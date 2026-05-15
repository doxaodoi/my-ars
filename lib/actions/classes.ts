"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ClassType } from "@prisma/client";
import { z } from "zod";

const ClassSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(ClassType),
  level: z.string().optional(),
});

export async function createClass(formData: FormData) {
  const parsed = ClassSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    level: formData.get("level") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.class.create({ data: parsed.data });
    revalidatePath("/classes");
    return { success: true };
  } catch {
    return { error: "Failed to create class" };
  }
}

export async function updateClass(id: string, formData: FormData) {
  const parsed = ClassSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    level: formData.get("level") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.class.update({ where: { id }, data: parsed.data });
    revalidatePath("/classes");
    return { success: true };
  } catch {
    return { error: "Failed to update class" };
  }
}

export async function deleteClass(id: string) {
  try {
    await db.class.delete({ where: { id } });
    revalidatePath("/classes");
    return { success: true };
  } catch {
    return { error: "Cannot delete class — it may have students or subjects attached." };
  }
}
