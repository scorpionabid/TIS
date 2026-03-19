import { useState, useEffect, useCallback } from 'react';

export interface ShiftPeriod {
  num: number;
  startTime: string;
  endTime: string;
}

export interface ShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  periodCount: number;
  periods: ShiftPeriod[];
}

export interface ShiftConfiguration {
  shift1: ShiftConfig;
  shift2: ShiftConfig;
  activeShift: 'shift1' | 'shift2' | 'both';
}

const STORAGE_KEY = 'teacher_availability_shifts_config';

// Default configuration
const defaultConfig: ShiftConfiguration = {
  shift1: {
    id: 'shift1',
    name: 'I NÖVBƏ',
    startTime: '08:00',
    endTime: '12:55',
    periodCount: 6,
    periods: [
      { num: 1, startTime: '08:00', endTime: '08:45' },
      { num: 2, startTime: '08:50', endTime: '09:35' },
      { num: 3, startTime: '09:40', endTime: '10:25' },
      { num: 4, startTime: '10:30', endTime: '11:15' },
      { num: 5, startTime: '11:20', endTime: '12:05' },
      { num: 6, startTime: '12:10', endTime: '12:55' },
    ],
  },
  shift2: {
    id: 'shift2',
    name: 'II NÖVBƏ',
    startTime: '13:00',
    endTime: '17:55',
    periodCount: 6,
    periods: [
      { num: 7, startTime: '13:00', endTime: '13:45' },
      { num: 8, startTime: '13:50', endTime: '14:35' },
      { num: 9, startTime: '14:40', endTime: '15:25' },
      { num: 10, startTime: '15:30', endTime: '16:15' },
      { num: 11, startTime: '16:20', endTime: '17:05' },
      { num: 12, startTime: '17:10', endTime: '17:55' },
    ],
  },
  activeShift: 'both',
};

// Generate periods based on start time and period count
const generatePeriods = (
  startTime: string,
  periodCount: number,
  periodDuration: number = 45,
  breakDuration: number = 5,
  startPeriodNum: number = 1
): ShiftPeriod[] => {
  const periods: ShiftPeriod[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMin;

  for (let i = 0; i < periodCount; i++) {
    const periodStart = currentMinutes;
    const periodEnd = periodStart + periodDuration;

    const startHourStr = String(Math.floor(periodStart / 60)).padStart(2, '0');
    const startMinStr = String(periodStart % 60).padStart(2, '0');
    const endHourStr = String(Math.floor(periodEnd / 60)).padStart(2, '0');
    const endMinStr = String(periodEnd % 60).padStart(2, '0');

    periods.push({
      num: startPeriodNum + i,
      startTime: `${startHourStr}:${startMinStr}`,
      endTime: `${endHourStr}:${endMinStr}`,
    });

    currentMinutes = periodEnd + breakDuration;
  }

  return periods;
};

// Calculate end time based on start time and periods
const calculateEndTime = (
  startTime: string,
  periodCount: number,
  periodDuration: number = 45,
  breakDuration: number = 5
): string => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const totalMinutes =
    startHour * 60 +
    startMin +
    periodCount * periodDuration +
    (periodCount - 1) * breakDuration;

  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;

  return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
};

export const useShiftConfig = () => {
  const [config, setConfig] = useState<ShiftConfiguration>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (e) {
        console.error('Failed to parse shift config:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever config changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }, [config, isLoaded]);

  // Update shift configuration
  const updateShiftConfig = useCallback(
    (
      shiftId: 'shift1' | 'shift2',
      updates: Partial<Omit<ShiftConfig, 'id' | 'periods'>>
    ) => {
      setConfig((prev) => {
        const shift = prev[shiftId];
        const newConfig = { ...shift, ...updates };

        // Recalculate periods if start time or period count changed
        if (updates.startTime !== undefined || updates.periodCount !== undefined) {
          const startPeriodNum = shiftId === 'shift1' ? 1 : shift.periodCount + 1;
          newConfig.periods = generatePeriods(
            newConfig.startTime,
            newConfig.periodCount,
            45,
            5,
            startPeriodNum
          );
          newConfig.endTime = calculateEndTime(
            newConfig.startTime,
            newConfig.periodCount
          );
        }

        return {
          ...prev,
          [shiftId]: newConfig,
        };
      });
    },
    []
  );

  // Set active shift
  const setActiveShift = useCallback(
    (activeShift: 'shift1' | 'shift2' | 'both') => {
      setConfig((prev) => ({ ...prev, activeShift }));
    },
    []
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  // Get all active periods based on active shift setting
  const getActivePeriods = useCallback((): ShiftPeriod[] => {
    switch (config.activeShift) {
      case 'shift1':
        return config.shift1.periods;
      case 'shift2':
        return config.shift2.periods;
      case 'both':
      default:
        return [...config.shift1.periods, ...config.shift2.periods];
    }
  }, [config]);

  // Get periods for display in grid (separate arrays for each shift)
  const getShiftPeriods = useCallback(
    (): { shift1: ShiftPeriod[]; shift2: ShiftPeriod[] } => {
      return {
        shift1: config.shift1.periods,
        shift2: config.shift2.periods,
      };
    },
    [config]
  );

  return {
    config,
    isLoaded,
    updateShiftConfig,
    setActiveShift,
    resetToDefaults,
    getActivePeriods,
    getShiftPeriods,
  };
};

export default useShiftConfig;
