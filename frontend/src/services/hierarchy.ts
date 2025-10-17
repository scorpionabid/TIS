import { apiClient, ApiResponse } from './api';

export interface HierarchyNode {
  id: number | string;
  name: string;
  type: string;
  level: number;
  is_active: boolean;
  has_children: boolean;
  children_count: number;
  children: HierarchyNode[];
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  established_date?: string;
  metadata: {
    region_code?: string;
    director_name?: string;
    student_capacity?: number;
    staff_count?: number;
    department_type?: string;
    institution_id?: number;
    head_name?: string;
  };
}

export interface HierarchyPath {
  id: number;
  name: string;
  type: string;
  level: number;
}

export interface HierarchyStatistics {
  total_institutions: number;
  active_institutions: number;
  root_institutions: number;
  max_depth: number;
  by_level: Record<string, number>;
  by_type: Record<string, number>;
}

export interface HierarchyFilters {
  include_inactive?: boolean;
  max_depth?: number;
  expand_all?: boolean;
}

export interface SubTreeFilters {
  include_inactive?: boolean;
  depth?: number;
}

export interface LevelFilters {
  include_inactive?: boolean;
  parent_type?: 'ministry' | 'region' | 'sektor' | 'school';
  region_code?: string;
}

export interface UpdateInstitutionData {
  name: string;
  type: string;
  description?: string;
  is_active: boolean;
  address?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  established_date?: string;
}

export interface MoveInstitutionData {
  new_parent_id: number;
  reason?: string;
}

export interface HierarchyResponse {
  success: boolean;
  data: HierarchyNode[];
  hierarchy_stats: HierarchyStatistics;
}

export interface SubTreeResponse {
  success: boolean;
  data: HierarchyNode;
}

export interface PathResponse {
  success: boolean;
  data: HierarchyPath[];
}

export interface LevelResponse {
  success: boolean;
  data: HierarchyNode[];
  level_info: {
    level: number;
    count: number;
    types: string[];
  };
}

export interface ValidationIssue {
  type: 'orphaned_institutions' | 'level_inconsistencies' | 'circular_references';
  count: number;
  institutions?: Record<string, string>;
  chains?: string[][];
}

export interface ValidationResponse {
  success: boolean;
  data: {
    is_valid: boolean;
    issues: ValidationIssue[];
    total_issues: number;
    checked_at: string;
  };
}

export interface MoveResponse {
  success: boolean;
  message: string;
  data: HierarchyNode;
}

class HierarchyService {
  /**
   * Get the complete institution hierarchy tree
   */
  async getHierarchy(filters?: HierarchyFilters): Promise<HierarchyResponse> {
    const response = await apiClient.get<HierarchyResponse>('/hierarchy', filters);
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error('Failed to fetch hierarchy');
  }

  /**
   * Get subtree for a specific institution
   */
  async getSubTree(institutionId: number, filters?: SubTreeFilters): Promise<SubTreeResponse> {
    const response = await apiClient.get<SubTreeResponse>(
      `/hierarchy/children/${institutionId}`, 
      filters
    );
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error('Failed to fetch subtree');
  }

  /**
   * Get the path (breadcrumb) for an institution
   */
  async getInstitutionPath(institutionId: number): Promise<PathResponse> {
    const response = await apiClient.get<PathResponse>(`/hierarchy/path/${institutionId}`);
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error('Failed to fetch institution path');
  }

  /**
   * Get institutions by specific level
   */
  async getInstitutionsByLevel(level: number, filters?: LevelFilters): Promise<LevelResponse> {
    const response = await apiClient.get<LevelResponse>(
      `/institutions/level/${level}`, 
      filters
    );
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error('Failed to fetch institutions by level');
  }

  /**
   * Update an institution (SuperAdmin/RegionAdmin only)
   */
  async updateInstitution(institutionId: number, data: UpdateInstitutionData): Promise<ApiResponse<HierarchyNode>> {
    const response = await apiClient.put<ApiResponse<HierarchyNode>>(
      `/institutions/${institutionId}`, 
      data
    );
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error(response.message || 'Failed to update institution');
  }

  /**
   * Move an institution in the hierarchy (SuperAdmin/RegionAdmin only)
   */
  async moveInstitution(institutionId: number, data: MoveInstitutionData): Promise<MoveResponse> {
    const response = await apiClient.post<MoveResponse>(
      `/institutions/${institutionId}/move`, 
      data
    );
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error(response.message || 'Failed to move institution');
  }

  /**
   * Validate hierarchy structure integrity
   */
  async validateHierarchy(): Promise<ValidationResponse> {
    const response = await apiClient.get<ValidationResponse>('/institutions-hierarchy/validate');
    
    if (response.success && response.data) {
      return response;
    }
    
    throw new Error('Failed to validate hierarchy');
  }

