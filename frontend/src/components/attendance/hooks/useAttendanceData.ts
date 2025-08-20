import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { attendanceService, BulkAttendanceData } from '@/services/attendance';
import { useAuth } from '@/contexts/AuthContext';

export interface UseAttendanceDataProps {
  selectedClassId: number | null;
  selectedDate: string;
}

export interface AttendanceDataState {
  [studentId: number]: {
    status: string;
    notes?: string;
  };
}

export const useAttendanceData = ({ selectedClassId, selectedDate }: UseAttendanceDataProps) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceDataState>({});
  
  const userInstitutionId = currentUser?.institution?.id;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isRegionAdmin = currentUser?.role === 'regionadmin';

  // Fetch classes
  const { 
    data: classes,
    isLoading: classesLoading 
  } = useQuery({
    queryKey: ['schoolAdmin', 'classes'],
    queryFn: async () => {
      const { schoolAdminService } = await import('@/services/schoolAdmin');
      return schoolAdminService.getClasses();
    },
    enabled: !!(userInstitutionId || isSuperAdmin || isRegionAdmin),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch students for selected class
  const { 
    data: students,
    isLoading: studentsLoading 
  } = useQuery({
    queryKey: ['attendance-students', selectedClassId, userInstitutionId],
    queryFn: () => selectedClassId ? attendanceService.getStudentsByClass(selectedClassId, userInstitutionId) : Promise.resolve([]),
    enabled: !!selectedClassId,
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

  // Record attendance mutation
  const recordAttendanceMutation = useMutation({
    mutationFn: (data: BulkAttendanceData) => attendanceService.recordBulkAttendance(data),
    onSuccess: () => {
      toast.success('Davamiyyət qeydə alındı');
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    },
    onError: () => {
      toast.error('Davamiyyət qeydə alına bilmədi');
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
    if (!students) return;

    const attendanceRecords = students.map(student => ({
      student_id: student.id,
      status: attendanceData[student.id]?.status || 'present',
      notes: attendanceData[student.id]?.notes || undefined
    }));

    const bulkData: BulkAttendanceData = {
      class_id: classId,
      date,
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
    
    // Loading states
    classesLoading,
    studentsLoading,
    attendanceLoading,
    statsLoading,
    
    // User info
    userInstitutionId,
    isSuperAdmin,
    isRegionAdmin,
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