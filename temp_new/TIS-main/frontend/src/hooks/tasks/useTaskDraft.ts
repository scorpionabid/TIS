import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageHelpers } from '@/utils/helpers';
import { logger } from '@/utils/logger';

type UseTaskDraftOptions = {
  debounceMs?: number;
};

const hasMeaningfulValue = (value: unknown) => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
};

export function useTaskDraft<T extends Record<string, any> = Record<string, any>>(
  storageKey: string,
  options: UseTaskDraftOptions = {}
) {
  const { debounceMs = 600 } = options;
  const timeoutRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<Partial<T> | null>(() => {
    if (typeof window === 'undefined') return null;
    return storageHelpers.get<Partial<T>>(storageKey, null);
  });

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    storageHelpers.remove(storageKey);
    setDraft(null);
  }, [storageKey]);

  const persistDraft = useCallback(
    (values: Partial<T>) => {
      if (typeof window === 'undefined') return;
      storageHelpers.set(storageKey, values);
      setDraft(values);
    },
    [storageKey]
  );

  const scheduleSave = useCallback(
    (values: Partial<T>) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        persistDraft(values);
      }, debounceMs);
    },
    [persistDraft, debounceMs]
  );

  const saveDraft = useCallback(
    (values: Partial<T> | null | undefined) => {
      if (!values) {
        clearDraft();
        return;
      }

      const hasContent = Object.values(values).some(hasMeaningfulValue);
      if (!hasContent) {
        clearDraft();
        return;
      }

      try {
        scheduleSave(values);
      } catch (error) {
        logger.warn('useTaskDraft save failed', error, {
          component: 'useTaskDraft',
          action: 'save',
        });
      }
    },
    [clearDraft, scheduleSave]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      draft,
      saveDraft,
      clearDraft,
    }),
    [clearDraft, draft, saveDraft]
  );
}
