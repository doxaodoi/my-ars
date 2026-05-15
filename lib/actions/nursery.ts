"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";

// ── Template ──────────────────────────────────────────────────────────────────

export async function createTemplate(classId: string, name: string) {
  try {
    const template = await db.nurseryTemplate.create({
      data: { classId, name },
    });
    revalidatePath(`/nursery/${classId}`);
    return { success: true, id: template.id };
  } catch {
    return { error: "Failed to create template." };
  }
}

export async function deleteTemplate(id: string, classId: string) {
  try {
    await db.nurseryTemplate.delete({ where: { id } });
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete template." };
  }
}

// ── Sections ──────────────────────────────────────────────────────────────────

const SectionSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  order: z.coerce.number().default(0),
});

export async function createSection(templateId: string, classId: string, formData: FormData) {
  const parsed = SectionSchema.safeParse({
    name: formData.get("name"),
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.nurserySection.create({ data: { templateId, ...parsed.data } });
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch {
    return { error: "Failed to create section." };
  }
}

export async function deleteSection(id: string, classId: string) {
  try {
    await db.nurserySection.delete({ where: { id } });
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete section." };
  }
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function createItem(sectionId: string, classId: string, name: string, order: number) {
  try {
    await db.nurseryItem.create({ data: { sectionId, name, order } });
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch {
    return { error: "Failed to create item." };
  }
}

export async function deleteItem(id: string, classId: string) {
  try {
    await db.nurseryItem.delete({ where: { id } });
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch {
    return { error: "Failed to delete item." };
  }
}

// ── Assessments (tick/untick) ─────────────────────────────────────────────────

type TickRow = { itemId: string; ticked: boolean; remark?: string };

export async function saveAssessments(
  studentId: string,
  termId: string,
  classId: string,
  rows: TickRow[]
) {
  try {
    await Promise.all(
      rows.map((row) =>
        db.nurseryStudentAssessment.upsert({
          where: {
            studentId_itemId_termId: {
              studentId,
              itemId: row.itemId,
              termId,
            },
          },
          update: { ticked: row.ticked, remark: row.remark ?? null },
          create: {
            studentId,
            itemId: row.itemId,
            termId,
            ticked: row.ticked,
            remark: row.remark ?? null,
          },
        })
      )
    );
    revalidatePath(`/nursery/${classId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save assessments." };
  }
}
