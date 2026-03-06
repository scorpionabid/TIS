import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  key: string;
  data: any;
  interval?: number; // milliseconds
  enabled?: boolean;
  onSave?: () => void;
}

export function useAutoSave({
  key,
  data,
  interval = 30000, // 30 seconds default
  enabled = true,
  onSave,
}: AutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  const saveToStorage = useCallback(() => {
    if (!enabled || !key) return;

    const dataString = JSON.stringify(data);

    // Only save if data has changed
    if (dataString !== lastSavedRef.current && dataString !== '{}' && dataString !== 'null') {
      try {
        localStorage.setItem(key, dataString);
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        lastSavedRef.current = dataString;
        onSave?.();
      } catch (error) {
        console.error('Failed to auto-save to localStorage:', error);
      }
    }
  }, [key, data, enabled, onSave]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveToStorage();
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, interval, enabled, saveToStorage]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
      lastSavedRef.current = '';
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }, [key]);

  const getSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(key);
      const timestamp = localStorage.getItem(`${key}_timestamp`);

      if (savedData) {
        return {
          data: JSON.parse(savedData),
          timestamp: timestamp ? parseInt(timestamp, 10) : null,
        };
      }
    } catch (error) {
      console.error('Failed to retrieve saved data:', error);
    }
    return null;
  }, [key]);

  return {
    saveNow: saveToStorage,
    clearSavedData,
    getSavedData,
  };
}
