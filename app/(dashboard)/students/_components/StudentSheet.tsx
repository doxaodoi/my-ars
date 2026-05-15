"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createStudent, updateStudent } from "@/lib/actions/students";
import type { Student, Class } from "@prisma/client";

interface StudentSheetProps {
  classes: Class[];
  existing?: Student;
}

export function StudentSheet({ classes, existing }: StudentSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState(existing?.classId ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("classId", classId);

    const result = existing
      ? await updateStudent(existing.id, fd)
      : await createStudent(fd);

    setLoading(false);
    if (result.error) { toast.error(result.error); return; }

    toast.success(existing ? "Student updated" : "Student added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          existing
            ? <Button variant="ghost" size="icon" className="text-muted-foreground" />
            : <Button />
        }
      >
        {existing ? (
          <Pencil className="w-4 h-4" />
        ) : (
          <><Plus className="w-4 h-4 mr-2" />Add Student</>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existing ? "Edit Student" : "New Student"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 px-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" name="name" defaultValue={existing?.name} required />
          </div>
          <div className="space-y-2">
            <Label>Class *</Label>
            <Select value={classId} onValueChange={(v) => { if (v) setClassId(v); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth" name="dateOfBirth" type="date"
              defaultValue={
                existing?.dateOfBirth
                  ? new Date(existing.dateOfBirth).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Parent / Guardian</p>
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent Name</Label>
              <Input id="parentName" name="parentName" defaultValue={existing?.parentName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone</Label>
              <Input id="parentPhone" name="parentPhone" type="tel" defaultValue={existing?.parentPhone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email</Label>
              <Input id="parentEmail" name="parentEmail" type="email" defaultValue={existing?.parentEmail ?? ""} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Add Student"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
