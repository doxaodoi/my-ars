import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportDetail } from "./_components/ReportDetail";

// ─── Grade-badge colors ───────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800",
  "A":  "bg-green-100 text-green-800",
  "B":  "bg-blue-100 text-blue-800",
  "C":  "bg-yellow-100 text-yellow-800",
  "D":  "bg-orange-100 text-orange-800",
  "E":  "bg-red-100 text-red-800",
  "F":  "bg-red-200 text-red-900",
};

const STATUS_PILL: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-green-100 text-green-700",
  PUBLISHED: "bg-violet-100 text-violet-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const { reportId } = await params;

  // Load report with full context
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
      tokens: { select: { token: true }, take: 1 },
    },
  });

  if (!report) notFound();

  const cls = report.student.class;
  const isKG      = cls.type === "KG";
  const isNursery = cls.type === "NURSERY" || cls.type === "CRECHE";

  // ── Fetch grades (KG / Basic) ─────────────────────────────────────────────
  let grades: {
    subjectName: string;
    midterm?: number | null;
    exam?: number | null;
    test1?: number | null;
    test2?: number | null;
    midtermScore?: number | null;
    assignment?: number | null;
    project?: number | null;
    basicExam?: number | null;
    total?: number | null;
    grade?: string | null;
  }[] = [];

  if (!isNursery) {
    const dbGrades = await db.grade.findMany({
      where: { studentId: report.studentId, termId: report.termId },
      include: { subject: { select: { id: true, name: true } } },
    });
    const orderMap = new Map(cls.subjects.map((s, i) => [s.id, i]));
    grades = dbGrades
      .sort((a, b) => (orderMap.get(a.subjectId) ?? 99) - (orderMap.get(b.subjectId) ?? 99))
      .map((g) => ({
        subjectName: g.subject.name,
        midterm: g.midterm, exam: g.exam,
        test1: g.test1, test2: g.test2,
        midtermScore: g.midtermScore, assignment: g.assignment,
        project: g.project, basicExam: g.basicExam,
        total: g.total, grade: g.grade,
      }));
  }

  // ── Fetch assessments (Nursery / Creche) ──────────────────────────────────
  let nurserySections: {
    name: string;
    items: { name: string; ticked: boolean; remark?: string | null }[];
  }[] = [];

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

  const token = report.tokens[0]?.token ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Reports
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
          title={report.student.name}
          description={`${cls.name} · ${report.term.name} ${report.term.year}`}
        />
        <span
          className={`mt-1 inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[report.status]}`}
        >
          {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* ── Grade table (KG / Basic) ──────────────────────────────────────── */}
      {!isNursery && grades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Academic Performance
          </h3>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                  {isKG ? (
                    <>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-14">{"Midterm\n/30"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-14">{"Exam\n/70"}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12">{"T1\n/10"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12">{"T2\n/10"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12">{"Mid\n/10"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12">{"Asgn\n/10"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12">{"Proj\n/20"}</th>
                      <th className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-16">{"Exam\n/100"}</th>
                    </>
                  )}
                  <th className="px-2 py-2 font-medium text-muted-foreground text-center w-14">Total</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground text-center w-14">Grade</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => {
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-3 py-2 font-medium">{g.subjectName}</td>
                      {isKG ? (
                        <>
                          <td className="px-2 py-2 text-center">{g.midterm?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.exam?.toFixed(1) ?? "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-center">{g.test1?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.test2?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.midtermScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.assignment?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.project?.toFixed(1) ?? "—"}</td>
                          <td className="px-2 py-2 text-center">{g.basicExam?.toFixed(1) ?? "—"}</td>
                        </>
                      )}
                      <td className="px-2 py-2 text-center font-semibold">
                        {g.total?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {g.grade ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[g.grade] ?? "bg-muted text-muted-foreground"}`}>
                            {g.grade}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Nursery / Creche tick assessments ────────────────────────────── */}
      {isNursery && nurserySections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Assessment
          </h3>
          {nurserySections.map((sec, si) => (
            <div key={si} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 border-b">
                <span className="text-sm font-semibold">{sec.name}</span>
              </div>
              <div className="divide-y">
                {sec.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-sm font-bold w-4 ${item.ticked ? "text-emerald-600" : "text-muted-foreground/40"}`}>
                      {item.ticked ? "✓" : "○"}
                    </span>
                    <span className="text-sm flex-1">{item.name}</span>
                    {item.remark && (
                      <span className="text-xs text-muted-foreground italic">{item.remark}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Interactive: remarks + actions ───────────────────────────────── */}
      <ReportDetail
        reportId={reportId}
        status={report.status}
        teacherRemark={report.teacherRemark}
        headRemark={report.headRemark}
        token={token}
        role={role}
        classId={cls.id}
        parentEmail={report.student.parentEmail}
        studentName={report.student.name}
        termLabel={`${report.term.name} ${report.term.year}`}
      />
    </div>
  );
}
