import { apiClient, PaginatedResponse } from './api';
import { BaseService, BaseEntity } from './BaseService';
import { RatingItem, RatingConfig, RatingListParams, CalculateRequest, CalculateResponse } from '@/types/rating';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

interface RatingEntity extends BaseEntity {
  user_id: number;
  institution_id: number;
  academic_year_id: number;
  period: string;
  overall_score: number;
  task_score: number;
  survey_score: number;
  manual_score: number;
  status: 'draft' | 'published' | 'archived';
}

class RatingService extends BaseService<RatingEntity> {
  constructor() {
    super('/ratings', ['ratings']);
  }

  /**
   * Get all ratings with optional filters
   */
  async getAllRatings(params?: RatingListParams): Promise<PaginatedResponse<RatingItem>> {
    logger.debug('Fetching all ratings', {
      component: 'RatingService',
      action: 'getAllRatings',
      data: { params }
    });

    const response = await apiClient.get(this.baseEndpoint, params);

    // Enhanced response handling for API consistency
    console.log(' [RatingService] Raw API response:', response);
    console.log(' [RatingService] Response type:', typeof response);

    // Handle paginated response structure from API
    if (response && typeof response === 'object' && 'current_page' in response) {
      console.log(' [RatingService] Using paginated response structure');
      return response as unknown as PaginatedResponse<RatingItem>;
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      console.log(' [RatingService] Using direct array response');
      const data = response;
      return {
        data,
        current_page: 1,
        per_page: data.length,
        total: data.length,
        last_page: 1,
        first_page_url: '',
        last_page_url: '',
        path: this.baseEndpoint,
        from: 1,
        to: data.length
      } as PaginatedResponse<RatingItem>;
    }

    // Handle nested data structure where response.data is the paginator
    if (response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' && 'current_page' in response.data) {
      console.log(' [RatingService] Using nested paginator structure');
      const paginator = response.data as any;
      return {
        data: paginator.data || [],
        current_page: paginator.current_page || 1,
        per_page: paginator.per_page || 15,
        total: paginator.total || 0,
        last_page: paginator.last_page || 1,
        first_page_url: paginator.first_page_url || '',
        last_page_url: paginator.last_page_url || '',
        path: paginator.path || this.baseEndpoint,
        from: paginator.from || 1,
        to: paginator.to || 0
      } as PaginatedResponse<RatingItem>;
    }

    // Handle nested data structure where response.data is the array
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      console.log(' [RatingService] Using nested data array structure');
      const data = response.data;
      return {
        data,
        current_page: (response as any).current_page || 1,
        per_page: (response as any).per_page || data.length,
        total: (response as any).total || data.length,
        last_page: (response as any).last_page || 1,
        first_page_url: (response as any).first_page_url || '',
        last_page_url: (response as any).last_page_url || '',
        path: (response as any).path || this.baseEndpoint,
        from: (response as any).from || 1,
        to: (response as any).to || data.length
      } as PaginatedResponse<RatingItem>;
    }

    console.warn(' [RatingService] Unexpected response structure:', response);

