import {
  BulkAttendanceErrorItem,
  BulkAttendanceRequest,
} from "@/services/bulkAttendance";

export interface AttendanceFormData {
  [gradeId: string]: {
    morning_present: number;
    morning_excused: number;
    morning_unexcused: number;
    evening_present: number;
    evening_excused: number;
    evening_unexcused: number;
    morning_notes: string;
    evening_notes: string;
  };
}

export interface AttendanceError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

export type AttendanceSession = "morning" | "evening";

export interface SaveMutationVariables {
  payload: BulkAttendanceRequest;
  session: AttendanceSession;
  isAutoSave: boolean;
}

export type ServerErrorMap = Record<number, BulkAttendanceErrorItem>;

export interface DirtySessionsState {
  morning: boolean;
  evening: boolean;
}

export type SaveResultState = {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
  timestamp: string | null;
  mode: "manual" | "auto";
  session: AttendanceSession | null;
};
