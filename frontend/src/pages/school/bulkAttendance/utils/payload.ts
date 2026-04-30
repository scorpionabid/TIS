import {
  BulkAttendanceRequest,
  ClassAttendanceData,
  ClassWithAttendance,
} from "@/services/bulkAttendance";
import { AttendanceFormData, AttendanceSession, DirtyClassesState } from "../types";

interface BuildPayloadParams {
  classes: ClassWithAttendance[];
  academicYearId: number;
  selectedDate: string;
  attendanceData: AttendanceFormData;
  dirtyClasses: DirtyClassesState;
}

const defaultAttendance = {
  morning_present: 0,
  morning_excused: 0,
  morning_unexcused: 0,
  evening_present: 0,
  evening_excused: 0,
  evening_unexcused: 0,
  uniform_violation: 0,
  morning_notes: "",
  evening_notes: "",
};

// Azerbaijan is UTC+4, no DST
const getBakuHour = (): number => (new Date().getUTCHours() + 4) % 24;

const getShiftNumber = (shift?: string | null): number => {
  const m = (shift ?? "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

export const buildSessionPayload = (
  session: AttendanceSession,
  { classes, academicYearId, selectedDate, attendanceData, dirtyClasses }: BuildPayloadParams
): BulkAttendanceRequest | null => {
  if (!classes.length) {
    return null;
  }

  const bakuHour = getBakuHour();

  // Include dirty classes + unrecorded classes with students (auto-include for 100% present)
  const recordedAtKey = session === "morning" ? "morning_recorded_at" : "evening_recorded_at";
  const includedList = classes.filter((cls) => {
    // 2nd shift morning sessions are blocked before 12:00 Baku time
    if (session === "morning" && bakuHour < 12 && getShiftNumber(cls.teaching_shift) === 2) {
      return false;
    }
    if (dirtyClasses[cls.id]?.[session]) return true;
    return cls.total_students > 0 && !cls.attendance?.[recordedAtKey];
  });

  if (!includedList.length) {
    return null;
  }

  const requestClasses: ClassAttendanceData[] = includedList.map((cls) => {
    const data = attendanceData[cls.id] || defaultAttendance;

    const baseData = {
      grade_id: cls.id,
      session,
    } as const;

    if (session === "morning") {
      return {
        ...baseData,
        morning_present: data.morning_present,
        morning_excused: data.morning_excused,
        morning_unexcused: data.morning_unexcused,
        uniform_violation: data.uniform_violation || 0,
        morning_notes: data.morning_notes,
      };
    }

    return {
      ...baseData,
      evening_present: data.evening_present,
      evening_excused: data.evening_excused,
      evening_unexcused: data.evening_unexcused,
      uniform_violation: data.uniform_violation || 0,
      evening_notes: data.evening_notes,
    };
  });

  return {
    attendance_date: selectedDate,
    academic_year_id: academicYearId,
    classes: requestClasses,
  };
};
