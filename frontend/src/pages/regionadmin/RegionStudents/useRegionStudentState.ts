import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import type { RegionStudent } from '@/services/students';
import type { SortColumn, SortDirection } from './types';

export function useRegionStudentState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-based filter helpers ──────────────────────────────────────────────
  const getParam  = (key: string) => searchParams.get(key) ?? '';
  const getNumParam = (key: string): number | undefined => {
    const v = searchParams.get(key);
    return v ? Number(v) : undefined;
  };

  const setParam = useCallback((updates: Record<string, string | number | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      // Filter dəyişdikdə page=1
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ── Filter state (URL) ────────────────────────────────────────────────────
  const search      = getParam('search');
  const sectorId    = getNumParam('sector_id');
  const schoolId    = getNumParam('school_id');
  const gradeLevel  = getParam('grade_level');
  const className   = getParam('class_name');
  const isActive    = getParam('is_active');

  // ── Sort & pagination (local — ephemeral) ─────────────────────────────────
  const [sortColumn, setSortColumn]       = useState<SortColumn>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [perPage, setPerPageState]        = useState(25);

  const pageParam = searchParams.get('page');
  const page      = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const setPage = useCallback((p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ── Detail dialog (local) ─────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<RegionStudent | null>(null);
  const [isDetailOpen, setIsDetailOpen]       = useState(false);

  const openDetail  = useCallback((s: RegionStudent) => { setSelectedStudent(s); setIsDetailOpen(true); }, []);
  const closeDetail = useCallback(() => { setIsDetailOpen(false); setSelectedStudent(null); }, []);

  // ── Sort handler ──────────────────────────────────────────────────────────
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
  }, [setPage]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearchChange = useCallback((v: string) => setParam({ search: v }), [setParam]);

  // Sektor dəyişdikdə məktəbi sıfırla
  const handleSectorChange = useCallback((id: number | undefined) => {
    setParam({ sector_id: id, school_id: undefined });
  }, [setParam]);

  const handleSchoolChange  = useCallback((id: number | undefined) => setParam({ school_id: id }), [setParam]);
  const handleGradeChange   = useCallback((v: string) => setParam({ grade_level: v, class_name: undefined }), [setParam]);
  const handleClassChange   = useCallback((v: string) => setParam({ class_name: v }), [setParam]);
  const handleStatusChange  = useCallback((v: string) => setParam({ is_active: v }), [setParam]);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['search', 'sector_id', 'school_id', 'grade_level', 'class_name', 'is_active', 'page'].forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const debouncedSearch = useDebounce(search, 400);
  const hasActiveFilters = !!(search || sectorId || schoolId || gradeLevel || className || isActive);

  return {
    // filter state
    search, debouncedSearch, sectorId, schoolId, gradeLevel, className, isActive,
    // sort/pagination
    sortColumn, sortDirection, page, perPage,
    setPage,
    setPerPage: (v: number) => { setPerPageState(v); setPage(1); },
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
