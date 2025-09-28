import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Document extends BaseEntity {
  title: string;
  description?: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_extension: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  access_level: 'public' | 'regional' | 'sectoral' | 'institution';
  category?: string;
  tags?: string[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  is_public: boolean;
  is_downloadable: boolean;
  is_viewable_online: boolean;
  uploaded_by: number;
  institution_id: number;
  allowed_users?: number[];
  allowed_roles?: string[];
  allowed_institutions?: number[];
  accessible_institutions?: number[];
  accessible_departments?: number[];
  expires_at?: string;
  published_at?: string;
  archived_at?: string;
  version?: string;
  is_latest_version?: boolean;
  parent_document_id?: number;
  uploader?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  institution?: {
    id: number;
    name: string;
    name_en?: string;
  };
  // Legacy support
  filename?: string;
  original_name?: string;
  shared_with?: string[];
  download_count?: number;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  category?: string;
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
  tags?: string[];
  allowed_users?: number[];
  allowed_roles?: string[];
  allowed_institutions?: number[];
  accessible_institutions?: number[];
  accessible_departments?: number[];
  is_public?: boolean;
  is_downloadable?: boolean;
  is_viewable_online?: boolean;
  expires_at?: string;
  file: File;
  // Legacy support
  shared_with?: string[];
}

export interface DocumentFilters extends PaginationParams {
  category?: string;
  uploaded_by?: number;
  is_public?: boolean;
  mime_type?: string;
  expires_after?: string;
  expires_before?: string;
  institution_id?: number;
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
}

export interface DocumentStats {
  total: number;
  total_size: number;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
  recent_uploads: number;
  public_documents: number;
}

class DocumentService extends BaseService<Document> {
  constructor() {
    super('/documents');
  }

  async uploadDocument(data: CreateDocumentData): Promise<Document> {
    const formData = new FormData();

    // Add file
    formData.append('file', data.file);

    // Add other fields with proper boolean handling
    Object.keys(data).forEach(key => {
      if (key !== 'file' && data[key as keyof CreateDocumentData] !== undefined) {
        const value = data[key as keyof CreateDocumentData];
        if (Array.isArray(value)) {
          // Only add array if it has items
          if (value.length > 0) {
            value.forEach(item => formData.append(`${key}[]`, item));
          }
        } else if (typeof value === 'boolean') {
          // Laravel expects '1' for true, '0' for false in FormData
          formData.append(key, value ? '1' : '0');
          console.log(`🔄 Boolean field ${key}: ${value} -> ${value ? '1' : '0'}`);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    // Debug log
    console.log('📤 Document upload data:', {
      title: data.title,
      description: data.description,
      category: data.category,
      accessible_institutions: data.accessible_institutions,
      accessible_departments: data.accessible_departments,
      is_public: data.is_public,
      fileSize: data.file.size,
      fileName: data.file.name,
      fileType: data.file.type
    });

    // Use apiClient's internal method for FormData uploads with proper CSRF and credentials
    const response = await this.uploadFormData(formData);
    return response.data;
  }

  // Custom FormData upload method that uses apiClient infrastructure
  private async uploadFormData(formData: FormData): Promise<{ data: Document }> {
    // Ensure CSRF cookie is initialized (same as apiClient does)
    const sanctumUrl = `${(apiClient as any).baseURL.replace('/api', '')}/sanctum/csrf-cookie`;

    try {
      await fetch(sanctumUrl, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      console.log('🔐 CSRF cookie initialized for file upload');
    } catch (error) {
      console.error('❌ Failed to initialize CSRF cookie:', error);
      throw new Error('Unable to initialize secure session for file upload');
    }

    // Get headers from apiClient but exclude Content-Type for FormData
    const headers = { ...((apiClient as any).getHeaders()) };
    delete headers['Content-Type']; // Let browser set multipart/form-data with boundary

    console.log('🚀 FormData upload request:', {
      url: `${(apiClient as any).baseURL}${this.baseEndpoint}`,
      method: 'POST',
      headers: headers,
      credentials: 'include',
      formDataEntries: [...formData.entries()].map(([key, value]) => ({
        key,
        value: value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
      }))
    });

    const response = await fetch(`${(apiClient as any).baseURL}${this.baseEndpoint}`, {
      method: 'POST',
      headers: headers,
      credentials: 'include', // Important for Sanctum SPA
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Document upload failed:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });

      // Try to parse JSON error for better debugging
      try {
        const errorJson = JSON.parse(errorText);
        console.error('📋 Detailed error response:', errorJson);
        if (errorJson.errors) {
          console.error('🔍 Validation errors:', errorJson.errors);
        }
        if (errorJson.message) {
          console.error('💬 Error message:', errorJson.message);
        }

        // Enhanced error message for user
        const userMessage = errorJson.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(userMessage);
      } catch (parseError) {
        console.error('📋 Raw error response:', errorText);
        console.error('⚠️ Failed to parse error JSON:', parseError);
        throw new Error(`Document upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const result = await response.json();
    return result;
  }

  async downloadDocument(id: number): Promise<Blob> {
    try {
      console.log('📥 Downloading document:', id);

      // Use apiClient for proper authentication and error handling
      const response = await apiClient.get(`${this.baseEndpoint}/${id}/download`, {}, {
        responseType: 'blob'
      });

      console.log('✅ Document download successful, response:', response);

      // ApiClient returns { data: blob } structure for blob responses
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data as Blob;
      } else {
        // Fallback for direct blob response
        return response as Blob;
      }
    } catch (error) {
      console.error('❌ Document download failed:', error);
      throw new Error('Download failed');
    }
  }


  async getSharedWithMe(params?: PaginationParams) {
    const response = await apiClient.get<Document[]>(`${this.baseEndpoint}/shared-with-me`, params);
    return response as any; // PaginatedResponse
  }

  async getMyUploads(params?: PaginationParams) {
    const response = await apiClient.get<Document[]>(`${this.baseEndpoint}/my-uploads`, params);
    return response as any; // PaginatedResponse
  }

  async getPublicDocuments(params?: PaginationParams) {
    const response = await apiClient.get<Document[]>(`${this.baseEndpoint}/public`, params);
    return response as any; // PaginatedResponse
  }

  async getStats(): Promise<DocumentStats> {
    const response = await apiClient.get<DocumentStats>(`${this.baseEndpoint}/stats`);
    if (!response.data) {
      throw new Error('Failed to get document statistics');
    }
    return response.data;
  }

  async updatePermissions(id: number, permissions: { is_public?: boolean; shared_with?: string[]; expires_at?: string }) {
    const response = await apiClient.put(`${this.baseEndpoint}/${id}/permissions`, permissions);
    return response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>(`${this.baseEndpoint}/categories`);
    return response.data || [];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel')) return '📊';
    if (mimeType.includes('powerpoint')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  }

  async shareDocument(id: number, shareData: {
    share_type: 'view' | 'edit';
    user_ids?: number[];
    role_names?: string[];
    institution_ids?: number[];
    message?: string;
    expires_at?: string;
    allow_download?: boolean;
    allow_reshare?: boolean;
  }): Promise<any> {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/share`, shareData);
    return response.data;
  }

  async createPublicLink(id: number, linkData: {
    expires_at?: string;
    allow_download?: boolean;
    max_downloads?: number;
    password?: string;
  }): Promise<{ public_url: string; expires_at?: string; share_id: number }> {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/public-link`, linkData);
    return response.data;
  }

  async revokeShare(shareId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/shares/${shareId}/revoke`);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Regional filtering awareness methods
  getAccessLevelLabel(accessLevel: string): string {
    switch (accessLevel) {
      case 'public': return 'Hamı görə bilər';
      case 'regional': return 'Region daxilində';
      case 'sectoral': return 'Sektor daxilində';  
      case 'institution': return 'Müəssisə daxilində';
      default: return accessLevel;
    }
  }

  getCategoryLabel(category: string): string {
    const categoryLabels: Record<string, string> = {
      'administrative': 'İdarəetmə sənədləri',
      'financial': 'Maliyyə sənədləri',
      'educational': 'Təhsil materialları',
      'hr': 'İnsan resursları',
      'technical': 'Texniki sənədlər',
      'legal': 'Hüquqi sənədlər',
      'reports': 'Hesabatlar',
      'forms': 'Formalar',
      'other': 'Digər'
    };
    return categoryLabels[category] || category;
  }

  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'draft': 'Qaralama',
      'active': 'Aktiv', 
      'archived': 'Arxivlənmiş',
      'deleted': 'Silinmiş'
    };
    return statusLabels[status] || status;
  }

  getFileTypeLabel(fileType: string): string {
    const fileTypeLabels: Record<string, string> = {
      'pdf': 'PDF sənədləri',
      'excel': 'Excel faylları',
      'word': 'Word sənədləri',
      'image': 'Şəkillər',
      'other': 'Digər'
    };
    return fileTypeLabels[fileType] || fileType;
  }

  // Get documents filtered by region (this will be handled by backend automatically)
  async getRegionalDocuments(params?: DocumentFilters) {
    // The backend automatically filters by user's regional permissions
    return this.getAll(params);
  }

  // Get documents for specific access level
  async getByAccessLevel(accessLevel: 'public' | 'regional' | 'sectoral' | 'institution', params?: DocumentFilters) {
    return this.getAll({ ...params, access_level: accessLevel });
  }
}

export const documentService = new DocumentService();