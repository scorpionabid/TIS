import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  scheduleService,
  Schedule,
  ScheduleSlot,
  ScheduleConflict,
  Room,
  Subject,
  Teacher,
  ScheduleClass,
  ScheduleTemplate,
  CreateScheduleData
} from '@/services/schedule';
import { format, startOfWeek, addDays } from 'date-fns';

export const useScheduleBuilder = (scheduleId?: number, onSave?: (schedule: Schedule) => void) => {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [activeTab, setActiveTab] = useState('grid');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load schedule data
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => scheduleId ? scheduleService.getSchedule(scheduleId) : null,
    enabled: !!scheduleId,
  });

  // Load classes
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['schedule-classes'],
    queryFn: () => scheduleService.getClasses(),
  });

  // Load rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['schedule-rooms'],
    queryFn: () => scheduleService.getRooms(),
  });

  // Load subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['schedule-subjects'],
    queryFn: () => scheduleService.getSubjects(),
  });

  // Load teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['schedule-teachers'],
    queryFn: () => scheduleService.getTeachers(),
  });

  // Load templates
  const { data: templates } = useQuery({
    queryKey: ['schedule-templates'],
    queryFn: () => scheduleService.getTemplates(),
  });

  // Save schedule mutation
  const saveMutation = useMutation({
    mutationFn: (data: CreateScheduleData) => 
      scheduleId ? scheduleService.updateSchedule(scheduleId, data) : scheduleService.createSchedule(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast({
        title: 'Uğurlu',
        description: 'Cədvəl yadda saxlanıldı',
      });
      onSave?.(result.data);
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'Cədvəl yadda saxlanılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Check conflicts mutation
  const conflictMutation = useMutation({
    mutationFn: (slot: ScheduleSlot) => scheduleService.checkConflicts(slot),
    onSuccess: (result) => {
      setConflicts(result.data);
    },
  });

  const timeSlots = [
    '08:00-08:45',
    '08:55-09:40',
    '09:50-10:35',
    '10:45-11:30',
    '11:40-12:25',
    '12:35-13:20',
    '13:30-14:15',
    '14:25-15:10',
    '15:20-16:05',
  ];

  const weekDays = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];

  const generateWeekDates = useCallback(() => {
    return weekDays.map((_, index) => addDays(selectedWeek, index));
  }, [selectedWeek]);

  const handleSlotClick = (day: number, timeSlot: string) => {
    setSelectedTimeSlot(`${day}-${timeSlot}`);
    setIsEditMode(true);
  };

  const handleAddSlot = () => {
    if (!selectedClass || !selectedRoom || !selectedSubject || !selectedTeacher || !selectedTimeSlot) {
      toast({
        title: 'Xəta',
        description: 'Bütün sahələri doldurun',
        variant: 'destructive',
      });
      return;
    }

    const [day, timeSlot] = selectedTimeSlot.split('-');
    const newSlot: ScheduleSlot = {
      id: Date.now(),
      day: parseInt(day),
      timeSlot,
      classId: selectedClass,
      roomId: selectedRoom,
      subjectId: selectedSubject,
      teacherId: selectedTeacher,
      date: generateWeekDates()[parseInt(day)],
    };

    // Check for conflicts
    conflictMutation.mutate(newSlot);
    
    // Add to schedule (you would update your schedule state here)
    resetSelection();
  };

  const resetSelection = () => {
    setSelectedClass(null);
    setSelectedRoom(null);
    setSelectedSubject(null);
    setSelectedTeacher(null);
    setSelectedTimeSlot(null);
    setIsEditMode(false);
  };

  const handleDragStart = (slot: ScheduleSlot) => {
    setDraggedSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (day: number, timeSlot: string) => {
    if (draggedSlot) {
      // Update slot position
      const updatedSlot = {
        ...draggedSlot,
        day,
        timeSlot,
        date: generateWeekDates()[day],
      };
      
      // Check for conflicts
      conflictMutation.mutate(updatedSlot);
      
      setDraggedSlot(null);
    }
  };

  const getSlotForTimeAndDay = (day: number, timeSlot: string): ScheduleSlot | null => {
    // This would be your logic to find existing slots
    return null;
  };

  const hasConflict = (day: number, timeSlot: string): boolean => {
    return conflicts.some(conflict => 
      conflict.day === day && conflict.timeSlot === timeSlot
    );
  };

  const exportSchedule = () => {
    // Export logic
    toast({
      title: 'Export',
      description: 'Cədvəl eksport edilir...',
    });
  };

  const importTemplate = (templateId: number) => {
    // Import template logic
    toast({
      title: 'İmport',
      description: 'Şablon yüklənir...',
    });
  };

  return {
    // State
    selectedWeek,
    setSelectedWeek,
    selectedClass,
    setSelectedClass,
    selectedRoom,
    setSelectedRoom,
    selectedSubject,
    setSelectedSubject,
    selectedTeacher,
    setSelectedTeacher,
    selectedTimeSlot,
    setSelectedTimeSlot,
    draggedSlot,
    setDraggedSlot,
    isEditMode,
    setIsEditMode,
    conflicts,
    activeTab,
    setActiveTab,

    // Data
    schedule: schedule?.data,
    classes: classes?.data || [],
    rooms: rooms?.data || [],
    subjects: subjects?.data || [],
    teachers: teachers?.data || [],
    templates: templates?.data || [],

    // Loading states
    scheduleLoading,
    classesLoading,
    roomsLoading,
    subjectsLoading,
    teachersLoading,

    // Constants
    timeSlots,
    weekDays,

    // Actions
    generateWeekDates,
    handleSlotClick,
    handleAddSlot,
    resetSelection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    getSlotForTimeAndDay,
    hasConflict,
    exportSchedule,
    importTemplate,

    // Mutations
    saveMutation,
    conflictMutation,
  };
};