import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronRight, FilePlus, CheckCircle } from "lucide-react";
import { TermSelect } from "./_components/TermSelect";

const TYPE_LABELS: Record<string, string> = {
  CRECHE: "Creche", NURSERY: "Nursery", KG: "KG", PRIMARY: "Basic",
};

const STATUS_PILL: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-green-100 text-green-700",
  PUBLISHED: "bg-violet-100 text-violet-700",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  // Teachers don't use this page
  if (role === "TEACHER") redirect("/grades");

  const { termId: termIdParam } = await searchParams;

  const terms = await db.term.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0];
  const activeTerm = termIdParam
    ? (terms.find((t) => t.id === termIdParam) ?? currentTerm)
    : currentTerm;

  if (!activeTerm) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          No terms found. Create a term in Administration first.
        </p>
      </div>
    );
  }

  // All classes
  const classes = await db.class.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  // Reports for the active term, grouped by student.classId
  const allReports = await db.report.findMany({
    where: { termId: activeTerm.id },
    include: { student: { select: { classId: true } } },
  });

  // Build per-class status counts
  const countsByClass: Record<string, Record<string, number>> = {};
  for (const r of allReports) {
    const cid = r.student.classId;
    countsByClass[cid] ??= { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, PUBLISHED: 0 };
    countsByClass[cid][r.status]++;
  }

  const totalSubmitted = allReports.filter((r) => r.status === "SUBMITTED").length;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Reports"
          description="Manage terminal report cards by class and term"
        />
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">Term:</span>
          <TermSelect terms={terms} activeTermId={activeTerm.id} basePath="/reports" />
        </div>
      </div>

      {/* Quick-access buttons */}
      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <Link href={`/reports/generate?termId=${activeTerm.id}`}>
            <Button variant="outline" size="sm">
              <FilePlus className="w-4 h-4 mr-2" />
              Generate / Manage
            </Button>
          </Link>
        )}
        <Link href={`/reports/review?termId=${activeTerm.id}`}>
          <Button variant={totalSubmitted > 0 ? "default" : "outline"} size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Review Queue
            {totalSubmitted > 0 && (
              <span className="ml-1.5 bg-white/25 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {totalSubmitted}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Class list */}
      <div className="space-y-2 max-w-3xl">
        {classes.map((cls) => {
          const counts = countsByClass[cls.id] ?? {};
          const generated = Object.values(counts).reduce((a, b) => a + b, 0);

          return (
            <div key={cls.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">{cls.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABELS[cls.type]} &middot; {cls._count.students} students
                    {generated > 0 ? ` · ${generated} reports` : " · No reports yet"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED"] as const).map((st) =>
                    counts[st] > 0 ? (
                      <span
                        key={st}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[st]}`}
                      >
                        {counts[st]} {st.charAt(0) + st.slice(1).toLowerCase()}
                      </span>
                    ) : null
                  )}

                  {isAdmin && (
                    <Link
                      href={`/reports/generate?classId=${cls.id}&termId=${activeTerm.id}`}
                    >
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        Manage
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
