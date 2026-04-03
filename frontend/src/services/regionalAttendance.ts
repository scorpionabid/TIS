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
  present_total?: number;
  total_uniform_violations?: number;
  uniform_violation_rate?: number;
  uniform_compliance_rate?: number;
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
  sector_name?: string;
  total_students: number;
  expected_school_days: number;
  records: number;
  reported_days: number;
  reported_classes: number;
  actual_attendance: number;
  possible_attendance: number;
  morning_absent: number;
  evening_absent: number;
  present_total?: number;
  total_uniform_violations?: number;
  uniform_violation_rate?: number;
  uniform_compliance_rate?: number;
  average_attendance_rate: number;
  reporting_gap: number;
  warnings: string[];
}

export interface SectorAttendanceStat {
  sector_id: number;
  name: string;
  school_count: number;
  total_students: number;
  present_total?: number;
  total_uniform_violations?: number;
  uniform_violation_rate?: number;
  uniform_compliance_rate?: number;
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
  present_total?: number;
  total_uniform_violations?: number;
  uniform_violation_rate?: number;
  uniform_compliance_rate?: number;
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
    present_total?: number;
    total_uniform_violations?: number;
    uniform_violation_rate?: number;
    uniform_compliance_rate?: number;
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

export interface GradeLevelStat {
  class_level: number;
  class_level_display: string;
  student_count: number;
  school_count: number;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
  total_uniform_violations: number;
  present_total: number;
  schools: Array<{
    school_id: number;
    grade_ids: number[];
    student_count: number;
  }>;
}

export interface GradeLevelStatsResponse {
  summary: {
    total_students: number;
    total_schools: number;
    overall_average_attendance: number;
    period: {
      start_date: string;
      end_date: string;
      school_days: number;
    };
  };
  grade_levels: GradeLevelStat[];
  filters: {
    start_date: string;
    end_date: string;
    sector_id?: number;
    education_program?: string;
  };
  context?: {
    region?: { id: number; name: string } | null;
    active_sector?: { id: number; name: string } | null;
  };
}

export interface MissingReportSchool {
  school_id: number;
  name: string;
  sector_id: number;
  sector_name: string;
  reported_days: number;
  missing_days: number;
  baseline_days: number;
  last_report_date: string | null;
}

export interface MissingReportSector {
  sector_id: number;
  sector_name: string;
  total_schools: number;
  schools_with_reports: number;
  schools_missing: number;
  missing_percentage: number;
  schools: MissingReportSchool[];
}

export interface MissingReportsResponse {
  summary: {
    total_schools: number;
    schools_with_reports: number;
    schools_missing_reports: number;
    missing_percentage: number;
    period: {
      start_date: string;
      end_date: string;
      school_days: number;
    };
  };
  sectors: MissingReportSector[];
  schools: MissingReportSchool[];
}

export interface SchoolGradeStat {
  id: number;
  name: string;
  grades: (number | null)[];
}

export interface SchoolGradeStatsResponse {
  schools: SchoolGradeStat[];
  regional_averages: (number | null)[];
  period: {
    start_date: string;
    end_date: string;
  };
  filters: {
    start_date: string;
    end_date: string;
    sector_id?: number | null;
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

  async getGradeLevelStats(
    filters: RegionalAttendanceFilters & { education_program?: string }
  ): Promise<GradeLevelStatsResponse> {
    const response = await apiClient.get<GradeLevelStatsResponse>(
      "/regional-attendance/grade-level-stats",
      filters
    );
    return unwrap<GradeLevelStatsResponse>(response);
  }

  async exportGradeLevelStats(
    filters: RegionalAttendanceFilters & { education_program?: string }
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      "/regional-attendance/grade-level-stats/export",
      filters,
      { responseType: "blob" }
    );
    return unwrap<Blob>(response);
  }

  async getSchoolsWithMissingReports(
    filters: RegionalAttendanceFilters
  ): Promise<MissingReportsResponse> {
    const response = await apiClient.get<MissingReportsResponse>(
      "/regional-attendance/missing-reports",
      filters
    );
    return unwrap<MissingReportsResponse>(response);
  }

  async exportMissingReports(filters: RegionalAttendanceFilters): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      "/regional-attendance/missing-reports/export",
      filters,
      { responseType: "blob" }
    );
    return unwrap<Blob>(response);
  }

  async getSchoolGradeStats(
    filters: RegionalAttendanceFilters & { education_program?: string }
  ): Promise<SchoolGradeStatsResponse> {
    const response = await apiClient.get<SchoolGradeStatsResponse>(
      "/regional-attendance/school-grade-stats",
      filters
    );
    return unwrap<SchoolGradeStatsResponse>(response);
  }

  async exportSchoolGradeStats(
    filters: RegionalAttendanceFilters & { education_program?: string }
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      "/regional-attendance/school-grade-stats/export",
      filters,
      { responseType: "blob" }
    );
    return unwrap<Blob>(response);
  }
}

export const regionalAttendanceService = new RegionalAttendanceService();
