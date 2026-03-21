import { Platform } from "react-native";
import { getShiftForDate, SHIFT_DEFINITIONS, ShiftType } from "./shift-utils";

let HomeWidget: any = null;

try {
  if (Platform.OS !== "web") {
    HomeWidget = require("react-native-home-widget");
  }
} catch {}

const SHIFT_LABELS_AR: Record<ShiftType, string> = {
  morning: "صباحي",
  evening: "مسائي",
  night: "ليلي",
  rest: "راحة",
};

const SHIFT_TIMES: Record<ShiftType, string> = {
  morning: "06:00 - 14:00",
  evening: "14:00 - 22:00",
  night: "22:00 - 06:00",
  rest: "",
};

function getTodayDateLabel(): string {
  const today = new Date();
  const day = today.getDate();
  const months = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];
  return `${day} ${months[today.getMonth()]}`;
}

export async function updateWidget(
  startDate: Date,
  pattern: ShiftType[],
  customShiftTimes?: Record<string, { start: string; end: string }>
): Promise<void> {
  if (!HomeWidget || Platform.OS === "web") return;

  try {
    const today = new Date();
    const shiftType = getShiftForDate(today, startDate, pattern);
    const def = SHIFT_DEFINITIONS[shiftType];

    let shiftTime = SHIFT_TIMES[shiftType];
    if (shiftType !== "rest" && customShiftTimes?.[shiftType]) {
      const custom = customShiftTimes[shiftType];
      shiftTime = `${custom.start} - ${custom.end}`;
    }

    const dateLabel = getTodayDateLabel();
    const shiftLabel = SHIFT_LABELS_AR[shiftType];

    await HomeWidget.saveWidgetData("shift_type", shiftType);
    await HomeWidget.saveWidgetData("shift_label", shiftLabel);
    await HomeWidget.saveWidgetData("shift_time", shiftTime);
    await HomeWidget.saveWidgetData("date_label", dateLabel);

    await HomeWidget.updateWidget({
      widgetName: "WorkRosterWidget",
      ios: { kind: "WorkRosterWidget" },
      android: { name: "WorkRosterWidget" },
    });
  } catch {}
}
