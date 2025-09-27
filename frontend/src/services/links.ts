import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface LinkShare extends BaseEntity {
  title: string;
  description?: string;
  url: string;
  link_type: 'external' | 'video' | 'form' | 'document';
  shared_by: number;
  institution_id?: number;
  share_scope: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  target_institutions?: number[];
  target_roles?: string[];
  target_departments?: number[];
  requires_login: boolean;
  expires_at?: string;
  max_clicks?: number;
  click_count: number;
  access_start_time?: string;
  access_end_time?: string;
  access_days_of_week?: number[];
  status: 'active' | 'expired' | 'disabled';
  thumbnail_url?: string;
  metadata?: Record<string, any>;
  is_featured: boolean;
  
  // Relations
  sharedBy?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface CreateLinkData {
  title: string;
  description?: string;
  url: string;
  link_type?: 'external' | 'video' | 'form' | 'document';
  share_scope: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  target_institutions?: number[];
  target_roles?: string[];
  target_departments?: number[];
  requires_login?: boolean;
  expires_at?: string;
  max_clicks?: number;
  access_start_time?: string;
  access_end_time?: string;
  access_days_of_week?: number[];
  thumbnail_url?: string;
  is_featured?: boolean;
}

export interface LinkFilters extends PaginationParams {
  link_type?: 'external' | 'video' | 'form' | 'document';
  share_scope?: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  is_featured?: boolean;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface LinkStatistics {
  total_clicks: number;
  unique_users: number;
  anonymous_clicks: number;
  recent_access_7_days: number;
  avg_daily_clicks: number;
  is_trending: boolean;
}

export interface LinkAnalytics {
  statistics: LinkStatistics;
  recent_access: Array<{
    id: number;
    user_id?: number;
    ip_address: string;
    user_agent: string;
    referrer?: string;
    created_at: string;
    user?: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
    };
  }>;
  link_info: {
    created_at: string;
    expires_at?: string;
    max_clicks?: number;
    status: string;
  };
}

export interface SharingOptions {
  targetable_institutions: Array<{
    id: number;
    name: string;
    type: string;
    level: number;
  }>;
  available_scopes: Record<string, string>;
  available_roles: string[];
  link_types: Record<string, string>;
  time_restrictions: {
    work_hours: [string, string];
    work_days: number[];
  };
}

class LinkService extends BaseService<LinkShare> {
  constructor() {
    super('/links');
  }

  async getAll(params?: LinkFilters) {
    console.log('🔍 LinkService.getAll called with params:', params);
    try {
      const response = await apiClient.get(this.baseEndpoint, params);
      console.log('✅ LinkService.getAll successful:', response);
      return response;
    } catch (error) {
      console.error('❌ LinkService.getAll failed:', error);
      throw error;
    }
  }

  async create(data: CreateLinkData): Promise<LinkShare> {
    console.log('🔥 LinkService.create called', data);

    // Enhanced debug logging for link creation
    console.log('📋 Link creation data details:', {
      title: data.title,
      description: data.description,
      url: data.url,
      link_type: data.link_type,
      share_scope: data.share_scope,
      target_institutions: data.target_institutions,
      target_roles: data.target_roles,
      target_departments: data.target_departments,
      is_featured: data.is_featured,
      expires_at: data.expires_at
    });

    try {
      const response = await apiClient.post(this.baseEndpoint, data);
      console.log('📤 API response for link create:', response);
      
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Link yaratma əməliyyatı uğursuz oldu');
      }
      
      console.log('✅ Link create successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Link create failed:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<CreateLinkData>): Promise<LinkShare> {
    console.log('🔥 LinkService.update called', id, data);
    
    try {
      const response = await apiClient.put(`${this.baseEndpoint}/${id}`, data);
      console.log('📤 API response for link update:', response);
      
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Link yeniləmə əməliyyatı uğursuz oldu');
      }
      
      console.log('✅ Link update successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Link update failed:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<LinkShare> {
    console.log('🔍 LinkService.getById called', id);
    
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}`);
      console.log('✅ LinkService.getById successful:', response);
      
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Link məlumatları tapılmadı');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ LinkService.getById failed:', error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    console.log('🔥 LinkService.delete called for:', id);
    
    try {
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}`);
      console.log('✅ Link delete successful:', response);
    } catch (error) {
      console.error('❌ Link delete failed:', error);
      throw error;
    }
  }

  async accessLink(id: number): Promise<{url: string; redirect_url: string}> {
    console.log('🔗 LinkService.accessLink called for:', id);

    try {
      const response = await apiClient.post(`${this.baseEndpoint}/${id}/access`);
      console.log('✅ Link access successful:', response);
      console.log('🔍 Response data:', response.data);

      // Backend response structure: {success: true, message: '...', data: {url: '...', redirect_url: '...'}}
      const accessData = response.data;

      if (!accessData || (!accessData.url && !accessData.redirect_url)) {
        console.error('❌ No URL data in response:', response);
        throw new Error('Link URL məlumatı tapılmadı');
      }

      // Return the URL data from response.data
      return {
        url: accessData.url || accessData.redirect_url,
        redirect_url: accessData.redirect_url || accessData.url
      };
    } catch (error) {
      console.error('❌ Link access failed:', error);
      throw error;
    }
  }

  async getStatistics(id: number): Promise<LinkAnalytics> {
    console.log('📊 LinkService.getStatistics called for:', id);
    
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}/statistics`);
      console.log('✅ Link statistics successful:', response);
      
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Link statistikaları tapılmadı');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Link statistics failed:', error);
      throw error;
    }
  }

  async getSharingOptions(): Promise<SharingOptions> {
    console.log('⚙️ LinkService.getSharingOptions called');
    
    try {
      const response = await apiClient.get('/link-shares/options/sharing');
      console.log('✅ Link sharing options successful:', response);
      
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Paylaşım seçimləri tapılmadı');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Link sharing options failed:', error);
      throw error;
    }
  }

  // Helper methods for categorization
  async getFeaturedLinks(limit = 10): Promise<LinkShare[]> {
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/featured/list`, { limit });
      return response.data || [];
    } catch (error) {
      console.error('❌ getFeaturedLinks failed:', error);
      return [];
    }
  }

  async getPopularLinks(limit = 10): Promise<LinkShare[]> {
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/popular/list`, { limit });
      return response.data || [];
    } catch (error) {
      console.error('❌ getPopularLinks failed:', error);
      return [];
    }
  }

  async getRecentLinks(limit = 10): Promise<LinkShare[]> {
    const response = await this.getAll({ 
      per_page: limit, 
      sort_by: 'created_at', 
      sort_direction: 'desc' 
    });
    return response.data?.data || [];
  }

  async getLinksByType(linkType: 'external' | 'video' | 'form' | 'document', limit = 20): Promise<LinkShare[]> {
    const response = await this.getAll({ 
      link_type: linkType, 
      per_page: limit,
      sort_by: 'created_at',
      sort_direction: 'desc'
    });
    return response.data?.data || [];
  }

  // Statistics methods
  async getLinkStats() {
    console.log('📈 LinkService.getLinkStats called');
    
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/stats`);
      console.log('✅ LinkService.getLinkStats successful:', response.data);
      
      // Transform response to match frontend expectations
      const data = response.data;
      return {
        total_links: data.total_links || 0,
        recent_links: data.recent_links || 0,
        total_clicks: data.total_clicks || 0,
        featured_links: data.featured_links || 0,
        by_type: data.type_breakdown || {
          external: 0,
          video: 0,
          form: 0,
          document: 0,
        },
        recent_activity: data.recent_activity || [],
      };
    } catch (error) {
      console.error('❌ LinkService.getLinkStats failed:', error);
      throw error;
    }
  }
}

export const linkService = new LinkService();