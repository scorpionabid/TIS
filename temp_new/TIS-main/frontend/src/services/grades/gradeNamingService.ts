import { apiClient, ApiResponse } from '../api';
import { logger } from '@/utils/logger';

export class GradeNamingService {
  private readonly baseURL = '/grades';

  /**
   * Get naming options for grade creation dropdown
   */
  async getNamingOptions(
    institutionId: number,
    academicYearId: number,
    classLevel?: number,
    extendedLetters: boolean = false
  ): Promise<ApiResponse<{
    class_levels: Array<{ value: number; label: string; stage: string }>;
    letters: Array<{ value: string; label: string; available: boolean; used: boolean }>;
    specialties: Array<{ value: string; label: string; recommended_for: number[] }>;
    existing_names: string[];
    capacity_recommendation: { min: number; recommended: number; max: number } | null;
    should_show_specialty: boolean;
    naming_pattern: string;
    naming_patterns: Record<string, string>;
  }>> {
    logger.debug('Fetching grade naming options', {
      component: 'GradeNamingService',
      action: 'getNamingOptions',
      data: { institutionId, classLevel, academicYearId }
    });

    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      academic_year_id: academicYearId.toString(),
      extended_letters: extendedLetters ? '1' : '0',
    });

    if (classLevel !== undefined) {
      params.append('class_level', classLevel.toString());
    }

    return apiClient.get<any>(`${this.baseURL}/naming/options?${params}`);
  }

  /**
   * Get smart naming suggestions for grade creation
   */
  async getNamingSuggestions(
    institutionId: number,
    classLevel: number,
    academic_year_id: number
  ): Promise<ApiResponse<any>> {
    logger.debug('Fetching grade naming suggestions', {
      component: 'GradeNamingService',
      action: 'getNamingSuggestions',
      data: { institutionId, classLevel, academicYearId: academic_year_id }
    });

    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      class_level: classLevel.toString(),
      academic_year_id: academic_year_id.toString()
    });

    return apiClient.get<any>(`${this.baseURL}/naming/suggestions?${params}`);
  }

  /**
   * Get naming system statistics
   */
  async getNamingSystemStats(): Promise<ApiResponse<any>> {
    logger.debug('Fetching naming system statistics', {
      component: 'GradeNamingService',
      action: 'getNamingSystemStats'
    });

    return apiClient.get<any>(`${this.baseURL}/naming/system-stats`);
  }
}
