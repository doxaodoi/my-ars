"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAssessments } from "@/lib/actions/nursery";
import type {
  NurseryItem,
  NurserySection,
  NurseryStudentAssessment,
  NurseryTemplate,
  Student,
  Term,
} from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionWithItems = NurserySection & { items: NurseryItem[] };
type TemplateWithSections = NurseryTemplate & { sections: SectionWithItems[] };

interface TickFormProps {
  template: TemplateWithSections;
  students: Student[];
  terms: Term[];
  activeTerm: Term;
  existingAssessments: NurseryStudentAssessment[];
  classId: string;
}

type GradeState = { grade: string | null; remark: string };
type Grades = Record<string, GradeState>; // itemId → state

const GRADE_OPTIONS = ["A", "B", "C", "D", "E", "F"] as const;

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-700 bg-emerald-50",
  B: "text-green-700 bg-green-50",
  C: "text-blue-700 bg-blue-50",
  D: "text-yellow-700 bg-yellow-50",
  E: "text-orange-700 bg-orange-50",
  F: "text-red-700 bg-red-50",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TickForm({
  template,
  students,
  terms,
  activeTerm,
  existingAssessments,
  classId,
}: TickFormProps) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [grades, setGrades] = useState<Grades>({});
  const [saving, setSaving] = useState(false);

  // Re-initialise state whenever the selected student changes
  useEffect(() => {
    if (!selectedStudentId) {
      setGrades({});
      return;
    }
    const newGrades: Grades = {};
    for (const a of existingAssessments) {
      if (a.studentId === selectedStudentId) {
        newGrades[a.itemId] = { grade: a.grade ?? null, remark: a.remark ?? "" };
      }
    }
    setGrades(newGrades);
  }, [selectedStudentId, existingAssessments]);

  function getGrade(itemId: string): GradeState {
    return grades[itemId] ?? { grade: null, remark: "" };
  }

  function setGrade(itemId: string, patch: Partial<GradeState>) {
    setGrades((prev) => ({
      ...prev,
      [itemId]: { ...getGrade(itemId), ...patch },
    }));
  }

  const allItems = template.sections.flatMap((s) => s.items);
  const gradedCount = allItems.filter((item) => getGrade(item.id).grade !== null).length;

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }

    setSaving(true);
    const rows = allItems.map((item) => {
      const g = getGrade(item.id);
      return {
        itemId: item.id,
        grade: g.grade,
        remark: g.remark.trim() || undefined,
      };
    });

    const result = await saveAssessments(
      selectedStudentId,
      activeTerm.id,
      classId,
      rows
    );
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Assessments saved");
      router.refresh();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground text-sm">Grade Assessments</h2>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Student selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Student:</span>
            <Select
              value={selectedStudentId}
              onValueChange={(v) => { if (v) setSelectedStudentId(v); }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select student...">
                  {selectedStudentId
                    ? students.find((s) => s.id === selectedStudentId)?.name ?? "Select student..."
                    : "Select student..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Term selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Term:</span>
            <Select
              value={activeTerm.id}
              onValueChange={(v) => {
                if (v) router.push(`/nursery/${classId}?termId=${v}`);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select term...">
                  {`${activeTerm.name} ${activeTerm.year}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.year}
                    {t.isCurrent ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress badge + save */}
        <div className="flex items-center gap-3">
          {selectedStudentId && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {gradedCount} / {allItems.length} graded
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !selectedStudentId}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Body */}
      {!selectedStudentId ? (
        <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
          Select a student above to view and fill in their assessment
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {template.sections.map((section) => (
              <div key={section.id} className="border rounded-lg overflow-hidden">
                {/* Section header */}
                <div className="bg-muted/40 px-4 py-2.5 border-b">
                  <h3 className="text-sm font-semibold text-foreground">
                    {section.name}
                  </h3>
                </div>

                {/* Items */}
                <div className="divide-y">
                  {section.items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground italic">
                      No items in this section yet.
                    </p>
                  ) : (
                    section.items.map((item) => {
                      const g = getGrade(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
                        >
                          {/* Item name */}
                          <span className="flex-1 text-sm text-foreground min-w-0">
                            {item.name}
                          </span>

                          {/* Grade buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {GRADE_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setGrade(item.id, {
                                  grade: g.grade === opt ? null : opt,
                                })}
                                className={`w-7 h-7 rounded text-xs font-bold border transition-all
                                  ${g.grade === opt
                                    ? `${GRADE_COLORS[opt]} border-current ring-1 ring-current/20`
                                    : "text-muted-foreground border-border hover:border-foreground/30"
                                  }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>

                          {/* Remark input */}
                          <input
                            type="text"
                            placeholder="Remark..."
                            value={g.remark}
                            onChange={(e) => setGrade(item.id, { remark: e.target.value })}
                            className="w-32 sm:w-40 text-xs rounded border border-border bg-background px-2 py-1 text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors shrink-0"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Assessments
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
