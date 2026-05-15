import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { Download } from "lucide-react";

// ─── Colors (same as report card PDF) ────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800",
  "A":  "bg-green-100 text-green-800",
  "B":  "bg-blue-100 text-blue-800",
  "C":  "bg-yellow-100 text-yellow-800",
  "D":  "bg-orange-100 text-orange-800",
  "E":  "bg-red-100 text-red-800",
  "F":  "bg-red-200 text-red-900",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Find the report token
  const reportToken = await db.reportToken.findUnique({
    where: { token },
    include: {
      report: {
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
      },
    },
  });

  if (!reportToken) notFound();

  // Check expiry
  if (reportToken.expiresAt && reportToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Link Expired</h1>
          <p className="text-sm text-muted-foreground">
            This report link has expired. Please contact the school for a new one.
          </p>
        </div>
      </div>
    );
  }

  // Report must be published
  if (reportToken.report.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Not Available</h1>
          <p className="text-sm text-muted-foreground">
            This report is not yet available. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const { report } = reportToken;
  const cls = report.student.class;
  const isKG      = cls.type === "KG";
  const isNursery = cls.type === "NURSERY" || cls.type === "CRECHE";

  // ── Grades (KG / Basic) ──────────────────────────────────────────────────
  let grades: {
    subjectName: string;
    midterm?: number | null; exam?: number | null;
    test1?: number | null; test2?: number | null;
    midtermScore?: number | null; assignment?: number | null;
    project?: number | null; basicExam?: number | null;
    total?: number | null; grade?: string | null;
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

  // ── Nursery / Creche assessments ─────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="Abundant Rain School" width={80} height={80} className="object-contain w-full h-full" />
          </div>
        </div>
        <h1 className="text-xl font-extrabold tracking-wide">ABUNDANT RAIN SCHOOL</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Abease, Amasaman, Accra · Ghana</p>
        <p className="text-sm font-semibold mt-1" style={{ color: "#f0c040" }}>
          ✦ Let God Arise! · Psalm 68:1
        </p>
      </header>

      {/* Banner */}
      <div className="bg-[#d4a017] text-white text-center py-2.5 text-sm font-bold tracking-widest uppercase">
        Terminal Report &nbsp;·&nbsp; {report.term.name} {report.term.year}
      </div>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Student info */}
        <div className="bg-background border rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
          <div className="p-4 col-span-2 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Student Name</p>
            <p className="font-bold text-base text-foreground">{report.student.name}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Class</p>
            <p className="font-semibold text-foreground">{cls.name}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Year</p>
            <p className="font-semibold text-foreground">{report.term.year}</p>
          </div>
        </div>

        {/* ── Academic Performance (KG / Basic) ──────────────────────── */}
        {!isNursery && grades.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
              Academic Performance
            </h2>
            <div className="bg-background border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-primary/5">
                    <th className="text-left px-3 py-2 font-semibold text-foreground/70">Subject</th>
                    {isKG ? (
                      <>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight">{"Midterm\n/30"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight">{"Exam\n/70"}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"T1\n/10"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"T2\n/10"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"Mid\n/10"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"Asgn\n/10"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"Proj\n/20"}</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground/70 whitespace-pre-line leading-tight text-xs">{"Exam\n/100"}</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-center font-semibold text-foreground/70">Total</th>
                    <th className="px-2 py-2 text-center font-semibold text-foreground/70">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
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
                      <td className="px-2 py-2 text-center font-bold">{g.total?.toFixed(1) ?? "—"}</td>
                      <td className="px-2 py-2 text-center">
                        {g.grade ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[g.grade] ?? "bg-muted text-muted-foreground"}`}>
                            {g.grade}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Nursery / Creche Assessments ────────────────────────────── */}
        {isNursery && nurserySections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Assessment</h2>
            {nurserySections.map((sec, si) => (
              <div key={si} className="bg-background border rounded-lg overflow-hidden">
                <div className="bg-primary/5 px-4 py-2.5 border-b">
                  <span className="text-sm font-semibold">{sec.name}</span>
                </div>
                <div className="divide-y">
                  {sec.items.map((item, ii) => (
                    <div key={ii} className={`flex items-center gap-3 px-4 py-2.5 ${ii % 2 === 1 ? "bg-muted/20" : ""}`}>
                      <span className={`text-sm font-bold w-4 ${item.ticked ? "text-emerald-600" : "text-muted-foreground/30"}`}>
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

        {/* ── Remarks ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="bg-background border rounded-lg overflow-hidden">
            <div className="bg-primary/5 px-4 py-2.5 border-b">
              <p className="text-sm font-semibold">Class Teacher Remark</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-foreground">
                {report.teacherRemark || <span className="text-muted-foreground italic">—</span>}
              </p>
            </div>
          </div>

          <div className="bg-background border rounded-lg overflow-hidden">
            <div className="bg-primary/5 px-4 py-2.5 border-b">
              <p className="text-sm font-semibold">Head Teacher Remark</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-foreground">
                {report.headRemark || <span className="text-muted-foreground italic">—</span>}
              </p>
            </div>
          </div>
        </div>

        {/* ── Download PDF ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-center">
          <a
            href={`/api/reports/${report.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report Card (PDF)
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          This report was generated by <strong>Abundant Rain School</strong>.<br />
          Please keep this link private.
        </p>
      </main>
    </div>
  );
}
