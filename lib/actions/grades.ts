"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ClassType } from "@prisma/client";
import { calcKGTotal, calcBasicTotal, getGradeLabel } from "@/lib/grading";

type GradeRow = {
  studentId: string;
  subjectId: string;
  // KG
  midterm?: number;
  exam?: number;
  // Basic
  test1?: number;
  test2?: number;
  midtermScore?: number;
  assignment?: number;
  project?: number;
  basicExam?: number;
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
        let total: number;

        if (classType === "KG") {
          const midterm = row.midterm ?? 0;
          const exam = row.exam ?? 0;
          total = calcKGTotal(midterm, exam);

          const { grade, remark } = getGradeLabel(total);

          await db.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: row.studentId,
                subjectId: row.subjectId,
                termId,
              },
            },
            update: { midterm, exam, total, grade, remark },
            create: {
              studentId: row.studentId,
              subjectId: row.subjectId,
              termId,
              midterm,
              exam,
              total,
              grade,
              remark,
            },
          });
        } else {
          // Basic 1-6
          const test1 = row.test1 ?? 0;
          const test2 = row.test2 ?? 0;
          const midtermScore = row.midtermScore ?? 0;
          const assignment = row.assignment ?? 0;
          const project = row.project ?? 0;
          const basicExam = row.basicExam ?? 0;
          total = calcBasicTotal(test1, test2, midtermScore, assignment, project, basicExam);

          const { grade, remark } = getGradeLabel(total);

          await db.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: row.studentId,
                subjectId: row.subjectId,
                termId,
              },
            },
            update: { test1, test2, midtermScore, assignment, project, basicExam, total, grade, remark },
            create: {
              studentId: row.studentId,
              subjectId: row.subjectId,
              termId,
              test1,
              test2,
              midtermScore,
              assignment,
              project,
              basicExam,
              total,
              grade,
              remark,
            },
          });
        }
      })
    );

    revalidatePath(`/grades/${classId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to save grades. Please try again." };
  }
}
