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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "@/lib/actions/users";
import { PasswordInput } from "@/components/shared/PasswordInput";
import type { Role } from "@prisma/client";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "ACADEMIC_HEAD", label: "Academic Head" },
  { value: "TEACHER", label: "Teacher" },
];

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface UserDialogProps {
  existing?: StaffUser;
}

export function UserDialog({ existing }: UserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>(existing?.role ?? "TEACHER");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);

    const result = existing
      ? await updateUser(existing.id, fd)
      : await createUser(fd);

    setLoading(false);
    if (result.error) { toast.error(result.error); return; }

    toast.success(existing ? "User updated" : "User created");
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
          <><Plus className="w-4 h-4 mr-1" />Add Staff</>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Staff" : "New Staff Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={existing?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={existing?.email} required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => { if (v) setRole(v as Role); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {existing ? "New Password (leave blank to keep)" : "Password"}
            </Label>
            <PasswordInput
              id="password" name="password"
              placeholder={existing ? "Leave blank to keep current" : "Min. 6 characters"}
              required={!existing}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
