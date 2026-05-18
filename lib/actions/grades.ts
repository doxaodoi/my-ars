"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ClassType } from "@prisma/client";
import { calcBasicFromSubScores, calcKGFromSubScores, getGradeLabel } from "@/lib/grading";

type GradeRow = {
  studentId: string;
  subjectId: string;
  // Sub-scores entered by teacher
  test1?: number;      // /10 (Basic only)
  test2?: number;      // /10 (Basic only)
  midTerm?: number;    // /10 (Basic) or /30 (KG)
  assignment?: number; // /10 (Basic only)
  project?: number;    // /20 (Basic only)
  examRaw?: number;    // /100 (both)
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
        // Skip rows with no data entered
        const hasData = classType === "KG"
          ? (row.midTerm !== undefined || row.examRaw !== undefined)
          : (row.test1 !== undefined || row.test2 !== undefined ||
             row.midTerm !== undefined || row.assignment !== undefined ||
             row.project !== undefined || row.examRaw !== undefined);
        if (!hasData) return;

        if (classType === "KG") {
          const midTerm = row.midTerm ?? 0;
          const examRaw = row.examRaw ?? 0;
          const { classScore, examScore, total, grade, remark } =
            calcKGFromSubScores({ midTerm, examRaw });

          await db.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: row.studentId,
                subjectId: row.subjectId,
                termId,
              },
            },
            update: { midTerm, examRaw, classScore, examScore, total, grade, remark },
            create: {
              studentId: row.studentId,
              subjectId: row.subjectId,
              termId,
              midTerm, examRaw, classScore, examScore, total, grade, remark,
            },
          });
        } else {
          // Basic (PRIMARY)
          const test1 = row.test1 ?? 0;
          const test2 = row.test2 ?? 0;
          const midTerm = row.midTerm ?? 0;
          const assignment = row.assignment ?? 0;
          const project = row.project ?? 0;
          const examRaw = row.examRaw ?? 0;
          const { classScore, examScore, total, grade, remark } =
            calcBasicFromSubScores({ test1, test2, midTerm, assignment, project, examRaw });

          await db.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: row.studentId,
                subjectId: row.subjectId,
                termId,
              },
            },
            update: {
              test1, test2, midTerm, assignment, project, examRaw,
              classScore, examScore, total, grade, remark,
            },
            create: {
              studentId: row.studentId,
              subjectId: row.subjectId,
              termId,
              test1, test2, midTerm, assignment, project, examRaw,
              classScore, examScore, total, grade, remark,
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
