import {
  BulkAttendanceRequest,
  ClassAttendanceData,
} from "@/services/bulkAttendance";
import { AttendanceFormData, AttendanceSession } from "../types";

interface BuildPayloadParams {
  classes: Array<{ id: number }>;
  academicYearId: number;
  selectedDate: string;
  attendanceData: AttendanceFormData;
}

const defaultAttendance = {
  morning_present: 0,
  morning_excused: 0,
  morning_unexcused: 0,
  evening_present: 0,
  evening_excused: 0,
  evening_unexcused: 0,
  morning_notes: "",
  evening_notes: "",
};

export const buildSessionPayload = (
  session: AttendanceSession,
  { classes, academicYearId, selectedDate, attendanceData }: BuildPayloadParams
): BulkAttendanceRequest | null => {
  if (!classes.length) {
    return null;
  }

  const requestClasses: ClassAttendanceData[] = classes.map((cls) => {
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
        morning_notes: data.morning_notes,
      };
    }

    return {
      ...baseData,
      evening_present: data.evening_present,
      evening_excused: data.evening_excused,
      evening_unexcused: data.evening_unexcused,
      evening_notes: data.evening_notes,
    };
  });

  return {
    attendance_date: selectedDate,
    academic_year_id: academicYearId,
    classes: requestClasses,
  };
};