    // Fallback for non-paginated response
    const data = handleArrayResponse<RatingItem>(response, 'RatingService.getAllRatings');
    return {
      data,
      current_page: 1,
      per_page: data.length,
      total: data.length,
      last_page: 1,
      first_page_url: '',
      last_page_url: '',
      path: this.baseEndpoint,
      from: 1,
      to: data.length
    } as PaginatedResponse<RatingItem>;
  }

  /**
   * Get rating by ID
   */
  async getRatingById(id: number): Promise<RatingItem> {
    logger.debug('Fetching rating by ID', {
      component: 'RatingService',
      action: 'getRatingById',
      data: { id }
    });

    const response = await apiClient.get<RatingItem>(`${this.baseEndpoint}/${id}`);
    return handleApiResponseWithError<RatingItem>(response, `RatingService.getRatingById(${id})`, 'RatingService');
  }

  /**
   * Create new rating
   */
  async createRating(data: Partial<RatingItem>): Promise<RatingItem> {
    logger.debug('Creating new rating', {
      component: 'RatingService',
      action: 'createRating',
      data: { payload: data }
    });

    const response = await apiClient.post<RatingItem>(this.baseEndpoint, data);
    const result = handleApiResponseWithError<RatingItem>(response, 'RatingService.createRating', 'RatingService');
    this.invalidateCache(['list']);
    return result;
  }

  /**
   * Update existing rating
   */
  async updateRating(id: number, data: Partial<RatingItem>): Promise<RatingItem> {
    logger.debug('Updating rating', {
      component: 'RatingService',
      action: 'updateRating',
      data: { id, payload: data }
    });

    const response = await apiClient.put<RatingItem>(`${this.baseEndpoint}/${id}`, data);
    const result = handleApiResponseWithError<RatingItem>(response, `RatingService.updateRating(${id})`, 'RatingService');
    this.invalidateCache(['list', 'detail']);
    return result;
  }

  /**
   * Delete rating
   */
  async deleteRating(id: number): Promise<void> {
    logger.debug('Deleting rating', {
      component: 'RatingService',
      action: 'deleteRating',
      data: { id }
    });

    await apiClient.delete(`${this.baseEndpoint}/${id}`);
    this.invalidateCache(['list', 'detail']);
  }

  /**
   * Calculate rating for a specific user
   */
  async calculate(userId: number, data: CalculateRequest): Promise<RatingItem> {
    logger.debug('Calculating rating for user', {
      component: 'RatingService',
      action: 'calculate',
      data: { userId, payload: data }
    });

    const response = await apiClient.post<RatingItem>(`${this.baseEndpoint}/calculate/${userId}`, data);
    const result = handleApiResponseWithError<RatingItem>(response, `RatingService.calculate(${userId})`, 'RatingService');
    this.invalidateCache(['list']);
    return result;
  }

  /**
   * Calculate rating for all users
   */
  async calculateAll(data: CalculateRequest): Promise<CalculateResponse> {
    logger.debug('Calculating ratings for all users', {
      component: 'RatingService',
      action: 'calculateAll',
      data: { payload: data }
    });

    const response = await apiClient.post<CalculateResponse>(`${this.baseEndpoint}/calculate-all`, data);
    const result = handleApiResponseWithError<CalculateResponse>(response, 'RatingService.calculateAll', 'RatingService');
    this.invalidateCache(['list']);
    return result;
  }

  /**
   * Calculate specialized rating for a teacher
   */
  async calculateTeacher(teacherId: number, academicYearId: number): Promise<RatingItem> {
    logger.debug('Calculating teacher rating', {
      component: 'RatingService',
      action: 'calculateTeacher',
      data: { teacherId, academicYearId }
    });

    const response = await apiClient.post<any>(`/teacher-rating/calculate/${teacherId}`, {
      academic_year_id: academicYearId
    });

    // The response has rating nested in data
    const result = response.data?.rating || response.rating;
    this.invalidateCache(['list']);
    return result;
  }

  /**
   * Calculate all teacher ratings
   */
  async calculateAllTeachers(academicYearId: number, institutionId?: number): Promise<any> {
    logger.debug('Calculating all teacher ratings', {
      component: 'RatingService',
      action: 'calculateAllTeachers',
      data: { academicYearId, institutionId }
    });

    const response = await apiClient.post<any>('/teacher-rating/calculate-all', {
      academic_year_id: academicYearId,
      institution_id: institutionId
    });

    this.invalidateCache(['list']);
    return response.data || response;
  }

  /**
   * Get teacher-specific statistics
   */
  async getTeacherStats(params: { academic_year_id: number; institution_id?: number }): Promise<any> {
    logger.debug('Fetching teacher statistics', {
      component: 'RatingService',
      action: 'getTeacherStats',
      data: { params }
    });

    const response = await apiClient.get<any>('/teacher-rating/statistics', params);
    return response.data || response;
  }

  /**
   * Get rating configurations
   */
  async getConfigs(params?: { institution_id?: number; academic_year_id?: number }): Promise<RatingConfig[]> {
    logger.debug('Fetching rating configs', {
      component: 'RatingService',
      action: 'getConfigs',
      data: { params }
    });

    const response = await apiClient.get<RatingConfig[]>('/rating-configs', params);
    return handleArrayResponse<RatingConfig>(response, 'RatingService.getConfigs');
  }

  /**
   * Create rating configuration
   */
  async createConfig(data: Partial<RatingConfig>): Promise<RatingConfig> {
    logger.debug('Creating rating config', {
      component: 'RatingService',
      action: 'createConfig',
      data: { payload: data }
    });

    const response = await apiClient.post<RatingConfig>('/rating-configs', data);
    return handleApiResponseWithError<RatingConfig>(response, 'RatingService.createConfig', 'RatingService');
  }

  /**
   * Update rating configuration
   */
  async updateConfig(id: number, data: Partial<RatingConfig>): Promise<RatingConfig> {
    logger.debug('Updating rating config', {
      component: 'RatingService',
      action: 'updateConfig',
      data: { id, payload: data }
    });

    const response = await apiClient.put<RatingConfig>(`/rating-configs/${id}`, data);
    return handleApiResponseWithError<RatingConfig>(response, `RatingService.updateConfig(${id})`, 'RatingService');
  }

  /**
   * Delete rating configuration
   */
  async deleteConfig(id: number): Promise<void> {
    logger.debug('Deleting rating config', {
      component: 'RatingService',
      action: 'deleteConfig',
      data: { id }
    });

    await apiClient.delete(`/rating-configs/${id}`);
  }

  /**
   * Get ratings by user role
   */
  async getByRole(role: string, params?: Omit<RatingListParams, 'user_role'>): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, user_role: role });
  }

  /**
   * Get ratings by institution
   */
  async getByInstitution(institutionId: number, params?: Omit<RatingListParams, 'institution_id'>): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, institution_id: institutionId });
  }

  /**
   * Get ratings by academic year
   */
  async getByAcademicYear(academicYearId: number, params?: Omit<RatingListParams, 'academic_year_id'>): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, academic_year_id: academicYearId });
  }

  /**
   * Get ratings by period
   */
  async getByPeriod(period: string, params?: Omit<RatingListParams, 'period'>): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, period });
  }

  /**
   * Get published ratings only
   */
  async getPublished(params?: RatingListParams): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, status: 'published' });
  }

  /**
   * Get draft ratings only
   */
  async getDrafts(params?: RatingListParams): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, status: 'draft' });
  }

  /**
   * Get archived ratings only
   */
  async getArchived(params?: RatingListParams): Promise<PaginatedResponse<RatingItem>> {
    return this.getAllRatings({ ...params, status: 'archived' });
  }

  /**
   * Search ratings by user name or email
   */
  async searchRatings(query: string, params?: RatingListParams): Promise<PaginatedResponse<RatingItem>> {
    const response = await this.getAllRatings(params);
    const filteredData = response.data?.filter((item: RatingItem) =>
      item.user?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      item.user?.email?.toLowerCase().includes(query.toLowerCase())
    ) || [];

    return {
      ...response,
      data: filteredData,
      total: filteredData.length,
      to: filteredData.length
    };
  }

  /**
   * Get rating statistics
   */
  async getStatistics(params?: { institution_id?: number; academic_year_id?: number; period?: string }) {
    const response = await this.getAllRatings(params);
    const ratings = response.data || [];

    if (ratings.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        distribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      };
    }

    const scores = ratings.map((item: RatingItem) => item.overall_score || 0);
    const total = ratings.length;
    const average = scores.reduce((sum: number, score: number) => sum + score, 0) / total;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    const distribution = {
      excellent: ratings.filter((item: RatingItem) => (item.overall_score || 0) >= 90).length,
      good: ratings.filter((item: RatingItem) => (item.overall_score || 0) >= 80 && (item.overall_score || 0) < 90).length,
      average: ratings.filter((item: RatingItem) => (item.overall_score || 0) >= 70 && (item.overall_score || 0) < 80).length,
      poor: ratings.filter((item: RatingItem) => (item.overall_score || 0) < 70).length
    };

    return {
      total,
      average,
      highest,
      lowest,
      distribution
    };
  }
}

export const ratingService = new RatingService();
export default ratingService;
