import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteDialog } from "@/components/shared/DeleteDialog";
import { UserDialog } from "./_components/UserDialog";
import { TermDialog, SetCurrentTermButton } from "./_components/TermDialog";
import { TeacherAssignment } from "./_components/TeacherAssignment";
import { deleteUser } from "@/lib/actions/users";
import { deleteTerm } from "@/lib/actions/terms";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner", ADMIN: "Admin",
  ACADEMIC_HEAD: "Academic Head", TEACHER: "Teacher",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session || !["OWNER", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const [users, terms, classes, assignments] = await Promise.all([
    db.user.findMany({
      where: { role: { not: "PARENT" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    db.term.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] }),
    db.class.findMany({ orderBy: [{ type: "asc" }, { level: "asc" }] }),
    db.classTeacher.findMany({ include: { class: true } }),
  ]);

  const teachers = users.filter((u) => u.role === "TEACHER");

  return (
    <div className="p-6 space-y-10">
      <PageHeader title="Administration" description="Manage staff accounts, terms, and class assignments" />

      {/* ── Staff Accounts ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Staff Accounts</h2>
          <UserDialog />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <UserDialog existing={u} />
                      {u.id !== session.user.id && (
                        <DeleteDialog
                          label={u.name}
                          onDelete={deleteUser.bind(null, u.id)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Terms ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Terms</h2>
          <TermDialog />
        </div>
        <div className="border rounded-lg overflow-hidden max-w-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.year}</TableCell>
                  <TableCell>
                    <SetCurrentTermButton termId={t.id} isCurrent={t.isCurrent} />
                  </TableCell>
                  <TableCell>
                    {!t.isCurrent && (
                      <DeleteDialog
                        label={`${t.name} ${t.year}`}
                        onDelete={deleteTerm.bind(null, t.id)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {terms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No terms yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Teacher → Class Assignments ────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Teacher Class Assignments</h2>
        <TeacherAssignment
          teachers={teachers}
          classes={classes}
          assignments={assignments}
        />
      </section>
    </div>
  );
}
