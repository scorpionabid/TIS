import { apiClient } from "./api";

export interface RegionalAttendanceFilters {
  start_date?: string;
  end_date?: string;
  sector_id?: number;
  region_id?: number;
}

export interface AttendanceSummary {
  total_sectors: number;
  total_schools: number;
  total_students: number;
  average_attendance_rate: number;
  reported_days: number;
  schools_missing_reports: number;
  period: {
    start_date: string;
    end_date: string;
    school_days: number;
  };
}

export interface SchoolAttendanceStat {
  school_id: number;
  name: string;
  sector_id: number | null;
  total_students: number;
  expected_school_days: number;
  records: number;
  reported_days: number;
  reported_classes: number;
  actual_attendance: number;
  possible_attendance: number;
  morning_absent: number;
  evening_absent: number;
  average_attendance_rate: number;
  reporting_gap: number;
  warnings: string[];
}

export interface SectorAttendanceStat {
  sector_id: number;
  name: string;
  school_count: number;
  total_students: number;
  average_attendance_rate: number;
  reported_days: number;
  schools: SchoolAttendanceStat[];
}

export interface RegionalAttendanceOverview {
  summary: AttendanceSummary;
  sectors: SectorAttendanceStat[];
  schools: SchoolAttendanceStat[];
  trends: Array<{
    date: string;
    short_date: string;
    rate: number;
    reported: boolean;
  }>;
  alerts: {
    missing_reports: Array<{ school_id: number; name: string }>;
    low_attendance: Array<{ school_id: number; name: string; rate: number }>;
  };
  filters: RegionalAttendanceFilters & {
    start_date: string;
    end_date: string;
    school_id?: number;
  };
  context: {
    region?: {
      id: number;
      name: string;
    } | null;
    active_sector?: {
      id: number;
      name: string;
    } | null;
  };
}

export interface SchoolClassStat {
  grade_id: number | null;
  name: string;
  class_level: number;
  student_count: number;
  records: number;
  reported_days: number;
  average_attendance_rate: number;
  actual_attendance: number;
  possible_attendance: number;
  morning_absent: number;
  evening_absent: number;
  report_gap?: number;
  warnings?: string[];
  expected_school_days: number;
}

export interface SchoolClassBreakdown {
  school: {
    id: number;
    name: string;
    sector_id?: number | null;
  };
  summary: {
    total_classes: number;
    reported_classes: number;
    average_attendance_rate: number;
    period: {
      start_date: string;
      end_date: string;
      school_days: number;
    };
  };
  classes: SchoolClassStat[];
  period: {
    start_date: string;
    end_date: string;
    expected_school_days: number;
  };
}

const unwrap = <T>(payload: any): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

export class RegionalAttendanceService {
  async getOverview(filters: RegionalAttendanceFilters): Promise<RegionalAttendanceOverview> {
    const response = await apiClient.get<RegionalAttendanceOverview>(
      "/regional-attendance/overview",
      filters
    );
    return unwrap<RegionalAttendanceOverview>(response);
  }

  async getSchoolClasses(
    schoolId: number,
    filters: RegionalAttendanceFilters
  ): Promise<SchoolClassBreakdown> {
    const response = await apiClient.get<SchoolClassBreakdown>(
      `/regional-attendance/schools/${schoolId}/classes`,
      filters
    );
    return unwrap<SchoolClassBreakdown>(response);
  }

  async exportExcel(filters: RegionalAttendanceFilters): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      "/regional-attendance/export",
      filters,
      { responseType: "blob" }
    );
    return unwrap<Blob>(response);
  }
}

export const regionalAttendanceService = new RegionalAttendanceService();
