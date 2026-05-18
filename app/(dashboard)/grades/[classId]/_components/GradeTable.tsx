"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { saveGrades } from "@/lib/actions/grades";
import { calcBasicFromSubScores, calcKGFromSubScores, getGradeLabel } from "@/lib/grading";
import type { Class, Student, Subject, Term, Grade } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreKey = "test1" | "test2" | "midTerm" | "assignment" | "project" | "examRaw";
type CellKey = `${string}_${string}_${ScoreKey}`;

interface GradeTableProps {
  cls: Class;
  students: Student[];
  subjects: Subject[];
  term: Term;
  terms: Term[];
  existingGrades: Grade[];
}

type ColDef =
  | { type: "input"; key: ScoreKey; label: string; max: number }
  | { type: "computed"; label: string; compute: (studentId: string, subjectId: string) => string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cellKey(studentId: string, subjectId: string, field: ScoreKey): CellKey {
  return `${studentId}_${subjectId}_${field}`;
}

// ─── Score cell ───────────────────────────────────────────────────────────────

function ScoreCell({
  value,
  max,
  onChange,
}: {
  value: string;
  max: number;
  onChange: (v: string) => void;
}) {
  const num = parseFloat(value);
  const invalid = value !== "" && (isNaN(num) || num < 0 || num > max);

  return (
    <input
      type="number"
      min={0}
      max={max}
      step="0.5"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      className={`w-full text-center text-xs rounded px-0.5 py-1 border bg-background
        focus:outline-none focus:ring-1 focus:ring-primary transition-colors
        ${invalid ? "border-destructive text-destructive" : "border-transparent hover:border-border"}`}
    />
  );
}

// ─── Grade badge ─────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800",
  "A":  "bg-green-100 text-green-800",
  "B":  "bg-blue-100 text-blue-800",
  "C":  "bg-yellow-100 text-yellow-800",
  "D":  "bg-orange-100 text-orange-800",
  "E":  "bg-red-100 text-red-800",
  "F":  "bg-red-200 text-red-900",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${GRADE_COLORS[grade] ?? "bg-muted text-muted-foreground"}`}>
      {grade}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GradeTable({
  cls,
  students,
  subjects,
  term,
  terms,
  existingGrades,
}: GradeTableProps) {
  const router = useRouter();
  const isKG = cls.type === "KG";

  // Build initial cell values from existing grades
  const initialCells: Record<CellKey, string> = {};
  for (const g of existingGrades) {
    if (isKG) {
      initialCells[cellKey(g.studentId, g.subjectId, "midTerm")] = g.midTerm?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "examRaw")] = g.examRaw?.toString() ?? "";
    } else {
      initialCells[cellKey(g.studentId, g.subjectId, "test1")] = g.test1?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "test2")] = g.test2?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "midTerm")] = g.midTerm?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "assignment")] = g.assignment?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "project")] = g.project?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "examRaw")] = g.examRaw?.toString() ?? "";
    }
  }

  const [cells, setCells] = useState<Record<CellKey, string>>(initialCells);
  const [saving, setSaving] = useState(false);
  const [activeTerm, setActiveTerm] = useState(term.id);

  const setCell = useCallback((key: CellKey, value: string) => {
    setCells((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Helper to read a cell as a number (or null)
  const cellNum = useCallback((studentId: string, subjectId: string, key: ScoreKey): number | null => {
    const v = cells[cellKey(studentId, subjectId, key)];
    if (v === "" || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }, [cells]);

  // Compute values for a student + subject pair
  function computeBasic(studentId: string, subjectId: string) {
    const t1 = cellNum(studentId, subjectId, "test1");
    const t2 = cellNum(studentId, subjectId, "test2");
    const mt = cellNum(studentId, subjectId, "midTerm");
    const as = cellNum(studentId, subjectId, "assignment");
    const pr = cellNum(studentId, subjectId, "project");
    const ex = cellNum(studentId, subjectId, "examRaw");
    const anyData = [t1, t2, mt, as, pr, ex].some((v) => v !== null);
    if (!anyData) return null;
    return calcBasicFromSubScores({
      test1: t1 ?? 0, test2: t2 ?? 0, midTerm: mt ?? 0,
      assignment: as ?? 0, project: pr ?? 0, examRaw: ex ?? 0,
    });
  }

  function computeKG(studentId: string, subjectId: string) {
    const mt = cellNum(studentId, subjectId, "midTerm");
    const ex = cellNum(studentId, subjectId, "examRaw");
    const anyData = mt !== null || ex !== null;
    if (!anyData) return null;
    return calcKGFromSubScores({ midTerm: mt ?? 0, examRaw: ex ?? 0 });
  }

  // Column definitions
  const cols: ColDef[] = isKG
    ? [
        { type: "input", key: "midTerm", label: "MT\n/30", max: 30 },
        { type: "computed", label: "CS\n/30", compute: (sid, subId) => {
          const r = computeKG(sid, subId);
          return r ? r.classScore.toFixed(1) : "—";
        }},
        { type: "input", key: "examRaw", label: "Exam\n/100", max: 100 },
        { type: "computed", label: "ES\n/70", compute: (sid, subId) => {
          const r = computeKG(sid, subId);
          return r ? r.examScore.toFixed(1) : "—";
        }},
        { type: "computed", label: "Total\n/100", compute: (sid, subId) => {
          const r = computeKG(sid, subId);
          return r ? r.total.toFixed(1) : "—";
        }},
      ]
    : [
        { type: "input", key: "test1",      label: "T1\n/10",   max: 10 },
        { type: "input", key: "test2",      label: "T2\n/10",   max: 10 },
        { type: "input", key: "midTerm",    label: "MT\n/10",   max: 10 },
        { type: "input", key: "assignment", label: "Asgn\n/10", max: 10 },
        { type: "input", key: "project",    label: "Proj\n/20", max: 20 },
        { type: "computed", label: "CA\n/60", compute: (sid, subId) => {
          const r = computeBasic(sid, subId);
          return r ? r.caTotal.toFixed(1) : "—";
        }},
        { type: "computed", label: "CS\n/50", compute: (sid, subId) => {
          const r = computeBasic(sid, subId);
          return r ? r.classScore.toFixed(1) : "—";
        }},
        { type: "input", key: "examRaw", label: "Exam\n/100", max: 100 },
        { type: "computed", label: "ES\n/50", compute: (sid, subId) => {
          const r = computeBasic(sid, subId);
          return r ? r.examScore.toFixed(1) : "—";
        }},
        { type: "computed", label: "Total\n/100", compute: (sid, subId) => {
          const r = computeBasic(sid, subId);
          return r ? r.total.toFixed(1) : "—";
        }},
      ];

  // Grade column is always last (separate from cols for cleaner rendering)
  function getGrade(studentId: string, subjectId: string): string | null {
    const result = isKG ? computeKG(studentId, subjectId) : computeBasic(studentId, subjectId);
    return result?.grade ?? null;
  }

  async function handleSave() {
    setSaving(true);

    const rows = students.flatMap((student) =>
      subjects.map((subject) => {
        if (isKG) {
          const mt = cellNum(student.id, subject.id, "midTerm");
          const ex = cellNum(student.id, subject.id, "examRaw");
          return {
            studentId: student.id,
            subjectId: subject.id,
            midTerm: mt ?? undefined,
            examRaw: ex ?? undefined,
          };
        } else {
          return {
            studentId: student.id,
            subjectId: subject.id,
            test1: cellNum(student.id, subject.id, "test1") ?? undefined,
            test2: cellNum(student.id, subject.id, "test2") ?? undefined,
            midTerm: cellNum(student.id, subject.id, "midTerm") ?? undefined,
            assignment: cellNum(student.id, subject.id, "assignment") ?? undefined,
            project: cellNum(student.id, subject.id, "project") ?? undefined,
            examRaw: cellNum(student.id, subject.id, "examRaw") ?? undefined,
          };
        }
      })
    );

    const result = await saveGrades(cls.id, activeTerm, cls.type, rows);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Grades saved successfully");
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No students in this class yet. Add students first.
      </p>
    );
  }

  if (subjects.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No subjects set up for this class yet. Add subjects first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Term selector + Save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Term:</span>
          <Select
            value={activeTerm}
            onValueChange={(v) => {
              if (v) {
                setActiveTerm(v);
                router.push(`/grades/${cls.id}?termId=${v}`);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select term...">
                {(() => {
                  const t = terms.find((t) => t.id === activeTerm);
                  return t ? `${t.name} ${t.year}` : "Select term...";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.year}{t.isCurrent ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            : <><Save className="w-4 h-4 mr-2" />Save Grades</>
          }
        </Button>
      </div>

      {/* Scoring info */}
      <p className="text-xs text-muted-foreground">
        {isKG
          ? "KG: Mid-Term /30 + Exam /100 scaled to 70% = Total /100"
          : "Basic: T1/10 + T2/10 + MT/10 + Asgn/10 + Proj/20 = CA/60 → CS/50 · Exam/100 → ES/50 · Total/100"}
      </p>

      {/* Grade tables — one per subject */}
      <div className="space-y-8">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{subject.name}</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground w-36 sticky left-0 bg-muted/40 z-10">
                      Student
                    </th>
                    {cols.map((c, i) => (
                      <th
                        key={i}
                        className={`px-1 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-12
                          ${c.type === "computed" ? "bg-muted/60" : ""}`}
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="px-1 py-2 font-medium text-muted-foreground text-center w-12">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const grade = getGrade(student.id, subject.id);

                    return (
                      <tr
                        key={student.id}
                        className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="px-2 py-1 font-medium text-foreground truncate max-w-36 sticky left-0 z-10"
                            style={{ backgroundColor: "inherit" }}>
                          {student.name}
                        </td>
                        {cols.map((c, i) => (
                          <td key={i} className={`px-0.5 py-0.5 ${c.type === "computed" ? "bg-muted/30" : ""}`}>
                            {c.type === "input" ? (
                              <ScoreCell
                                value={cells[cellKey(student.id, subject.id, c.key)] ?? ""}
                                max={c.max}
                                onChange={(v) => setCell(cellKey(student.id, subject.id, c.key), v)}
                              />
                            ) : (
                              <span className="block text-center text-xs font-medium text-muted-foreground">
                                {c.compute(student.id, subject.id)}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-1 py-1 text-center">
                          {grade ? <GradeBadge grade={grade} /> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            : <><Save className="w-4 h-4 mr-2" />Save Grades</>
          }
        </Button>
      </div>
    </div>
  );
}
