import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { regionOperatorService } from '@/services/regionOperator';
import { DashboardSkeleton } from '../skeletons';
import { ModernDashboardWrapper } from './ModernDashboardWrapper';
import { ExpandedCalendarPanel } from './ExpandedCalendarPanel';
import { DashboardNotesCard } from './DashboardNotesCard';
import { DashboardActivityCard } from './DashboardActivityCard';

export const ModernRegionOperatorDashboard = memo(() => {
  const { isLoading, error } = useQuery({
    queryKey: ['regionoperator-dashboard'],
    queryFn: () => regionOperatorService.getDashboard(),
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <ExpandedCalendarPanel
            title="Region Operator Təqvimi"
            description="Gündəlik sənəd, müraciət və iclas planı"
            eventTypeOptions={[
              { value: 'task', label: 'Tapşırıq' },
              { value: 'meeting', label: 'İclas' },
              { value: 'event', label: 'Hesabat' },
              { value: 'visit', label: 'Yoxlama' },
            ]}
          />
        </motion.div>

        <motion.div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <DashboardNotesCard />
          <DashboardActivityCard />
        </motion.div>
      </div>
    </ModernDashboardWrapper>
  );
});

ModernRegionOperatorDashboard.displayName = 'ModernRegionOperatorDashboard';
