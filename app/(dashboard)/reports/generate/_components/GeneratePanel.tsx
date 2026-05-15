"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus, Send, Globe, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateClassReports,
  submitClassReports,
  publishClassReports,
} from "@/lib/actions/reports";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  classId: string;
  className: string;
  termId: string;
  termName: string;
  students: { id: string; name: string }[];
  reports: { id: string; studentId: string; status: string }[];
  role: string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     "Draft",
  SUBMITTED: "Pending Review",
  APPROVED:  "Approved",
  PUBLISHED: "Published",
};

const STATUS_PILL: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED:  "bg-green-100 text-green-700",
  PUBLISHED: "bg-violet-100 text-violet-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratePanel({
  classId,
  className,
  termId,
  termName,
  students,
  reports,
  role,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Build a map for quick lookup
  const reportByStudent = new Map(reports.map((r) => [r.studentId, r]));

  // Counts
  const missing   = students.filter((s) => !reportByStudent.has(s.id)).length;
  const drafts    = reports.filter((r) => r.status === "DRAFT").length;
  const approved  = reports.filter((r) => r.status === "APPROVED").length;
  const published = reports.filter((r) => r.status === "PUBLISHED").length;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setLoading("generate");
    const result = await generateClassReports(classId, termId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Reports generated for ${className}`);
      router.refresh();
    }
  }

  async function handleSubmitAll() {
    setLoading("submit");
    const result = await submitClassReports(classId, termId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${(result as { count?: number }).count ?? drafts} report(s) submitted for review`);
      router.refresh();
    }
  }

  async function handlePublishAll() {
    setLoading("publish");
    const result = await publishClassReports(classId, termId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${(result as { count?: number }).count ?? approved} report(s) published`);
      router.refresh();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{className}</span>
        <span>&middot;</span>
        <span>{termName}</span>
        <span>&middot;</span>
        <span>{students.length} students</span>
        {missing > 0 && (
          <>
            <span>&middot;</span>
            <span className="text-amber-600 font-medium">{missing} without reports</span>
          </>
        )}
        {published > 0 && (
          <>
            <span>&middot;</span>
            <span className="text-violet-600 font-medium">{published} published</span>
          </>
        )}
      </div>

      {/* Bulk action buttons */}
      <div className="flex flex-wrap gap-2">
        {missing > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={loading === "generate"}
          >
            {loading === "generate" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FilePlus className="w-4 h-4 mr-2" />
            )}
            Generate Missing ({missing})
          </Button>
        )}

        {drafts > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSubmitAll}
            disabled={loading === "submit"}
          >
            {loading === "submit" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit All Drafts ({drafts})
          </Button>
        )}

        {approved > 0 && (role === "OWNER" || role === "ADMIN") && (
          <Button
            size="sm"
            onClick={handlePublishAll}
            disabled={loading === "publish"}
          >
            {loading === "publish" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Globe className="w-4 h-4 mr-2" />
            )}
            Publish Approved ({approved})
          </Button>
        )}
      </div>

      {/* Student table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Student</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">Status</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-right w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => {
              const report = reportByStudent.get(student.id);
              return (
                <tr
                  key={student.id}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                >
                  <td className="px-4 py-2.5 font-medium">{student.name}</td>
                  <td className="px-4 py-2.5">
                    {report ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[report.status]}`}
                      >
                        {STATUS_LABEL[report.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not generated</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {report && (
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          View
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
