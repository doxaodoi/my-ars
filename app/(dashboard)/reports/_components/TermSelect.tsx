"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Term } from "@prisma/client";

interface Props {
  terms: Term[];
  activeTermId: string;
  /** Base path to redirect to, e.g. "/reports" or "/reports/generate?classId=xxx" */
  basePath: string;
}

export function TermSelect({ terms, activeTermId, basePath }: Props) {
  const router = useRouter();
  return (
    <Select
      value={activeTermId}
      onValueChange={(v) => {
        if (!v) return;
        const sep = basePath.includes("?") ? "&" : "?";
        router.push(`${basePath}${sep}termId=${v}`);
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {terms.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name} {t.year}
            {t.isCurrent ? " (current)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
