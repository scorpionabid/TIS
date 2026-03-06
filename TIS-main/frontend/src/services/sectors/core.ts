import { apiClient } from '../api';
import type {
  Sector,
  SectorFilters,
  SectorCreateData,
  SectorUpdateData,
  SectorResponse,
  SectorsResponse,
  SectorCreateResponse,
  SectorUpdateResponse,
  SectorDeleteResponse
} from './types';

/**
 * Core Sectors Service
 * Handles basic CRUD operations for sectors
 */
export class CoreSectorsService {
  private baseUrl = '/sectors';

  /**
   * Get all sectors with optional filtering
   */
  async getSectors(filters?: SectorFilters): Promise<SectorsResponse> {
    console.log('🔍 CoreSectorsService.getSectors called with filters:', filters);
    try {
      const response = await apiClient.get<Sector[]>(this.baseUrl, filters);
      console.log('✅ CoreSectorsService.getSectors successful:', response);
      return response as SectorsResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.getSectors failed:', error);
      throw error;
    }
  }

  /**
   * Get a single sector by ID
   */
  async getSector(id: number): Promise<SectorResponse> {
    console.log('🔍 CoreSectorsService.getSector called for ID:', id);
    try {
      const response = await apiClient.get<Sector>(`${this.baseUrl}/${id}`);
      console.log('✅ CoreSectorsService.getSector successful:', response);
      return response as SectorResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.getSector failed:', error);
      throw error;
    }
  }

