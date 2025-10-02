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
    return response.data.data;
  }

  /**
   * Get specific folder with its documents
   */
  async getById(folderId: number): Promise<FolderWithDocuments> {
    const response = await api.get<{ success: boolean; data: FolderWithDocuments }>(
      `${this.basePath}/${folderId}`
    );
    return response.data.data;
  }

  /**
   * Create regional folders from templates
   */
  async createRegionalFolders(data: CreateRegionalFoldersRequest): Promise<DocumentCollection[]> {
    const response = await api.post<{ success: boolean; data: DocumentCollection[] }>(
      `${this.basePath}/regional`,
      data
    );
    return response.data.data;
  }

  /**
   * Update/rename folder
   */
  async update(folderId: number, data: UpdateFolderRequest): Promise<DocumentCollection> {
    const response = await api.put<{ success: boolean; data: DocumentCollection }>(
      `${this.basePath}/${folderId}`,
      data
    );
    return response.data.data;
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
    const response = await api.get(`${this.basePath}/${folderId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get folder audit logs
   */
  async getAuditLogs(folderId: number): Promise<FolderAuditLog[]> {
    const response = await api.get<{ success: boolean; data: FolderAuditLog[] }>(
      `${this.basePath}/${folderId}/audit-logs`
    );
    return response.data.data;
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
