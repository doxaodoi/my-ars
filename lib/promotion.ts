import type { ClassType } from "@prisma/client";

/**
 * Ordered promotion path for the school.
 * Creche -> Nursery 1 -> Nursery 2 -> KG 1 -> KG 2 -> Basic 1 ... Basic 6 -> GRADUATED
 */
export const PROMOTION_PATH: Array<{
  type: ClassType;
  level: string | null;
  label: string;
}> = [
  { type: "CRECHE",  level: null, label: "Creche" },
  { type: "NURSERY", level: "1",  label: "Nursery 1" },
  { type: "NURSERY", level: "2",  label: "Nursery 2" },
  { type: "KG",      level: "1",  label: "KG 1" },
  { type: "KG",      level: "2",  label: "KG 2" },
  { type: "PRIMARY", level: "1",  label: "Basic 1" },
  { type: "PRIMARY", level: "2",  label: "Basic 2" },
  { type: "PRIMARY", level: "3",  label: "Basic 3" },
  { type: "PRIMARY", level: "4",  label: "Basic 4" },
  { type: "PRIMARY", level: "5",  label: "Basic 5" },
  { type: "PRIMARY", level: "6",  label: "Basic 6" },
];

/** Returns the index of a class in the promotion path, or -1 if not found. */
export function getPromotionIndex(type: string, level: string | null): number {
  return PROMOTION_PATH.findIndex(
    (p) => p.type === type && p.level === (level ?? null)
  );
}

/**
 * Returns the next step in the promotion path, or null if the class is
 * at the end (Basic 6 -> graduated).
 */
export function getNextInPath(type: string, level: string | null) {
  const idx = getPromotionIndex(type, level);
  if (idx === -1 || idx === PROMOTION_PATH.length - 1) return null;
  return PROMOTION_PATH[idx + 1];
}
