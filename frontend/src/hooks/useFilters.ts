import { useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * useFilters — universal filter hook
 *
 * Xüsusiyyətlər:
 * - Generic filter state (T extends Record<string, unknown>)
 * - Debounced search (konfiqurasiya olunan sahə üçün)
 * - URL sync (persistToUrl: true ilə)
 * - hasActiveFilters, activeFilterCount computed
 * - clearFilters() — bütün state-i default-a qaytarır
 *
 * İstifadə (local state):
 *   const DEFAULT = { search: '', status: 'all' } as const;
 *   const { filters, debouncedSearch, setFilter, clearFilters } =
 *     useFilters(DEFAULT, { searchKey: 'search', debounceMs: 400 });
 *
 * İstifadə (URL state):
 *   const { filters, debouncedSearch, setFilter, clearFilters } =
 *     useFilters(DEFAULT, { persistToUrl: true, searchKey: 'search' });
 */

export interface UseFiltersOptions {
  /** Debounce ediləcək sahənin adı (default: 'search') */
  searchKey?: string;
  /** Debounce gecikməsi ms ilə (default: 400) */
  debounceMs?: number;
  /** Filter dəyərlərini URL search params-a yaz (default: false) */
  persistToUrl?: boolean;
  /** "Boş/inaktiv" kimi sayılan dəyərlər (default: ['', 'all', undefined, null]) */
  emptyValues?: unknown[];
}

export interface UseFiltersReturn<T extends Record<string, unknown>> {
  /** Cari filter state-i */
  filters: T;
  /** Debounce olunmuş search dəyəri (yalnız searchKey sahəsi üçün) */
  debouncedSearch: string;
  /** Bir sahəni dəyişdir */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Bütün filterləri default-a qaytar */
  clearFilters: () => void;
  /** Ən azı bir aktiv filter varsa true */
  hasActiveFilters: boolean;
  /** Aktiv filter sayı */
  activeFilterCount: number;
}

function isEmpty(emptyValues: unknown[], value: unknown): boolean {
  return emptyValues.includes(value);
}

export function useFilters<T extends Record<string, unknown>>(
  defaults: T,
  options: UseFiltersOptions = {},
): UseFiltersReturn<T> {
  const {
    searchKey = 'search',
    debounceMs = 400,
    persistToUrl = false,
    emptyValues = ['', 'all', undefined, null],
  } = options;

  // Stabilize defaults reference so callers don't need to memoize
  const defaultsRef = useRef<T>(defaults);

  // ── Local state ────────────────────────────────────────────────────────────
  const [localFilters, setLocalFilters] = useState<T>(defaults);

  const setLocalFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearLocalFilters = useCallback(() => {
    setLocalFilters(defaultsRef.current);
  }, []);

  // ── URL state ──────────────────────────────────────────────────────────────
  // NOTE: useSearchParams is always called (React hooks rules), but only used when persistToUrl=true.
  // All ATİS pages are inside <BrowserRouter>, so this is safe.
  const [searchParams, setSearchParams] = useSearchParams();

  const urlFilters = useMemo<T>(() => {
    if (!persistToUrl) return localFilters; // short-circuit: avoid computation when not needed
    return Object.fromEntries(
      Object.keys(defaultsRef.current).map((key) => {
        const val = searchParams.get(key);
        return [key, val !== null ? (val as unknown) : defaultsRef.current[key]];
      }),
    ) as T;
  }, [persistToUrl, searchParams, localFilters]);

  const setURLFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (isEmpty(emptyValues, value) || String(value) === '') {
        next.delete(key as string);
      } else {
        next.set(key as string, String(value));
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams, emptyValues]);

  const clearURLFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.keys(defaultsRef.current).forEach((key) => next.delete(key));
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ── Unified ────────────────────────────────────────────────────────────────
  const filters = persistToUrl ? urlFilters : localFilters;
  const setFilter = persistToUrl ? setURLFilter : setLocalFilter;
  const clearFilters = persistToUrl ? clearURLFilters : clearLocalFilters;

  const searchValue = (filters[searchKey] ?? '') as string;
  const debouncedSearch = useDebounce(searchValue, debounceMs);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(v => !isEmpty(emptyValues, v)),
    [filters, emptyValues],
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => !isEmpty(emptyValues, v)).length,
    [filters, emptyValues],
  );

  return { filters, debouncedSearch, setFilter, clearFilters, hasActiveFilters, activeFilterCount };
}
