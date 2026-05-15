import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, ChevronRight } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  CRECHE: "Creche", NURSERY: "Nursery", KG: "KG", PRIMARY: "Basic",
};

export default async function GradesPage() {
  const session = await auth();
  const role = session!.user.role;
  const userId = session!.user.id;

  // Teachers see only their assigned classes; Admins/Owners see all KG + Basic
  const classes = await db.class.findMany({
    where: {
      type: { in: ["KG", "PRIMARY"] },
      ...(role === "TEACHER"
        ? { teachers: { some: { userId } } }
        : {}),
    },
    include: {
      _count: { select: { students: true } },
    },
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Grade Entry"
        description="Select a class to enter or update scores"
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No classes assigned"
          description={
            role === "TEACHER"
              ? "Ask your admin to assign you to a class"
              : "No KG or Basic classes found"
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/grades/${cls.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold text-foreground">{cls.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {TYPE_LABELS[cls.type]} · {cls._count.students} student{cls._count.students !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
