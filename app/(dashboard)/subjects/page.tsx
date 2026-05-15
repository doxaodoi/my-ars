import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteDialog } from "@/components/shared/DeleteDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubjectDialog } from "./_components/SubjectDialog";
import { deleteSubject } from "@/lib/actions/subjects";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BookOpen } from "lucide-react";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;

  const classes = await db.class.findMany({
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  const activeClassId = classId ?? classes[0]?.id ?? null;

  const subjects = activeClassId
    ? await db.subject.findMany({
        where: { classId: activeClassId },
        orderBy: { order: "asc" },
      })
    : [];

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage subjects for each class"
        action={activeClassId ? <SubjectDialog classId={activeClassId} /> : undefined}
      />

      {/* Class tabs */}
      <div className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/subjects?classId=${c.id}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              c.id === activeClassId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!activeClassId ? (
        <EmptyState icon={BookOpen} title="No classes found" description="Add classes first" />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`No subjects for ${activeClass?.name}`}
          description="Click Add Subject to get started"
        />
      ) : (
        <div className="border rounded-lg overflow-hidden max-w-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center w-20">Order</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <SubjectDialog classId={activeClassId} existing={s} />
                      <DeleteDialog
                        label={s.name}
                        onDelete={deleteSubject.bind(null, s.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
