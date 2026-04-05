import { useState, useCallback } from 'react';
import type { RegionStudent } from '@/services/students';
import type { SortColumn, SortDirection } from './types';

export function useRegionStudentState() {
  // Filters
  const [search, setSearch]           = useState('');
  const [sectorId, setSectorId]       = useState<number | undefined>();
  const [schoolId, setSchoolId]       = useState<number | undefined>();
  const [gradeLevel, setGradeLevel]   = useState('');
  const [className, setClassName]     = useState('');
  const [isActive, setIsActive]       = useState<string>('');

  // Sorting & pagination
  const [sortColumn, setSortColumn]     = useState<SortColumn>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage]                 = useState(1);
  const [perPage, setPerPage]           = useState(25);

  // Detail dialog
  const [selectedStudent, setSelectedStudent] = useState<RegionStudent | null>(null);
  const [isDetailOpen, setIsDetailOpen]       = useState(false);

  const openDetail  = useCallback((s: RegionStudent) => { setSelectedStudent(s); setIsDetailOpen(true); }, []);
  const closeDetail = useCallback(() => { setIsDetailOpen(false); setSelectedStudent(null); }, []);

  const handleSort = useCallback((col: SortColumn) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortDirection('asc');
      return col;
    });
    setPage(1);
  }, []);

  // When sector changes, reset school and page
  const handleSectorChange = useCallback((id: number | undefined) => {
    setSectorId(id);
    setSchoolId(undefined);
    setPage(1);
  }, []);

  const handleSchoolChange  = useCallback((id: number | undefined) => { setSchoolId(id);  setPage(1); }, []);
  const handleGradeChange   = useCallback((v: string) => { setGradeLevel(v); setPage(1); setClassName(''); }, []);
  const handleClassChange   = useCallback((v: string) => { setClassName(v);  setPage(1); }, []);
  const handleStatusChange  = useCallback((v: string) => { setIsActive(v);   setPage(1); }, []);
  const handleSearchChange  = useCallback((v: string) => { setSearch(v);     setPage(1); }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSectorId(undefined);
    setSchoolId(undefined);
    setGradeLevel('');
    setClassName('');
    setIsActive('');
    setPage(1);
  }, []);

  const hasActiveFilters = !!(search || sectorId || schoolId || gradeLevel || className || isActive);

  return {
    // filter state
    search, sectorId, schoolId, gradeLevel, className, isActive,
    // sort/pagination
    sortColumn, sortDirection, page, perPage,
    setPage,
    setPerPage: (v: number) => { setPerPage(v); setPage(1); },
    // handlers
    handleSort,
    handleSectorChange,
    handleSchoolChange,
    handleGradeChange,
    handleClassChange,
    handleStatusChange,
    handleSearchChange,
    clearFilters,
    hasActiveFilters,
    // detail
    selectedStudent, isDetailOpen, openDetail, closeDetail,
  };
}
