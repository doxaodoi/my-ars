"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTerm, setCurrentTerm } from "@/lib/actions/terms";

const TERM_NAMES = ["Term 1", "Term 2", "Term 3"];
const currentYear = new Date().getFullYear();

export function TermDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termName, setTermName] = useState("Term 1");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("name", termName);

    const result = await createTerm(fd);
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Term created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="w-4 h-4 mr-1" />New Term
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Term</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={termName} onValueChange={(v) => { if (v) setTermName(v); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TERM_NAMES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Academic Year</Label>
            <Input id="year" name="year" type="number" defaultValue={currentYear} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Term
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SetCurrentTermButton({ termId, isCurrent }: { termId: string; isCurrent: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const result = await setCurrentTerm(termId);
    setLoading(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Current term updated");
    router.refresh();
  }

  if (isCurrent) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Current
      </span>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      Set Current
    </Button>
  );
}
