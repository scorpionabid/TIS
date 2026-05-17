/**
 * Memoization utilities for optimizing re-renders in Report Tables
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Deep equality check for complex objects
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Shallow comparison of arrays
 */
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

/**
 * Custom hook for memoizing derived data with deep equality
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  const ref = useRef<{ value: T; deps: unknown[] }>({ value: undefined as T, deps: [] });

  const depsChanged = deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => !deepEqual(dep, ref.current.deps[i]));

  if (depsChanged) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

/**
 * Hook for memoizing expensive calculations that depend on array data
 */
export function useArrayMemo<T, R>(
  array: T[],
  compute: (items: T[]) => R,
  deps: unknown[] = []
): R {
  return useMemo(() => compute(array), [array, ...deps]);
}

/**
 * Hook for creating stable callbacks that don't cause child re-renders
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[] = []
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(((...args: unknown[]) => callbackRef.current(...args)) as T, deps);
}

/**
 * Hook for throttling high-frequency updates (e.g., search input)
 */
export function useThrottledValue<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setThrottledValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * Hook for tracking which table rows have changed to optimize row re-renders
 */
export function useRowChangeTracker<T extends { id?: string | number }>(
  rows: T[]
): Set<string | number> {
  const previousRows = useRef<Map<string | number, string>>(new Map());

  return useMemo(() => {
    const changed = new Set<string | number>();
    const currentRows = new Map<string | number, string>();

    rows.forEach((row) => {
      const id = row.id ?? JSON.stringify(row);
      const hash = JSON.stringify(row);
      currentRows.set(id, hash);

      const prevHash = previousRows.current.get(id);
      if (prevHash !== undefined && prevHash !== hash) {
        changed.add(id);
      }
    });

    previousRows.current = currentRows;
    return changed;
  }, [rows]);
}

/**
 * Create a stable selector function for large datasets
 */
export function createStableSelector<T, R>(
  selector: (data: T) => R
): (data: T) => R {
  let lastData: T | undefined;
  let lastResult: R | undefined;

  return (data: T): R => {
    if (lastData !== undefined && deepEqual(lastData, data)) {
      return lastResult as R;
    }

    lastData = data;
    lastResult = selector(data);
    return lastResult;
  };
}