  /**
   * Get hierarchy statistics
   */
  async getStatistics(): Promise<HierarchyStatistics> {
    const hierarchyResponse = await this.getHierarchy({ max_depth: 1 });
    return hierarchyResponse.hierarchy_stats;
  }

  /**
   * Search institutions in hierarchy
   */
  async searchInstitutions(query: string, filters?: HierarchyFilters): Promise<HierarchyNode[]> {
    const hierarchyResponse = await this.getHierarchy({ 
      expand_all: true, 
      ...filters 
    });
    
    return this.searchInHierarchy(hierarchyResponse.data, query.toLowerCase());
  }

  /**
   * Helper method to search through hierarchy tree
   */
  private searchInHierarchy(nodes: HierarchyNode[], query: string): HierarchyNode[] {
    const results: HierarchyNode[] = [];
    
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(query) || 
          node.type.toLowerCase().includes(query)) {
        results.push(node);
      }
      
      if (node.children && node.children.length > 0) {
        const childResults = this.searchInHierarchy(node.children, query);
        results.push(...childResults);
      }
    }
    
    return results;
  }

  /**
   * Get all ancestors of an institution
   */
  async getAncestors(institutionId: number): Promise<HierarchyPath[]> {
    const pathResponse = await this.getInstitutionPath(institutionId);
    // Remove the current institution from the path (last item)
    return pathResponse.data.slice(0, -1);
  }

  /**
   * Get all descendants of an institution
   */
  async getDescendants(institutionId: number): Promise<HierarchyNode[]> {
    const subtreeResponse = await this.getSubTree(institutionId, { 
      depth: 5, 
      include_inactive: false 
    });
    
    const descendants: HierarchyNode[] = [];
    this.collectDescendants(subtreeResponse.data, descendants);
    return descendants;
  }

  /**
   * Helper method to collect all descendants recursively
   */
  private collectDescendants(node: HierarchyNode, descendants: HierarchyNode[]): void {
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        descendants.push(child);
        this.collectDescendants(child, descendants);
      }
    }
  }

  /**
   * Check if user can modify hierarchy (permission check)
   */
  canModifyHierarchy(userRoles: string[]): boolean {
    return userRoles.some(role => ['superadmin', 'regionadmin'].includes(role));
  }

  /**
   * Get hierarchy breadcrumb display text
   */
  getBreadcrumbText(path: HierarchyPath[]): string {
    return path.map(item => item.name).join(' > ');
  }

  /**
   * Get institution type display name in Azerbaijani
   */
  getTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      'ministry': 'Nazirlik',
      'region': 'Regional İdarə',
      'regional_education_department': 'Regional Təhsil İdarəsi',
      'sector_education_office': 'Sektor Təhsil Şöbəsi',
      'sektor': 'Sektor',
      'school': 'Məktəb',
      'secondary_school': 'Tam Orta Məktəb',
      'gymnasium': 'Gimnasiya',
      'lyceum': 'Lisey',
      'kindergarten': 'Uşaq Bağçası',
      'preschool_center': 'Məktəbəqədər Təhsil Mərkəzi',
      'nursery': 'Uşaq Evləri',
      'vocational': 'Peşə Məktəbi',
      'special': 'Xüsusi Məktəb',
      'private': 'Özəl Məktəb',
      'department': 'Şöbə',
    };
    
    return typeMap[type] || type;
  }

  /**
   * Get institution type icon
   */
  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'ministry': '🏛️',
      'region': '🌍',
      'regional_education_department': '🌍',
      'sector_education_office': '🏢',
      'sektor': '🏢',
      'school': '🏫',
      'secondary_school': '🏫',
      'gymnasium': '🏛️',
      'lyceum': '🎓',
      'kindergarten': '🧸',
      'preschool_center': '🎓',
      'nursery': '🏡',
      'vocational': '⚙️',
      'special': '♿',
      'private': '🔒',
      'department': '📂',
    };
    
    return iconMap[type] || '🏢';
  }

  /**
   * Format hierarchy statistics for display
   */
  formatStatistics(stats: HierarchyStatistics): Array<{
    label: string;
    value: number;
    icon: string;
    color: string;
  }> {
    return [
      {
        label: 'Ümumi Müəssisələr',
        value: stats.total_institutions,
        icon: '🏢',
        color: 'text-blue-600'
      },
      {
        label: 'Aktiv Müəssisələr',
        value: stats.active_institutions,
        icon: '✅',
        color: 'text-green-600'
      },
      {
        label: 'Kök Müəssisələr',
        value: stats.root_institutions,
        icon: '🌳',
        color: 'text-purple-600'
      },
      {
        label: 'Maksimum Dərinlik',
        value: stats.max_depth,
        icon: '📊',
        color: 'text-orange-600'
      }
    ];
  }
}

export const hierarchyService = new HierarchyService();
