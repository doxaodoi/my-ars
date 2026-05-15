"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClass, updateClass } from "@/lib/actions/classes";
import type { Class, ClassType } from "@prisma/client";

const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: "CRECHE", label: "Creche" },
  { value: "NURSERY", label: "Nursery" },
  { value: "KG", label: "KG" },
  { value: "PRIMARY", label: "Basic (Primary)" },
];

interface ClassDialogProps {
  existing?: Class;
}

export function ClassDialog({ existing }: ClassDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ClassType>(existing?.type ?? "PRIMARY");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);

    const result = existing
      ? await updateClass(existing.id, fd)
      : await createClass(fd);

    setLoading(false);
    if (result.error) { toast.error(result.error); return; }

    toast.success(existing ? "Class updated" : "Class created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          existing
            ? <Button variant="ghost" size="icon" className="text-muted-foreground" />
            : <Button />
        }
      >
        {existing ? (
          <Pencil className="w-4 h-4" />
        ) : (
          <><Plus className="w-4 h-4 mr-2" />Add Class</>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Class" : "New Class"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name" name="name"
              defaultValue={existing?.name}
              placeholder="e.g. Basic 1, KG 2, Nursery 1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Class Type</Label>
            <Select value={type} onValueChange={(v) => { if (v) setType(v as ClassType); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Create Class"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
