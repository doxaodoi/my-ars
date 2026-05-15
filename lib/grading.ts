export function getGradeLabel(total: number): { grade: string; remark: string } {
  if (total >= 90) return { grade: "A+", remark: "Distinction" };
  if (total >= 80) return { grade: "A", remark: "Excellent" };
  if (total >= 70) return { grade: "B", remark: "Very Good" };
  if (total >= 60) return { grade: "C", remark: "Good" };
  if (total >= 50) return { grade: "D", remark: "Credit" };
  if (total >= 40) return { grade: "E", remark: "Weak" };
  return { grade: "F", remark: "Fail" };
}

/** KG1 & KG2: midterm /30, exam /70, total = midterm + exam */
export function calcKGTotal(midterm: number, exam: number): number {
  return Math.min(30, midterm) + Math.min(70, exam);
}

/** Basic 1–6: CA = test1+test2+midterm+assignment+project (/60), exam /100
 *  Total = (CA/60)*50 + (exam/100)*50 */
export function calcBasicTotal(
  test1: number,
  test2: number,
  midterm: number,
  assignment: number,
  project: number,
  exam: number
): number {
  const ca = test1 + test2 + midterm + assignment + project;
  return (ca / 60) * 50 + (exam / 100) * 50;
}
