import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sectorsService, SectorFilters } from '@/services/sectors';

interface UseSectorsProps {
  selectedType: string;
  selectedRegion: string;
  selectedStatus: string;
  searchQuery: string;
}

export function useSectors({ selectedType, selectedRegion, selectedStatus, searchQuery }: UseSectorsProps) {
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
  const sectorsQuery = useQuery({
    queryKey: ['sectors', filters],
    queryFn: () => sectorsService.getSectors(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load statistics
  const statsQuery = useQuery({
    queryKey: ['sector-statistics'],
    queryFn: () => sectorsService.getSectorStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Load available managers
  const managersQuery = useQuery({
    queryKey: ['available-managers'],
    queryFn: () => sectorsService.getAvailableManagers(),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  return {
    sectors: sectorsQuery.data,
    isLoading: sectorsQuery.isLoading,
    error: sectorsQuery.error,
    statistics: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,
    managers: managersQuery.data,
    filters,
  };
}