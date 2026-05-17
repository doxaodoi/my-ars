import { PrismaClient, Role, ClassType } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Owner account
  const ownerPassword = await hash("admin123", 12);
  const owner = await db.user.upsert({
    where: { email: "owner@abundantrain.edu.gh" },
    update: {},
    create: {
      name: "School Owner",
      email: "owner@abundantrain.edu.gh",
      password: ownerPassword,
      role: Role.OWNER,
    },
  });
  console.log("✓ Owner:", owner.email);

  // Admin account
  const adminPassword = await hash("admin123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@abundantrain.edu.gh" },
    update: {},
    create: {
      name: "School Admin",
      email: "admin@abundantrain.edu.gh",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log("✓ Admin:", admin.email);

  // Academic Head
  const headPassword = await hash("admin123", 12);
  const head = await db.user.upsert({
    where: { email: "head@abundantrain.edu.gh" },
    update: {},
    create: {
      name: "Academic Head",
      email: "head@abundantrain.edu.gh",
      password: headPassword,
      role: Role.ACADEMIC_HEAD,
    },
  });
  console.log("✓ Academic Head:", head.email);

  // Teacher
  const teacherPassword = await hash("teacher123", 12);
  const teacher = await db.user.upsert({
    where: { email: "teacher@abundantrain.edu.gh" },
    update: {},
    create: {
      name: "Demo Teacher",
      email: "teacher@abundantrain.edu.gh",
      password: teacherPassword,
      role: Role.TEACHER,
    },
  });
  console.log("✓ Teacher:", teacher.email);

  // Current term
  const term = await db.term.upsert({
    where: { id: "term-1-2025" },
    update: { isCurrent: true, year: "2025/2026" },
    create: {
      id: "term-1-2025",
      name: "Term 1",
      year: "2025/2026",
      isCurrent: true,
    },
  });
  console.log("✓ Term:", term.name, term.year);

  // Classes
  const classData = [
    { id: "class-creche", name: "Creche", type: ClassType.CRECHE, level: null },
    { id: "class-nursery-1", name: "Nursery 1", type: ClassType.NURSERY, level: "1" },
    { id: "class-nursery-2", name: "Nursery 2", type: ClassType.NURSERY, level: "2" },
    { id: "class-kg1", name: "KG 1", type: ClassType.KG, level: "1" },
    { id: "class-kg2", name: "KG 2", type: ClassType.KG, level: "2" },
    { id: "class-b1", name: "Basic 1", type: ClassType.PRIMARY, level: "1" },
    { id: "class-b2", name: "Basic 2", type: ClassType.PRIMARY, level: "2" },
    { id: "class-b3", name: "Basic 3", type: ClassType.PRIMARY, level: "3" },
    { id: "class-b4", name: "Basic 4", type: ClassType.PRIMARY, level: "4" },
    { id: "class-b5", name: "Basic 5", type: ClassType.PRIMARY, level: "5" },
    { id: "class-b6", name: "Basic 6", type: ClassType.PRIMARY, level: "6" },
  ];

  for (const c of classData) {
    await db.class.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log("✓ Classes:", classData.map((c) => c.name).join(", "));

  // Subjects for KG classes
  const kgSubjects = ["English Language", "Mathematics", "Science", "Creative Arts", "Religious Studies"];
  for (const classId of ["class-kg1", "class-kg2"]) {
    for (let i = 0; i < kgSubjects.length; i++) {
      await db.subject.upsert({
        where: { id: `${classId}-subj-${i}` },
        update: {},
        create: { id: `${classId}-subj-${i}`, name: kgSubjects[i], classId, order: i },
      });
    }
  }

  // Subjects for Basic 1-6
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
  console.log("✓ Subjects seeded for KG and Basic classes");

  // Assign teacher to Basic 1
  await db.classTeacher.upsert({
    where: { userId_classId: { userId: teacher.id, classId: "class-b1" } },
    update: {},
    create: { userId: teacher.id, classId: "class-b1", isClassTeacher: true },
  });
  console.log("✓ Teacher assigned to Basic 1");

  console.log("\n✅ Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Owner:         owner@abundantrain.edu.gh  / admin123");
  console.log("  Admin:         admin@abundantrain.edu.gh  / admin123");
  console.log("  Academic Head: head@abundantrain.edu.gh   / admin123");
  console.log("  Teacher:       teacher@abundantrain.edu.gh / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
