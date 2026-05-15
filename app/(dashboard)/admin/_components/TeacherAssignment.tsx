"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { assignTeacherToClass, removeTeacherFromClass } from "@/lib/actions/users";
import type { Class, ClassTeacher } from "@prisma/client";

type Assignment = ClassTeacher & { class: Class };
type Teacher = { id: string; name: string; email: string };

interface TeacherAssignmentProps {
  teachers: Teacher[];
  classes: Class[];
  assignments: Assignment[];
}

export function TeacherAssignment({ teachers, classes, assignments }: TeacherAssignmentProps) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    if (!teacherId || !classId) { toast.error("Select a teacher and class"); return; }
    setLoading(true);
    const result = await assignTeacherToClass(teacherId, classId, false);
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Teacher assigned");
    setTeacherId(""); setClassId("");
    router.refresh();
  }

  async function handleRemove(userId: string, clsId: string) {
    const result = await removeTeacherFromClass(userId, clsId);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Assignment removed");
    router.refresh();
  }

  const byTeacher = teachers.map((t) => ({
    ...t,
    classes: assignments.filter((a) => a.userId === t.id),
  }));

  return (
    <div className="space-y-4">
      {/* Assign form */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/40 rounded-lg">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Teacher</p>
          <Select value={teacherId} onValueChange={(v) => { if (v) setTeacherId(v); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select teacher" /></SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Class</p>
          <Select value={classId} onValueChange={(v) => { if (v) setClassId(v); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAssign} disabled={loading}>Assign</Button>
      </div>

      {/* Assignment list */}
      <div className="space-y-3">
        {byTeacher.filter((t) => t.classes.length > 0).map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-accent-foreground">
                {t.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {t.classes.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
                  >
                    {a.class.name}
                    <button
                      onClick={() => handleRemove(t.id, a.classId)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {byTeacher.every((t) => t.classes.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">No assignments yet</p>
        )}
      </div>
    </div>
  );
}
