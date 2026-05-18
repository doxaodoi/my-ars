"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";

// ── Role guards ───────────────────────────────────────────────────────────────

/** Require OWNER, ADMIN, or ACADEMIC_HEAD */
async function requireSenior() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" } as const;
  if (!["OWNER", "ADMIN", "ACADEMIC_HEAD"].includes(session.user.role)) {
    return { error: "Unauthorized" } as const;
  }
  return null;
}

/** Require any authenticated user (returns session or error) */
async function requireAuth() {
  const session = await auth();
  if (!session?.user) return { session: null, error: "Unauthorized" } as const;
  return { session, error: null } as const;
}

// ── Generate DRAFT reports for all students in a class / term ─────────────────

export async function generateClassReports(classId: string, termId: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    const students = await db.student.findMany({
      where: { classId, graduated: false },
      select: { id: true },
    });

    await db.report.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        termId,
        status: "DRAFT" as const,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/reports");
    revalidatePath("/reports/generate");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate reports." };
  }
}

// ── Report metadata (interest, conduct, attendance, etc.) ────────────────────

export async function saveReportMeta(
  reportId: string,
  data: {
    interest?: string;
    conduct?: string;
    attitude?: string;
    attendance?: number | null;
    totalDays?: number | null;
    promoted?: string;
  }
) {
  const { error } = await requireAuth();
  if (error) return { error };

  try {
    await db.report.update({
      where: { id: reportId },
      data: {
        interest: data.interest?.trim() || null,
        conduct: data.conduct?.trim() || null,
        attitude: data.attitude?.trim() || null,
        attendance: data.attendance ?? null,
        totalDays: data.totalDays ?? null,
        promoted: data.promoted?.trim() || null,
      },
    });
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save report details." };
  }
}

// ── Teacher remark ────────────────────────────────────────────────────────────

export async function saveTeacherRemark(reportId: string, remark: string) {
  const { error } = await requireAuth();
  if (error) return { error };

  try {
    await db.report.update({
      where: { id: reportId },
      data: { teacherRemark: remark.trim() || null },
    });
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save remark." };
  }
}

export async function saveHeadRemark(reportId: string, remark: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    await db.report.update({
      where: { id: reportId },
      data: { headRemark: remark.trim() || null },
    });
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save remark." };
  }
}

// ── Submit ────────────────────────────────────────────────────────────────────

export async function submitReport(reportId: string) {
  const { session, error } = await requireAuth();
  if (error) return { error };

  // TEACHER: verify they are assigned to this report's class
  if (session.user.role === "TEACHER") {
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: { student: { select: { classId: true } } },
    });
    if (!report) return { error: "Report not found." };
    const assigned = await db.classTeacher.findFirst({
      where: { userId: session.user.id, classId: report.student.classId },
    });
    if (!assigned) return { error: "Unauthorized" };
  }

  try {
    const report = await db.report.findUnique({ where: { id: reportId } });
    if (!report || report.status !== "DRAFT") {
      return { error: "Only DRAFT reports can be submitted." };
    }
    await db.report.update({
      where: { id: reportId },
      data: { status: "SUBMITTED" },
    });
    revalidatePath("/reports");
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to submit report." };
  }
}

export async function submitClassReports(classId: string, termId: string) {
  const { session, error } = await requireAuth();
  if (error) return { error };

  // TEACHER: verify they are assigned to this class
  if (session.user.role === "TEACHER") {
    const assigned = await db.classTeacher.findFirst({
      where: { userId: session.user.id, classId },
    });
    if (!assigned) return { error: "Unauthorized" };
  }

  try {
    const students = await db.student.findMany({
      where: { classId, graduated: false },
      select: { id: true },
    });

    const { count } = await db.report.updateMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        termId,
        status: "DRAFT",
      },
      data: { status: "SUBMITTED" },
    });

    revalidatePath("/reports");
    revalidatePath("/reports/generate");
    return { success: true, count };
  } catch (e) {
    console.error(e);
    return { error: "Failed to submit reports." };
  }
}

// ── Approve / Reject ──────────────────────────────────────────────────────────

export async function approveReport(reportId: string, headRemark?: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    const report = await db.report.findUnique({ where: { id: reportId } });
    if (!report || report.status !== "SUBMITTED") {
      return { error: "Only SUBMITTED reports can be approved." };
    }
    await db.report.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
        headRemark: headRemark?.trim() || report.headRemark || null,
      },
    });
    revalidatePath("/reports");
    revalidatePath("/reports/review");
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to approve report." };
  }
}

export async function rejectReport(reportId: string, headRemark?: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    await db.report.update({
      where: { id: reportId },
      data: {
        status: "DRAFT",
        headRemark: headRemark?.trim() || null,
      },
    });
    revalidatePath("/reports");
    revalidatePath("/reports/review");
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to return report for revision." };
  }
}

// ── Publish ───────────────────────────────────────────────────────────────────

export async function publishReport(reportId: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    const report = await db.report.update({
      where: { id: reportId },
      data: { status: "PUBLISHED", published: true },
    });

    // Create a share token if one doesn't exist
    const existing = await db.reportToken.findFirst({
      where: { reportId },
    });

    let token = existing?.token;
    if (!existing) {
      const created = await db.reportToken.create({
        data: { reportId, studentId: report.studentId },
      });
      token = created.token;
    }

    revalidatePath("/reports");
    revalidatePath(`/reports/${reportId}`);
    return { success: true, token };
  } catch (e) {
    console.error(e);
    return { error: "Failed to publish report." };
  }
}

export async function publishClassReports(classId: string, termId: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    const students = await db.student.findMany({
      where: { classId, graduated: false },
      select: { id: true },
    });

    const reports = await db.report.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        termId,
        status: "APPROVED",
      },
    });

    for (const r of reports) {
      await db.report.update({
        where: { id: r.id },
        data: { status: "PUBLISHED", published: true },
      });
      const existing = await db.reportToken.findFirst({ where: { reportId: r.id } });
      if (!existing) {
        await db.reportToken.create({
          data: { reportId: r.id, studentId: r.studentId },
        });
      }
    }

    revalidatePath("/reports");
    revalidatePath("/reports/generate");
    return { success: true, count: reports.length };
  } catch (e) {
    console.error(e);
    return { error: "Failed to publish reports." };
  }
}

// ── Email parent ──────────────────────────────────────────────────────────────

export async function emailReportToParent(reportId: string) {
  const guard = await requireSenior();
  if (guard) return guard;

  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        student: { select: { name: true, parentEmail: true } },
        term:    { select: { name: true, year: true } },
        tokens:  { select: { token: true }, take: 1 },
      },
    });

    if (!report || report.status !== "PUBLISHED") {
      return { error: "Report must be published before sharing." };
    }
    if (!report.student.parentEmail) {
      return { error: "No parent email on file for this student." };
    }
    if (!report.tokens[0]) {
      return { error: "No share link found. Try publishing the report again." };
    }

    const appUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const reportUrl = `${appUrl}/parent/${report.tokens[0].token}`;

    await sendReportEmail({
      to: report.student.parentEmail,
      studentName: report.student.name,
      reportUrl,
      term: `${report.term.name} ${report.term.year}`,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to send email." };
  }
}
