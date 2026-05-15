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

type ScoreKey =
  | "midterm" | "exam"
  | "test1" | "test2" | "midtermScore" | "assignment" | "project" | "basicExam";

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

function getMax(field: ScoreKey, classType: string): number {
  if (classType === "KG") {
    return field === "midterm" ? 30 : 70;
  }
  const map: Record<string, number> = {
    test1: 10, test2: 10, midtermScore: 10,
    assignment: 10, project: 20, basicExam: 100,
  };
  return map[field] ?? 100;
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
    if (isKG) {
      initialCells[cellKey(g.studentId, g.subjectId, "midterm")] = g.midterm?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "exam")] = g.exam?.toString() ?? "";
    } else {
      initialCells[cellKey(g.studentId, g.subjectId, "test1")] = g.test1?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "test2")] = g.test2?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "midtermScore")] = g.midtermScore?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "assignment")] = g.assignment?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "project")] = g.project?.toString() ?? "";
      initialCells[cellKey(g.studentId, g.subjectId, "basicExam")] = g.basicExam?.toString() ?? "";
    }
  }

  const [cells, setCells] = useState<Record<CellKey, string>>(initialCells);
  const [saving, setSaving] = useState(false);
  const [activeTerm, setActiveTerm] = useState(term.id);

  const setCell = useCallback((key: CellKey, value: string) => {
    setCells((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Compute total for a student + subject pair
  function computeTotal(studentId: string, subjectId: string): number | null {
    const g = (f: ScoreKey) => {
      const v = cells[cellKey(studentId, subjectId, f)];
      return v === "" || v === undefined ? null : parseFloat(v);
    };

    if (isKG) {
      const m = g("midterm"), e = g("exam");
      if (m === null && e === null) return null;
      return calcKGTotal(m ?? 0, e ?? 0);
    } else {
      const vals = [g("test1"), g("test2"), g("midtermScore"), g("assignment"), g("project"), g("basicExam")];
      if (vals.every((v) => v === null)) return null;
      return calcBasicTotal(
        vals[0] ?? 0, vals[1] ?? 0, vals[2] ?? 0,
        vals[3] ?? 0, vals[4] ?? 0, vals[5] ?? 0,
      );
    }
  }

  async function handleSave() {
    setSaving(true);

    const rows = students.flatMap((student) =>
      subjects.map((subject) => {
        const g = (f: ScoreKey) => {
          const v = cells[cellKey(student.id, subject.id, f)];
          return v === "" || v === undefined ? undefined : parseFloat(v);
        };

        if (isKG) {
          return {
            studentId: student.id,
            subjectId: subject.id,
            midterm: g("midterm"),
            exam: g("exam"),
          };
        } else {
          return {
            studentId: student.id,
            subjectId: subject.id,
            test1: g("test1"),
            test2: g("test2"),
            midtermScore: g("midtermScore"),
            assignment: g("assignment"),
            project: g("project"),
            basicExam: g("basicExam"),
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

  // KG columns: Midterm /30 | Exam /70 | Total | Grade
  // Basic columns: T1/10 | T2/10 | Mid/10 | Asgn/10 | Proj/20 | Exam/100 | Total | Grade
  const kgCols: { key: ScoreKey; label: string; max: number }[] = [
    { key: "midterm",     label: "Midterm\n/30",    max: 30 },
    { key: "exam",        label: "Exam\n/70",       max: 70 },
  ];
  const basicCols: { key: ScoreKey; label: string; max: number }[] = [
    { key: "test1",       label: "Test 1\n/10",     max: 10 },
    { key: "test2",       label: "Test 2\n/10",     max: 10 },
    { key: "midtermScore",label: "Midterm\n/10",    max: 10 },
    { key: "assignment",  label: "Assign.\n/10",    max: 10 },
    { key: "project",     label: "Project\n/20",    max: 20 },
    { key: "basicExam",   label: "Exam\n/100",      max: 100 },
  ];
  const cols = isKG ? kgCols : basicCols;

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
              <SelectValue />
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
                        className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-pre-line leading-tight min-w-16"
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
