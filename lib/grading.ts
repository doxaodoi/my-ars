export function getGradeLabel(total: number): { grade: string; remark: string } {
  if (total >= 90) return { grade: "A+", remark: "Distinction" };
  if (total >= 80) return { grade: "A", remark: "Excellent" };
  if (total >= 70) return { grade: "B", remark: "Very Good" };
  if (total >= 60) return { grade: "C", remark: "Good" };
  if (total >= 50) return { grade: "D", remark: "Credit" };
  if (total >= 40) return { grade: "E", remark: "Weak" };
  return { grade: "F", remark: "Fail" };
}

/** KG1 & KG2: classScore /30, examScore /70, total = classScore + examScore */
export function calcKGTotal(classScore: number, examScore: number): number {
  return Math.min(30, Math.max(0, classScore)) + Math.min(70, Math.max(0, examScore));
}

/** Basic 1-6: classScore /100 weighted 50% + examScore /100 weighted 50% */
export function calcBasicTotal(classScore: number, examScore: number): number {
  const cs = Math.min(100, Math.max(0, classScore));
  const es = Math.min(100, Math.max(0, examScore));
  return (cs / 100) * 50 + (es / 100) * 50;
}
