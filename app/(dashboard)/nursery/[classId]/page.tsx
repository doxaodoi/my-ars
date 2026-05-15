import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { ArrowLeft } from "lucide-react";
import { TemplateBuilder } from "./_components/TemplateBuilder";
import { TickForm } from "./_components/TickForm";

export default async function NurseryClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ termId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { classId } = await params;
  const { termId: termIdParam } = await searchParams;

  const cls = await db.class.findUnique({
    where: { id: classId },
    include: {
      students: { orderBy: { name: "asc" } },
    },
  });

  if (!cls || !["CRECHE", "NURSERY"].includes(cls.type)) notFound();

  // Teacher access check
  if (session.user.role === "TEACHER") {
    const assignment = await db.classTeacher.findFirst({
      where: { userId: session.user.id, classId },
    });
    if (!assignment) redirect("/nursery");
  }

  const isAdmin = ["OWNER", "ADMIN"].includes(session.user.role);

  // Load template with sections and items
  const template = await db.nurseryTemplate.findFirst({
    where: { classId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  // Load terms
  const terms = await db.term.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0];
  const activeTerm = termIdParam
    ? (terms.find((t) => t.id === termIdParam) ?? currentTerm)
    : currentTerm;

  // Load existing assessments for the active term (all students in class)
  const existingAssessments =
    template && activeTerm
      ? await db.nurseryStudentAssessment.findMany({
          where: {
            termId: activeTerm.id,
            student: { classId },
          },
        })
      : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/nursery"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Classes
        </Link>
      </div>

      <PageHeader
        title={cls.name}
        description={`Nursery Assessments${activeTerm ? ` · ${activeTerm.name} ${activeTerm.year}` : ""}`}
      />

      {/* Template builder — admin / owner only */}
      {isAdmin && (
        <TemplateBuilder template={template} classId={classId} />
      )}

      {/* Tick form section */}
      {!activeTerm ? (
        <p className="text-muted-foreground text-sm">
          No terms found. Create a term in Administration first.
        </p>
      ) : !template ? (
        !isAdmin ? (
          <p className="text-muted-foreground text-sm">
            No assessment template has been set up for this class yet. Contact your admin.
          </p>
        ) : null /* admin sees the template builder above */
      ) : cls.students.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No students in this class yet. Add students first.
        </p>
      ) : (
        <TickForm
          template={template}
          students={cls.students}
          terms={terms}
          activeTerm={activeTerm}
          existingAssessments={existingAssessments}
          classId={classId}
        />
      )}
    </div>
  );
}
