import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckCircle } from "lucide-react";
import { TermSelect } from "../_components/TermSelect";
import { ReviewTable } from "./_components/ReviewTable";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
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

  // Load SUBMITTED reports for the active term
  const reports = await db.report.findMany({
    where: { termId: activeTerm.id, status: "SUBMITTED" },
    include: {
      student: {
        include: { class: { select: { name: true, type: true } } },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  const rows = reports.map((r) => ({
    id: r.id,
    studentName: r.student.name,
    className: r.student.class.name,
    classType: r.student.class.type,
    teacherRemark: r.teacherRemark,
    existingHeadRemark: r.headRemark,
  }));

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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Review Queue"
          description={`${rows.length} report${rows.length !== 1 ? "s" : ""} awaiting approval`}
        />
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">Term:</span>
          <TermSelect
            terms={terms}
            activeTermId={activeTerm.id}
            basePath="/reports/review"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="All clear!"
          description="No reports are pending review for this term."
        />
      ) : (
        <ReviewTable rows={rows} role={role} />
      )}
    </div>
  );
}
