import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  sectorsService, 
  SectorFilters, 
  Sector, 
  SectorCreateData, 
  SectorTaskCreateData 
} from '@/services/sectors';
import { useToast } from '@/hooks/use-toast';

export const useSectors = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build filters
  const filters: SectorFilters = useMemo(() => {
    const f: SectorFilters = {};
    if (selectedType !== 'all') f.type = selectedType;
    if (selectedRegion !== 'all') f.region_id = parseInt(selectedRegion);
    if (selectedStatus !== 'all') f.is_active = selectedStatus === 'active';
    if (searchQuery.trim()) f.search = searchQuery.trim();
    f.sort_by = 'name';
    f.sort_order = 'asc';
    return f;
  }, [selectedType, selectedRegion, selectedStatus, searchQuery]);

  // Load sectors data
  const { data: sectorsResponse, isLoading: sectorsLoading, error } = useQuery({
    queryKey: ['sectors', filters],
    queryFn: () => sectorsService.getSectors(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['sector-statistics'],
    queryFn: () => sectorsService.getSectorStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Load available managers
  const { data: managersResponse } = useQuery({
    queryKey: ['available-managers'],
    queryFn: () => sectorsService.getAvailableManagers(),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Use real data or fallback to mock data
  const sectors = sectorsResponse?.data || sectorsService.getMockSectors();
  const stats = statsResponse?.data || sectorsService.getMockStatistics();
  const availableManagers = managersResponse?.data || sectorsService.getMockManagers();

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: SectorCreateData) => sectorsService.createSector(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sector-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Yeni sektor yaradildı.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sektor yaratıdılarkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => sectorsService.toggleSectorStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sector-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Sektor statusu dəyişdirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Status dəyişdirilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedRegion('all');
    setSelectedStatus('all');
    setSearchQuery('');
  };

  return {
    // State
    selectedType,
    setSelectedType,
    selectedRegion, 
    setSelectedRegion,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    selectedSector,
    setSelectedSector,
    
    // Data
    sectors,
    stats,
    availableManagers,
    sectorsLoading,
    statsLoading,
    error,
    
    // Mutations
    createMutation,
    toggleStatusMutation,
    
    // Actions
    clearFilters,
  };
};