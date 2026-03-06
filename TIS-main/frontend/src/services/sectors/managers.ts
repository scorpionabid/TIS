import { apiClient } from '../api';
import type {
  SectorManager,
  SectorAssignment,
  SectorManagersResponse,
  SectorUpdateResponse
} from './types';

/**
 * Sector Manager Assignment Service
 * Handles manager assignment and management operations for sectors
 */
export class SectorManagersService {
  private baseUrl = '/sectors';

  /**
   * Get available managers for sector assignment
   */
  async getAvailableManagers(): Promise<SectorManagersResponse> {
    console.log('🔍 SectorManagersService.getAvailableManagers called');
    try {
      const response = await apiClient.get<SectorManager[]>(`${this.baseUrl}/managers/available`);
      console.log('✅ SectorManagersService.getAvailableManagers successful:', response);
      return response as SectorManagersResponse;
    } catch (error) {
      console.error('❌ SectorManagersService.getAvailableManagers failed:', error);
      throw error;
    }
  }

  /**
   * Assign a manager to a sector
   */
  async assignManager(sectorId: number, managerId: number): Promise<SectorUpdateResponse> {
    console.log('🔍 SectorManagersService.assignManager called for sector:', sectorId, 'manager:', managerId);
    try {
      const response = await apiClient.put(`${this.baseUrl}/${sectorId}`, { manager_id: managerId });
      console.log('✅ SectorManagersService.assignManager successful:', response);
      return response as SectorUpdateResponse;
    } catch (error) {
      console.error('❌ SectorManagersService.assignManager failed:', error);
      throw error;
    }
  }

  /**
   * Unassign a manager from a sector
   */
  async unassignManager(sectorId: number): Promise<SectorUpdateResponse> {
    console.log('🔍 SectorManagersService.unassignManager called for sector:', sectorId);
    try {
      const response = await apiClient.put(`${this.baseUrl}/${sectorId}`, { manager_id: null });
      console.log('✅ SectorManagersService.unassignManager successful:', response);
      return response as SectorUpdateResponse;
    } catch (error) {
      console.error('❌ SectorManagersService.unassignManager failed:', error);
      throw error;
    }
  }

  /**
   * Get manager details by ID
   */
  async getManager(managerId: number): Promise<{ success: boolean; data: SectorManager }> {
    console.log('🔍 SectorManagersService.getManager called for manager:', managerId);
    try {
      const response = await apiClient.get<SectorManager>(`/users/${managerId}`);
      console.log('✅ SectorManagersService.getManager successful:', response);
      return response as { success: boolean; data: SectorManager };
    } catch (error) {
      console.error('❌ SectorManagersService.getManager failed:', error);
      throw error;
    }
  }

  /**
   * Get sectors managed by a specific manager
   */
  async getSectorsByManager(managerId: number): Promise<{ success: boolean; data: any[] }> {
    console.log('🔍 SectorManagersService.getSectorsByManager called for manager:', managerId);
    try {
      const response = await apiClient.get(`${this.baseUrl}`, { manager_id: managerId });
      console.log('✅ SectorManagersService.getSectorsByManager successful:', response);
      return response as { success: boolean; data: any[] };
    } catch (error) {
      console.error('❌ SectorManagersService.getSectorsByManager failed:', error);
      throw error;
    }
  }

  /**
   * Transfer manager from one sector to another
   */
  async transferManager(fromSectorId: number, toSectorId: number, managerId: number): Promise<{
    success: boolean;
    message: string;
    data: { fromSector: any; toSector: any };
  }> {
    console.log('🔍 SectorManagersService.transferManager called:', { fromSectorId, toSectorId, managerId });
    try {
      // First unassign from old sector
      await this.unassignManager(fromSectorId);
      
      // Then assign to new sector
      const assignResponse = await this.assignManager(toSectorId, managerId);
      
      console.log('✅ SectorManagersService.transferManager successful');
      return {
        success: true,
        message: 'Manager transferred successfully',
        data: {
          fromSector: { id: fromSectorId },
          toSector: assignResponse.data
        }
      };
    } catch (error) {
      console.error('❌ SectorManagersService.transferManager failed:', error);
      throw error;
    }
  }

