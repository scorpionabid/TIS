import { apiClient as api } from './api';
import type {
  DocumentCollection,
  CreateRegionalFoldersRequest,
  UpdateFolderRequest,
  DeleteFolderRequest,
  FolderWithDocuments,
  FolderAuditLog,
} from '../types/documentCollection';

class DocumentCollectionService {
  private basePath = '/document-collections';

  /**
   * Get all accessible folders for current user
   */
  async getAll(): Promise<DocumentCollection[]> {
    const response = await api.get<{ success: boolean; data: DocumentCollection[] }>(this.basePath);
    // apiOptimized returns the data directly from Laravel, not wrapped in another .data
    // Laravel returns: {success: true, data: [...]}
    // apiOptimized.handleResponse returns this directly, so response IS the Laravel response
    return (response as any).data || [];
  }

  /**
   * Get specific folder with its documents
   */
  async getById(folderId: number): Promise<FolderWithDocuments> {
    const response = await api.get<{ success: boolean; data: { folder: DocumentCollection; documents: any[] } }>(
      `${this.basePath}/${folderId}`
    );
    // Backend returns {success: true, data: {folder: {...}, documents: [...]}}
    // We need to merge folder and documents into FolderWithDocuments format
    const backendData = (response as any).data;
    return {
      ...backendData.folder,
      documents: backendData.documents || []
    };
  }

  /**
   * Get specific folder with paginated and filtered documents (optimized for 600+ institutions)
   */
  async getByIdPaginated(
    folderId: number,
    params?: {
      page?: number;
      per_page?: number;
      search?: string;
      region_id?: number;
      sector_id?: number;
      file_type?: string;
      sort_by?: string;
      sort_direction?: string;
    }
  ): Promise<{
    data: {
      folder: DocumentCollection;
      institutions: any[];
    };
    meta: {
      current_page: number;
      per_page: number;
      total_institutions: number;
      total_pages: number;
      total_documents: number;
      total_size: number;
      from: number;
      to: number;
    };
  }> {
    const response = await api.get(`${this.basePath}/${folderId}`, params);
    return response as any;
  }

  /**
   * Create regional folders from templates
   */
  async createRegionalFolders(data: CreateRegionalFoldersRequest): Promise<DocumentCollection[]> {
    const response = await api.post<{ success: boolean; data: DocumentCollection[] }>(
      `${this.basePath}/regional`,
      data
    );
    return (response as any).data;
  }

  /**
   * Update/rename folder
   */
  async update(folderId: number, data: UpdateFolderRequest): Promise<DocumentCollection> {
    const response = await api.put<{ success: boolean; data: DocumentCollection }>(
      `${this.basePath}/${folderId}`,
      data
    );
    return (response as any).data;
  }

  /**
   * Delete folder with cascade deletion
   */
  async delete(folderId: number, data?: DeleteFolderRequest): Promise<void> {
    await api.delete(`${this.basePath}/${folderId}`, { data });
  }

  /**
   * Bulk download folder contents as ZIP
   */
  async bulkDownload(folderId: number): Promise<Blob> {
    const response = await api.get(
      `${this.basePath}/${folderId}/download`,
      undefined, // params
      { responseType: 'blob' } // options
    );
    return response.data;
  }

  /**
   * Get folder audit logs
   */
  async getAuditLogs(folderId: number): Promise<FolderAuditLog[]> {
    const response = await api.get<{ success: boolean; data: FolderAuditLog[] }>(
      `${this.basePath}/${folderId}/audit-logs`
    );
    return (response as any).data;
  }

  /**
   * Upload document to folder
   */
  async uploadDocument(folderId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `${this.basePath}/${folderId}/documents`,
      formData
    );
    return (response as any).data;
  }

  /**
   * Delete document from folder
   */
  async deleteDocument(documentId: number): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  }

  /**
   * Download document by ID
   */
  async downloadDocument(documentId: number): Promise<Blob> {
    // IMPORTANT: Pass responseType in third argument (options), NOT in params
    const response = await api.get(
      `/documents/${documentId}/download`,
      undefined, // params
      { responseType: 'blob' } // options
    );

    // apiOptimized returns {data: blob} for blob responses
    const blob = response.data || response;

    if (!(blob instanceof Blob)) {
      throw new Error('Invalid file response from server');
    }

    return blob;
  }

  /**
   * Download blob as file
   */
  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new DocumentCollectionService();
