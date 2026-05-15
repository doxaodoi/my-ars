import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { GradeTable } from "./_components/GradeTable";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function GradeEntryPage({
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
      subjects: { orderBy: { order: "asc" } },
      students: { orderBy: { name: "asc" } },
    },
  });
  if (!cls || !["KG", "PRIMARY"].includes(cls.type)) notFound();

  // Teacher access check
  if (session.user.role === "TEACHER") {
    const assignment = await db.classTeacher.findFirst({
      where: { userId: session.user.id, classId },
    });
    if (!assignment) redirect("/grades");
  }

  const terms = await db.term.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] });
  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0];
  const activeTerm = termIdParam
    ? terms.find((t) => t.id === termIdParam) ?? currentTerm
    : currentTerm;

  if (!activeTerm) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No terms found. Create a term in Administration first.</p>
      </div>
    );
  }

  // Load existing grades for this class + term
  const existingGrades = await db.grade.findMany({
    where: {
      termId: activeTerm.id,
      student: { classId },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/grades"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Classes
        </Link>
      </div>

      <PageHeader
        title={cls.name}
        description={`Grade entry · ${activeTerm.name} ${activeTerm.year}`}
      />

      <GradeTable
        cls={cls}
        students={cls.students}
        subjects={cls.subjects}
        term={activeTerm}
        terms={terms}
        existingGrades={existingGrades}
      />
    </div>
  );
}
