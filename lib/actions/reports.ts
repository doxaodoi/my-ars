"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendReportEmail } from "@/lib/email";

// ── Generate DRAFT reports for all students in a class / term ─────────────────

export async function generateClassReports(classId: string, termId: string) {
  try {
    const students = await db.student.findMany({
      where: { classId },
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

// ── Teacher remark ────────────────────────────────────────────────────────────

export async function saveTeacherRemark(reportId: string, remark: string) {
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
  try {
    const students = await db.student.findMany({
      where: { classId },
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
  try {
    const students = await db.student.findMany({
      where: { classId },
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
