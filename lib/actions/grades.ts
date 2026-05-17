"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ClassType } from "@prisma/client";
import { calcKGTotal, calcBasicTotal, getGradeLabel } from "@/lib/grading";

type GradeRow = {
  studentId: string;
  subjectId: string;
  classScore?: number;
  examScore?: number;
};

export async function saveGrades(
  classId: string,
  termId: string,
  classType: ClassType,
  rows: GradeRow[]
) {
  try {
    await Promise.all(
      rows.map(async (row) => {
        const classScore = row.classScore ?? 0;
        const examScore = row.examScore ?? 0;

        // Skip rows where both scores are 0 (no data entered)
        const hasData = row.classScore !== undefined || row.examScore !== undefined;
        if (!hasData) return;

        let total: number;
        if (classType === "KG") {
          total = calcKGTotal(classScore, examScore);
        } else {
          total = calcBasicTotal(classScore, examScore);
        }

        const { grade, remark } = getGradeLabel(total);

        await db.grade.upsert({
          where: {
            studentId_subjectId_termId: {
              studentId: row.studentId,
              subjectId: row.subjectId,
              termId,
            },
          },
          update: { classScore, examScore, total, grade, remark },
          create: {
            studentId: row.studentId,
            subjectId: row.subjectId,
            termId,
            classScore,
            examScore,
            total,
            grade,
            remark,
          },
        });
      })
    );

    revalidatePath(`/grades/${classId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save grades. Please try again." };
  }
}
