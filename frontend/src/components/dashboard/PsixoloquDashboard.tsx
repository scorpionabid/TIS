import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { RefreshCw, Brain, Heart, Users, BookOpen, TrendingUp, Calendar, MessageSquare, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StatsCard } from './StatsCard';

interface PsixoloquDashboardProps {
  className?: string;
}

export const PsixoloquDashboard: React.FC<PsixoloquDashboardProps> = ({ className }) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [...schoolAdminKeys.dashboardStats(), 'psixoloq'],
    queryFn: () => schoolAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Məlumatlar yeniləndi');
    } catch {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Dashboard yüklənir...</p>
        </div>
      </div>
    );
  }

  const upcomingSessions = [
    { name: 'Əli Məmmədov', grade: '9-A', type: 'Fərdi', time: '09:00', status: 'today' },
    { name: 'Leyla Həsənova', grade: '7-B', type: 'Qrup', time: '10:30', status: 'today' },
    { name: 'Rauf İsmayılov', grade: '11-C', type: 'Fərdi', time: '14:00', status: 'today' },
    { name: 'Nigar Əliyeva', grade: '6-A', type: 'Qrup', time: '15:30', status: 'tomorrow' },
  ];

  const recentNotes = [
    { student: 'A.M.', note: 'Sosial adaptasiya müsbət inkişaf edir', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { student: 'L.H.', note: 'İmtahan narahatlığı — relaksasiya texnikaları tövsiyə edildi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    { student: 'R.İ.', note: 'Ailə ilə əlaqə gücləndirilməli', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  ];

  return (
    <div className={cn('p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Psixoloji Dəstək Mərkəzi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Şagird rifahı, məsləhət seansları və psixoloji izləmə
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Yenilə
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <StatsCard
          title="Aktiv Müraciətlər"
          value={stats?.total_students ?? 12}
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Bu Həftə Seanslar"
          value={8}
          icon={Calendar}
          variant="success"
        />
        <StatsCard
          title="Gözləmə Siyahısı"
          value={3}
          icon={ClipboardList}
          variant="warning"
        />
        <StatsCard
          title="Tamamlanan Proqramlar"
          value={24}
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* Main content — 2 column on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Sessions */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Yaxınlaşan Seanslar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3">
            {upcomingSessions.map((session, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{session.name}</p>
                    <p className="text-xs text-muted-foreground">{session.grade} · {session.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-sm font-mono text-muted-foreground">{session.time}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] px-2 hidden sm:inline-flex',
                      session.status === 'today' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {session.status === 'today' ? 'Bu gün' : 'Sabah'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Son Müşahidə Qeydləri
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3">
            {recentNotes.map((note, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/30">
                <div className={cn('text-xs font-black px-2 py-1 rounded-lg flex-shrink-0 h-fit', note.color)}>
                  {note.student}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{note.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Focus areas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {[
          { icon: Heart, label: 'Emosional Dəstək', count: 5, color: 'text-rose-500 bg-rose-100 dark:bg-rose-950/30' },
          { icon: BookOpen, label: 'Akademik Narahatlıq', count: 4, color: 'text-amber-500 bg-amber-100 dark:bg-amber-950/30' },
          { icon: Users, label: 'Sosial İnteqrasiya', count: 3, color: 'text-blue-500 bg-blue-100 dark:bg-blue-950/30' },
        ].map((area) => (
          <Card key={area.label} className="rounded-2xl shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
              <div className={cn('p-2.5 sm:p-3 rounded-xl flex-shrink-0', area.color)}>
                <area.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{area.label}</p>
                <p className="text-xl sm:text-2xl font-bold">{area.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
