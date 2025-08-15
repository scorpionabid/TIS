import { apiClient } from './api';

export interface Preschool {
  id: number;
  name: string;
  short_name?: string;
  code: string;
  type: 'kindergarten' | 'preschool_center' | 'nursery';
  type_label: string;
  sector_id: number;
  sector_name: string;
  is_active: boolean;
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  manager?: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    phone?: string;
  };
  statistics: {
    total_children: number;
    total_teachers: number;
    total_staff: number;
    active_surveys: number;
    pending_tasks: number;
  };
  performance_metrics: {
    response_rate: number;
    task_completion_rate: number;
    survey_participation: number;
    document_compliance: number;
  };
  established_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PreschoolFilters {
  sector_id?: number;
  type?: 'kindergarten' | 'preschool_center' | 'nursery';
  is_active?: boolean;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'type' | 'established_date';
  sort_order?: 'asc' | 'desc';
}

export interface PreschoolCreateData {
  name: string;
  short_name?: string;
  code?: string;
  type: 'kindergarten' | 'preschool_center' | 'nursery';
  parent_id: number; // This is the sector_id
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active?: boolean;
  established_date?: string;
}

export interface PreschoolUpdateData extends Partial<PreschoolCreateData> {
  id: number;
}

export interface PreschoolStatistics {
  total_preschools: number;
  active_preschools: number;
  inactive_preschools: number;
  by_type: Array<{
    type: string;
    type_label: string;
    count: number;
    percentage: number;
  }>;
  by_sector: Array<{
    sector_id: number;
    sector_name: string;
    preschool_count: number;
    active_count: number;
  }>;
  performance_summary: {
    preschools_with_managers: number;
    preschools_without_managers: number;
    total_children: number;
    total_teachers: number;
  };
}

export interface PreschoolManager {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  experience_years?: number;
  managed_preschools_count: number;
  performance_rating?: number;
  is_active: boolean;
  assigned_at?: string;
}

export interface PreschoolAssignment {
  preschool_id: number;
  manager_id: number;
}

class PreschoolsService {
  private baseUrl = '/preschools';

  async getPreschools(filters?: PreschoolFilters): Promise<{ success: boolean; data: Preschool[] }> {
    console.log('🔍 PreschoolsService.getPreschools called with filters:', filters);
    try {
      const response = await apiClient.get<Preschool[]>(this.baseUrl, filters);
      console.log('✅ PreschoolsService.getPreschools successful:', response);
      return response as { success: boolean; data: Preschool[] };
    } catch (error) {
      console.error('❌ PreschoolsService.getPreschools failed:', error);
      throw error;
    }
  }

  async getPreschool(id: number): Promise<{ success: boolean; data: Preschool }> {
    console.log('🔍 PreschoolsService.getPreschool called for ID:', id);
    try {
      const response = await apiClient.get<Preschool>(`${this.baseUrl}/${id}`);
      console.log('✅ PreschoolsService.getPreschool successful:', response);
      return response as { success: boolean; data: Preschool };
    } catch (error) {
      console.error('❌ PreschoolsService.getPreschool failed:', error);
      throw error;
    }
  }

  async createPreschool(data: PreschoolCreateData): Promise<{ success: boolean; message: string; data: Preschool }> {
    console.log('🔍 PreschoolsService.createPreschool called with:', data);
    try {
      const response = await apiClient.post<Preschool>(this.baseUrl, data);
      console.log('✅ PreschoolsService.createPreschool successful:', response);
      return response as { success: boolean; message: string; data: Preschool };
    } catch (error) {
      console.error('❌ PreschoolsService.createPreschool failed:', error);
      throw error;
    }
  }

  async updatePreschool(id: number, data: Partial<PreschoolUpdateData>): Promise<{ success: boolean; message: string; data: Preschool }> {
    console.log('🔍 PreschoolsService.updatePreschool called for ID:', id, 'with data:', data);
    try {
      const response = await apiClient.put<Preschool>(`${this.baseUrl}/${id}`, data);
      console.log('✅ PreschoolsService.updatePreschool successful:', response);
      return response as { success: boolean; message: string; data: Preschool };
    } catch (error) {
      console.error('❌ PreschoolsService.updatePreschool failed:', error);
      throw error;
    }
  }

  async deletePreschool(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 PreschoolsService.deletePreschool called for ID:', id);
    try {
      const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ PreschoolsService.deletePreschool successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ PreschoolsService.deletePreschool failed:', error);
      throw error;
    }
  }

  async getPreschoolStatistics(): Promise<{ success: boolean; data: PreschoolStatistics }> {
    console.log('🔍 PreschoolsService.getPreschoolStatistics called');
    try {
      const response = await apiClient.get<PreschoolStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ PreschoolsService.getPreschoolStatistics successful:', response);
      return response as { success: boolean; data: PreschoolStatistics };
    } catch (error) {
      console.error('❌ PreschoolsService.getPreschoolStatistics failed:', error);
      throw error;
    }
  }

