"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.nativeEnum(Role),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const UpdateUserSchema = UserSchema.omit({ password: true }).extend({
  password: z.string().min(6).optional().or(z.literal("")),
});

// ── Role guard shared by all admin-only actions ───────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["OWNER", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" } as const;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = UserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const hashed = await hash(parsed.data.password, 12);
    await db.user.create({ data: { ...parsed.data, password: hashed } });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to create user. Email may already exist." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.password = await hash(password, 12);

  try {
    await db.user.update({ where: { id }, data });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to update user." };
  }
}

export async function deleteUser(id: string) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await db.user.delete({ where: { id } });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to delete user." };
  }
}

export async function assignTeacherToClass(userId: string, classId: string, isClassTeacher: boolean) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await db.classTeacher.upsert({
      where: { userId_classId: { userId, classId } },
      update: { isClassTeacher },
      create: { userId, classId, isClassTeacher },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to assign teacher." };
  }
}

export async function removeTeacherFromClass(userId: string, classId: string) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await db.classTeacher.delete({ where: { userId_classId: { userId, classId } } });
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to remove assignment." };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) return { error: "User not found" };

  const valid = await compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  if (newPassword.length < 6) return { error: "New password must be at least 6 characters" };

  const hashed = await hash(newPassword, 12);
  await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });
  return { success: true };
}
