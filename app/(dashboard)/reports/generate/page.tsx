import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { TermSelect } from "../_components/TermSelect";
import { GeneratePanel } from "./_components/GeneratePanel";
import { ClassSelectClient } from "./_components/ClassSelectClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  CRECHE: "Creche", NURSERY: "Nursery", KG: "KG", PRIMARY: "Basic",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "OWNER" && role !== "ADMIN") redirect("/reports");

  const { classId: classIdParam, termId: termIdParam } = await searchParams;

  const [terms, classes] = await Promise.all([
    db.term.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] }),
    db.class.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: [{ type: "asc" }, { level: "asc" }],
    }),
  ]);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0];
  const activeTerm = termIdParam
    ? (terms.find((t) => t.id === termIdParam) ?? currentTerm)
    : currentTerm;

  const activeClass = classIdParam
    ? classes.find((c) => c.id === classIdParam)
    : undefined;

  // When a class is selected, load students + existing reports
  let students: { id: string; name: string }[] = [];
  let reports: { id: string; studentId: string; status: string }[] = [];

  if (activeClass && activeTerm) {
    [students, reports] = await Promise.all([
      db.student.findMany({
        where: { classId: activeClass.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.report.findMany({
        where: { termId: activeTerm.id, student: { classId: activeClass.id } },
        select: { id: true, studentId: true, status: true },
      }),
    ]);
  }

  const basePath = classIdParam
    ? `/reports/generate?classId=${classIdParam}`
    : "/reports/generate";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Reports Overview
        </Link>
      </div>

      <PageHeader
        title="Generate / Manage Reports"
        description="Create and submit report cards for a class and term"
      />

      {/* Class + Term selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Class:</span>
          <ClassSelectClient
            classes={classes.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              count: c._count.students,
            }))}
            activeClassId={activeClass?.id ?? ""}
            termId={activeTerm?.id ?? ""}
            typeLabels={TYPE_LABELS}
          />
        </div>
        {activeTerm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Term:</span>
            <TermSelect
              terms={terms}
              activeTermId={activeTerm.id}
              basePath={basePath}
            />
          </div>
        )}
      </div>

      {/* Main panel */}
      {!activeClass || !activeTerm ? (
        <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
          Select a class above to manage its reports
        </div>
      ) : (
        <GeneratePanel
          classId={activeClass.id}
          className={activeClass.name}
          termId={activeTerm.id}
          termName={`${activeTerm.name} ${activeTerm.year}`}
          students={students}
          reports={reports}
          role={role}
        />
      )}
    </div>
  );
}
