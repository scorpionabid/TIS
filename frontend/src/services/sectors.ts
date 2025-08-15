import { apiClient } from './api';

export interface Sector {
  id: number;
  name: string;
  code: string;
  description?: string;
  region_id: number;
  region_name: string;
  type: 'primary' | 'secondary' | 'preschool' | 'vocational' | 'special' | 'mixed';
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
    total_institutions: number;
    total_students: number;
    total_teachers: number;
    total_staff: number;
    active_surveys: number;
    pending_tasks: number;
  };
  institutions_breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    response_rate: number;
    task_completion_rate: number;
    survey_participation: number;
    document_compliance: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SectorFilters {
  region_id?: number;
  type?: string;
  is_active?: boolean;
  manager_id?: number;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'total_institutions' | 'total_students';
  sort_order?: 'asc' | 'desc';
}

export interface SectorCreateData {
  name: string;
  code?: string;
  description?: string;
  parent_id: number; // This is the region_id in Institution model
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active?: boolean;
}

export interface SectorUpdateData extends Partial<SectorCreateData> {
  id: number;
}

export interface SectorStatistics {
  total_sectors: number;
  active_sectors: number;
  inactive_sectors: number;
  by_region: Array<{
    region_id: number;
    region_name: string;
    sector_count: number;
    total_institutions: number;
    total_students: number;
  }>;
  by_type: Array<{
    type: string;
    count: number;
    percentage: number;
    avg_institutions_per_sector: number;
  }>;
  performance_summary: {
    avg_response_rate: number;
    avg_task_completion: number;
    sectors_above_target: number;
    sectors_below_target: number;
  };
  geographic_distribution: Array<{
    region: string;
    latitude: number;
    longitude: number;
    sector_count: number;
    coverage_area: number;
  }>;
}

export interface SectorManager {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  experience_years: number;
  managed_sectors_count: number;
  performance_rating: number;
  is_active: boolean;
  assigned_at: string;
}

export interface SectorAssignment {
  sector_id: number;
  manager_id: number;
}

export interface SectorTask {
  id: number;
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  progress: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_by: number;
  assigned_to?: number;
  assigned_institution_id: number;
  target_scope: 'specific' | 'regional' | 'sectoral' | 'all';
  target_institutions?: number[];
  target_roles?: string[];
  notes?: string;
  completion_notes?: string;
  requires_approval: boolean;
  approved_by?: number;
  approved_at?: string;
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  assignee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SectorTaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  sort_by?: 'created_at' | 'deadline' | 'title' | 'priority';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
}

export interface SectorTaskCreateData {
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  target_scope: 'specific' | 'regional' | 'sectoral' | 'all';
  target_institutions?: number[];
  target_roles?: string[];
  assigned_to?: number;
  notes?: string;
  requires_approval?: boolean;
}

export interface SectorTaskStatistics {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  by_category: {
    report: number;
    maintenance: number;
    event: number;
    audit: number;
    instruction: number;
    other: number;
  };
  completion_rate: number;
}

export interface SectorDocument {
  id: number;
  title: string;
  description?: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_extension: string;
  mime_type: string;
  file_size: number;
  file_type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  uploaded_by: number;
  institution_id: number;
  category: 'administrative' | 'financial' | 'educational' | 'hr' | 'technical' | 'legal' | 'reports' | 'forms' | 'other';
  status: 'draft' | 'active' | 'archived' | 'deleted';
  is_public: boolean;
  is_downloadable: boolean;
  is_viewable_online: boolean;
  expires_at?: string;
  published_at?: string;
  version: string;
  is_latest_version: boolean;
  allowed_institutions?: number[];
  accessible_institutions?: number[];
  uploader?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
  formatted_file_size?: string;
  download_url?: string;
  preview_url?: string;
}

export interface SectorDocumentFilters {
  category?: string;
  access_level?: string;
  file_type?: string;
  search?: string;
  sort_by?: 'created_at' | 'title' | 'file_size' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
}

export interface SectorDocumentUploadData {
  file: File;
  title: string;
  description?: string;
  category: 'administrative' | 'financial' | 'educational' | 'hr' | 'technical' | 'legal' | 'reports' | 'forms' | 'other';
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  is_downloadable?: boolean;
  is_viewable_online?: boolean;
  expires_at?: string;
  allowed_institutions?: number[];
}

export interface SectorDocumentStatistics {
  total_documents: number;
  total_size: number;
  by_category: {
    administrative: number;
    financial: number;
    educational: number;
    hr: number;
    technical: number;
    legal: number;
    reports: number;
    forms: number;
    other: number;
  };
  by_file_type: {
    pdf: number;
    excel: number;
    word: number;
    image: number;
    other: number;
  };
  by_access_level: {
    public: number;
    sectoral: number;
    regional: number;
    institution: number;
  };
  recent_uploads: number;
  expiring_soon: number;
}