  /**
   * Bulk assign managers to multiple sectors
   */
  async bulkAssignManagers(assignments: SectorAssignment[]): Promise<{
    success: boolean;
    message: string;
    successful: number;
    failed: number;
    results: Array<{ sectorId: number; managerId: number; success: boolean; error?: string }>;
  }> {
    console.log('🔍 SectorManagersService.bulkAssignManagers called with:', assignments);
    
    const results: Array<{ sectorId: number; managerId: number; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const assignment of assignments) {
      try {
        await this.assignManager(assignment.sector_id, assignment.manager_id);
        results.push({
          sectorId: assignment.sector_id,
          managerId: assignment.manager_id,
          success: true
        });
        successful++;
      } catch (error) {
        results.push({
          sectorId: assignment.sector_id,
          managerId: assignment.manager_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }

    console.log('✅ SectorManagersService.bulkAssignManagers completed:', { successful, failed });
    return {
      success: true,
      message: `Bulk assignment completed. ${successful} successful, ${failed} failed.`,
      successful,
      failed,
      results
    };
  }

  /**
   * Get manager performance metrics
   */
  async getManagerPerformance(managerId: number): Promise<{
    success: boolean;
    data: {
      totalSectors: number;
      activeSectors: number;
      totalInstitutions: number;
      averageResponseRate: number;
      taskCompletionRate: number;
      performanceRating: number;
      assignmentHistory: Array<{
        sectorId: number;
        sectorName: string;
        assignedAt: string;
        isActive: boolean;
      }>;
    };
  }> {
    console.log('🔍 SectorManagersService.getManagerPerformance called for manager:', managerId);
    try {
      const response = await apiClient.get(`/users/${managerId}/performance`);
      console.log('✅ SectorManagersService.getManagerPerformance successful:', response);
      return response as any;
    } catch (error) {
      console.error('❌ SectorManagersService.getManagerPerformance failed:', error);
      throw error;
    }
  }

  /**
   * Get manager workload
   */
  async getManagerWorkload(managerId: number): Promise<{
    success: boolean;
    data: {
      totalSectors: number;
      totalInstitutions: number;
      totalStudents: number;
      totalStaff: number;
      pendingTasks: number;
      activeSurveys: number;
      workloadScore: number;
      capacityStatus: 'low' | 'medium' | 'high' | 'overloaded';
    };
  }> {
    console.log('🔍 SectorManagersService.getManagerWorkload called for manager:', managerId);
    try {
      const sectorsResponse = await this.getSectorsByManager(managerId);
      const sectors = sectorsResponse.data;
      
      const workload = this.calculateWorkload(sectors);
      
      console.log('✅ SectorManagersService.getManagerWorkload successful:', workload);
      return {
        success: true,
        data: workload
      };
    } catch (error) {
      console.error('❌ SectorManagersService.getManagerWorkload failed:', error);
      throw error;
    }
  }

  /**
   * Calculate manager workload from sectors data
   */
  private calculateWorkload(sectors: any[]) {
    const totalSectors = sectors.length;
    const totalInstitutions = sectors.reduce((sum, sector) => sum + (sector.statistics?.total_institutions || 0), 0);
    const totalStudents = sectors.reduce((sum, sector) => sum + (sector.statistics?.total_students || 0), 0);
    const totalStaff = sectors.reduce((sum, sector) => sum + (sector.statistics?.total_staff || 0), 0);
    const pendingTasks = sectors.reduce((sum, sector) => sum + (sector.statistics?.pending_tasks || 0), 0);
    const activeSurveys = sectors.reduce((sum, sector) => sum + (sector.statistics?.active_surveys || 0), 0);
    
    // Calculate workload score (0-100)
    const workloadScore = Math.min(100, 
      (totalSectors * 10) + 
      (totalInstitutions * 2) + 
      (totalStudents / 100) + 
      (pendingTasks * 5) + 
      (activeSurveys * 3)
    );
    
    // Determine capacity status
    let capacityStatus: 'low' | 'medium' | 'high' | 'overloaded';
    if (workloadScore < 25) capacityStatus = 'low';
    else if (workloadScore < 50) capacityStatus = 'medium';
    else if (workloadScore < 75) capacityStatus = 'high';
    else capacityStatus = 'overloaded';
    
    return {
      totalSectors,
      totalInstitutions,
      totalStudents,
      totalStaff,
      pendingTasks,
      activeSurveys,
      workloadScore: Math.round(workloadScore),
      capacityStatus
    };
  }

  /**
   * Get mock managers data for development/fallback
   */
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

  /**
   * Get manager status color for UI
   */
  getManagerStatusColor(isActive: boolean): string {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  }

  /**
   * Get capacity status color for UI
   */
  getCapacityStatusColor(status: 'low' | 'medium' | 'high' | 'overloaded'): string {
    switch (status) {
      case 'low':
        return 'text-blue-600 bg-blue-100';
      case 'medium':
        return 'text-green-600 bg-green-100';
      case 'high':
        return 'text-yellow-600 bg-yellow-100';
      case 'overloaded':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get performance rating color for UI
   */
  getPerformanceRatingColor(rating: number): string {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Format manager name for display
   */
  formatManagerName(manager: SectorManager): string {
    return `${manager.first_name} ${manager.last_name}`;
  }

  /**
   * Calculate manager efficiency score
   */
  calculateEfficiencyScore(manager: SectorManager, workload: any): number {
    const experienceWeight = Math.min(manager.experience_years / 10, 1) * 20;
    const ratingWeight = (manager.performance_rating / 5) * 30;
    const workloadWeight = Math.max(0, (100 - workload.workloadScore) / 100) * 50;
    
    return Math.round(experienceWeight + ratingWeight + workloadWeight);
  }

  /**
   * Find best manager for sector assignment
   */
  findBestManagerForSector(managers: SectorManager[], sectorRequirements?: {
    minExperience?: number;
    maxWorkload?: number;
    preferredRating?: number;
  }): SectorManager | null {
    const eligibleManagers = managers.filter(manager => 
      manager.is_active && 
      (!sectorRequirements?.minExperience || manager.experience_years >= sectorRequirements.minExperience)
    );

    if (eligibleManagers.length === 0) return null;

    // Sort by efficiency score (experience + rating + current workload)
    eligibleManagers.sort((a, b) => {
      const scoreA = (a.experience_years * 2) + (a.performance_rating * 10) - (a.managed_sectors_count * 5);
      const scoreB = (b.experience_years * 2) + (b.performance_rating * 10) - (b.managed_sectors_count * 5);
      return scoreB - scoreA;
    });

    return eligibleManagers[0];
  }
}

export const sectorManagersService = new SectorManagersService();