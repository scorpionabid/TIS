import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { attendanceService, BulkAttendanceData } from '@/services/attendance';
import { attendanceRecordService, BulkAttendanceRecordData } from '@/services/attendanceRecords';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';

export interface UseAttendanceDataProps {
  selectedClassId: number | null;
  selectedDate: string;
  selectedInstitution?: number | null;
}

export interface AttendanceDataState {
  [studentId: number]: {
    status: string;
    notes?: string;
  };
}

export const useAttendanceData = ({ selectedClassId, selectedDate, selectedInstitution }: UseAttendanceDataProps) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceDataState>({});
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(selectedInstitution || null);
  
  const userInstitutionId = currentUser?.institution?.id;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isRegionAdmin = currentUser?.role === 'regionadmin';
  const isSektorAdmin = currentUser?.role === 'sektoradmin';
  const isSchoolAdmin = currentUser?.role === 'schooladmin';

  // Auto-select institution for SchoolAdmin
  useEffect(() => {
    if (isSchoolAdmin && userInstitutionId && !selectedInstitutionId) {
      console.log('🏫 Auto-selecting school admin institution:', userInstitutionId, currentUser?.institution?.name);
      setSelectedInstitutionId(userInstitutionId);
    }
  }, [isSchoolAdmin, userInstitutionId, selectedInstitutionId, currentUser]);

  // Fetch institutions for role-based access (only schools and preschools)
  const { 
    data: institutionsResponse, 
    isLoading: institutionsLoading 
  } = useQuery({
    queryKey: ['student-institutions-dropdown'],
    queryFn: () => {
      console.log('🏢 AttendanceData: Fetching student institutions (schools & preschools)...');
      return institutionService.getStudentInstitutions({ per_page: 100 });
    },
    enabled: !isSchoolAdmin, // Only fetch if not school admin
    staleTime: 1000 * 60 * 10,
  });

  const institutions = institutionsResponse?.data || [];

  // Fetch classes based on selected institution
  const { 
    data: classes,
    isLoading: classesLoading 
  } = useQuery({
    queryKey: ['attendance-classes', selectedInstitutionId],
    queryFn: async () => {
      if (!selectedInstitutionId) return [];
      
      console.log('🏛️ Fetching classes for institution:', selectedInstitutionId);
      
      // Use attendance service to get classes by institution
      return attendanceService.getClassesByInstitution(selectedInstitutionId);
    },
    enabled: !!selectedInstitutionId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch students for selected class
  const { 
    data: students,
    isLoading: studentsLoading 
  } = useQuery({
    queryKey: ['attendance-students', selectedClassId, selectedInstitutionId],
    queryFn: () => selectedClassId ? attendanceService.getStudentsByClass(selectedClassId, selectedInstitutionId) : Promise.resolve([]),
    enabled: !!selectedClassId && !!selectedInstitutionId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch attendance for selected class and date
  const { 
    data: existingAttendance,
    isLoading: attendanceLoading,
    refetch: refetchAttendance 
  } = useQuery({
    queryKey: ['attendance-records', selectedClassId, selectedDate],
    queryFn: () => selectedClassId ? attendanceService.getAttendanceForClass(selectedClassId, selectedDate) : Promise.resolve([]),
    enabled: !!selectedClassId && !!selectedDate,
    refetchOnWindowFocus: false,
  });

  // Fetch attendance statistics
  const { 
    data: attendanceStats,
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['attendance-stats', selectedClassId, selectedDate],
    queryFn: () => selectedClassId ? attendanceService.getAttendanceStatsForClass(
      selectedClassId, 
      format(startOfWeek(new Date(selectedDate)), 'yyyy-MM-dd'),
      format(endOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
    ) : Promise.resolve(null),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Record attendance mutation - using new comprehensive API
  const recordAttendanceMutation = useMutation({
    mutationFn: (data: BulkAttendanceRecordData) => attendanceRecordService.bulkCreateAttendanceRecords(data),
    onSuccess: (response) => {
      const { created_count, updated_count, error_count } = response.data;
      if (error_count > 0) {
        toast.warning(`Davamiyyət qeydə alındı: ${created_count} yaradıldı, ${updated_count} yeniləndi, ${error_count} xəta`);
      } else {
        toast.success(`Davamiyyət qeydə alındı: ${created_count} yaradıldı, ${updated_count} yeniləndi`);
      }
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    },
    onError: (error: any) => {
      toast.error('Davamiyyət qeydə alına bilmədi: ' + (error.message || 'Naməlum xəta'));
    },
  });

  // Initialize attendance data when existing attendance loads
  useEffect(() => {
    if (existingAttendance && students) {
      const attendanceMap: AttendanceDataState = {};
      
      students.forEach(student => {
        const existing = existingAttendance.find(a => a.student_id === student.id);
        attendanceMap[student.id] = {
          status: existing?.status || 'present',
          notes: existing?.notes || ''
        };
      });
      
      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance, students]);

  const updateAttendanceStatus = (studentId: number, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const updateAttendanceNotes = (studentId: number, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const applyBulkStatus = (status: string) => {
    if (!students) return;
    
    const updatedData: AttendanceDataState = {};
    students.forEach(student => {
      updatedData[student.id] = {
        status,
        notes: attendanceData[student.id]?.notes || ''
      };
    });
    
    setAttendanceData(prev => ({ ...prev, ...updatedData }));
  };

  const saveAttendance = (classId: number, date: string) => {
    if (!students || !currentUser) return;

    const attendanceRecords = students.map(student => ({
      student_id: student.id,
      status: attendanceData[student.id]?.status as any || 'present',
      notes: attendanceData[student.id]?.notes || undefined
    }));

    // Use the new comprehensive AttendanceRecord API
    const bulkData: BulkAttendanceRecordData = {
      class_id: classId,
      teacher_id: currentUser.id,
      academic_year_id: 1, // TODO: Get current academic year
      attendance_date: date,
      period_number: 1, // Default to first period
      attendance_records: attendanceRecords
    };

    recordAttendanceMutation.mutate(bulkData);
  };

  const calculateDailyStats = () => {
    if (!students || !attendanceData) return null;

    const stats = {
      total: students.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    students.forEach(student => {
      const status = attendanceData[student.id]?.status || 'present';
      stats[status as keyof typeof stats]++;
    });

    return {
      ...stats,
      attendance_rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
    };
  };

  return {
    // Data
    classes,
    students,
    existingAttendance,
    attendanceStats,
    attendanceData,
    institutions,
    
    // Loading states
    classesLoading,
    studentsLoading,
    attendanceLoading,
    statsLoading,
    institutionsLoading,
    
    // Institution state
    selectedInstitutionId,
    setSelectedInstitutionId,
    
    // User info
    userInstitutionId,
    isSuperAdmin,
    isRegionAdmin,
    isSektorAdmin,
    isSchoolAdmin,
    currentUser,
    
    // Actions
    updateAttendanceStatus,
    updateAttendanceNotes,
    applyBulkStatus,
    saveAttendance,
    refetchAttendance,
    
    // Computed
    dailyStats: calculateDailyStats(),
    
    // Mutation
    isRecordingAttendance: recordAttendanceMutation.isPending,
  };
};