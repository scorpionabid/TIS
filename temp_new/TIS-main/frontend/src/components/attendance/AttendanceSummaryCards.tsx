import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, TrendingUp, TrendingDown, CalendarIcon, BarChart3, PieChart, Users, BookOpen, AlertTriangle, Loader2, Trophy, Info 
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface AttendanceSummaryCardsProps {
  stats: any;
  loading: boolean;
  startDate: string;
  endDate: string;
  activePreset: string;
}

export const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({
  stats,
  loading,
  startDate,
  endDate,
  activePreset
}) => {
  const trendCopy = {
    up: { label: 'Artan trend', description: 'Son dövrdə davamiyyət göstəriciləri yüksəlir.' },
    down: { label: 'Azalan trend', description: 'Son dövrdə davamiyyət əvvəlki aralığa nisbətən zəifləyib.' },
    stable: { label: 'Sabit trend', description: 'Davamiyyət göstəricilərində ciddi dəyişiklik yoxdur.' }
  } as const;

  const trend = stats.trend_direction || 'stable';
  const activeTrend = trendCopy[trend as keyof typeof trendCopy];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {/* 1. Gələn şagird sayı */}
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563eb]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Gələn şagird sayı</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#2563eb] to-[#60a5fa] shadow-sm">
            <Users className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#1d4ed8]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats.avg_daily_attending || 0)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
             <Info className="h-3 w-3" />
             Günlük orta göstərici
          </p>
        </CardContent>
      </Card>

      {/* 2. Orta davamiyyət */}
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#10b981]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Orta davamiyyət</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#10b981] to-[#6ee7b7] shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-extrabold text-[#047857]">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.average_attendance || 0}%`}
            </div>
            {!loading && trend !== 'stable' && (
              <div className={`flex items-center text-[10px] font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {stats.total_students || 0} şagird üzrə
          </p>
        </CardContent>
      </Card>

      {/* 3. Forma qaydası */}
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#6366f1]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Forma qaydası</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#6366f1] to-[#a5b4fc] shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#3730a3]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${Number(stats.uniform_compliance_rate ?? 0).toFixed(1)}%`}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {Number(stats.total_uniform_violations ?? 0)} pozuntu
          </p>
        </CardContent>
      </Card>

      {/* 4. Doldurulmayan günlər */}
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all group hover:border-rose-200">
        <div className={`absolute top-0 left-0 right-0 h-1 ${Number(stats.missing_days || 0) > 0 ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Doldurulmayan günlər</CardTitle>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${Number(stats.missing_days || 0) > 0 ? 'from-[#ef4444] to-[#f87171]' : 'from-[#10b981] to-[#34d399]'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-extrabold ${Number(stats.missing_days || 0) > 0 ? 'text-[#b91c1c]' : 'text-[#065f46]'}`}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats.missing_days || 0)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Periodda {stats.expected_working_days || 0} iş günü var
          </p>
        </CardContent>
      </Card>

      {/* 5. Dövr */}
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-1 border-dashed bg-slate-50/50">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#f59e0b]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Hesabat Dövrü</CardTitle>
          <CalendarIcon className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-extrabold flex flex-wrap gap-1 text-[#b45309]">
            <span>{format(new Date(startDate), 'dd MMM', { locale: az })}</span>
            <span className="text-muted-foreground font-normal">→</span>
            <span>{format(new Date(endDate), 'dd MMM', { locale: az })}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{activePreset}</p>
        </CardContent>
      </Card>
    </div>
  );
};
