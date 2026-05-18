/**
 * One-time migration endpoint.
 * Rescales old Basic grade data from classScore/100 + examScore/100
 * to the new classScore/50 + examScore/50 format.
 *
 * KG grades are NOT affected (their /30 + /70 format is unchanged).
 *
 * POST /api/admin/migrate-grades?secret=YOUR_SETUP_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGradeLabel } from "@/lib/grading";

export async function POST(req: NextRequest) {
  // Require SETUP_SECRET (same as /api/setup)
  const setupSecret = process.env.SETUP_SECRET;
  if (setupSecret) {
    const provided = req.nextUrl.searchParams.get("secret");
    if (provided !== setupSecret) {
      return NextResponse.json({ error: "Invalid or missing secret" }, { status: 401 });
    }
  }

  // Find all Basic (PRIMARY) grades that have old-format data:
  // classScore is set but test1 is NULL (meaning it was saved pre-migration)
  const oldGrades = await db.grade.findMany({
    where: {
      test1: null,
      classScore: { not: null },
      subject: { class: { type: "PRIMARY" } },
    },
    include: { subject: { select: { class: { select: { type: true } } } } },
  });

  let migrated = 0;

  for (const g of oldGrades) {
    if (g.classScore === null || g.examScore === null) continue;

    // Old format: classScore was out of 100, examScore was out of 100
    // New format: classScore = (old/100)*50, examScore = (old/100)*50
    const newClassScore = (g.classScore / 100) * 50;
    const newExamScore = (g.examScore / 100) * 50;
    const newTotal = newClassScore + newExamScore;
    const { grade, remark } = getGradeLabel(newTotal);

    await db.grade.update({
      where: { id: g.id },
      data: {
        classScore: newClassScore,
        examScore: newExamScore,
        total: newTotal,
        grade,
        remark,
      },
    });
    migrated++;
  }

  return NextResponse.json({
    status: "done",
    migrated,
    message: `Rescaled ${migrated} Basic grade records from /100 to /50 format.`,
  });
}
