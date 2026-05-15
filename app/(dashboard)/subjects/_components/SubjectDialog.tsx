"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { createSubject, updateSubject } from "@/lib/actions/subjects";
import type { Subject } from "@prisma/client";

interface SubjectDialogProps {
  classId: string;
  existing?: Subject;
}

export function SubjectDialog({ classId, existing }: SubjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("classId", classId);

    const result = existing
      ? await updateSubject(existing.id, fd)
      : await createSubject(fd);

    setLoading(false);
    if (result.error) { toast.error(result.error); return; }

    toast.success(existing ? "Subject updated" : "Subject added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          existing
            ? <Button variant="ghost" size="icon" className="text-muted-foreground" />
            : <Button size="sm" />
        }
      >
        {existing ? (
          <Pencil className="w-4 h-4" />
        ) : (
          <><Plus className="w-4 h-4 mr-1" />Add Subject</>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Subject" : "New Subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name</Label>
            <Input
              id="name" name="name"
              defaultValue={existing?.name}
              placeholder="e.g. Mathematics"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order">
              Report Card Position
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                (1 = appears first, 2 = second, etc.)
              </span>
            </Label>
            <Input
              id="order" name="order" type="number"
              defaultValue={existing?.order ?? 0}
              min={0}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Add Subject"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
