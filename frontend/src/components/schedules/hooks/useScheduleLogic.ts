import { useState, useCallback, useMemo } from 'react';
import { ScheduleSlot, ScheduleConflict } from '@/services/schedule';
import { addWeeks, subWeeks } from 'date-fns';

interface UseScheduleLogicProps {
  slots: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  onSlotClick?: (slot: ScheduleSlot) => void;
  onSlotEdit?: (slot: ScheduleSlot) => void;
  onEmptySlotClick?: (dayOfWeek: number, timeSlot: string) => void;
  readOnly?: boolean;
}

const timeSlots = [
  { id: '1', start_time: '08:00', end_time: '08:45', duration: 45, name: '1-ci dərs' },
  { id: '2', start_time: '08:55', end_time: '09:40', duration: 45, name: '2-ci dərs' },
  { id: '3', start_time: '09:50', end_time: '10:35', duration: 45, name: '3-cü dərs' },
  { id: '4', start_time: '10:55', end_time: '11:40', duration: 45, name: '4-cü dərs' },
  { id: '5', start_time: '11:50', end_time: '12:35', duration: 45, name: '5-ci dərs' },
  { id: '6', start_time: '12:45', end_time: '13:30', duration: 45, name: '6-cı dərs' },
  { id: '7', start_time: '13:40', end_time: '14:25', duration: 45, name: '7-ci dərs' },
  { id: '8', start_time: '14:35', end_time: '15:20', duration: 45, name: '8-ci dərs' },
];

const daysOfWeek = [
  { id: 1, name: 'Bazar ertəsi', short: 'B.e', veryShort: 'B.e' },
  { id: 2, name: 'Çərşənbə axşamı', short: 'Ç.a', veryShort: 'Ç.a' },
  { id: 3, name: 'Çərşənbə', short: 'Ç', veryShort: 'Ç' },
  { id: 4, name: 'Cümə axşamı', short: 'C.a', veryShort: 'C.a' },
  { id: 5, name: 'Cümə', short: 'C', veryShort: 'C' },
];

export const useScheduleLogic = ({
  slots,
  conflicts,
  onSlotClick,
  onSlotEdit,
  onEmptySlotClick,
  readOnly = false
}: UseScheduleLogicProps) => {
  // State management
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [viewScale, setViewScale] = useState<'compact' | 'normal' | 'detailed'>('normal');
  const [gridView, setGridView] = useState<'grid' | 'list'>('grid');

  // Filter slots based on filter type
  const filteredSlots = useMemo(() => {
    if (filterType === 'all') return slots;
    
    return slots.filter(slot => {
      switch (filterType) {
        case 'conflicts':
          return conflicts.some(conflict => 
            conflict.affected_slots.includes(slot.id)
          );
        case 'core':
          return slot.subject?.type === 'core';
        case 'elective':
          return slot.subject?.type === 'elective';
        default:
          return true;
      }
    });
  }, [slots, conflicts, filterType]);

  // Get slot for specific time and day
  const getSlotForCell = useCallback((dayOfWeek: number, timeSlotId: string) => {
    const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
    if (!timeSlot) return null;
    
    return filteredSlots.find(slot => 
      slot.day_of_week === dayOfWeek && 
      slot.start_time === timeSlot.start_time
    );
  }, [filteredSlots]);

  // Check if slot has conflicts
  const hasConflict = useCallback((slot: ScheduleSlot) => {
    return conflicts.some(conflict => 
      conflict.affected_slots.includes(slot.id)
    );
  }, [conflicts]);

  // Get conflict details for slot
  const getSlotConflicts = useCallback((slot: ScheduleSlot) => {
    return conflicts.filter(conflict => 
      conflict.affected_slots.includes(slot.id)
    );
  }, [conflicts]);

  // Navigation functions
  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  // Handle slot interactions
  const handleSlotClick = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);
    if (onSlotClick) {
      onSlotClick(slot);
    }
  };

  const handleEmptySlotClick = (dayOfWeek: number, timeSlotId: string) => {
    if (readOnly || !onEmptySlotClick) return;
    
    const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
    if (timeSlot) {
      onEmptySlotClick(dayOfWeek, timeSlot.start_time);
    }
  };

  return {
    // State
    currentWeek,
    selectedSlot,
    filterType,
    viewScale,
    gridView,
    filteredSlots,
    
    // Constants
    timeSlots,
    daysOfWeek,
    
    // Setters
    setCurrentWeek,
    setSelectedSlot,
    setFilterType,
    setViewScale,
    setGridView,
    
    // Functions
    getSlotForCell,
    hasConflict,
    getSlotConflicts,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    handleSlotClick,
    handleEmptySlotClick
  };
};
