/**
 * One-time setup endpoint.
 * Hit GET /api/setup once after first deploy to seed the database.
 * Safe to call multiple times — does nothing if an owner already exists.
 *
 * Optionally protect with SETUP_SECRET env var:
 *   GET /api/setup?secret=your-secret
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { Role, ClassType } from "@prisma/client";

export async function GET(req: NextRequest) {
  // ── Optional secret guard ─────────────────────────────────────────────────
  const setupSecret = process.env.SETUP_SECRET;
  if (setupSecret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== setupSecret) {
      return NextResponse.json({ error: "Invalid or missing secret" }, { status: 401 });
    }
  }

  // ── Check if already seeded ───────────────────────────────────────────────
  const ownerCount = await db.user.count({ where: { role: Role.OWNER } });
  if (ownerCount > 0) {
    return NextResponse.json({
      status: "already_seeded",
      message: "Database is already initialised. Nothing was changed.",
    });
  }

  // ── Seed owner ────────────────────────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@abundantrain.edu.gh";
  const ownerPassword = process.env.OWNER_PASSWORD ?? "changeme123";

  const owner = await db.user.create({
    data: {
      name: "School Owner",
      email: ownerEmail,
      password: await hash(ownerPassword, 12),
      role: Role.OWNER,
    },
  });

  // ── Seed current term ─────────────────────────────────────────────────────
  await db.term.upsert({
    where: { id: "term-1-2025" },
    update: { isCurrent: true },
    create: { id: "term-1-2025", name: "Term 1", year: 2025, isCurrent: true },
  });

  // ── Seed classes ──────────────────────────────────────────────────────────
  const classData = [
    { id: "class-creche",    name: "Creche",    type: ClassType.CRECHE,   level: null },
    { id: "class-nursery-1", name: "Nursery 1", type: ClassType.NURSERY,  level: "1" },
    { id: "class-nursery-2", name: "Nursery 2", type: ClassType.NURSERY,  level: "2" },
    { id: "class-kg1",       name: "KG 1",      type: ClassType.KG,       level: "1" },
    { id: "class-kg2",       name: "KG 2",      type: ClassType.KG,       level: "2" },
    { id: "class-b1",        name: "Basic 1",   type: ClassType.PRIMARY,  level: "1" },
    { id: "class-b2",        name: "Basic 2",   type: ClassType.PRIMARY,  level: "2" },
    { id: "class-b3",        name: "Basic 3",   type: ClassType.PRIMARY,  level: "3" },
    { id: "class-b4",        name: "Basic 4",   type: ClassType.PRIMARY,  level: "4" },
    { id: "class-b5",        name: "Basic 5",   type: ClassType.PRIMARY,  level: "5" },
    { id: "class-b6",        name: "Basic 6",   type: ClassType.PRIMARY,  level: "6" },
  ];
  for (const c of classData) {
    await db.class.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // ── Seed KG subjects ──────────────────────────────────────────────────────
  const kgSubjects = [
    "English Language", "Mathematics", "Science", "Creative Arts", "Religious Studies",
  ];
  for (const classId of ["class-kg1", "class-kg2"]) {
    for (let i = 0; i < kgSubjects.length; i++) {
      await db.subject.upsert({
        where: { id: `${classId}-subj-${i}` },
        update: {},
        create: { id: `${classId}-subj-${i}`, name: kgSubjects[i], classId, order: i },
      });
    }
  }

  // ── Seed Basic 1-6 subjects ───────────────────────────────────────────────
  const basicSubjects = [
    "English Language", "Mathematics", "Science", "Social Studies",
    "Religious & Moral Education", "Creative Arts", "Ghanaian Language", "ICT",
  ];
  for (const cls of classData.filter((c) => c.type === ClassType.PRIMARY)) {
    for (let i = 0; i < basicSubjects.length; i++) {
      await db.subject.upsert({
        where: { id: `${cls.id}-subj-${i}` },
        update: {},
        create: { id: `${cls.id}-subj-${i}`, name: basicSubjects[i], classId: cls.id, order: i },
      });
    }
  }

  return NextResponse.json({
    status: "seeded",
    message: "Database initialised successfully.",
    login: {
      email: ownerEmail,
      password: ownerPassword,
      note: "Change this password immediately after first login via My Account → Change Password.",
    },
    created: {
      owner: owner.email,
      classes: classData.map((c) => c.name),
      term: "Term 1 2025",
    },
  });
}
