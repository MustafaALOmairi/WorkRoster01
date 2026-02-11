export type ShiftType = "morning" | "evening" | "night" | "rest";

export interface ShiftDefinition {
  type: ShiftType;
  label: string;
  labelAr: string;
  startTime: string;
  endTime: string;
}

export interface RotationPattern {
  id: string;
  name: string;
  nameAr: string;
  shifts: ShiftType[];
}

export const SHIFT_DEFINITIONS: Record<ShiftType, ShiftDefinition> = {
  morning: {
    type: "morning",
    label: "Morning",
    labelAr: "صباحي",
    startTime: "06:00",
    endTime: "14:00",
  },
  evening: {
    type: "evening",
    label: "Evening",
    labelAr: "مسائي",
    startTime: "14:00",
    endTime: "22:00",
  },
  night: {
    type: "night",
    label: "Night",
    labelAr: "ليلي",
    startTime: "22:00",
    endTime: "06:00",
  },
  rest: {
    type: "rest",
    label: "Rest",
    labelAr: "راحة",
    startTime: "",
    endTime: "",
  },
};

export const PRESET_PATTERNS: RotationPattern[] = [
  {
    id: "2x2",
    name: "2×2",
    nameAr: "2×2",
    shifts: ["morning", "morning", "rest", "rest"],
  },
  {
    id: "2x2_me",
    name: "2×2 (M+E)",
    nameAr: "2×2 (صباحي+مسائي)",
    shifts: ["morning", "morning", "evening", "evening", "rest", "rest"],
  },
  {
    id: "4x4",
    name: "4×4",
    nameAr: "4×4",
    shifts: ["morning", "morning", "morning", "morning", "rest", "rest", "rest", "rest"],
  },
  {
    id: "4x4_full",
    name: "4×4 Full Rotation",
    nameAr: "4×4 دورة كاملة",
    shifts: [
      "morning", "morning", "morning", "morning",
      "rest", "rest", "rest", "rest",
      "evening", "evening", "evening", "evening",
      "rest", "rest", "rest", "rest",
      "night", "night", "night", "night",
      "rest", "rest", "rest", "rest",
    ],
  },
  {
    id: "3x3",
    name: "3×3",
    nameAr: "3×3",
    shifts: ["morning", "morning", "morning", "rest", "rest", "rest"],
  },
];

export function getShiftForDate(
  date: Date,
  startDate: Date,
  pattern: ShiftType[]
): ShiftType {
  if (pattern.length === 0) return "rest";
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const index = ((diffDays % pattern.length) + pattern.length) % pattern.length;
  return pattern[index];
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل",
  "مايو", "يونيو", "يوليو", "أغسطس",
  "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const DAY_NAMES_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
