import { apiClient, ApiResponse } from './api';

// TOKEN_STORAGE_KEY must match apiOptimized.ts constant
const TOKEN_STORAGE_KEY = 'atis_auth_token';

export interface PreschoolReportFilters {
  start_date: string;
  end_date: string;
  sector_id?: number;
  institution_id?: number;
}

export interface PreschoolInstitutionSummary {
  institution_id: number;
  institution_name: string;
  sector_name: string | null;
  type: string;
  group_count: number;
  total_enrolled: number;
  total_present: number;
  average_rate: number;
  records_submitted: number;
  records_expected: number;
  completion_rate: number;
}

export interface PreschoolReportTotals {
  institution_count: number;
  total_enrolled: number;
  total_present: number;
  average_rate: number;
  avg_completion: number;
}

export interface PreschoolReportData {
  period: {
    start_date: string;
    end_date: string;
  };
  institutions: PreschoolInstitutionSummary[];
  totals: PreschoolReportTotals;
}

class PreschoolReportService {
  private readonly baseUrl = '/preschool/attendance/reports';

  async getReport(filters: PreschoolReportFilters): Promise<ApiResponse<PreschoolReportData>> {
    const params: Record<string, string | number> = {
      start_date: filters.start_date,
      end_date: filters.end_date,
    };

    if (filters.sector_id !== undefined) {
      params.sector_id = filters.sector_id;
    }
    if (filters.institution_id !== undefined) {
      params.institution_id = filters.institution_id;
    }

    return apiClient.get<PreschoolReportData>(this.baseUrl, params);
  }

  async downloadPhotosZip(filters: PreschoolReportFilters): Promise<Blob> {
    const params: Record<string, string | number> = {
      start_date: filters.start_date,
      end_date: filters.end_date,
    };

    if (filters.institution_id !== undefined) {
      params.institution_id = filters.institution_id;
    }

    // Use apiClient blob responseType so auth/CSRF headers are applied correctly
    const response = await apiClient.get<Blob>(
      `${this.baseUrl}/export`,
      params,
      { responseType: 'blob', cache: false }
    );

    if (response.data instanceof Blob) {
      return response.data;
    }

    throw new Error('Export cavabı müvafiq Blob qaytarmadı');
  }

  triggerZipDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Returns a signed export URL for direct navigation.
   * Only use when the browser must open the file in a new tab.
   */
  getExportUrl(filters: PreschoolReportFilters): string {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    const params = new URLSearchParams({
      start_date: filters.start_date,
      end_date: filters.end_date,
      token: encodeURIComponent(token),
    });
    if (filters.institution_id !== undefined) {
      params.append('institution_id', String(filters.institution_id));
    }
    return `/api${this.baseUrl}/export?${params.toString()}`;
  }
}

export const preschoolReportService = new PreschoolReportService();
