"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";

const TermSchema = z.object({
  name: z.string().min(1, "Term name is required"),
  year: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "Year must be in YYYY/YYYY format (e.g. 2025/2026)")
    .refine((v) => {
      const [a, b] = v.split("/").map(Number);
      return b === a + 1 && a >= 2020 && a <= 2100;
    }, "Second year must be one more than the first"),
  termEnds: z.string().optional(),
  nextTermBegins: z.string().optional(),
});

export async function createTerm(formData: FormData) {
  const parsed = TermSchema.safeParse({
    name: formData.get("name"),
    year: formData.get("year"),
    termEnds: formData.get("termEnds") || undefined,
    nextTermBegins: formData.get("nextTermBegins") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.term.create({
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        isCurrent: false,
        termEnds: parsed.data.termEnds ? new Date(parsed.data.termEnds) : null,
        nextTermBegins: parsed.data.nextTermBegins ? new Date(parsed.data.nextTermBegins) : null,
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to create term." };
  }
}

export async function updateTerm(id: string, formData: FormData) {
  const parsed = TermSchema.safeParse({
    name: formData.get("name"),
    year: formData.get("year"),
    termEnds: formData.get("termEnds") || undefined,
    nextTermBegins: formData.get("nextTermBegins") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.term.update({
      where: { id },
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        termEnds: parsed.data.termEnds ? new Date(parsed.data.termEnds) : null,
        nextTermBegins: parsed.data.nextTermBegins ? new Date(parsed.data.nextTermBegins) : null,
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to update term." };
  }
}

export async function setCurrentTerm(id: string) {
  try {
    await db.term.updateMany({ data: { isCurrent: false } });
    await db.term.update({ where: { id }, data: { isCurrent: true } });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to set current term." };
  }
}

export async function deleteTerm(id: string) {
  try {
    await db.term.delete({ where: { id } });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Cannot delete term — it may have grades or reports attached." };
  }
}
