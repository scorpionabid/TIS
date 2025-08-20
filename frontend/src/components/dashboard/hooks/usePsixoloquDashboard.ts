import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface PsychologySession {
  id: number;
  student_name: string;
  student_class: string;
  session_type: 'assessment' | 'counseling' | 'follow_up' | 'group_therapy';
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export interface StudentCase {
  id: number;
  student_name: string;
  student_class: string;
  case_type: 'behavioral' | 'academic' | 'emotional' | 'social' | 'family';
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved' | 'referred' | 'monitoring';
  opened_date: string;
  last_session: string;
  next_appointment?: string;
}

export const usePsixoloquDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: [...schoolAdminKeys.dashboardStats(), 'psixoloq'],
    queryFn: () => schoolAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
      ]);
      toast.success('Məlumatlar yeniləndi');
    } catch (error) {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    } finally {
      setRefreshing(false);
    }
  };

  // Mock data for psychology sessions
  const upcomingSessions: PsychologySession[] = [
    {
      id: 1,
      student_name: "Ayşə Məmmədova",
      student_class: "7-A",
      session_type: "counseling",
      date: "2024-08-20T10:00:00",
      duration: 45,
      status: "scheduled",
      priority: "high",
      notes: "Davamiyyət problemləri ilə bağlı"
    },
    {
      id: 2,
      student_name: "Orxan Əliyev",
      student_class: "9-B",
      session_type: "assessment",
      date: "2024-08-20T14:30:00",
      duration: 60,
      status: "scheduled",
      priority: "medium",
      notes: "Akademik performans qiymətləndirməsi"
    },
    {
      id: 3,
      student_name: "Leyla Həsənova",
      student_class: "5-C",
      session_type: "follow_up",
      date: "2024-08-21T09:00:00",
      duration: 30,
      status: "scheduled",
      priority: "low",
      notes: "Sosial adaptasiya izləməsi"
    }
  ];

  // Mock data for student cases
  const activeCases: StudentCase[] = [
    {
      id: 1,
      student_name: "Rəşad Quliyev",
      student_class: "8-A",
      case_type: "behavioral",
      severity: "moderate",
      status: "active",
      opened_date: "2024-07-15",
      last_session: "2024-08-15",
      next_appointment: "2024-08-22"
    },
    {
      id: 2,
      student_name: "Gülnar İsmayılova",
      student_class: "6-B",
      case_type: "emotional",
      severity: "mild",
      status: "monitoring",
      opened_date: "2024-06-20",
      last_session: "2024-08-10"
    },
    {
      id: 3,
      student_name: "Elvin Nərimanov",
      student_class: "10-A",
      case_type: "academic",
      severity: "severe",
      status: "active",
      opened_date: "2024-08-01",
      last_session: "2024-08-16",
      next_appointment: "2024-08-23"
    }
  ];

  // Calculate stats
  const totalCases = activeCases.length;
  const todaySessions = upcomingSessions.filter(s => 
    format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;
  const urgentCases = activeCases.filter(c => c.severity === 'severe').length;
  const completionRate = 85; // Mock data

  // Helper functions
  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'assessment': return 'Qiymətləndirmə';
      case 'counseling': return 'Məsləhət';
      case 'follow_up': return 'İzləmə';
      case 'group_therapy': return 'Qrup Terapiyası';
      default: return 'Sesiya';
    }
  };

  const getCaseTypeLabel = (type: string) => {
    switch (type) {
      case 'behavioral': return 'Davranış';
      case 'academic': return 'Akademik';
      case 'emotional': return 'Emosional';
      case 'social': return 'Sosial';
      case 'family': return 'Ailə';
      default: return 'Ümumi';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe': return 'Ciddi';
      case 'moderate': return 'Orta';
      case 'mild': return 'Yüngül';
      default: return 'Naməlum';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'resolved': return 'Həll olundu';
      case 'referred': return 'Yönləndirilib';
      case 'monitoring': return 'İzlənir';
      case 'completed': return 'Tamamlandı';
      case 'scheduled': return 'Planlaşdırılıb';
      case 'cancelled': return 'Ləğv olundu';
      default: return 'Naməlum';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'destructive';
      case 'moderate': return 'warning';
      case 'mild': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'warning';
      case 'resolved': return 'success';
      case 'referred': return 'secondary';
      case 'monitoring': return 'default';
      case 'completed': return 'success';
      case 'scheduled': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return {
    // State
    refreshing,
    statsLoading,
    stats,
    upcomingSessions,
    activeCases,
    
    // Calculated stats
    totalCases,
    todaySessions,
    urgentCases,
    completionRate,
    
    // Actions
    handleRefresh,
    
    // Helper functions
    getSessionTypeLabel,
    getCaseTypeLabel,
    getSeverityLabel,
    getStatusLabel,
    getSeverityColor,
    getStatusColor,
    getPriorityColor
  };
};