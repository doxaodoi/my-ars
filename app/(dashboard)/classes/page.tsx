import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteDialog } from "@/components/shared/DeleteDialog";
import { ClassDialog } from "./_components/ClassDialog";
import { deleteClass } from "@/lib/actions/classes";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GraduationCap } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  CRECHE: "Creche",
  NURSERY: "Nursery",
  KG: "KG",
  PRIMARY: "Basic",
};

const TYPE_COLORS: Record<string, string> = {
  CRECHE: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  NURSERY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  KG: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PRIMARY: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export default async function ClassesPage() {
  const classes = await db.class.findMany({
    include: { _count: { select: { students: true, subjects: true } } },
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Classes"
        description="Manage all classes in the school"
        action={<ClassDialog />}
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Add your first class to get started"
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Subjects</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[cls.type]}`}>
                      {TYPE_LABELS[cls.type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{cls._count.students}</TableCell>
                  <TableCell className="text-center">{cls._count.subjects}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <ClassDialog existing={cls} />
                      <DeleteDialog
                        label={cls.name}
                        onDelete={deleteClass.bind(null, cls.id)}
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
