"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";

const SubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  classId: z.string().min(1, "Class is required"),
  order: z.coerce.number().default(0),
});

export async function createSubject(formData: FormData) {
  const parsed = SubjectSchema.safeParse({
    name: formData.get("name"),
    classId: formData.get("classId"),
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.subject.create({ data: parsed.data });
    revalidatePath("/subjects");
    return { success: true };
  } catch {
    return { error: "Failed to create subject." };
  }
}

export async function updateSubject(id: string, formData: FormData) {
  const parsed = SubjectSchema.safeParse({
    name: formData.get("name"),
    classId: formData.get("classId"),
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.subject.update({ where: { id }, data: parsed.data });
    revalidatePath("/subjects");
    return { success: true };
  } catch {
    return { error: "Failed to update subject." };
  }
}

export async function deleteSubject(id: string) {
  try {
    await db.subject.delete({ where: { id } });
    revalidatePath("/subjects");
    return { success: true };
  } catch {
    return { error: "Cannot delete subject — it may have grades attached." };
  }
}
