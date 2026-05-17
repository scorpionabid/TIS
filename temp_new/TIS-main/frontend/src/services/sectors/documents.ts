import { apiClient } from '../api';
import { logger } from '@/utils/logger';
import type {
  SectorDocument,
  SectorDocumentFilters,
  SectorDocumentUploadData,
  SectorDocumentShareData,
  SectorDocumentStatistics,
  SectorDocumentsResponse,
  SectorDocumentResponse,
  SectorDocumentStatisticsResponse,
  SectorDocumentShareResponse
} from './types';

/**
 * Sector Document Management Service
 * Handles document-related operations for sectors
 */
export class SectorDocumentsService {
  private baseUrl = '/sectors';

  async getSectorDocuments(sectorId: number, filters?: SectorDocumentFilters): Promise<SectorDocumentsResponse> {
    try {
      const response = await apiClient.get<{
        data: SectorDocument[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      }>(`${this.baseUrl}/${sectorId}/documents`, filters);
      return response as SectorDocumentsResponse;
    } catch (error) {
      logger.error('SectorDocumentsService.getSectorDocuments failed', { sectorId, error });
      throw error;
    }
  }

  async uploadSectorDocument(sectorId: number, data: SectorDocumentUploadData): Promise<SectorDocumentResponse> {
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
      return response as SectorDocumentResponse;
    } catch (error) {
      logger.error('SectorDocumentsService.uploadSectorDocument failed', { sectorId, error });
      throw error;
    }
  }

  async getSectorDocumentStatistics(sectorId: number): Promise<SectorDocumentStatisticsResponse> {
    try {
      const response = await apiClient.get<SectorDocumentStatistics>(`${this.baseUrl}/${sectorId}/documents/statistics`);
      return response as SectorDocumentStatisticsResponse;
    } catch (error) {
      logger.error('SectorDocumentsService.getSectorDocumentStatistics failed', { sectorId, error });
      throw error;
    }
  }

  async shareSectorDocument(sectorId: number, documentId: number, data: SectorDocumentShareData): Promise<SectorDocumentShareResponse> {
    try {
      const response = await apiClient.post<SectorDocumentShareResponse>(`${this.baseUrl}/${sectorId}/documents/${documentId}/share`, data);
      return response as SectorDocumentShareResponse;
    } catch (error) {
      logger.error('SectorDocumentsService.shareSectorDocument failed', { sectorId, documentId, error });
      throw error;
    }
  }

