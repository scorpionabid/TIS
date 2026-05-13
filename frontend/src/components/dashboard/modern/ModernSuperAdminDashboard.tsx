import React, { memo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { AlertTriangle, Activity, Zap } from "lucide-react";
import { GreetingHeader } from "./GreetingHeader";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { ModernDashboardWrapper } from "./ModernDashboardWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Charts from "../Charts";
import RecentActivityWidget from "../RecentActivityWidget";
import { DashboardSkeleton } from "../skeletons";
import { motion } from "framer-motion";

const QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
};

export const ModernSuperAdminDashboard = memo(() => {
  const { 
    data: dashboardData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['dashboard-batched'],
    queryFn: () => dashboardService.getSuperAdminDashboardBatched(),
    ...QUERY_OPTIONS
  });

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboardData) {
    return (
      <div className="p-12 text-center glass-card rounded-3xl m-6">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-destructive">Xəta baş verdi</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Məlumatları yükləmək mümkün olmadı. Zəhmət olmasa internet bağlantınızı yoxlayın və ya yenidən cəhd edin.</p>
      </div>
    );
  }

  return (
    <ModernDashboardWrapper>
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card className="glass-card border-none modern-shadow rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Sistem Analitikası</CardTitle>
                <p className="text-sm text-muted-foreground">Son 30 günün statistik göstəriciləri</p>
              </div>
              <div className="p-2 bg-primary/5 rounded-full">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <Charts />
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
        >
          <Card className="glass-card border-none modern-shadow rounded-3xl h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Son Fəaliyyət</CardTitle>
              <Zap className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <RecentActivityWidget activities={dashboardData?.recentActivity || []} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ModernDashboardWrapper>
  );
});

ModernSuperAdminDashboard.displayName = 'ModernSuperAdminDashboard';
