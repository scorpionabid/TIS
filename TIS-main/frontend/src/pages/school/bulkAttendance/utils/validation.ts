import { Dispatch, SetStateAction } from "react";
import bulkAttendanceService from "@/services/bulkAttendance";
import { AttendanceFormData, AttendanceSession } from "../types";

export const validateClassAttendance = (
  attendanceData: AttendanceFormData,
  gradeId: number,
  totalStudents: number,
  session: AttendanceSession,
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
): boolean => {
  const data = attendanceData[gradeId];
  if (!data) return false;

  const presentKey = `${session}_present` as keyof AttendanceFormData[string];
  const excusedKey = `${session}_excused` as keyof AttendanceFormData[string];
  const unexcusedKey =
    `${session}_unexcused` as keyof AttendanceFormData[string];

  if (totalStudents <= 0) {
    setErrors((prev) => ({
      ...prev,
      [`${gradeId}_${session}`]: "Şagird sayı qeyd edilməyib",
    }));
    return false;
  }

  const excused = Number(data[excusedKey] ?? 0);
  const unexcused = Number(data[unexcusedKey] ?? 0);
  const present = Math.max(0, totalStudents - (excused + unexcused));

  const isValid = bulkAttendanceService.validateAttendanceCounts(
    totalStudents,
    present,
    excused,
    unexcused
  );

  if (!isValid) {
    setErrors((prev) => ({
      ...prev,
      [`${gradeId}_${session}`]: `Ümumi say ${totalStudents} şagirddən çox ola bilməz`,
    }));
  }

  return isValid;
};

export const validateSessionAttendance = (
  attendanceData: AttendanceFormData,
  classes: Array<{ id: number; total_students: number }>,
  session: AttendanceSession,
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
): boolean => {
  let allValid = true;

  classes.forEach((cls) => {
    if (
      !validateClassAttendance(
        attendanceData,
        cls.id,
        cls.total_students,
        session,
        setErrors
      )
    ) {
      allValid = false;
    }
  });

  return allValid;
};
