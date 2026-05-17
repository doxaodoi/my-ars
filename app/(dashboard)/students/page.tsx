import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteDialog } from "@/components/shared/DeleteDialog";
import { StudentSheet } from "./_components/StudentSheet";
import { CsvImport } from "./_components/CsvImport";
import { deleteStudent } from "@/lib/actions/students";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; q?: string }>;
}) {
  const { classId, q } = await searchParams;

  const [students, classes] = await Promise.all([
    db.student.findMany({
      where: {
        graduated: false,
        ...(classId ? { classId } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { class: true },
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    }),
    db.class.findMany({ orderBy: [{ type: "asc" }, { level: "asc" }] }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length !== 1 ? "s" : ""} found`}
        action={
          <div className="flex items-center gap-2">
            <CsvImport classes={classes} />
            <StudentSheet classes={classes} />
          </div>
        }
      />

      {/* Filter bar */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name..."
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          name="classId"
          defaultValue={classId ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Filter
        </button>
      </form>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Add your first student or adjust your filters"
        />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Parent Phone</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.class.name}</TableCell>
                  <TableCell>{s.parentName ?? "—"}</TableCell>
                  <TableCell>{s.parentPhone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <StudentSheet classes={classes} existing={s} />
                      <DeleteDialog
                        label={s.name}
                        onDelete={deleteStudent.bind(null, s.id)}
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
