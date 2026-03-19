import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, TrendingUp, TrendingDown, CalendarIcon, BarChart3, PieChart, Users, BookOpen, AlertTriangle, Loader2 
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563eb]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500">Ümumi qeyd</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#2563eb] to-[#60a5fa]">
            <FileText className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#1d4ed8]">{stats.total_records || 0}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {stats.total_days || 0} tədris günü
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#10b981]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500">Orta davamiyyət</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#10b981] to-[#6ee7b7]">
            <BarChart3 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#047857]">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.average_attendance || 0}%`}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {stats.total_students || 0} şagird üzrə
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#6366f1]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500">Forma qaydası</CardTitle>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#6366f1] to-[#a5b4fc]">
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

      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#7c3aed]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500">Dinamika</CardTitle>
          {trend === 'up' ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : 
           trend === 'down' ? <TrendingDown className="h-5 w-5 text-rose-500" /> : <PieChart className="h-5 w-5 text-indigo-500" />}
        </CardHeader>
        <CardContent>
          <div className={`text-base font-extrabold ${trend === 'up' ? 'text-[#047857]' : trend === 'down' ? 'text-[#be123c]' : 'text-[#6d28d9]'}`}>
            {activeTrend.label}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2">{activeTrend.description}</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#f59e0b]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500">Dövr</CardTitle>
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
