import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PromotionPanel } from "./_components/PromotionPanel";

export default async function PromotePage() {
  const session = await auth();
  if (!session || !["OWNER", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const classes = await db.class.findMany({
    include: {
      _count: { select: { students: { where: { graduated: false } } } },
    },
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Promote Students"
          description="Move students to the next class at the end of the academic year"
        />
      </div>

      <PromotionPanel
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          level: c.level,
          studentCount: c._count.students,
        }))}
      />
    </div>
  );
}
