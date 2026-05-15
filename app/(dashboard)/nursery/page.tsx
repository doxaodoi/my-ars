import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Baby, ChevronRight } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  CRECHE: "Creche",
  NURSERY: "Nursery",
};

export default async function NurseryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;

  const classes = await db.class.findMany({
    where: {
      type: { in: ["CRECHE", "NURSERY"] },
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
        title="Nursery Assessments"
        description="Select a class to manage tick-based assessments"
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="No classes found"
          description={
            role === "TEACHER"
              ? "Ask your admin to assign you to a Creche or Nursery class"
              : "No Creche or Nursery classes have been set up yet"
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/nursery/${cls.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold text-foreground">{cls.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {TYPE_LABELS[cls.type]} &middot; {cls._count.students} student
                      {cls._count.students !== 1 ? "s" : ""}
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
