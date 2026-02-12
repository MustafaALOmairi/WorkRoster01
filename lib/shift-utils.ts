export type ShiftType = "morning" | "evening" | "night" | "rest";

export interface ShiftDefinition {
  type: ShiftType;
  label: string;
  labelAr: string;
  shortLabel: string;
  shortLabelAr: string;
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
    shortLabel: "Day",
    shortLabelAr: "نهار",
    startTime: "06:00",
    endTime: "14:00",
  },
  evening: {
    type: "evening",
    label: "Evening",
    labelAr: "مسائي",
    shortLabel: "Eve",
    shortLabelAr: "مساء",
    startTime: "14:00",
    endTime: "22:00",
  },
  night: {
    type: "night",
    label: "Night",
    labelAr: "ليلي",
    shortLabel: "Night",
    shortLabelAr: "ليل",
    startTime: "22:00",
    endTime: "06:00",
  },
  rest: {
    type: "rest",
    label: "Rest",
    labelAr: "راحة",
    shortLabel: "Off",
    shortLabelAr: "إجازة",
    startTime: "",
    endTime: "",
  },
};

export const PRESET_PATTERNS: RotationPattern[] = [
  {
    id: "2x2",
    name: "2x2",
    nameAr: "2x2",
    shifts: ["morning", "morning", "rest", "rest"],
  },
  {
    id: "2x2_me",
    name: "2x2 (M+E)",
    nameAr: "2x2 (صباحي+مسائي)",
    shifts: ["morning", "morning", "evening", "evening", "rest", "rest"],
  },
  {
    id: "4x4",
    name: "4x4",
    nameAr: "4x4",
    shifts: ["morning", "morning", "morning", "morning", "rest", "rest", "rest", "rest"],
  },
  {
    id: "4x4_full",
    name: "4x4 Full Rotation",
    nameAr: "4x4 دورة كاملة",
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
    name: "3x3",
    nameAr: "3x3",
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

export const MONTH_NAMES_EN = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export const MONTH_SHORT_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const DAY_NAMES_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
export const DAY_NAMES_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const DAY_FULL_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const DAY_FULL_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

export function searchDatesForShift(
  shiftType: ShiftType,
  startDate: Date,
  pattern: ShiftType[],
  fromDate: Date,
  count: number
): Date[] {
  const results: Date[] = [];
  const current = new Date(fromDate);
  let safety = 0;
  while (results.length < count && safety < 730) {
    const shift = getShiftForDate(current, startDate, pattern);
    if (shift === shiftType) {
      results.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    safety++;
  }
  return results;
}
