import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { studentService } from '@/services/students';
import type { RegionStudentFilters } from '@/services/students';

interface UseRegionStudentDataParams {
  search: string;
  sectorId: number | undefined;
  schoolId: number | undefined;
  gradeLevel: string;
  className: string;
  isActive: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export function useRegionStudentData(params: UseRegionStudentDataParams) {
  const filters: RegionStudentFilters = {
    search:      params.search     || undefined,
    sector_id:   params.sectorId,
    school_id:   params.schoolId,
    grade_level: params.gradeLevel || undefined,
    class_name:  params.className  || undefined,
    is_active:   params.isActive !== '' ? params.isActive : undefined,
    sort_by:     params.sortColumn,
    sort_order:  params.sortDirection,
    page:        params.page,
    per_page:    params.perPage,
  };

  const studentsQuery = useQuery({
    queryKey: ['regionadmin', 'students', filters],
    queryFn: () => studentService.getRegionStudents(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const filterOptionsQuery = useQuery({
    queryKey: ['regionadmin', 'students', 'filter-options'],
    queryFn: () => studentService.getRegionStudentFilterOptions(),
    staleTime: 5 * 60_000,
  });

  const students    = studentsQuery.data?.data        ?? [];
  const pagination  = studentsQuery.data?.pagination;
  const statistics  = studentsQuery.data?.statistics;
  const sectors     = filterOptionsQuery.data?.sectors ?? [];
  const allSchools  = filterOptionsQuery.data?.schools ?? [];

  // Filter schools by selected sector for the cascading dropdown
  const schools = useMemo(() => {
    if (!params.sectorId) return allSchools;
    return allSchools.filter(s => s.parent_id === params.sectorId);
  }, [allSchools, params.sectorId]);

  return {
    students,
    pagination,
    statistics,
    sectors,
    schools,
    isLoading:  studentsQuery.isLoading,
    isFetching: studentsQuery.isFetching,
    isError:    studentsQuery.isError,
    errorMessage: studentsQuery.error instanceof Error
      ? studentsQuery.error.message
      : 'Şagirdlər yüklənərkən xəta baş verdi',
    refetch: studentsQuery.refetch,
  };
}
