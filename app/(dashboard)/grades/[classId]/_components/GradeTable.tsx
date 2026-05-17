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
import { calcKGTotal, calcBasicTotal, getGradeLabel } from "@/lib/grading";
import type { Class, Student, Subject, Term, Grade } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreKey = "classScore" | "examScore";
type CellKey = `${string}_${string}_${ScoreKey}`;

interface GradeTableProps {
  cls: Class;
  students: Student[];
  subjects: Subject[];
  term: Term;
  terms: Term[];
  existingGrades: Grade[];
}

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
      className={`w-full text-center text-sm rounded px-1 py-1 border bg-background
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[grade] ?? "bg-muted text-muted-foreground"}`}>
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
    initialCells[cellKey(g.studentId, g.subjectId, "classScore")] = g.classScore?.toString() ?? "";
    initialCells[cellKey(g.studentId, g.subjectId, "examScore")] = g.examScore?.toString() ?? "";
  }

  const [cells, setCells] = useState<Record<CellKey, string>>(initialCells);
  const [saving, setSaving] = useState(false);
  const [activeTerm, setActiveTerm] = useState(term.id);

  const setCell = useCallback((key: CellKey, value: string) => {
    setCells((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Compute total for a student + subject pair
  function computeTotal(studentId: string, subjectId: string): number | null {
    const cs = cells[cellKey(studentId, subjectId, "classScore")];
    const es = cells[cellKey(studentId, subjectId, "examScore")];
    const classScore = cs === "" || cs === undefined ? null : parseFloat(cs);
    const examScore = es === "" || es === undefined ? null : parseFloat(es);

    if (classScore === null && examScore === null) return null;

    if (isKG) {
      return calcKGTotal(classScore ?? 0, examScore ?? 0);
    } else {
      return calcBasicTotal(classScore ?? 0, examScore ?? 0);
    }
  }

  async function handleSave() {
    setSaving(true);

    const rows = students.flatMap((student) =>
      subjects.map((subject) => {
        const cs = cells[cellKey(student.id, subject.id, "classScore")];
        const es = cells[cellKey(student.id, subject.id, "examScore")];
        return {
          studentId: student.id,
          subjectId: subject.id,
          classScore: cs === "" || cs === undefined ? undefined : parseFloat(cs),
          examScore: es === "" || es === undefined ? undefined : parseFloat(es),
        };
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

  // Column definitions
  const cols: { key: ScoreKey; label: string; max: number }[] = isKG
    ? [
        { key: "classScore", label: "Class Score\n/30", max: 30 },
        { key: "examScore",  label: "Exam\n/70",        max: 70 },
      ]
    : [
        { key: "classScore", label: "Class Score\n/100", max: 100 },
        { key: "examScore",  label: "Exam\n/100",        max: 100 },
      ];

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
          ? "KG Scoring: Class Score (30%) + Exam (70%) = Total out of 100"
          : "Basic Scoring: Class Score (50%) + Exam (50%) = Total out of 100"}
      </p>

      {/* Grade tables — one per subject */}
      <div className="space-y-8">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{subject.name}</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-48">Student</th>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-20"
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-muted-foreground text-center w-16">Total</th>
                    <th className="px-2 py-2 font-medium text-muted-foreground text-center w-14">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const total = computeTotal(student.id, subject.id);
                    const gradeInfo = total !== null ? getGradeLabel(total) : null;

                    return (
                      <tr
                        key={student.id}
                        className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="px-3 py-1.5 font-medium text-foreground truncate max-w-48">
                          {student.name}
                        </td>
                        {cols.map((c) => (
                          <td key={c.key} className="px-1 py-1">
                            <ScoreCell
                              value={cells[cellKey(student.id, subject.id, c.key)] ?? ""}
                              max={c.max}
                              onChange={(v) => setCell(cellKey(student.id, subject.id, c.key), v)}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center font-semibold">
                          {total !== null ? total.toFixed(1) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {gradeInfo ? <GradeBadge grade={gradeInfo.grade} /> : "—"}
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
