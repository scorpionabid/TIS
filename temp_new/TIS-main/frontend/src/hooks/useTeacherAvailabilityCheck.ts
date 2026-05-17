import { useQuery } from '@tanstack/react-query';
import { teacherAvailabilityService, type TeacherAvailability, type DayOfWeek } from '@/services/teacherAvailability';
import { academicYearService } from '@/services/academicYears';

// Map dayOfWeek number to DayOfWeek string
const DAY_MAPPING: Record<number, DayOfWeek> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

// Reverse mapping
const REVERSE_DAY_MAPPING: Record<DayOfWeek, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

interface UseTeacherAvailabilityCheckProps {
  teacherId?: number;
  academicYearId?: number;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  isPreferred: boolean;
  isUnavailable: boolean;
  availabilityType: string | null;
  reason?: string;
}

export const useTeacherAvailabilityCheck = ({
  teacherId,
  academicYearId,
}: UseTeacherAvailabilityCheckProps) => {
  // Get current academic year if not provided
  const { data: currentYear } = useQuery({
    queryKey: ['academic-year-current'],
    queryFn: () => academicYearService.getCurrent(),
    enabled: !academicYearId,
  });

  const effectiveAcademicYearId = academicYearId || currentYear?.id;

  // Fetch teacher availability
  const { data: availabilitiesResponse, isLoading } = useQuery({
    queryKey: ['teacher-availabilities-for-schedule', teacherId, effectiveAcademicYearId],
    queryFn: () => teacherAvailabilityService.list({
      teacher_id: teacherId,
      academic_year_id: effectiveAcademicYearId,
    }),
    enabled: !!teacherId && !!effectiveAcademicYearId,
  });

  const availabilities = availabilitiesResponse?.data || [];

  /**
   * Check if teacher is available at specific day and time
   */
  const checkAvailability = (
    dayOfWeek: number, // 1-7
    startTime: string, // HH:mm
    endTime?: string // HH:mm (optional, defaults to 45min later)
  ): AvailabilityCheckResult => {
    if (!teacherId || availabilities.length === 0) {
      return {
        isAvailable: true,
        isPreferred: false,
        isUnavailable: false,
        availabilityType: null,
        reason: 'Mövcudluq məlumatı yoxdur',
      };
    }

    const dayString = DAY_MAPPING[dayOfWeek];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const effectiveEndTime = endTime || `${String(startHour + 1).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    // Find matching availability entries for this day and time
    const matchingEntries = availabilities.filter((entry: TeacherAvailability) => {
      if (entry.day_of_week !== dayString) return false;

      const [entryStartHour] = entry.start_time.split(':').map(Number);
      const [entryEndHour] = entry.end_time.split(':').map(Number);

      // Check if the lesson time overlaps with this availability entry
      return startHour >= entryStartHour && startHour < entryEndHour;
    });

    if (matchingEntries.length === 0) {
      return {
        isAvailable: true,
        isPreferred: false,
        isUnavailable: false,
        availabilityType: 'none',
        reason: 'Təyin edilməyib',
      };
    }

    // Check for unavailable (highest priority)
    const unavailableEntry = matchingEntries.find(
      (e: TeacherAvailability) => e.availability_type === 'unavailable'
    );
    if (unavailableEntry) {
      return {
        isAvailable: false,
        isPreferred: false,
        isUnavailable: true,
        availabilityType: 'unavailable',
        reason: unavailableEntry.reason || 'Müəllim bu vaxtda mövcud deyil',
      };
    }

    // Check for preferred
    const preferredEntry = matchingEntries.find(
      (e: TeacherAvailability) => e.availability_type === 'preferred'
    );
    if (preferredEntry) {
      return {
        isAvailable: true,
        isPreferred: true,
        isUnavailable: false,
        availabilityType: 'preferred',
        reason: preferredEntry.reason || 'Üstünlük verilən vaxt',
      };
    }

    // Check for available
    const availableEntry = matchingEntries.find(
      (e: TeacherAvailability) => e.availability_type === 'available'
    );
    if (availableEntry) {
      return {
        isAvailable: true,
        isPreferred: false,
        isUnavailable: false,
        availabilityType: 'available',
        reason: availableEntry.reason || 'Müəllim mövcuddur',
      };
    }

    // Default case
    return {
      isAvailable: true,
      isPreferred: false,
      isUnavailable: false,
      availabilityType: 'none',
      reason: 'Təyin edilməyib',
    };
  };

  /**
   * Get all availability entries for a specific day
   */
  const getDayAvailability = (dayOfWeek: number): TeacherAvailability[] => {
    const dayString = DAY_MAPPING[dayOfWeek];
    return availabilities.filter((entry: TeacherAvailability) => entry.day_of_week === dayString);
  };

  /**
   * Check if there are any availability conflicts for a list of teacher IDs
   */
  const checkMultiTeacherAvailability = (
    teacherIds: number[],
    dayOfWeek: number,
    startTime: string
  ): Map<number, AvailabilityCheckResult> => {
    const results = new Map<number, AvailabilityCheckResult>();
    
    // This would require fetching all teachers' availabilities
    // For now, return empty (can be implemented with batch API call)
    teacherIds.forEach(id => {
      results.set(id, { isAvailable: true, isPreferred: false, isUnavailable: false, availabilityType: null });
    });

    return results;
  };

  return {
    availabilities,
    isLoading,
    checkAvailability,
    getDayAvailability,
    checkMultiTeacherAvailability,
  };
};

export default useTeacherAvailabilityCheck;
