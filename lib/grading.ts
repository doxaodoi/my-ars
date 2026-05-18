export function getGradeLabel(total: number): { grade: string; remark: string } {
  if (total >= 90) return { grade: "A+", remark: "Distinction" };
  if (total >= 80) return { grade: "A", remark: "Excellent" };
  if (total >= 70) return { grade: "B", remark: "Very Good" };
  if (total >= 60) return { grade: "C", remark: "Good" };
  if (total >= 50) return { grade: "D", remark: "Credit" };
  if (total >= 40) return { grade: "E", remark: "Weak" };
  return { grade: "F", remark: "Fail" };
}

// ─── Basic 1-6 ──────────────────────────────────────────────────────────────

/**
 * Basic 1-6: compute from 5 CA sub-scores + raw exam mark.
 *
 * CA: Test1/10 + Test2/10 + MidTerm/10 + Assignment/10 + Project/20 = /60
 * Class Score = (CA / 60) × 50
 * Exam Score  = (examRaw / 100) × 50
 * Total       = Class Score + Exam Score  (out of 100)
 */
export function calcBasicFromSubScores(scores: {
  test1: number;
  test2: number;
  midTerm: number;
  assignment: number;
  project: number;
  examRaw: number;
}) {
  const caTotal = Math.min(10, Math.max(0, scores.test1))
                + Math.min(10, Math.max(0, scores.test2))
                + Math.min(10, Math.max(0, scores.midTerm))
                + Math.min(10, Math.max(0, scores.assignment))
                + Math.min(20, Math.max(0, scores.project));
  const classScore = (caTotal / 60) * 50;
  const examScore = (Math.min(100, Math.max(0, scores.examRaw)) / 100) * 50;
  const total = classScore + examScore;
  const { grade, remark } = getGradeLabel(total);
  return { caTotal, classScore, examScore, total, grade, remark };
}

// ─── KG 1-2 ─────────────────────────────────────────────────────────────────

/**
 * KG 1-2: compute from midterm /30 + raw exam /100.
 *
 * Class Score = midTerm (already out of 30)
 * Exam Score  = (examRaw / 100) × 70
 * Total       = Class Score + Exam Score  (out of 100)
 */
export function calcKGFromSubScores(scores: {
  midTerm: number;
  examRaw: number;
}) {
  const classScore = Math.min(30, Math.max(0, scores.midTerm));
  const examScore = (Math.min(100, Math.max(0, scores.examRaw)) / 100) * 70;
  const total = classScore + examScore;
  const { grade, remark } = getGradeLabel(total);
  return { classScore, examScore, total, grade, remark };
}