export interface SectorDocumentShareData {
  target_institutions: number[];
  access_type: 'view' | 'download';
  expires_at?: string;
  message?: string;
}


class SectorsService {
  private baseUrl = '/sectors';

  async getSectors(filters?: SectorFilters): Promise<{ success: boolean; data: Sector[] }> {
    console.log('🔍 SectorsService.getSectors called with filters:', filters);
    try {
      const response = await apiClient.get<Sector[]>(this.baseUrl, filters);
      console.log('✅ SectorsService.getSectors successful:', response);
      return response as { success: boolean; data: Sector[] };
    } catch (error) {
      console.error('❌ SectorsService.getSectors failed:', error);
      throw error;
    }
  }

  async getSector(id: number): Promise<{ success: boolean; data: Sector }> {
    console.log('🔍 SectorsService.getSector called for ID:', id);
    try {
      const response = await apiClient.get<Sector>(`${this.baseUrl}/${id}`);
      console.log('✅ SectorsService.getSector successful:', response);
      return response as { success: boolean; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.getSector failed:', error);
      throw error;
    }
  }

  async createSector(data: SectorCreateData): Promise<{ success: boolean; message: string; data: Sector }> {
    console.log('🔍 SectorsService.createSector called with:', data);
    try {
      const response = await apiClient.post<Sector>(this.baseUrl, data);
      console.log('✅ SectorsService.createSector successful:', response);
      return response as { success: boolean; message: string; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.createSector failed:', error);
      throw error;
    }
  }

  async updateSector(id: number, data: Partial<SectorUpdateData>): Promise<{ success: boolean; message: string; data: Sector }> {
    console.log('🔍 SectorsService.updateSector called for ID:', id, 'with data:', data);
    try {
      const response = await apiClient.put<Sector>(`${this.baseUrl}/${id}`, data);
      console.log('✅ SectorsService.updateSector successful:', response);
      return response as { success: boolean; message: string; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.updateSector failed:', error);
      throw error;
    }
  }

  async deleteSector(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SectorsService.deleteSector called for ID:', id);
    try {
      const response = await apiClient.delete<void>(`${this.baseUrl}/${id}`);
      console.log('✅ SectorsService.deleteSector successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SectorsService.deleteSector failed:', error);
      throw error;
    }
  }

  async getSectorStatistics(): Promise<{ success: boolean; data: SectorStatistics }> {
    console.log('🔍 SectorsService.getSectorStatistics called');
    try {
      const response = await apiClient.get<SectorStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ SectorsService.getSectorStatistics successful:', response);
      return response as { success: boolean; data: SectorStatistics };
    } catch (error) {
      console.error('❌ SectorsService.getSectorStatistics failed:', error);
      throw error;
    }
  }

  async getAvailableManagers(): Promise<{ success: boolean; data: SectorManager[] }> {
    console.log('🔍 SectorsService.getAvailableManagers called');
    try {
      const response = await apiClient.get<SectorManager[]>(`${this.baseUrl}/managers/available`);
      console.log('✅ SectorsService.getAvailableManagers successful:', response);
      return response as { success: boolean; data: SectorManager[] };
    } catch (error) {
      console.error('❌ SectorsService.getAvailableManagers failed:', error);
      throw error;
    }
  }

  async assignManager(sectorId: number, managerId: number): Promise<{ success: boolean; message: string; data: Sector }> {
    console.log('🔍 SectorsService.assignManager called for sector:', sectorId, 'manager:', managerId);
    try {
      const response = await apiClient.put<Sector>(`${this.baseUrl}/${sectorId}`, { manager_id: managerId });
      console.log('✅ SectorsService.assignManager successful:', response);
      return response as { success: boolean; message: string; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.assignManager failed:', error);
      throw error;
    }
  }

  async unassignManager(sectorId: number): Promise<{ success: boolean; message: string; data: Sector }> {
    console.log('🔍 SectorsService.unassignManager called for sector:', sectorId);
    try {
      const response = await apiClient.put<Sector>(`${this.baseUrl}/${sectorId}`, { manager_id: null });
      console.log('✅ SectorsService.unassignManager successful:', response);
      return response as { success: boolean; message: string; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.unassignManager failed:', error);
      throw error;
    }
  }


  async toggleSectorStatus(id: number): Promise<{ success: boolean; message: string; data: Sector }> {
    console.log('🔍 SectorsService.toggleSectorStatus called for ID:', id);
    try {
      const response = await apiClient.post<Sector>(`${this.baseUrl}/${id}/toggle-status`, {});
      console.log('✅ SectorsService.toggleSectorStatus successful:', response);
      return response as { success: boolean; message: string; data: Sector };
    } catch (error) {
      console.error('❌ SectorsService.toggleSectorStatus failed:', error);
      throw error;
    }
  }

  async getSectorsByRegion(regionId: number): Promise<{ success: boolean; data: Sector[] }> {
    console.log('🔍 SectorsService.getSectorsByRegion called for region:', regionId);
    try {
      const response = await apiClient.get<Sector[]>(`${this.baseUrl}`, { region_id: regionId });
      console.log('✅ SectorsService.getSectorsByRegion successful:', response);
      return response as { success: boolean; data: Sector[] };
    } catch (error) {
      console.error('❌ SectorsService.getSectorsByRegion failed:', error);
      throw error;
    }
  }

  // Task Management Methods
  async getSectorTasks(sectorId: number, filters?: SectorTaskFilters): Promise<{ 
    success: boolean; 
    data: { 
      data: SectorTask[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    } 
  }> {
    console.log('🔍 SectorsService.getSectorTasks called for sector:', sectorId, 'with filters:', filters);
    try {
      const response = await apiClient.get<{ 
        data: SectorTask[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      }>(`${this.baseUrl}/${sectorId}/tasks`, filters);
      console.log('✅ SectorsService.getSectorTasks successful:', response);
      return response as { success: boolean; data: { data: SectorTask[]; current_page: number; last_page: number; per_page: number; total: number; } };
    } catch (error) {
      console.error('❌ SectorsService.getSectorTasks failed:', error);
      throw error;
    }
  }

  async createSectorTask(sectorId: number, data: SectorTaskCreateData): Promise<{ 
    success: boolean; 
    message: string; 
    data: SectorTask 
  }> {
    console.log('🔍 SectorsService.createSectorTask called for sector:', sectorId, 'with data:', data);
    try {
      const response = await apiClient.post<SectorTask>(`${this.baseUrl}/${sectorId}/tasks`, data);
      console.log('✅ SectorsService.createSectorTask successful:', response);
      return response as { success: boolean; message: string; data: SectorTask };
    } catch (error) {
      console.error('❌ SectorsService.createSectorTask failed:', error);
      throw error;
    }
  }

  async getSectorTaskStatistics(sectorId: number): Promise<{ 
    success: boolean; 
    data: SectorTaskStatistics 
  }> {
    console.log('🔍 SectorsService.getSectorTaskStatistics called for sector:', sectorId);
    try {
      const response = await apiClient.get<SectorTaskStatistics>(`${this.baseUrl}/${sectorId}/tasks/statistics`);
      console.log('✅ SectorsService.getSectorTaskStatistics successful:', response);
      return response as { success: boolean; data: SectorTaskStatistics };
    } catch (error) {
      console.error('❌ SectorsService.getSectorTaskStatistics failed:', error);
      throw error;
    }
  }

  // Document Management Methods
  async getSectorDocuments(sectorId: number, filters?: SectorDocumentFilters): Promise<{ 
    success: boolean; 
    data: { 
      data: SectorDocument[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    } 
  }> {
    console.log('🔍 SectorsService.getSectorDocuments called for sector:', sectorId, 'with filters:', filters);
    try {
      const response = await apiClient.get<{ 
        data: SectorDocument[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      }>(`${this.baseUrl}/${sectorId}/documents`, filters);
      console.log('✅ SectorsService.getSectorDocuments successful:', response);
      return response as { success: boolean; data: { data: SectorDocument[]; current_page: number; last_page: number; per_page: number; total: number; } };
    } catch (error) {
      console.error('❌ SectorsService.getSectorDocuments failed:', error);
      throw error;
    }
  }

  async uploadSectorDocument(sectorId: number, data: SectorDocumentUploadData): Promise<{ 
    success: boolean; 
    message: string; 
    data: SectorDocument 
  }> {
    console.log('🔍 SectorsService.uploadSectorDocument called for sector:', sectorId, 'with data:', data);
    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('access_level', data.access_level);
      if (data.is_downloadable !== undefined) formData.append('is_downloadable', data.is_downloadable.toString());
      if (data.is_viewable_online !== undefined) formData.append('is_viewable_online', data.is_viewable_online.toString());
      if (data.expires_at) formData.append('expires_at', data.expires_at);
      if (data.allowed_institutions) {
        data.allowed_institutions.forEach((id, index) => {
          formData.append(`allowed_institutions[${index}]`, id.toString());
        });
      }

      const response = await apiClient.post<SectorDocument>(`${this.baseUrl}/${sectorId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ SectorsService.uploadSectorDocument successful:', response);
      return response as { success: boolean; message: string; data: SectorDocument };
    } catch (error) {
      console.error('❌ SectorsService.uploadSectorDocument failed:', error);
      throw error;
    }
  }

  async getSectorDocumentStatistics(sectorId: number): Promise<{ 
    success: boolean; 
    data: SectorDocumentStatistics 
  }> {
    console.log('🔍 SectorsService.getSectorDocumentStatistics called for sector:', sectorId);
    try {
      const response = await apiClient.get<SectorDocumentStatistics>(`${this.baseUrl}/${sectorId}/documents/statistics`);
      console.log('✅ SectorsService.getSectorDocumentStatistics successful:', response);
      return response as { success: boolean; data: SectorDocumentStatistics };
    } catch (error) {
      console.error('❌ SectorsService.getSectorDocumentStatistics failed:', error);
      throw error;
    }
  }

  async shareSectorDocument(sectorId: number, documentId: number, data: SectorDocumentShareData): Promise<{ 
    success: boolean; 
    message: string; 
    data: any 
  }> {
    console.log('🔍 SectorsService.shareSectorDocument called for sector:', sectorId, 'document:', documentId, 'with data:', data);
    try {
      const response = await apiClient.post<any>(`${this.baseUrl}/${sectorId}/documents/${documentId}/share`, data);
      console.log('✅ SectorsService.shareSectorDocument successful:', response);
      return response as { success: boolean; message: string; data: any };
    } catch (error) {
      console.error('❌ SectorsService.shareSectorDocument failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
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

  getMockStatistics(): SectorStatistics {
    return {
      total_sectors: 45,
      active_sectors: 38,
      inactive_sectors: 7,
      by_region: [
        { region_id: 1, region_name: 'Bakı regionu', sector_count: 12, total_institutions: 567, total_students: 89456 },
        { region_id: 2, region_name: 'Gəncə regionu', sector_count: 8, total_institutions: 234, total_students: 34567 },
        { region_id: 3, region_name: 'Sumqayıt regionu', sector_count: 6, total_institutions: 156, total_students: 23456 },
        { region_id: 4, region_name: 'Mingəçevir regionu', sector_count: 4, total_institutions: 89, total_students: 12345 },
        { region_id: 5, region_name: 'Digər regionlar', sector_count: 15, total_institutions: 445, total_students: 56789 }
      ],
      by_type: [
        { type: 'secondary', count: 18, percentage: 40.0, avg_institutions_per_sector: 28.5 },
        { type: 'preschool', count: 12, percentage: 26.7, avg_institutions_per_sector: 15.3 },
        { type: 'primary', count: 8, percentage: 17.8, avg_institutions_per_sector: 22.1 },
        { type: 'vocational', count: 4, percentage: 8.9, avg_institutions_per_sector: 12.8 },
        { type: 'special', count: 2, percentage: 4.4, avg_institutions_per_sector: 8.5 },
        { type: 'mixed', count: 1, percentage: 2.2, avg_institutions_per_sector: 35.0 }
      ],
      performance_summary: {
        avg_response_rate: 76.8,
        avg_task_completion: 83.2,
        sectors_above_target: 28,
        sectors_below_target: 17
      },
      geographic_distribution: [
        { region: 'Bakı', latitude: 40.4093, longitude: 49.8671, sector_count: 12, coverage_area: 2130.0 },
        { region: 'Gəncə', latitude: 40.6828, longitude: 46.3606, sector_count: 8, coverage_area: 1789.0 },
        { region: 'Sumqayıt', latitude: 40.5897, longitude: 49.6688, sector_count: 6, coverage_area: 983.0 },
        { region: 'Mingəçevir', latitude: 40.7642, longitude: 47.0596, sector_count: 4, coverage_area: 1456.0 }
      ]
    };
  }

  getMockManagers(): SectorManager[] {
    return [
      {
        id: 45,
        first_name: 'Arif',
        last_name: 'İbrahimov',
        email: 'arif.ibrahimov@edu.az',
        phone: '+994 55 111-2233',
        role: 'SektorAdmin',
        experience_years: 8,
        managed_sectors_count: 0,
        performance_rating: 4.6,
        is_active: true,
        assigned_at: ''
      },
      {
        id: 67,
        first_name: 'Leyla',
        last_name: 'Əhmədova',
        email: 'leyla.ahmedova@edu.az',
        phone: '+994 55 444-5566',
        role: 'SektorAdmin',
        experience_years: 5,
        managed_sectors_count: 0,
        performance_rating: 4.3,
        is_active: true,
        assigned_at: ''
      },
      {
        id: 89,
        first_name: 'Tural',
        last_name: 'Nərimanov',
        email: 'tural.nerimanov@edu.az',
        phone: '+994 55 777-8899',
        role: 'SektorAdmin',
        experience_years: 12,
        managed_sectors_count: 0,
        performance_rating: 4.8,
        is_active: true,
        assigned_at: ''
      }
    ];
  }
}

export const sectorsService = new SectorsService();