import { apiClient, ApiResponse } from './api';

// TOKEN_STORAGE_KEY must match apiOptimized.ts constant
const TOKEN_STORAGE_KEY = 'atis_auth_token';

export interface PreschoolAttendancePhoto {
  id: number;
  url: string;
}

export interface PreschoolAttendanceRecord {
  id: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
  notes: string | null;
  is_locked: boolean;
  photo_count: number;
  photos: PreschoolAttendancePhoto[];
}

export interface PreschoolGroupWithAttendance {
  group_id: number;
  group_name: string;
  total_enrolled: number;
  attendance: PreschoolAttendanceRecord | null;
}

export interface PreschoolAttendanceData {
  date: string;
  institution: {
    id: number;
    name: string;
  };
  groups: PreschoolGroupWithAttendance[];
}

export interface SaveAttendanceGroupItem {
  group_id: number;
  present_count: number;
  notes?: string;
}

export interface SaveAttendancePayload {
  attendance_date: string;
  groups: SaveAttendanceGroupItem[];
}

export interface SaveAttendanceSummary {
  saved_count: number;
  failed_count: number;
  failed_ids: number[];
}

export interface UploadPhotosData {
  photos: PreschoolAttendancePhoto[];
  count: number;
}

class PreschoolAttendanceService {
  private readonly baseUrl = '/preschool/attendance';

  async getForDate(date?: string): Promise<ApiResponse<PreschoolAttendanceData>> {
    const params: Record<string, string> = {};
    if (date) {
      params.date = date;
    }
    return apiClient.get<PreschoolAttendanceData>(this.baseUrl, params);
  }

  async saveAttendance(data: SaveAttendancePayload): Promise<ApiResponse<SaveAttendanceSummary>> {
    return apiClient.post<SaveAttendanceSummary>(this.baseUrl, data);
  }

  async uploadPhotos(
    attendanceId: number,
    files: File[]
  ): Promise<ApiResponse<UploadPhotosData>> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files[]', f));

    // Use apiClient.post so auth headers and CSRF are applied automatically.
    // apiClient detects FormData and removes Content-Type to let the browser
    // set the multipart boundary correctly.
    return apiClient.post<UploadPhotosData>(
      `${this.baseUrl}/${attendanceId}/photos`,
      formData
    );
  }

  async deletePhoto(photoId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.baseUrl}/photos/${photoId}`);
  }

  /**
   * Returns a URL that serves a photo with the bearer token as a query param.
   * Useful for <img src=...> where Authorization headers cannot be set.
   */
  getPhotoServeUrl(photoId: number): string {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    return `/api${this.baseUrl}/photos/${photoId}/serve?token=${encodeURIComponent(token)}`;
  }
}

export const preschoolAttendanceService = new PreschoolAttendanceService();
