import { apiClient } from './apiOptimized';
import { gradeBookService } from './gradeBook';

export interface HierarchyNode {
  id: number;
  name: string;
  type: 'region' | 'sector' | 'institution' | 'grade' | 'gradebook';
  stats: {
    total?: number;
    institutions?: number;
    grade_books?: number;
    students?: number;
    average?: number;
  };
  children?: HierarchyNode[];
}

export interface HierarchyData {
  summary: {
    total_institutions?: number;
    total_sectors?: number;
    total_grade_books: number;
    total_students: number;
    average_score: number;
  };
  items: HierarchyNode[];
}

export interface AnalysisParams {
  view_type: 'institution' | 'sector' | 'region' | 'subject' | 'grade';
  compare_by: 'time' | 'level' | 'subject';
  metrics?: string[];
  region_id?: number;
  sector_id?: number;
  institution_id?: number;
  academic_year_id?: number;
}

export interface AnalysisData {
  chart_data?: any[];
  comparison_data?: any[];
  rankings?: any[];
  metrics?: {
    growth_rate?: number;
    average_score?: number;
    best_month?: string;
    worst_month?: string;
  };
}

export interface BulkExportParams {
  level: 'sector' | 'region' | 'institution';
  sector_id?: number;
  region_id?: number;
  institution_id?: number;
  academic_year_id?: number;
  format: 'excel' | 'pdf' | 'csv';
  include?: string[];
}

/**
 * GradeBookAdminService - Hierarchical data and admin operations
 */
class GradeBookAdminService {
  private baseUrl = '/grade-books';

  /**
   * Get hierarchical data (region/sector/institution/grade)
   */
  async getHierarchy(
    level: 'region' | 'sector' | 'institution' | 'grade',
    filters: {
      region_id?: number;
      sector_id?: number;
      institution_id?: number;
      academic_year_id?: number;
    }
  ): Promise<{ data: HierarchyData }> {
    const response = await apiClient.get(`${this.baseUrl}/hierarchy`, {
      params: { level, ...filters },
    });
    return response.data;
  }

  /**
   * Get region summary with all sectors and institutions
   */
  async getRegionSummary(
    regionId: number,
    academicYearId?: number
  ): Promise<{ data: HierarchyData }> {
    return this.getHierarchy('region', { region_id: regionId, academic_year_id: academicYearId });
  }

  /**
   * Get sector summary with all institutions
   */
  async getSectorSummary(
    sectorId: number,
    academicYearId?: number
  ): Promise<{ data: HierarchyData }> {
    return this.getHierarchy('sector', { sector_id: sectorId, academic_year_id: academicYearId });
  }

  /**
   * Get institution hierarchy with grades
   */
  async getInstitutionHierarchy(
    institutionId: number,
    academicYearId?: number
  ): Promise<{ data: HierarchyData }> {
    return this.getHierarchy('institution', { institution_id: institutionId, academic_year_id: academicYearId });
  }

  /**
   * Get multi-level analysis data
   */
  async getMultiLevelAnalysis(params: AnalysisParams): Promise<{ data: AnalysisData }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/multi-level`, {
      params: params,
    });
    return response.data;
  }

  /**
   * Get institutions by sector
   */
  async getInstitutionsBySector(sectorId: number): Promise<{ id: number; name: string }[]> {
    const response = await apiClient.get('/institutions', {
      params: { sector_id: sectorId, status: 'active' },
    });
    return response.data.data || [];
  }

  /**
   * Get sectors by region
   */
  async getSectorsByRegion(regionId: number): Promise<{ id: number; name: string }[]> {
    const response = await apiClient.get('/sectors', {
      params: { region_id: regionId },
    });
    return response.data.data || [];
  }

  /**
   * Bulk export grade books
   */
  async bulkExport(params: BulkExportParams): Promise<Blob> {
    const response = await apiClient.post(`${this.baseUrl}/bulk-export`, params, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Download export file
   */
  downloadExport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

export const gradeBookAdminService = new GradeBookAdminService();
export default gradeBookAdminService;
