import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { dashboardService } from '@/services/dashboard';
import { DashboardSkeleton } from '../skeletons';
import { ModernDashboardWrapper } from './ModernDashboardWrapper';
import { ExpandedCalendarPanel } from './ExpandedCalendarPanel';
import { DashboardNotesCard } from './DashboardNotesCard';
import { DashboardActivityCard } from './DashboardActivityCard';

interface SektorDashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  activeSurveys: number;
  overdueTasks: number;
  sektorInfo?: { name: string; region: string };
  recentActivities?: any[];
  schoolsList?: any[];
}

export const ModernSektorAdminDashboard = memo(() => {
  const { isLoading, error } = useQuery<SektorDashboardStats>({
    queryKey: ['sektoradmin-dashboard'],
    queryFn: async () => {
      const response = await dashboardService.getSektorAdminStats();
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data as SektorDashboardStats;
      }
      return response as SektorDashboardStats;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-12 text-center glass-card rounded-3xl m-6 border-2 border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-black text-destructive">Məlumatlar yüklənmədi</h2>
        <p className="text-muted-foreground mt-2 font-medium">Sistem API ilə əlaqə qura bilmir.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6 rounded-xl gap-2">
          <RotateCcw size={16} /> Yenidən yoxla
        </Button>
      </div>
    );
  }

  return (
    <ModernDashboardWrapper>
      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <ExpandedCalendarPanel
            title="Sektor İdarəetmə Təqvimi"
            description="Monitorinqlər, məktəb yoxlamaları və iclaslar"
            eventTypeOptions={[
              { value: 'visit', label: 'Monitorinq' },
              { value: 'meeting', label: 'İclas' },
              { value: 'task', label: 'Son Tarix' },
              { value: 'event', label: 'Digər' },
            ]}
          />
        </motion.div>

        <motion.div className="flex flex-col gap-8 h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <DashboardNotesCard />
          <DashboardActivityCard />
        </motion.div>
      </div>
    </ModernDashboardWrapper>
  );
});

ModernSektorAdminDashboard.displayName = 'ModernSektorAdminDashboard';