  async downloadDocument(sectorId: number, documentId: number): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${sectorId}/documents/${documentId}/download`, {}, {
        responseType: 'blob'
      });
      return response as Blob;
    } catch (error) {
      logger.error('SectorDocumentsService.downloadDocument failed', { sectorId, documentId, error });
      throw error;
    }
  }

  async updateDocument(sectorId: number, documentId: number, data: Partial<SectorDocument>): Promise<SectorDocumentResponse> {
    try {
      const response = await apiClient.put<SectorDocument>(`${this.baseUrl}/${sectorId}/documents/${documentId}`, data);
      return response as SectorDocumentResponse;
    } catch (error) {
      logger.error('SectorDocumentsService.updateDocument failed', { sectorId, documentId, error });
      throw error;
    }
  }

  async deleteDocument(sectorId: number, documentId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${sectorId}/documents/${documentId}`);
      return response as { success: boolean; message: string };
    } catch (error) {
      logger.error('SectorDocumentsService.deleteDocument failed', { sectorId, documentId, error });
      throw error;
    }
  }

  async archiveDocument(sectorId: number, documentId: number): Promise<SectorDocumentResponse> {
    return this.updateDocument(sectorId, documentId, { status: 'archived' });
  }

  async restoreDocument(sectorId: number, documentId: number): Promise<SectorDocumentResponse> {
    return this.updateDocument(sectorId, documentId, { status: 'active' });
  }

  async getDocumentsByCategory(sectorId: number, category: SectorDocument['category']): Promise<SectorDocumentsResponse> {
    return this.getSectorDocuments(sectorId, { category });
  }

  async getDocumentsByAccessLevel(sectorId: number, accessLevel: SectorDocument['access_level']): Promise<SectorDocumentsResponse> {
    return this.getSectorDocuments(sectorId, { access_level: accessLevel });
  }

  async getPublicDocuments(sectorId: number): Promise<SectorDocumentsResponse> {
    return this.getDocumentsByAccessLevel(sectorId, 'public');
  }

  async getExpiringDocuments(sectorId: number, daysAhead: number = 30): Promise<SectorDocument[]> {
    try {
      const response = await this.getSectorDocuments(sectorId, {
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      return response.data.data.filter(doc => {
        if (!doc.expires_at) return false;
        const expiryDate = new Date(doc.expires_at);
        return expiryDate <= futureDate && expiryDate >= new Date();
      });
    } catch (error) {
      logger.error('SectorDocumentsService.getExpiringDocuments failed', { sectorId, daysAhead, error });
      throw error;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(fileType: SectorDocument['file_type']): string {
    switch (fileType) {
      case 'pdf':
        return 'text-red-600';
      case 'excel':
        return 'text-green-600';
      case 'word':
        return 'text-blue-600';
      case 'image':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  }

  getCategoryColor(category: SectorDocument['category']): string {
    switch (category) {
      case 'administrative':
        return 'text-blue-600 bg-blue-100';
      case 'financial':
        return 'text-green-600 bg-green-100';
      case 'educational':
        return 'text-purple-600 bg-purple-100';
      case 'hr':
        return 'text-orange-600 bg-orange-100';
      case 'technical':
        return 'text-gray-600 bg-gray-100';
      case 'legal':
        return 'text-red-600 bg-red-100';
      case 'reports':
        return 'text-yellow-600 bg-yellow-100';
      case 'forms':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getAccessLevelColor(accessLevel: SectorDocument['access_level']): string {
    switch (accessLevel) {
      case 'public':
        return 'text-green-600 bg-green-100';
      case 'regional':
        return 'text-blue-600 bg-blue-100';
      case 'sectoral':
        return 'text-orange-600 bg-orange-100';
      case 'institution':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  isDocumentExpired(document: SectorDocument): boolean {
    if (!document.expires_at) return false;
    return new Date(document.expires_at) < new Date();
  }

  isDocumentExpiringSoon(document: SectorDocument, daysAhead: number = 7): boolean {
    if (!document.expires_at) return false;
    const expiryDate = new Date(document.expires_at);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return expiryDate <= futureDate && expiryDate >= new Date();
  }

  generateDocumentAnalytics(statistics: SectorDocumentStatistics) {
    const totalFiles = statistics.total_documents;
    if (totalFiles === 0) return null;

    return {
      mostUsedCategory: this.findMostUsedCategory(statistics.by_category),
      mostUsedFileType: this.findMostUsedFileType(statistics.by_file_type),
      accessDistribution: this.calculateAccessDistribution(statistics.by_access_level),
      storageUtilization: this.formatFileSize(statistics.total_size),
      documentsPerCategory: this.calculateCategoryPercentages(statistics.by_category, totalFiles)
    };
  }

  private findMostUsedCategory(byCategory: SectorDocumentStatistics['by_category']): string {
    return Object.entries(byCategory).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private findMostUsedFileType(byFileType: SectorDocumentStatistics['by_file_type']): string {
    return Object.entries(byFileType).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private calculateAccessDistribution(byAccessLevel: SectorDocumentStatistics['by_access_level']) {
    const total = Object.values(byAccessLevel).reduce((sum, count) => sum + count, 0);
    return Object.entries(byAccessLevel).map(([level, count]) => ({
      level,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  private calculateCategoryPercentages(byCategory: SectorDocumentStatistics['by_category'], total: number) {
    return Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }
}

export const sectorDocumentsService = new SectorDocumentsService();
