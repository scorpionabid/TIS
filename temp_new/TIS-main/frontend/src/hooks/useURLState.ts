import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useURLFilters — filter dəyərlərini URL search params ilə sinxronlaşdırır.
 *
 * İstifadə:
 *   const { filters, setFilter, clearFilters } = useURLFilters({ status: undefined, region: undefined });
 */
export function useURLFilters<T extends Record<string, unknown>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = Object.fromEntries(
    Object.keys(defaults).map((key) => {
      const val = searchParams.get(key);
      return [key, val !== null ? (val as unknown) : defaults[key]];
    })
  ) as T;

  const setFilter = useCallback(
    (key: keyof T, value: T[keyof T]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === undefined || value === null || value === '') {
            next.delete(key as string);
          } else {
            next.set(key as string, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.keys(defaults).forEach((key) => next.delete(key));
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams, defaults]);

  return { filters, setFilter, clearFilters };
}

/**
 * useURLPagination — cari səhifəni URL search params ilə sinxronlaşdırır.
 *
 * İstifadə:
 *   const { page, setPage } = useURLPagination(1, 20);
 */
export function useURLPagination(initialPage = 1, _perPage = 20) {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = searchParams.get('page');
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : initialPage;

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newPage <= 1) {
            next.delete('page');
          } else {
            next.set('page', String(newPage));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { page, setPage };
}