  /**
   * Create a new sector
   */
  async createSector(data: SectorCreateData): Promise<SectorCreateResponse> {
    console.log('🔍 CoreSectorsService.createSector called with:', data);
    try {
      const response = await apiClient.post<Sector>(this.baseUrl, data);
      console.log('✅ CoreSectorsService.createSector successful:', response);
      return response as SectorCreateResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.createSector failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing sector
   */
  async updateSector(id: number, data: Partial<SectorUpdateData>): Promise<SectorUpdateResponse> {
    console.log('🔍 CoreSectorsService.updateSector called for ID:', id, 'with data:', data);
    try {
      const response = await apiClient.put<Sector>(`${this.baseUrl}/${id}`, data);
      console.log('✅ CoreSectorsService.updateSector successful:', response);
      return response as SectorUpdateResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.updateSector failed:', error);
      throw error;
    }
  }

  /**
   * Delete a sector
   */
  async deleteSector(id: number): Promise<SectorDeleteResponse> {
    console.log('🔍 CoreSectorsService.deleteSector called for ID:', id);
    try {
      const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ CoreSectorsService.deleteSector successful:', response);
      return response as SectorDeleteResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.deleteSector failed:', error);
      throw error;
    }
  }

  /**
   * Toggle sector active status
   */
  async toggleSectorStatus(id: number): Promise<SectorUpdateResponse> {
    console.log('🔍 CoreSectorsService.toggleSectorStatus called for ID:', id);
    try {
      const response = await apiClient.post<Sector>(`${this.baseUrl}/${id}/toggle-status`, {});
      console.log('✅ CoreSectorsService.toggleSectorStatus successful:', response);
      return response as SectorUpdateResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.toggleSectorStatus failed:', error);
      throw error;
    }
  }

  /**
   * Get sectors by region
   */
  async getSectorsByRegion(regionId: number): Promise<SectorsResponse> {
    console.log('🔍 CoreSectorsService.getSectorsByRegion called for region:', regionId);
    try {
      const response = await apiClient.get<Sector[]>(this.baseUrl, { region_id: regionId });
      console.log('✅ CoreSectorsService.getSectorsByRegion successful:', response);
      return response as SectorsResponse;
    } catch (error) {
      console.error('❌ CoreSectorsService.getSectorsByRegion failed:', error);
      throw error;
    }
  }

  /**
   * Get mock sectors data for development/fallback
   */
  getMockSectors(): Sector[] {
    return [
      {
        id: 1,
        name: 'Orta təhsil sektoru',
        code: 'OTS-BAK-001',
        description: 'Bakı regionunun orta təhsil müəssisələrini əhatə edən sektor',
        region_id: 1,
        region_name: 'Bakı regionu',
        type: 'secondary',
        is_active: true,
        address: 'Bakı, Yasamal rayonu, Atatürk prospekti 123',
        phone: '+994 12 555-0123',
        email: 'orta.tehsil.baki@edu.az',
        manager_id: 15,
        manager: {
          id: 15,
          first_name: 'Elnur',
          last_name: 'Məmmədov',
          username: 'elnur.memmedov',
          email: 'elnur.memmedov@edu.az',
          phone: '+994 55 123-4567'
        },
        statistics: {
          total_institutions: 234,
          total_students: 45678,
          total_teachers: 2890,
          total_staff: 1245,
          active_surveys: 8,
          pending_tasks: 15
        },
        institutions_breakdown: [
          { type: 'Tam orta məktəb', count: 156, percentage: 66.7 },
          { type: 'Lisey', count: 45, percentage: 19.2 },
          { type: 'Gimnazium', count: 33, percentage: 14.1 }
        ],
        performance_metrics: {
          response_rate: 87.4,
          task_completion_rate: 92.1,
          survey_participation: 84.7,
          document_compliance: 89.3
        },
        created_at: '2023-01-15T09:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Məktəbəqədər sektoru',
        code: 'MQS-GNC-002',
        description: 'Gəncə regionunun məktəbəqədər təhsil müəssisələri',
        region_id: 2,
        region_name: 'Gəncə regionu',
        type: 'preschool',
        is_active: true,
        address: 'Gəncə, Kəpəz rayonu, Heydər Əliyev prospekti 45',
        phone: '+994 22 444-0234',
        email: 'mektebeqeder.gence@edu.az',
        manager_id: 23,
        manager: {
          id: 23,
          first_name: 'Səbinə',
          last_name: 'Həsənova',
          username: 'sebine.hesenova',
          email: 'sebine.hesenova@edu.az',
          phone: '+994 55 987-6543'
        },
        statistics: {
          total_institutions: 89,
          total_students: 12456,
          total_teachers: 756,
          total_staff: 445,
          active_surveys: 5,
          pending_tasks: 7
        },
        institutions_breakdown: [
          { type: 'Uşaq bağçası', count: 67, percentage: 75.3 },
          { type: 'Mektebe hazirlik mərkəzi', count: 15, percentage: 16.9 },
          { type: 'Kompleks uşaq müəssisəsi', count: 7, percentage: 7.9 }
        ],
        performance_metrics: {
          response_rate: 79.2,
          task_completion_rate: 85.6,
          survey_participation: 76.8,
          document_compliance: 82.1
        },
        created_at: '2023-02-20T10:30:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Peşə təhsili sektoru',
        code: 'PTS-SUM-003',
        description: 'Sumqayıt regionunun peşə təhsili və texniki kollecləri',
        region_id: 3,
        region_name: 'Sumqayıt regionu',
        type: 'vocational',
        is_active: true,
        address: 'Sumqayıt, 1-ci mikrorayon, Vətən küçəsi 78',
        phone: '+994 18 333-0345',
        email: 'pese.tehsil.sumqayit@edu.az',
        manager: undefined,
        statistics: {
          total_institutions: 12,
          total_students: 3456,
          total_teachers: 234,
          total_staff: 89,
          active_surveys: 2,
          pending_tasks: 12
        },
        institutions_breakdown: [
          { type: 'Texniki kollec', count: 8, percentage: 66.7 },
          { type: 'Peşə məktəbi', count: 4, percentage: 33.3 }
        ],
        performance_metrics: {
          response_rate: 65.3,
          task_completion_rate: 71.8,
          survey_participation: 68.9,
          document_compliance: 74.2
        },
        created_at: '2023-03-10T14:15:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Xüsusi ehtiyaclı təhsil sektoru',
        code: 'XTS-MNZ-004',
        description: 'Mingəçevir regionunun xüsusi ehtiyaclı uşaqlar üçün təhsil müəssisələri',
        region_id: 4,
        region_name: 'Mingəçevir regionu',
        type: 'special',
        is_active: false,
        address: 'Mingəçevir, Azadlıq prospekti 23',
        phone: '+994 25 222-0456',
        email: 'xususi.tehsil.mingecevir@edu.az',
        manager_id: 31,
        manager: {
          id: 31,
          first_name: 'Rəşad',
          last_name: 'Quliyev',
          username: 'reshad.quliyev',
          email: 'reshad.quliyev@edu.az',
          phone: '+994 55 456-7890'
        },
        statistics: {
          total_institutions: 6,
          total_students: 234,
          total_teachers: 45,
          total_staff: 23,
          active_surveys: 1,
          pending_tasks: 3
        },
        institutions_breakdown: [
          { type: 'Xüsusi internat məktəbi', count: 3, percentage: 50.0 },
          { type: 'Reabilitasiya mərkəzi', count: 2, percentage: 33.3 },
          { type: 'İnkluziv təhsil mərkəzi', count: 1, percentage: 16.7 }
        ],
        performance_metrics: {
          response_rate: 58.7,
          task_completion_rate: 68.4,
          survey_participation: 62.1,
          document_compliance: 71.9
        },
        created_at: '2023-04-05T11:45:00Z',
        updated_at: new Date().toISOString()
      }
    ];
  }
}

export const coreSectorsService = new CoreSectorsService();