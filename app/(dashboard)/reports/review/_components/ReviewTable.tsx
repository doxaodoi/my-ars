"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveReport, rejectReport } from "@/lib/actions/reports";

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = {
  id: string;
  studentName: string;
  className: string;
  classType: string;
  teacherRemark: string | null;
  existingHeadRemark: string | null;
};

interface Props {
  rows: Row[];
  role: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewTable({ rows: initialRows, role }: Props) {
  const router = useRouter();

  // Track which report is being reviewed (expanded)
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [headRemark, setHeadRemark] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Local rows state so we can optimistically remove approved/rejected rows
  const [rows, setRows] = useState(initialRows);

  function openReview(id: string, existingRemark: string | null) {
    setReviewingId(id);
    setHeadRemark(existingRemark ?? "");
  }

  function cancelReview() {
    setReviewingId(null);
    setHeadRemark("");
  }

  async function handleApprove(id: string) {
    setLoading(`approve-${id}`);
    const result = await approveReport(id, headRemark);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Report approved");
      setRows((prev) => prev.filter((r) => r.id !== id));
      cancelReview();
      router.refresh();
    }
  }

  async function handleReject(id: string) {
    if (!headRemark.trim()) {
      toast.error("Please add a remark explaining why the report is being returned.");
      return;
    }
    setLoading(`reject-${id}`);
    const result = await rejectReport(id, headRemark);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Report returned for revision");
      setRows((prev) => prev.filter((r) => r.id !== id));
      cancelReview();
      router.refresh();
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        All reports have been reviewed.
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Student</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Class</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Teacher Remark</th>
            <th className="px-4 py-2.5 font-medium text-muted-foreground text-right w-36">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Fragment key={row.id}>
              <tr
                className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                <td className="px-4 py-2.5 font-medium">{row.studentName}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.className}</td>
                <td className="px-4 py-2.5 text-muted-foreground max-w-xs">
                  {row.teacherRemark ? (
                    <span className="truncate block max-w-xs" title={row.teacherRemark}>
                      {row.teacherRemark}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/60">No remark</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/reports/${row.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    {reviewingId !== row.id && (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openReview(row.id, row.existingHeadRemark)}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </td>
              </tr>

              {/* Expanded review panel */}
              {reviewingId === row.id && (
                <tr className="bg-muted/30 border-t border-b">
                  <td colSpan={4} className="px-4 py-3">
                    <div className="space-y-3 max-w-lg">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Head Teacher Remark (optional for approval, required for rejection)
                      </p>
                      <textarea
                        value={headRemark}
                        onChange={(e) => setHeadRemark(e.target.value)}
                        placeholder="Add a remark…"
                        rows={2}
                        className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleApprove(row.id)}
                          disabled={!!loading}
                        >
                          {loading === `approve-${row.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(row.id)}
                          disabled={!!loading}
                        >
                          {loading === `reject-${row.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Return for Revision
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={cancelReview}
                          disabled={!!loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
