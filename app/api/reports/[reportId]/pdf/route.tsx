import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReportCard } from "@/components/reports/ReportCard";
import type { ReportCardData } from "@/components/reports/ReportCard";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { reportId } = await params;

  // ── Fetch report + student + class + term ────────────────────────────────
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      student: {
        include: {
          class: {
            include: { subjects: { orderBy: { order: "asc" } } },
          },
        },
      },
      term: true,
    },
  });

  if (!report) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const cls = report.student.class;
  const isNursery = cls.type === "NURSERY" || cls.type === "CRECHE";

  // ── Grades (KG / Primary) ─────────────────────────────────────────────────
  let grades: ReportCardData["grades"] = [];
  if (!isNursery) {
    const dbGrades = await db.grade.findMany({
      where: { studentId: report.studentId, termId: report.termId },
      include: { subject: { select: { id: true, name: true } } },
    });

    // Preserve subject order
    const orderMap = new Map(cls.subjects.map((s, i) => [s.id, i]));
    grades = dbGrades
      .sort(
        (a, b) =>
          (orderMap.get(a.subjectId) ?? 99) - (orderMap.get(b.subjectId) ?? 99)
      )
      .map((g) => ({
        name: g.subject.name,
        midterm: g.midterm,
        exam: g.exam,
        test1: g.test1,
        test2: g.test2,
        midtermScore: g.midtermScore,
        assignment: g.assignment,
        project: g.project,
        basicExam: g.basicExam,
        total: g.total,
        grade: g.grade,
        remark: g.remark,
      }));
  }

  // ── Nursery / Creche assessments ──────────────────────────────────────────
  let nurserySections: ReportCardData["nurserySections"] = [];
  if (isNursery) {
    const template = await db.nurseryTemplate.findFirst({
      where: { classId: cls.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            items: {
              orderBy: { order: "asc" },
              include: {
                assessments: {
                  where: { studentId: report.studentId, termId: report.termId },
                },
              },
            },
          },
        },
      },
    });

    if (template) {
      nurserySections = template.sections.map((sec) => ({
        name: sec.name,
        items: sec.items.map((item) => {
          const a = item.assessments[0];
          return { name: item.name, ticked: a?.ticked ?? false, remark: a?.remark };
        }),
      }));
    }
  }

  // ── Build PDF data ────────────────────────────────────────────────────────
  const data: ReportCardData = {
    studentName: report.student.name,
    className: cls.name,
    classType: cls.type as ReportCardData["classType"],
    termName: report.term.name,
    year: report.term.year,
    teacherRemark: report.teacherRemark,
    headRemark: report.headRemark,
    grades: !isNursery ? grades : undefined,
    nurserySections: isNursery ? nurserySections : undefined,
  };

  // ── Render PDF ────────────────────────────────────────────────────────────
  const element = React.createElement(ReportCard, { data }) as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const safeName = report.student.name.replace(/\s+/g, "_");
  const fileName = `Report_${safeName}_${report.term.name}_${report.term.year}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
