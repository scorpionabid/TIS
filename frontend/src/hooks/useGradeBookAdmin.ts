import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { gradeBookAdminService, HierarchyData, AnalysisData, AnalysisParams } from '@/services/gradeBookAdmin';
import { useToast } from '@/hooks/use-toast';

export type AdminLevel = 'region' | 'sector' | 'institution';

export interface UseGradeBookAdminReturn {
  // Data
  hierarchyData: HierarchyData | null;
  analysisData: AnalysisData | null;
  sectors: { id: number; name: string }[];
  institutions: { id: number; name: string }[];

  // Loading states
  loading: boolean;
  analysisLoading: boolean;

  // Selected values
  selectedLevel: AdminLevel;
  selectedRegionId: number | null;
  selectedSectorId: number | null;
  selectedInstitutionId: number | null;
  selectedAcademicYearId: number | null;

  // Setters
  setSelectedLevel: (level: AdminLevel) => void;
  setSelectedRegionId: (id: number | null) => void;
  setSelectedSectorId: (id: number | null) => void;
  setSelectedInstitutionId: (id: number | null) => void;
  setSelectedAcademicYearId: (id: number | null) => void;

  // Permissions
  canAccessRegion: boolean;
  canAccessSector: boolean;
  canAccessInstitution: boolean;
  userRegionId: number | null;
  userSectorId: number | null;

  // Actions
  refreshHierarchy: () => Promise<void>;
  refreshAnalysis: (params?: Partial<AnalysisParams>) => Promise<void>;
  loadSectors: (regionId: number) => Promise<void>;
  loadInstitutions: (sectorId: number) => Promise<void>;
}

export const useGradeBookAdmin = (): UseGradeBookAdminReturn => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { isRegionAdmin, isSektorAdmin, isSuperAdmin } = useRoleCheck();

  // Get user's assigned region/sector from currentUser
  const userRegionId = useMemo(() => currentUser?.region_id || null, [currentUser]);
  const userSectorId = useMemo(() => currentUser?.sector_id || null, [currentUser]);

  // Determine initial level based on role
  const initialLevel: AdminLevel = useMemo(() => {
    if (isSuperAdmin || isRegionAdmin) return 'region';
    if (isSektorAdmin) return 'sector';
    return 'institution';
  }, [isSuperAdmin, isRegionAdmin, isSektorAdmin]);

  // State
  const [selectedLevel, setSelectedLevel] = useState<AdminLevel>(initialLevel);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(userRegionId);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(userSectorId);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);

  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [institutions, setInstitutions] = useState<{ id: number; name: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Permissions
  const canAccessRegion = isSuperAdmin || isRegionAdmin;
  const canAccessSector = isSuperAdmin || isRegionAdmin || isSektorAdmin;
  const canAccessInstitution = true; // All admin roles can access institution level

  // Load hierarchy data
  const refreshHierarchy = useCallback(async () => {
    try {
      setLoading(true);

      const effectiveRegionId = selectedRegionId || userRegionId;
      const effectiveSectorId = selectedSectorId || userSectorId;

      let data: HierarchyData | null = null;

      switch (selectedLevel) {
        case 'region':
          if (effectiveRegionId) {
            const response = await gradeBookAdminService.getRegionSummary(
              effectiveRegionId,
              selectedAcademicYearId || undefined
            );
            data = response.data;
          }
          break;
        case 'sector':
          if (effectiveSectorId) {
            const response = await gradeBookAdminService.getSectorSummary(
              effectiveSectorId,
              selectedAcademicYearId || undefined
            );
            data = response.data;
          }
          break;
        case 'institution':
          if (selectedInstitutionId) {
            const response = await gradeBookAdminService.getInstitutionHierarchy(
              selectedInstitutionId,
              selectedAcademicYearId || undefined
            );
            data = response.data;
          }
          break;
      }

      setHierarchyData(data);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Hiyerarşik məlumatlar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, selectedRegionId, selectedSectorId, selectedInstitutionId, selectedAcademicYearId, userRegionId, userSectorId, toast]);

  // Load analysis data
  const refreshAnalysis = useCallback(async (params?: Partial<AnalysisParams>) => {
    try {
      setAnalysisLoading(true);

      const effectiveRegionId = selectedRegionId || userRegionId;
      const effectiveSectorId = selectedSectorId || userSectorId;

      if (!effectiveRegionId && !effectiveSectorId) {
        return;
      }

      const analysisParams: AnalysisParams = {
        view_type: params?.view_type || (selectedLevel as any),
        compare_by: params?.compare_by || 'time',
        metrics: params?.metrics || ['average'],
        region_id: effectiveRegionId || undefined,
        sector_id: effectiveSectorId || undefined,
        academic_year_id: selectedAcademicYearId || undefined,
      };

      const response = await gradeBookAdminService.getMultiLevelAnalysis(analysisParams);
      setAnalysisData(response.data);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Analiz məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedLevel, selectedRegionId, selectedSectorId, selectedAcademicYearId, userRegionId, userSectorId, toast]);

  // Load sectors for a region
  const loadSectors = useCallback(async (regionId: number) => {
    try {
      const data = await gradeBookAdminService.getSectorsByRegion(regionId);
      setSectors(data);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Sektorlar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Load institutions for a sector
  const loadInstitutions = useCallback(async (sectorId: number) => {
    try {
      const data = await gradeBookAdminService.getInstitutionsBySector(sectorId);
      setInstitutions(data);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Məktəblər yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Auto-load hierarchy when dependencies change
  useEffect(() => {
    refreshHierarchy();
  }, [refreshHierarchy]);

  // Auto-load sectors when region changes
  useEffect(() => {
    if (selectedRegionId && canAccessRegion) {
      loadSectors(selectedRegionId);
    }
  }, [selectedRegionId, canAccessRegion, loadSectors]);

  // Auto-load institutions when sector changes
  useEffect(() => {
    if (selectedSectorId && canAccessSector) {
      loadInstitutions(selectedSectorId);
    }
  }, [selectedSectorId, canAccessSector, loadInstitutions]);

  return {
    // Data
    hierarchyData,
    analysisData,
    sectors,
    institutions,

    // Loading states
    loading,
    analysisLoading,

    // Selected values
    selectedLevel,
    selectedRegionId,
    selectedSectorId,
    selectedInstitutionId,
    selectedAcademicYearId,

    // Setters
    setSelectedLevel,
    setSelectedRegionId,
    setSelectedSectorId,
    setSelectedInstitutionId,
    setSelectedAcademicYearId,

    // Permissions
    canAccessRegion,
    canAccessSector,
    canAccessInstitution,
    userRegionId,
    userSectorId,

    // Actions
    refreshHierarchy,
    refreshAnalysis,
    loadSectors,
    loadInstitutions,
  };
};
