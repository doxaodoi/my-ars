import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users, GraduationCap, FileText, ClipboardList,
  CheckCircle, AlertCircle, BookOpen, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const role    = session!.user.role;
  const userId  = session!.user.id;
  const name    = session!.user.name?.split(" ")[0] ?? "there";

  // ── Current term ─────────────────────────────────────────────────────────
  const currentTerm = await db.term.findFirst({ where: { isCurrent: true } });

  // ── Core counts (admin / head) ────────────────────────────────────────────
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isHead  = role === "ACADEMIC_HEAD" || isAdmin;

  const [studentCount, classCount, publishedCount, submittedCount, approvedCount] =
    await Promise.all([
      isAdmin || isHead ? db.student.count() : Promise.resolve(0),
      isAdmin           ? db.class.count()   : Promise.resolve(0),
      isHead ? db.report.count({ where: { status: "PUBLISHED", termId: currentTerm?.id } }) : Promise.resolve(0),
      isHead ? db.report.count({ where: { status: "SUBMITTED", termId: currentTerm?.id } }) : Promise.resolve(0),
      isHead ? db.report.count({ where: { status: "APPROVED",  termId: currentTerm?.id } }) : Promise.resolve(0),
    ]);

  // ── Teacher: assigned classes ─────────────────────────────────────────────
  const teacherClasses =
    role === "TEACHER"
      ? await db.class.findMany({
          where: { teachers: { some: { userId } } },
          include: { _count: { select: { students: true } } },
          orderBy: [{ type: "asc" }, { level: "asc" }],
        })
      : [];

  const TYPE_LABELS: Record<string, string> = {
    CRECHE: "Creche", NURSERY: "Nursery", KG: "KG", PRIMARY: "Basic",
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 space-y-8">
      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greetingTime()}, {name} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {currentTerm
            ? ` · ${currentTerm.name} ${currentTerm.year}`
            : " · No current term set — go to Administration to create one."}
        </p>
      </div>

      {/* ── Stats (admin / head) ────────────────────────────────────────── */}
      {(isAdmin || isHead) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isAdmin && (
            <>
              <StatCard title="Total Students" value={studentCount} icon={Users}        desc="Enrolled across all classes" />
              <StatCard title="Classes"         value={classCount}   icon={GraduationCap} desc="Active classes" />
            </>
          )}
          {isHead && !isAdmin && (
            <StatCard title="Total Students" value={studentCount} icon={Users} desc="Enrolled across all classes" />
          )}
          <StatCard
            title="Published"
            value={publishedCount}
            icon={FileText}
            desc={currentTerm ? `${currentTerm.name} ${currentTerm.year}` : "This term"}
          />
          <StatCard
            title="Pending Review"
            value={submittedCount}
            icon={ClipboardList}
            desc="Reports awaiting approval"
            highlight={submittedCount > 0}
          />
        </div>
      )}

      {/* ── Action cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Pending review alert */}
        {isHead && submittedCount > 0 && (
          <Link href={`/reports/review${currentTerm ? `?termId=${currentTerm.id}` : ""}`}>
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-300">
                    {submittedCount} report{submittedCount !== 1 ? "s" : ""} to review
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Click to open review queue
                  </p>
                </div>
                <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Approved — ready to publish */}
        {isAdmin && approvedCount > 0 && (
          <Link href={`/reports/generate${currentTerm ? `?termId=${currentTerm.id}` : ""}`}>
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">
                    {approvedCount} report{approvedCount !== 1 ? "s" : ""} approved
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Ready to publish
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Quick links */}
        {isAdmin && (
          <QuickLink href="/grades"   icon={ClipboardList} label="Grade Entry"    desc="Enter or update scores" />
        )}
        {isAdmin && (
          <QuickLink href="/nursery"  icon={CheckCircle}   label="Nursery / Creche" desc="Tick assessments" />
        )}
        {isAdmin && (
          <QuickLink href="/reports/generate" icon={FileText} label="Generate Reports" desc="Create report cards" />
        )}
        {isHead && !isAdmin && (
          <QuickLink href="/reports/review" icon={BookOpen} label="Review Queue" desc="Approve submitted reports" />
        )}
      </div>

      {/* ── Teacher: assigned classes ───────────────────────────────────── */}
      {role === "TEACHER" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Classes
          </h2>
          {teacherClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have not been assigned to any classes yet. Contact your admin.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherClasses.map((cls) => {
                const isKGorBasic  = cls.type === "KG"  || cls.type === "PRIMARY";
                const isNursery    = cls.type === "NURSERY" || cls.type === "CRECHE";
                return (
                  <Card key={cls.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-5">
                      <p className="font-semibold text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TYPE_LABELS[cls.type]} · {cls._count.students} student{cls._count.students !== 1 ? "s" : ""}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {isKGorBasic && (
                          <Link href={`/grades/${cls.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                              Grades
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {isNursery && (
                          <Link href={`/nursery/${cls.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                              Assessments
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small reusable sub-components ───────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, desc, highlight = false,
}: {
  title: string; value: number; icon: React.ElementType;
  desc: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-blue-200 dark:border-blue-900" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${highlight ? "text-blue-500" : "text-primary"}`} />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`text-3xl font-bold ${highlight ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href, icon: Icon, label, desc,
}: {
  href: string; icon: React.ElementType; label: string; desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group h-full">
        <CardContent className="flex items-center justify-between p-5 h-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
