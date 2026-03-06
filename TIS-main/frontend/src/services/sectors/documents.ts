import { apiClient } from '../api';
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

  /**
   * Get documents for a specific sector
   */
  async getSectorDocuments(sectorId: number, filters?: SectorDocumentFilters): Promise<SectorDocumentsResponse> {
    console.log('🔍 SectorDocumentsService.getSectorDocuments called for sector:', sectorId, 'with filters:', filters);
    try {
      const response = await apiClient.get<{ 
        data: SectorDocument[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      }>(`${this.baseUrl}/${sectorId}/documents`, filters);
      console.log('✅ SectorDocumentsService.getSectorDocuments successful:', response);
      return response as SectorDocumentsResponse;
    } catch (error) {
      console.error('❌ SectorDocumentsService.getSectorDocuments failed:', error);
      throw error;
    }
  }

  /**
   * Upload a document to a sector
   */
  async uploadSectorDocument(sectorId: number, data: SectorDocumentUploadData): Promise<SectorDocumentResponse> {
    console.log('🔍 SectorDocumentsService.uploadSectorDocument called for sector:', sectorId, 'with data:', data);
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
      console.log('✅ SectorDocumentsService.uploadSectorDocument successful:', response);
      return response as SectorDocumentResponse;
    } catch (error) {
      console.error('❌ SectorDocumentsService.uploadSectorDocument failed:', error);
      throw error;
    }
  }

  /**
   * Get document statistics for a sector
   */
  async getSectorDocumentStatistics(sectorId: number): Promise<SectorDocumentStatisticsResponse> {
    console.log('🔍 SectorDocumentsService.getSectorDocumentStatistics called for sector:', sectorId);
    try {
      const response = await apiClient.get<SectorDocumentStatistics>(`${this.baseUrl}/${sectorId}/documents/statistics`);
      console.log('✅ SectorDocumentsService.getSectorDocumentStatistics successful:', response);
      return response as SectorDocumentStatisticsResponse;
    } catch (error) {
      console.error('❌ SectorDocumentsService.getSectorDocumentStatistics failed:', error);
      throw error;
    }
  }

  /**
   * Share a document with other institutions
   */
  async shareSectorDocument(sectorId: number, documentId: number, data: SectorDocumentShareData): Promise<SectorDocumentShareResponse> {
    console.log('🔍 SectorDocumentsService.shareSectorDocument called for sector:', sectorId, 'document:', documentId, 'with data:', data);
    try {
      const response = await apiClient.post<any>(`${this.baseUrl}/${sectorId}/documents/${documentId}/share`, data);
      console.log('✅ SectorDocumentsService.shareSectorDocument successful:', response);
      return response as SectorDocumentShareResponse;
    } catch (error) {
      console.error('❌ SectorDocumentsService.shareSectorDocument failed:', error);
      throw error;
    }
  }

  /**
   * Download a document
   */
  async downloadDocument(sectorId: number, documentId: number): Promise<Blob> {
    console.log('🔍 SectorDocumentsService.downloadDocument called for sector:', sectorId, 'document:', documentId);
    try {
      const response = await apiClient.get(`${this.baseUrl}/${sectorId}/documents/${documentId}/download`, {}, {
        responseType: 'blob'
      });
      console.log('✅ SectorDocumentsService.downloadDocument successful');
      return response as Blob;
    } catch (error) {
      console.error('❌ SectorDocumentsService.downloadDocument failed:', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(sectorId: number, documentId: number, data: Partial<SectorDocument>): Promise<SectorDocumentResponse> {
    console.log('🔍 SectorDocumentsService.updateDocument called for sector:', sectorId, 'document:', documentId, 'with data:', data);
    try {
      const response = await apiClient.put<SectorDocument>(`${this.baseUrl}/${sectorId}/documents/${documentId}`, data);
      console.log('✅ SectorDocumentsService.updateDocument successful:', response);
      return response as SectorDocumentResponse;
    } catch (error) {
      console.error('❌ SectorDocumentsService.updateDocument failed:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(sectorId: number, documentId: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SectorDocumentsService.deleteDocument called for sector:', sectorId, 'document:', documentId);
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${sectorId}/documents/${documentId}`);
      console.log('✅ SectorDocumentsService.deleteDocument successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SectorDocumentsService.deleteDocument failed:', error);
      throw error;
    }
  }

  /**
   * Archive a document
   */
  async archiveDocument(sectorId: number, documentId: number): Promise<SectorDocumentResponse> {
    return this.updateDocument(sectorId, documentId, { status: 'archived' });
  }

  /**
   * Restore an archived document
   */
  async restoreDocument(sectorId: number, documentId: number): Promise<SectorDocumentResponse> {
    return this.updateDocument(sectorId, documentId, { status: 'active' });
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(sectorId: number, category: SectorDocument['category']): Promise<SectorDocumentsResponse> {
    return this.getSectorDocuments(sectorId, { category });
  }

  /**
   * Get documents by access level
   */
  async getDocumentsByAccessLevel(sectorId: number, accessLevel: SectorDocument['access_level']): Promise<SectorDocumentsResponse> {
    return this.getSectorDocuments(sectorId, { access_level: accessLevel });
  }

  /**
   * Get public documents
   */
  async getPublicDocuments(sectorId: number): Promise<SectorDocumentsResponse> {
    return this.getDocumentsByAccessLevel(sectorId, 'public');
  }

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(sectorId: number, daysAhead: number = 30): Promise<SectorDocument[]> {
    console.log('🔍 SectorDocumentsService.getExpiringDocuments called for sector:', sectorId, 'days ahead:', daysAhead);
    try {
      const response = await this.getSectorDocuments(sectorId, {
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const expiringDocs = response.data.data.filter(doc => {
        if (!doc.expires_at) return false;
        const expiryDate = new Date(doc.expires_at);
        return expiryDate <= futureDate && expiryDate >= new Date();
      });
      
      console.log('✅ SectorDocumentsService.getExpiringDocuments successful, found:', expiringDocs.length, 'expiring documents');
      return expiringDocs;
    } catch (error) {
      console.error('❌ SectorDocumentsService.getExpiringDocuments failed:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon class
   */
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

  /**
   * Get category color for UI
   */
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

  /**
   * Get access level color for UI
   */
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

  /**
   * Check if document is expired
   */
  isDocumentExpired(document: SectorDocument): boolean {
    if (!document.expires_at) return false;
    const expiryDate = new Date(document.expires_at);
    const now = new Date();
    return expiryDate < now;
  }

  /**
   * Check if document is expiring soon
   */
  isDocumentExpiringSoon(document: SectorDocument, daysAhead: number = 7): boolean {
    if (!document.expires_at) return false;
    const expiryDate = new Date(document.expires_at);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const now = new Date();
    return expiryDate <= futureDate && expiryDate >= now;
  }

  /**
   * Generate document usage analytics
   */
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

  /**
   * Find most used category
   */
  private findMostUsedCategory(byCategory: SectorDocumentStatistics['by_category']): string {
    return Object.entries(byCategory).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Find most used file type
   */
  private findMostUsedFileType(byFileType: SectorDocumentStatistics['by_file_type']): string {
    return Object.entries(byFileType).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Calculate access level distribution
   */
  private calculateAccessDistribution(byAccessLevel: SectorDocumentStatistics['by_access_level']) {
    const total = Object.values(byAccessLevel).reduce((sum, count) => sum + count, 0);
    return Object.entries(byAccessLevel).map(([level, count]) => ({
      level,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  /**
   * Calculate category percentages
   */
  private calculateCategoryPercentages(byCategory: SectorDocumentStatistics['by_category'], total: number) {
    return Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }
}

export const sectorDocumentsService = new SectorDocumentsService();