  async assignManager(preschoolId: number, managerId: number): Promise<{ success: boolean; message: string; data: Preschool }> {
    console.log('🔍 PreschoolsService.assignManager called for preschool:', preschoolId, 'manager:', managerId);
    try {
      const response = await apiClient.put<Preschool>(`${this.baseUrl}/${preschoolId}/assign-manager`, { manager_id: managerId });
      console.log('✅ PreschoolsService.assignManager successful:', response);
      return response as { success: boolean; message: string; data: Preschool };
    } catch (error) {
      console.error('❌ PreschoolsService.assignManager failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockPreschools(): Preschool[] {
    return [
      {
        id: 1,
        name: 'Narıncı uşaq bağçası',
        short_name: 'Narıncı',
        code: 'BAGCA-001',
        type: 'kindergarten',
        type_label: 'Uşaq Bağçası',
        sector_id: 7,
        sector_name: 'Səbail Rayon Təhsil Sektoru',
        is_active: true,
        address: 'Bakı, Səbail rayonu, Neftçilər prospekti 25',
        phone: '+994 12 555-0101',
        email: 'narinci.bagca@edu.az',
        manager_id: 101,
        manager: {
          id: 101,
          first_name: 'Günel',
          last_name: 'Məmmədova',
          username: 'gunel.bagca',
          email: 'gunel.memmedova@edu.az',
          phone: '+994 55 123-4501'
        },
        statistics: {
          total_children: 145,
          total_teachers: 18,
          total_staff: 25,
          active_surveys: 3,
          pending_tasks: 5
        },
        performance_metrics: {
          response_rate: 89.5,
          task_completion_rate: 94.2,
          survey_participation: 87.3,
          document_compliance: 91.8
        },
        established_date: '2010-09-01',
        created_at: '2023-01-15T09:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Günəş məktəbəqədər təhsil mərkəzi',
        short_name: 'Günəş MƏTM',
        code: 'BAGCA-002',
        type: 'preschool_center',
        type_label: 'Məktəbəqədər Təhsil Mərkəzi',
        sector_id: 8,
        sector_name: 'Nəsimi Rayon Təhsil Sektoru',
        is_active: true,
        address: 'Bakı, Nəsimi rayonu, Azadlıq prospekti 112',
        phone: '+994 12 555-0102',
        email: 'gunes.metm@edu.az',
        statistics: {
          total_children: 89,
          total_teachers: 12,
          total_staff: 16,
          active_surveys: 2,
          pending_tasks: 3
        },
        performance_metrics: {
          response_rate: 85.2,
          task_completion_rate: 88.7,
          survey_participation: 82.9,
          document_compliance: 87.1
        },
        established_date: '2015-08-15',
        created_at: '2023-02-20T10:30:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Balaca ulduzlar uşaq evi',
        short_name: 'Balaca ulduzlar',
        code: 'BAGCA-003', 
        type: 'nursery',
        type_label: 'Uşaq Evləri',
        sector_id: 9,
        sector_name: 'Yasamal Rayon Təhsil Sektoru',
        is_active: true,
        address: 'Bakı, Yasamal rayonu, Mərdəkan yolu 45',
        phone: '+994 12 555-0103',
        email: 'balaca.ulduzlar@edu.az',
        statistics: {
          total_children: 32,
          total_teachers: 6,
          total_staff: 9,
          active_surveys: 1,
          pending_tasks: 2
        },
        performance_metrics: {
          response_rate: 78.9,
          task_completion_rate: 85.4,
          survey_participation: 76.2,
          document_compliance: 82.6
        },
        established_date: '2018-05-20',
        created_at: '2023-03-10T14:15:00Z',
        updated_at: new Date().toISOString()
      }
    ];
  }

  getMockStatistics(): PreschoolStatistics {
    return {
      total_preschools: 25,
      active_preschools: 23,
      inactive_preschools: 2,
      by_type: [
        { type: 'kindergarten', type_label: 'Uşaq Bağçası', count: 18, percentage: 72.0 },
        { type: 'preschool_center', type_label: 'Məktəbəqədər Təhsil Mərkəzi', count: 5, percentage: 20.0 },
        { type: 'nursery', type_label: 'Uşaq Evləri', count: 2, percentage: 8.0 }
      ],
      by_sector: [
        { sector_id: 7, sector_name: 'Səbail Rayon Təhsil Sektoru', preschool_count: 8, active_count: 8 },
        { sector_id: 8, sector_name: 'Nəsimi Rayon Təhsil Sektoru', preschool_count: 6, active_count: 5 },
        { sector_id: 9, sector_name: 'Yasamal Rayon Təhsil Sektoru', preschool_count: 5, active_count: 5 },
        { sector_id: 10, sector_name: 'Gəncə Mərkəz Təhsil Sektoru', preschool_count: 4, active_count: 3 },
        { sector_id: 11, sector_name: 'Gəncə Kəpəz Təhsil Sektoru', preschool_count: 2, active_count: 2 }
      ],
      performance_summary: {
        preschools_with_managers: 20,
        preschools_without_managers: 5,
        total_children: 1235,
        total_teachers: 145
      }
    };
  }

  getMockManagers(): PreschoolManager[] {
    return [
      {
        id: 201,
        first_name: 'Səidə',
        last_name: 'Əliyeva',
        username: 'seide.bagca',
        email: 'seide.aliyeva@edu.az',
        phone: '+994 55 111-2234',
        role: 'bağçaadmin',
        experience_years: 12,
        managed_preschools_count: 0,
        performance_rating: 4.7,
        is_active: true,
        assigned_at: ''
      },
      {
        id: 202,
        first_name: 'Narmin',
        last_name: 'İsmayılova',
        username: 'narmin.bagca',
        email: 'narmin.ismayilova@edu.az',
        phone: '+994 55 444-5567',
        role: 'bağçaadmin',
        experience_years: 8,
        managed_preschools_count: 0,
        performance_rating: 4.4,
        is_active: true,
        assigned_at: ''
      },
      {
        id: 203,
        first_name: 'Rəna',
        last_name: 'Həsənova',
        username: 'rena.bagca',
        email: 'rena.hesenova@edu.az',
        phone: '+994 55 777-8890',
        role: 'bağçaadmin',
        experience_years: 15,
        managed_preschools_count: 0,
        performance_rating: 4.9,
        is_active: true,
        assigned_at: ''
      }
    ];
  }
}

export const preschoolsService = new PreschoolsService();