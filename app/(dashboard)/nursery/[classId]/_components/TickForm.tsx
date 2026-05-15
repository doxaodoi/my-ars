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

type TickState = { ticked: boolean; remark: string };
type Ticks = Record<string, TickState>; // itemId → state

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
  const [ticks, setTicks] = useState<Ticks>({});
  const [saving, setSaving] = useState(false);

  // Re-initialise tick state whenever the selected student changes
  useEffect(() => {
    if (!selectedStudentId) {
      setTicks({});
      return;
    }
    const newTicks: Ticks = {};
    for (const a of existingAssessments) {
      if (a.studentId === selectedStudentId) {
        newTicks[a.itemId] = { ticked: a.ticked, remark: a.remark ?? "" };
      }
    }
    setTicks(newTicks);
  }, [selectedStudentId, existingAssessments]);

  function getTick(itemId: string): TickState {
    return ticks[itemId] ?? { ticked: false, remark: "" };
  }

  function setTick(itemId: string, patch: Partial<TickState>) {
    setTicks((prev) => ({
      ...prev,
      [itemId]: { ...getTick(itemId), ...patch },
    }));
  }

  const allItems = template.sections.flatMap((s) => s.items);
  const tickedCount = allItems.filter((item) => getTick(item.id).ticked).length;

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }

    setSaving(true);
    const rows = allItems.map((item) => {
      const tick = getTick(item.id);
      return {
        itemId: item.id,
        ticked: tick.ticked,
        remark: tick.remark.trim() || undefined,
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
        <h2 className="font-semibold text-foreground text-sm">Tick Assessments</h2>
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
                <SelectValue placeholder="Select student…" />
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
                <SelectValue />
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
              {tickedCount} / {allItems.length} ticked
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
                      const tick = getTick(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            id={`tick-${item.id}`}
                            checked={tick.ticked}
                            onChange={(e) =>
                              setTick(item.id, { ticked: e.target.checked })
                            }
                            className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                          />

                          {/* Label + optional remark */}
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`tick-${item.id}`}
                              className="text-sm text-foreground cursor-pointer select-none"
                            >
                              {item.name}
                            </label>
                            {/* Remark input — shown when item is ticked */}
                            {tick.ticked && (
                              <input
                                type="text"
                                placeholder="Add a remark… (optional)"
                                value={tick.remark}
                                onChange={(e) =>
                                  setTick(item.id, { remark: e.target.value })
                                }
                                className="mt-1.5 w-full max-w-sm text-xs rounded border border-border bg-background px-2 py-1 text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                              />
                            )}
                          </div>
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
