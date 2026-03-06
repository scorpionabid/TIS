import { apiClient } from '../api';
import type {
  SectorStatistics,
  SectorStatisticsResponse
} from './types';

/**
 * Sector Statistics Service
 * Handles statistics and analytics for sectors
 */
export class SectorStatisticsService {
  private baseUrl = '/sectors';

  /**
   * Get comprehensive sector statistics
   */
  async getSectorStatistics(): Promise<SectorStatisticsResponse> {
    console.log('🔍 SectorStatisticsService.getSectorStatistics called');
    try {
      const response = await apiClient.get<SectorStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ SectorStatisticsService.getSectorStatistics successful:', response);
      return response as SectorStatisticsResponse;
    } catch (error) {
      console.error('❌ SectorStatisticsService.getSectorStatistics failed:', error);
      throw error;
    }
  }

  /**
   * Get mock statistics data for development/fallback
   */
  getMockStatistics(): SectorStatistics {
    return {
      total_sectors: 45,
      active_sectors: 38,
      inactive_sectors: 7,
      by_region: [
        { region_id: 1, region_name: 'Bakı regionu', sector_count: 12, total_institutions: 567, total_students: 89456 },
        { region_id: 2, region_name: 'Gəncə regionu', sector_count: 8, total_institutions: 234, total_students: 34567 },
        { region_id: 3, region_name: 'Sumqayıt regionu', sector_count: 6, total_institutions: 156, total_students: 23456 },
        { region_id: 4, region_name: 'Mingəçevir regionu', sector_count: 4, total_institutions: 89, total_students: 12345 },
        { region_id: 5, region_name: 'Digər regionlar', sector_count: 15, total_institutions: 445, total_students: 56789 }
      ],
      by_type: [
        { type: 'secondary', count: 18, percentage: 40.0, avg_institutions_per_sector: 28.5 },
        { type: 'preschool', count: 12, percentage: 26.7, avg_institutions_per_sector: 15.3 },
        { type: 'primary', count: 8, percentage: 17.8, avg_institutions_per_sector: 22.1 },
        { type: 'vocational', count: 4, percentage: 8.9, avg_institutions_per_sector: 12.8 },
        { type: 'special', count: 2, percentage: 4.4, avg_institutions_per_sector: 8.5 },
        { type: 'mixed', count: 1, percentage: 2.2, avg_institutions_per_sector: 35.0 }
      ],
      performance_summary: {
        avg_response_rate: 76.8,
        avg_task_completion: 83.2,
        sectors_above_target: 28,
        sectors_below_target: 17
      },
      geographic_distribution: [
        { region: 'Bakı', latitude: 40.4093, longitude: 49.8671, sector_count: 12, coverage_area: 2130.0 },
        { region: 'Gəncə', latitude: 40.6828, longitude: 46.3606, sector_count: 8, coverage_area: 1789.0 },
        { region: 'Sumqayıt', latitude: 40.5897, longitude: 49.6688, sector_count: 6, coverage_area: 983.0 },
        { region: 'Mingəçevir', latitude: 40.7642, longitude: 47.0596, sector_count: 4, coverage_area: 1456.0 }
      ]
    };
  }

  /**
   * Calculate sector performance metrics
   */
  calculatePerformanceMetrics(statistics: SectorStatistics) {
    const { performance_summary } = statistics;
    
    return {
      overallPerformance: (performance_summary.avg_response_rate + performance_summary.avg_task_completion) / 2,
      performanceGrade: this.getPerformanceGrade(performance_summary.avg_task_completion),
      targetAchievementRate: (performance_summary.sectors_above_target / (performance_summary.sectors_above_target + performance_summary.sectors_below_target)) * 100,
      improvementAreas: this.identifyImprovementAreas(performance_summary)
    };
  }

  /**
   * Get performance grade based on completion rate
   */
  private getPerformanceGrade(completionRate: number): string {
    if (completionRate >= 90) return 'A';
    if (completionRate >= 80) return 'B';
    if (completionRate >= 70) return 'C';
    if (completionRate >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify areas needing improvement
   */
  private identifyImprovementAreas(summary: SectorStatistics['performance_summary']): string[] {
    const areas: string[] = [];
    
    if (summary.avg_response_rate < 75) {
      areas.push('Survey Response Rate');
    }
    if (summary.avg_task_completion < 80) {
      areas.push('Task Completion');
    }
    if (summary.sectors_below_target > summary.sectors_above_target) {
      areas.push('Target Achievement');
    }
    
    return areas;
  }

  /**
   * Generate sector distribution insights
   */
  generateDistributionInsights(statistics: SectorStatistics) {
    const { by_region, by_type } = statistics;
    
    // Find region with most sectors
    const topRegion = by_region.reduce((prev, current) => 
      prev.sector_count > current.sector_count ? prev : current
    );
    
    // Find most common sector type
    const topType = by_type.reduce((prev, current) => 
      prev.count > current.count ? prev : current
    );
    
    // Calculate average institutions per sector
    const totalInstitutions = by_region.reduce((sum, region) => sum + region.total_institutions, 0);
    const avgInstitutionsPerSector = totalInstitutions / statistics.total_sectors;
    
    return {
      topRegion: {
        name: topRegion.region_name,
        sectorCount: topRegion.sector_count,
        percentage: (topRegion.sector_count / statistics.total_sectors) * 100
      },
      topType: {
        type: topType.type,
        count: topType.count,
        percentage: topType.percentage
      },
      avgInstitutionsPerSector: Math.round(avgInstitutionsPerSector * 10) / 10,
      sectorDensity: this.calculateSectorDensity(by_region),
      coverageGaps: this.identifyGoverageGaps(by_region)
    };
  }

  /**
   * Calculate sector density by region
   */
  private calculateSectorDensity(byRegion: SectorStatistics['by_region']) {
    return byRegion.map(region => ({
      region: region.region_name,
      density: region.total_students / region.sector_count,
      efficiency: region.total_institutions / region.sector_count
    }));
  }

  /**
   * Identify regions with potential coverage gaps
   */
  private identifyGoverageGaps(byRegion: SectorStatistics['by_region']) {
    const avgStudentsPerSector = byRegion.reduce((sum, region) => 
      sum + (region.total_students / region.sector_count), 0
    ) / byRegion.length;
    
    return byRegion
      .filter(region => (region.total_students / region.sector_count) > avgStudentsPerSector * 1.5)
      .map(region => ({
        region: region.region_name,
        currentLoad: region.total_students / region.sector_count,
        recommendedSectors: Math.ceil(region.total_students / avgStudentsPerSector) - region.sector_count
      }));
  }
}

export const sectorStatisticsService = new SectorStatisticsService();