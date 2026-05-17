// Re-export all sector service modules for backward compatibility
// This maintains the original API while using the new modular structure

// Export all types
export * from './sectors/types';

// Export individual service classes
export { CoreSectorsService, coreSectorsService } from './sectors/core';
export { SectorStatisticsService, sectorStatisticsService } from './sectors/statistics';
export { SectorTasksService, sectorTasksService } from './sectors/tasks';
export { SectorDocumentsService, sectorDocumentsService } from './sectors/documents';
export { SectorManagersService, sectorManagersService } from './sectors/managers';

// Import services for the unified service class
import { coreSectorsService } from './sectors/core';
import { sectorStatisticsService } from './sectors/statistics';
import { sectorTasksService } from './sectors/tasks';
import { sectorDocumentsService } from './sectors/documents';
import { sectorManagersService } from './sectors/managers';

/**
 * Unified Sectors Service
 * Provides a single interface for all sector-related operations
 * Maintains backward compatibility with the original monolithic service
 */
class SectorsService {
  // Core sector operations
  async getSectors(filters?: any) {
    return coreSectorsService.getSectors(filters);
  }

  async getSector(id: number) {
    return coreSectorsService.getSector(id);
  }

  async createSector(data: any) {
    return coreSectorsService.createSector(data);
  }

  async updateSector(id: number, data: any) {
    return coreSectorsService.updateSector(id, data);
  }

  async deleteSector(id: number) {
    return coreSectorsService.deleteSector(id);
  }

  async toggleSectorStatus(id: number) {
    return coreSectorsService.toggleSectorStatus(id);
  }

  async getSectorsByRegion(regionId: number) {
    return coreSectorsService.getSectorsByRegion(regionId);
  }

  // Statistics operations
  async getSectorStatistics() {
    return sectorStatisticsService.getSectorStatistics();
  }

  // Manager operations
  async getAvailableManagers() {
    return sectorManagersService.getAvailableManagers();
  }

  async assignManager(sectorId: number, managerId: number) {
    return sectorManagersService.assignManager(sectorId, managerId);
  }

  async unassignManager(sectorId: number) {
    return sectorManagersService.unassignManager(sectorId);
  }

  // Task management operations
  async getSectorTasks(sectorId: number, filters?: any) {
    return sectorTasksService.getSectorTasks(sectorId, filters);
  }

  async createSectorTask(sectorId: number, data: any) {
    return sectorTasksService.createSectorTask(sectorId, data);
  }

  async getSectorTaskStatistics(sectorId: number) {
    return sectorTasksService.getSectorTaskStatistics(sectorId);
  }

  // Document management operations
  async getSectorDocuments(sectorId: number, filters?: any) {
    return sectorDocumentsService.getSectorDocuments(sectorId, filters);
  }

  async uploadSectorDocument(sectorId: number, data: any) {
    return sectorDocumentsService.uploadSectorDocument(sectorId, data);
  }

  async getSectorDocumentStatistics(sectorId: number) {
    return sectorDocumentsService.getSectorDocumentStatistics(sectorId);
  }

  async shareSectorDocument(sectorId: number, documentId: number, data: any) {
    return sectorDocumentsService.shareSectorDocument(sectorId, documentId, data);
  }

  // Mock data methods for backward compatibility
  getMockSectors() {
    return coreSectorsService.getMockSectors();
  }

  getMockStatistics() {
    return sectorStatisticsService.getMockStatistics();
  }

  getMockManagers() {
    return sectorManagersService.getMockManagers();
  }

  // Expose individual services for advanced usage
  get core() {
    return coreSectorsService;
  }

  get statistics() {
    return sectorStatisticsService;
  }

  get tasks() {
    return sectorTasksService;
  }

  get documents() {
    return sectorDocumentsService;
  }

  get managers() {
    return sectorManagersService;
  }
}

// Export the unified service instance for backward compatibility
export const sectorsService = new SectorsService();

// Default export for convenience
export default sectorsService;