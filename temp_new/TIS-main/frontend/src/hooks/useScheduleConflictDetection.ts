import { useMemo, useCallback } from 'react';
import { ScheduleSlot, ScheduleConflict } from '@/services/schedule';

interface UseScheduleConflictDetectionProps {
  slots: ScheduleSlot[];
  enabled?: boolean;
}

interface ConflictDetectionResult {
  conflicts: ScheduleConflict[];
  hasConflicts: boolean;
  getSlotConflicts: (slotId: number) => ScheduleConflict[];
  getConflictsForTeacher: (teacherId: number) => ScheduleConflict[];
  getConflictsForClass: (classId: number) => ScheduleConflict[];
  getConflictsForRoom: (roomId: number) => ScheduleConflict[];
  validateNewSlot: (newSlot: Partial<ScheduleSlot>) => { isValid: boolean; conflicts: string[] };
}

export const useScheduleConflictDetection = ({
  slots,
  enabled = true,
}: UseScheduleConflictDetectionProps): ConflictDetectionResult => {
  
  // Detect all conflicts
  const conflicts = useMemo(() => {
    if (!enabled || slots.length === 0) return [];

    const detectedConflicts: ScheduleConflict[] = [];

    // Group slots by day and time for efficient checking
    const slotsByTime = new Map<string, ScheduleSlot[]>();
    
    slots.forEach(slot => {
      const key = `${slot.day_of_week}-${slot.start_time}`;
      if (!slotsByTime.has(key)) {
        slotsByTime.set(key, []);
      }
      slotsByTime.get(key)!.push(slot);
    });

    // Check for conflicts within each time slot
    slotsByTime.forEach((timeSlots) => {
      if (timeSlots.length < 2) return;

      // Check teacher conflicts
      const teacherMap = new Map<number, ScheduleSlot[]>();
      timeSlots.forEach(slot => {
        if (!teacherMap.has(slot.teacher_id)) {
          teacherMap.set(slot.teacher_id, []);
        }
        teacherMap.get(slot.teacher_id)!.push(slot);
      });

      teacherMap.forEach((teacherSlots, teacherId) => {
        if (teacherSlots.length > 1) {
          const firstSlot = teacherSlots[0];
          detectedConflicts.push({
            id: `teacher-${teacherId}-${firstSlot.day_of_week}-${firstSlot.start_time}`,
            type: 'teacher_conflict',
            severity: 'critical',
            description: `Müəllim ${firstSlot.teacher?.first_name} ${firstSlot.teacher?.last_name} eyni vaxtda ${teacherSlots.length} fərqli sinifdə təyin edilib`,
            affected_slots: teacherSlots.map(s => s.id),
            suggestions: ['Başqa vaxt seçin', 'Başqa müəllim təyin edin'],
            auto_resolvable: false,
          });
        }
      });

      // Check class conflicts
      const classMap = new Map<number, ScheduleSlot[]>();
      timeSlots.forEach(slot => {
        if (!classMap.has(slot.class_id)) {
          classMap.set(slot.class_id, []);
        }
        classMap.get(slot.class_id)!.push(slot);
      });

      classMap.forEach((classSlots, classId) => {
        if (classSlots.length > 1) {
          const firstSlot = classSlots[0];
          detectedConflicts.push({
            id: `class-${classId}-${firstSlot.day_of_week}-${firstSlot.start_time}`,
            type: 'class_conflict',
            severity: 'critical',
            description: `Sinif ${firstSlot.class?.name} eyni vaxtda ${classSlots.length} fərqli fənnə təyin edilib`,
            affected_slots: classSlots.map(s => s.id),
            suggestions: ['Başqa vaxt seçin'],
            auto_resolvable: false,
          });
        }
      });

      // Check room conflicts (only if rooms are assigned)
      const roomMap = new Map<number, ScheduleSlot[]>();
      timeSlots.forEach(slot => {
        if (slot.room_id) {
          if (!roomMap.has(slot.room_id)) {
            roomMap.set(slot.room_id, []);
          }
          roomMap.get(slot.room_id)!.push(slot);
        }
      });

      roomMap.forEach((roomSlots, roomId) => {
        if (roomSlots.length > 1) {
          const firstSlot = roomSlots[0];
          detectedConflicts.push({
            id: `room-${roomId}-${firstSlot.day_of_week}-${firstSlot.start_time}`,
            type: 'room_conflict',
            severity: 'high',
            description: `Otaq ${firstSlot.room?.name} eyni vaxtda ${roomSlots.length} fərqli sinifə təyin edilib`,
            affected_slots: roomSlots.map(s => s.id),
            suggestions: ['Başqa otaq seçin', 'Başqa vaxt seçin'],
            auto_resolvable: true,
          });
        }
      });
    });

    return detectedConflicts;
  }, [slots, enabled]);

  const hasConflicts = conflicts.length > 0;

  // Get conflicts for a specific slot
  const getSlotConflicts = useCallback((slotId: number): ScheduleConflict[] => {
    return conflicts.filter(c => c.affected_slots.includes(slotId));
  }, [conflicts]);

  // Get conflicts for a teacher
  const getConflictsForTeacher = useCallback((teacherId: number): ScheduleConflict[] => {
    return conflicts.filter(c => 
      c.type === 'teacher_conflict' && 
      slots.some(s => s.teacher_id === teacherId && c.affected_slots.includes(s.id))
    );
  }, [conflicts, slots]);

  // Get conflicts for a class
  const getConflictsForClass = useCallback((classId: number): ScheduleConflict[] => {
    return conflicts.filter(c => 
      c.type === 'class_conflict' && 
      slots.some(s => s.class_id === classId && c.affected_slots.includes(s.id))
    );
  }, [conflicts, slots]);

  // Get conflicts for a room
  const getConflictsForRoom = useCallback((roomId: number): ScheduleConflict[] => {
    return conflicts.filter(c => 
      c.type === 'room_conflict' && 
      slots.some(s => s.room_id === roomId && c.affected_slots.includes(s.id))
    );
  }, [conflicts, slots]);

  // Validate a new slot before adding
  const validateNewSlot = useCallback((newSlot: Partial<ScheduleSlot>): { isValid: boolean; conflicts: string[] } => {
    const conflictMessages: string[] = [];

    // Check teacher availability
    const teacherConflicts = slots.filter(s =>
      s.teacher_id === newSlot.teacher_id &&
      s.day_of_week === newSlot.day_of_week &&
      s.start_time === newSlot.start_time
    );
    if (teacherConflicts.length > 0) {
      conflictMessages.push('Müəllim bu vaxtda artıq başqa sinifdə təyin edilib');
    }

    // Check class availability
    const classConflicts = slots.filter(s =>
      s.class_id === newSlot.class_id &&
      s.day_of_week === newSlot.day_of_week &&
      s.start_time === newSlot.start_time
    );
    if (classConflicts.length > 0) {
      conflictMessages.push('Sinif bu vaxtda artıq başqa fənnə təyin edilib');
    }

    // Check room availability
    if (newSlot.room_id) {
      const roomConflicts = slots.filter(s =>
        s.room_id === newSlot.room_id &&
        s.day_of_week === newSlot.day_of_week &&
        s.start_time === newSlot.start_time
      );
      if (roomConflicts.length > 0) {
        conflictMessages.push('Otaq bu vaxtda artıq başqa sinifə təyin edilib');
      }
    }

    return {
      isValid: conflictMessages.length === 0,
      conflicts: conflictMessages,
    };
  }, [slots]);

  return {
    conflicts,
    hasConflicts,
    getSlotConflicts,
    getConflictsForTeacher,
    getConflictsForClass,
    getConflictsForRoom,
    validateNewSlot,
  };
};

export default useScheduleConflictDetection;
