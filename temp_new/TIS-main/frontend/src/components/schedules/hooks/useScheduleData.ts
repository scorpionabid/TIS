import { useQuery } from '@tanstack/react-query';
import { scheduleService } from '@/services/schedule';
import { format } from 'date-fns';

interface UseScheduleDataProps {
  scheduleId?: number;
  classId?: number;
  teacherId?: number;
  roomId?: number;
  weekStart: Date;
  showConflicts: boolean;
}

export const useScheduleData = ({
  scheduleId,
  classId,
  teacherId,
  roomId,
  weekStart,
  showConflicts
}: UseScheduleDataProps) => {
  // Load weekly schedule data
  const {
    data: weeklyResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['weekly-schedule', format(weekStart, 'yyyy-MM-dd'), classId, teacherId, roomId],
    queryFn: () => scheduleService.getWeeklySchedule({
      class_id: classId,
      teacher_id: teacherId,
      week_start: format(weekStart, 'yyyy-MM-dd')
    }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Load conflicts if enabled
  const { data: conflictsResponse } = useQuery({
    queryKey: ['schedule-conflicts', scheduleId],
    queryFn: () => scheduleService.detectConflicts({ schedule_id: scheduleId }),
    enabled: showConflicts && !!scheduleId,
    staleTime: 1000 * 60 * 5,
  });

  const slots = weeklyResponse?.data?.slots || [];
  const conflicts = conflictsResponse?.data?.conflicts || [];

  return {
    slots,
    conflicts,
    isLoading,
    error,
    refetch
  };
};
