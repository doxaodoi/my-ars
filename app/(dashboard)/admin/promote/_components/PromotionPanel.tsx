"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  GraduationCap,
  Loader2,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStudentsByClass,
  promoteStudents,
  graduateStudents,
} from "@/lib/actions/students";
import { getNextInPath } from "@/lib/promotion";

interface ClassInfo {
  id: string;
  name: string;
  type: string;
  level: string | null;
  studentCount: number;
}

interface StudentRow {
  id: string;
  name: string;
  admissionNo: string | null;
}

interface PromotionPanelProps {
  classes: ClassInfo[];
}

export function PromotionPanel({ classes }: PromotionPanelProps) {
  const router = useRouter();
  const [sourceClassId, setSourceClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sourceClass = classes.find((c) => c.id === sourceClassId);
  const nextStep = sourceClass
    ? getNextInPath(sourceClass.type, sourceClass.level)
    : null;
  const targetClass = nextStep
    ? classes.find((c) => c.type === nextStep.type && c.level === nextStep.level)
    : null;
  const isGraduation = sourceClass && !nextStep;

  // Load students when source class changes
  useEffect(() => {
    if (!sourceClassId) {
      setStudents([]);
      setSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    getStudentsByClass(sourceClassId).then((data) => {
      if (cancelled) return;
      setStudents(data);
      setSelectedIds(new Set(data.map((s) => s.id)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sourceClassId]);

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  async function handleConfirm() {
    const ids = Array.from(selectedIds);
    setPromoting(true);

    const result = isGraduation
      ? await graduateStudents(ids)
      : await promoteStudents(ids, targetClass!.id);

    setPromoting(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    const count = result.count ?? ids.length;
    toast.success(
      isGraduation
        ? `Graduated ${count} student${count !== 1 ? "s" : ""}`
        : `Promoted ${count} student${count !== 1 ? "s" : ""} to ${targetClass!.name}`
    );
    setConfirmOpen(false);
    setSourceClassId("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Source class selector */}
      <div className="max-w-sm space-y-2">
        <label className="text-sm font-medium text-foreground">
          Select class to promote from
        </label>
        <Select
          value={sourceClassId}
          onValueChange={(v) => { if (v) setSourceClassId(v); }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a class..." />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.studentCount} student{c.studentCount !== 1 ? "s" : ""})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Promotion info banner */}
      {sourceClass && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="px-2.5 py-1 rounded bg-primary/10 text-primary">
              {sourceClass.name}
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            {isGraduation ? (
              <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Graduated
              </span>
            ) : targetClass ? (
              <span className="px-2.5 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {targetClass.name}
              </span>
            ) : (
              <span className="text-destructive">Target class not found in system</span>
            )}
          </div>
        </div>
      )}

      {/* Student list */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading students...
        </div>
      )}

      {!loading && sourceClassId && students.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Users className="w-8 h-8" />
          <p className="text-sm">No active students in this class</p>
        </div>
      )}

      {!loading && students.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} of {students.length} selected
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedIds.size === students.length ? (
                <><Square className="w-3.5 h-3.5 mr-1.5" />Deselect All</>
              ) : (
                <><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Select All</>
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Admission #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => toggleStudent(s.id)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="accent-primary w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.admissionNo ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action button */}
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={selectedIds.size === 0 || (!isGraduation && !targetClass)}
            className="w-full sm:w-auto"
          >
            {isGraduation ? (
              <><GraduationCap className="w-4 h-4 mr-2" />Graduate {selectedIds.size} Student{selectedIds.size !== 1 ? "s" : ""}</>
            ) : (
              <><ArrowRight className="w-4 h-4 mr-2" />Promote {selectedIds.size} Student{selectedIds.size !== 1 ? "s" : ""}</>
            )}
          </Button>
        </>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isGraduation ? "Confirm Graduation" : "Confirm Promotion"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isGraduation ? (
              <>
                Are you sure you want to graduate <strong>{selectedIds.size}</strong>{" "}
                student{selectedIds.size !== 1 ? "s" : ""} from{" "}
                <strong>{sourceClass?.name}</strong>? They will be marked as
                graduated and removed from active student lists.
              </>
            ) : (
              <>
                Are you sure you want to promote <strong>{selectedIds.size}</strong>{" "}
                student{selectedIds.size !== 1 ? "s" : ""} from{" "}
                <strong>{sourceClass?.name}</strong> to{" "}
                <strong>{targetClass?.name}</strong>?
              </>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={promoting}>
              {promoting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isGraduation ? "Graduate" : "Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
