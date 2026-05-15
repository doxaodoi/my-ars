"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  classes: { id: string; name: string; type: string; count: number }[];
  activeClassId: string;
  termId: string;
  typeLabels: Record<string, string>;
}

export function ClassSelectClient({ classes, activeClassId, termId, typeLabels }: Props) {
  const router = useRouter();
  return (
    <Select
      value={activeClassId || "_none"}
      onValueChange={(v) => {
        if (!v || v === "_none") return;
        const params = new URLSearchParams();
        params.set("classId", v);
        if (termId) params.set("termId", termId);
        router.push(`/reports/generate?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Select class…" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} — {typeLabels[c.type]} ({c.count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
