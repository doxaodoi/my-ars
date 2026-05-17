"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send, CheckCircle, XCircle, Globe, Download,
  Loader2, Share2, Copy, Check, Mail, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveTeacherRemark,
  saveHeadRemark,
  saveReportMeta,
  submitReport,
  approveReport,
  rejectReport,
  publishReport,
  emailReportToParent,
} from "@/lib/actions/reports";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  reportId: string;
  status: string;
  teacherRemark: string | null;
  headRemark: string | null;
  interest: string | null;
  conduct: string | null;
  attitude: string | null;
  attendance: number | null;
  totalDays: number | null;
  promoted: string | null;
  token: string | null;
  role: string;
  classId: string;
  parentEmail?: string | null;
  studentName?: string;
  termLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportDetail({
  reportId,
  status,
  teacherRemark: initialTeacherRemark,
  headRemark: initialHeadRemark,
  interest: initialInterest,
  conduct: initialConduct,
  attitude: initialAttitude,
  attendance: initialAttendance,
  totalDays: initialTotalDays,
  promoted: initialPromoted,
  token: initialToken,
  role,
  parentEmail,
  studentName = "",
  termLabel = "",
}: Props) {
  const router = useRouter();
  const [teacherRemark, setTeacherRemark] = useState(initialTeacherRemark ?? "");
  const [headRemark, setHeadRemark]       = useState(initialHeadRemark ?? "");
  const [interest, setInterest]           = useState(initialInterest ?? "");
  const [conduct, setConduct]             = useState(initialConduct ?? "");
  const [attitude, setAttitude]           = useState(initialAttitude ?? "");
  const [attendance, setAttendance]       = useState(initialAttendance?.toString() ?? "");
  const [totalDays, setTotalDays]         = useState(initialTotalDays?.toString() ?? "");
  const [promoted, setPromoted]           = useState(initialPromoted ?? "");
  const [token, setToken]                 = useState(initialToken);
  const [loading, setLoading]             = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);

  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isHead  = role === "ACADEMIC_HEAD" || isAdmin;

  // Can edit when DRAFT
  const canEditMeta = isAdmin && status === "DRAFT";
  const canEditTeacher = isAdmin && status === "DRAFT";
  const canEditHead = isHead && (status === "SUBMITTED" || status === "APPROVED");

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function run<T>(
    key: string,
    fn: () => Promise<T>,
    onSuccess: (r: T) => void
  ) {
    setLoading(key);
    const result = await fn();
    setLoading(null);
    if ((result as { error?: string }).error) {
      toast.error((result as { error: string }).error);
    } else {
      onSuccess(result);
    }
  }

  async function handleSaveMeta() {
    await run("save-meta", () => saveReportMeta(reportId, {
      interest,
      conduct,
      attitude,
      attendance: attendance ? parseInt(attendance) : null,
      totalDays: totalDays ? parseInt(totalDays) : null,
      promoted,
    }), () => {
      toast.success("Report details saved");
      router.refresh();
    });
  }

  async function handleSaveTeacherRemark() {
    await run("save-teacher", () => saveTeacherRemark(reportId, teacherRemark), () => {
      toast.success("Teacher remark saved");
      router.refresh();
    });
  }

  async function handleSaveHeadRemark() {
    await run("save-head", () => saveHeadRemark(reportId, headRemark), () => {
      toast.success("Head remark saved");
      router.refresh();
    });
  }

  async function handleSubmit() {
    await run("submit", () => submitReport(reportId), () => {
      toast.success("Report submitted for review");
      router.refresh();
    });
  }

  async function handleApprove() {
    await run("approve", () => approveReport(reportId, headRemark), () => {
      toast.success("Report approved");
      router.refresh();
    });
  }

  async function handleReject() {
    if (!headRemark.trim()) {
      toast.error("Add a remark explaining why you are returning this report.");
      return;
    }
    await run("reject", () => rejectReport(reportId, headRemark), () => {
      toast.success("Report returned for revision");
      router.refresh();
    });
  }

  async function handlePublish() {
    await run("publish", () => publishReport(reportId), (result) => {
      const r = result as { token?: string };
      if (r.token) setToken(r.token);
      toast.success("Report published");
      router.refresh();
    });
  }

  async function copyLink() {
    if (!token) return;
    const url = `${window.location.origin}/parent/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  function openWhatsApp() {
    if (!token) return;
    const url = `${window.location.origin}/parent/${token}`;
    const msg = encodeURIComponent(
      `Hello! The terminal report for ${studentName} (${termLabel}) is ready. View it here: ${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  async function handleEmailParent() {
    await run("email", () => emailReportToParent(reportId), () => {
      toast.success(`Report emailed to parent`);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Report metadata (interest, conduct, attendance) ─────────────── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 border-b">
          <p className="text-sm font-semibold text-foreground">Report Details</p>
        </div>
        <div className="p-4 space-y-3">
          {canEditMeta ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Interest</label>
                  <input
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    placeholder="e.g. Football, Reading"
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Conduct</label>
                  <select
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select...</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Attitude to Work</label>
                  <select
                    value={attitude}
                    onChange={(e) => setAttitude(e.target.value)}
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select...</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Promoted To</label>
                  <input
                    value={promoted}
                    onChange={(e) => setPromoted(e.target.value)}
                    placeholder="e.g. Basic 3"
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Days Present</label>
                  <input
                    type="number"
                    min={0}
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Total Days</label>
                  <input
                    type="number"
                    min={0}
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSaveMeta}
                disabled={loading === "save-meta"}
              >
                {loading === "save-meta" ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : null}
                Save Details
              </Button>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Interest</span>
                <p className="font-medium">{interest || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Conduct</span>
                <p className="font-medium">{conduct || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Attitude</span>
                <p className="font-medium">{attitude || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Attendance</span>
                <p className="font-medium">
                  {attendance && totalDays ? `${attendance} / ${totalDays} days` : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Promoted To</span>
                <p className="font-medium">{promoted || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Teacher remark ─────────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 border-b">
          <p className="text-sm font-semibold text-foreground">Class Teacher Remark</p>
        </div>
        <div className="p-4">
          {canEditTeacher ? (
            <div className="space-y-2">
              <textarea
                value={teacherRemark}
                onChange={(e) => setTeacherRemark(e.target.value)}
                placeholder="Write a remark for this student..."
                rows={3}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-colors"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSaveTeacherRemark}
                disabled={loading === "save-teacher"}
              >
                {loading === "save-teacher" ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : null}
                Save Remark
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {teacherRemark || <span className="italic">No remark added</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── Head teacher remark ─────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 border-b">
          <p className="text-sm font-semibold text-foreground">Head Teacher Remark</p>
        </div>
        <div className="p-4">
          {canEditHead ? (
            <div className="space-y-2">
              <textarea
                value={headRemark}
                onChange={(e) => setHeadRemark(e.target.value)}
                placeholder="Write a head teacher remark..."
                rows={3}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-colors"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSaveHeadRemark}
                disabled={loading === "save-head"}
              >
                {loading === "save-head" ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : null}
                Save Remark
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {headRemark || <span className="italic">No remark added</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
        {/* Submit — admin/owner when DRAFT */}
        {isAdmin && status === "DRAFT" && (
          <Button size="sm" onClick={handleSubmit} disabled={!!loading}>
            {loading === "submit" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit for Review
          </Button>
        )}

        {/* Approve / Reject — head/admin when SUBMITTED */}
        {isHead && status === "SUBMITTED" && (
          <>
            <Button size="sm" onClick={handleApprove} disabled={!!loading}>
              {loading === "approve" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleReject}
              disabled={!!loading}
            >
              {loading === "reject" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Return for Revision
            </Button>
          </>
        )}

        {/* Publish — admin/owner when APPROVED */}
        {isAdmin && status === "APPROVED" && (
          <Button size="sm" onClick={handlePublish} disabled={!!loading}>
            {loading === "publish" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Globe className="w-4 h-4 mr-2" />
            )}
            Publish
          </Button>
        )}

        {/* PDF download — always visible */}
        <a href={`/api/reports/${reportId}/pdf`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </a>

        {/* Share link — when published */}
        {status === "PUBLISHED" && token && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground font-mono truncate max-w-52 select-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/parent/${token}`
                : `/parent/${token}`}
            </span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyLink}>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        )}

        {/* Publish to get token if PUBLISHED but no token yet */}
        {status === "PUBLISHED" && !token && isAdmin && (
          <Button size="sm" variant="outline" onClick={handlePublish} disabled={!!loading}>
            <Share2 className="w-4 h-4 mr-2" />
            Generate Share Link
          </Button>
        )}

        {/* WhatsApp + email share — when published + token exists */}
        {status === "PUBLISHED" && token && (
          <>
            <Button size="sm" variant="outline" onClick={openWhatsApp} className="text-green-700 border-green-300 hover:bg-green-50">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            {parentEmail && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmailParent}
                disabled={loading === "email"}
              >
                {loading === "email" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Email Parent
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
