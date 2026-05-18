"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseDateFlexible } from "@/lib/date-utils";

const StudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  classId: z.string().min(1, "Class is required"),
  admissionNo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional().or(z.literal("")),
  parentPhone: z.string().optional(),
});

export async function createStudent(formData: FormData) {
  const parsed = StudentSchema.safeParse({
    name: formData.get("name"),
    classId: formData.get("classId"),
    admissionNo: formData.get("admissionNo") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    parentName: formData.get("parentName") || undefined,
    parentEmail: formData.get("parentEmail") || undefined,
    parentPhone: formData.get("parentPhone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { dateOfBirth, parentEmail, ...rest } = parsed.data;
  try {
    await db.student.create({
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? parseDateFlexible(dateOfBirth) ?? undefined : undefined,
        parentEmail: parentEmail || undefined,
      },
    });
    revalidatePath("/students");
    return { success: true };
  } catch {
    return { error: "Failed to create student. Admission number may already exist." };
  }
}

export async function updateStudent(id: string, formData: FormData) {
  const parsed = StudentSchema.safeParse({
    name: formData.get("name"),
    classId: formData.get("classId"),
    admissionNo: formData.get("admissionNo") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    parentName: formData.get("parentName") || undefined,
    parentEmail: formData.get("parentEmail") || undefined,
    parentPhone: formData.get("parentPhone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { dateOfBirth, parentEmail, ...rest } = parsed.data;
  try {
    await db.student.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? parseDateFlexible(dateOfBirth) ?? null : null,
        parentEmail: parentEmail || null,
      },
    });
    revalidatePath("/students");
    return { success: true };
  } catch {
    return { error: "Failed to update student." };
  }
}

export async function deleteStudent(id: string) {
  try {
    await db.student.delete({ where: { id } });
    revalidatePath("/students");
    return { success: true };
  } catch {
    return { error: "Failed to delete student." };
  }
}

export async function importStudentsFromCSV(
  rows: Array<{
    name: string;
    className: string;
    admissionNo?: string;
    dateOfBirth?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
  }>
) {
  const classes = await db.class.findMany();
  const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c.id]));

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const classId = classMap.get(row.className.toLowerCase().trim());
    if (!classId) {
      errors.push(`"${row.name}": class "${row.className}" not found`);
      continue;
    }
    try {
      const dob = row.dateOfBirth ? parseDateFlexible(row.dateOfBirth) : undefined;
      await db.student.create({
        data: {
          name: row.name.trim(),
          classId,
          admissionNo: row.admissionNo?.trim() || undefined,
          dateOfBirth: dob ?? undefined,
          parentName: row.parentName?.trim() || undefined,
          parentEmail: row.parentEmail?.trim() || undefined,
          parentPhone: row.parentPhone?.trim() || undefined,
        },
      });
      created++;
    } catch {
      errors.push(`"${row.name}": duplicate admission number or other error`);
    }
  }

  revalidatePath("/students");
  return { created, errors };
}

// ─── Promotion Actions ──────────────────────────────────────────────────────

export async function getStudentsByClass(classId: string) {
  return db.student.findMany({
    where: { classId, graduated: false },
    select: { id: true, name: true, admissionNo: true },
    orderBy: { name: "asc" },
  });
}

export async function promoteStudents(studentIds: string[], targetClassId: string) {
  if (!studentIds.length) return { error: "No students selected." };
  if (!targetClassId) return { error: "Target class is required." };

  try {
    const targetClass = await db.class.findUnique({ where: { id: targetClassId } });
    if (!targetClass) return { error: "Target class not found." };

    const { count } = await db.student.updateMany({
      where: { id: { in: studentIds } },
      data: { classId: targetClassId },
    });
    revalidatePath("/students");
    revalidatePath("/admin");
    return { success: true, count };
  } catch {
    return { error: "Failed to promote students." };
  }
}

export async function graduateStudents(studentIds: string[]) {
  if (!studentIds.length) return { error: "No students selected." };

  try {
    const { count } = await db.student.updateMany({
      where: { id: { in: studentIds } },
      data: { graduated: true },
    });
    revalidatePath("/students");
    revalidatePath("/admin");
    return { success: true, count };
  } catch {
    return { error: "Failed to graduate students." };
  }
}
