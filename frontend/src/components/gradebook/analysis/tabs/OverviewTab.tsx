import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BookOpen, TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface OverviewTabProps {
  filters: AnalysisFilters;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface OverviewData {
  totalStudents: number;
  totalJournals: number;
  activeJournals: number;
  archivedJournals: number;
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  subjectAverages: { subject: string; average: number }[];
  examCount: number;
  completionRate: number;
  averageScore: number;
  highestScore: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export function OverviewTab({ filters }: Pick<OverviewTabProps, 'filters'>) {
  const { toast } = useToast();
  const [data, setData] = useState<OverviewData | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    loadOverviewData();
  }, [filters]);

  const loadOverviewData = async () => {
    try {
      setLocalLoading(true);

      const params: Record<string, number | string | number[] | string[]> = {};
      if (filters.institution_id)                    params.institution_id    = filters.institution_id;
      if (filters.academic_year_ids?.length)         params.academic_year_ids = filters.academic_year_ids;
      if (filters.subject_ids?.length)               params.subject_ids       = filters.subject_ids;
      if (filters.grade_ids?.length)                 params.grade_ids         = filters.grade_ids;
      if (filters.sector_ids?.length)                params.sector_ids        = filters.sector_ids;
      if (filters.school_ids?.length)                params.school_ids        = filters.school_ids;
      if (filters.class_levels?.length)              params.class_levels      = filters.class_levels;
      if (filters.teaching_languages?.length)        params.teaching_languages = filters.teaching_languages;
      if (filters.gender)                            params.gender            = filters.gender;
      if (filters.status && filters.status !== 'all') params.status           = filters.status;

      const result = await gradeBookService.getOverviewStats(params as Parameters<typeof gradeBookService.getOverviewStats>[0]);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Failed to load overview data');
      }
    } catch {
      toast({
        title: 'Xəta',
        description: 'Statistikalar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLocalLoading(false);
    }
  };

  if (localLoading) {
    return <OverviewSkeleton />;
  }

  if (!data || data.totalJournals === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Seçilmiş filtrlər üzrə məlumat tapılmadı.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Şagirdlər"
          value={data.totalStudents}
          icon={<Users className="w-5 h-5" />}
          subValue="Aktiv şagird"
        />
        <KpiCard
          title="Jurnallar"
          value={data.totalJournals}
          icon={<BookOpen className="w-5 h-5" />}
          subValue={`${data.activeJournals} aktiv`}
        />
        <KpiCard
          title="İmtahanlar"
          value={data.examCount}
          icon={<Target className="w-5 h-5" />}
          subValue="Ümumi sütun"
        />
        <KpiCard
          title="Aktiv jurnallar"
          value={`${data.activeJournals}`}
          icon={<Calendar className="w-5 h-5" />}
          subValue={`${data.archivedJournals} arxiv`}
        />
        <KpiCard
          title="Ortalama Bal"
          value={data.averageScore?.toFixed(1) || '0.0'}
          icon={<TrendingUp className="w-5 h-5" />}
          subValue="Bütün imtahanlar"
        />
        <KpiCard
          title="Ən Yüksək Bal"
          value={data.highestScore?.toFixed(1) || '0.0'}
          icon={<Award className="w-5 h-5" />}
          subValue="Maksimum"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Qiymət Paylanması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="grade"
                  label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                >
                  {data.gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} şagird (${props.payload.percentage}%)`,
                    props.payload.grade
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Averages */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Fənn Üzrə Ortalamalar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.subjectAverages}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="subject" type="category" width={80} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} bal`, 'Ortalama']}
                />
                <Bar 
                  dataKey="average" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">Jurnallar Statusu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Aktiv jurnallar</span>
              <span className="text-sm font-medium">{data.activeJournals} / {data.totalJournals}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${data.totalJournals > 0 ? Math.round((data.activeJournals / data.totalJournals) * 100) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Arxivlənmiş jurnallar</span>
              <span className="text-sm font-medium">{data.archivedJournals} / {data.totalJournals}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-slate-400 h-2 rounded-full"
                style={{ width: `${data.totalJournals > 0 ? Math.round((data.archivedJournals / data.totalJournals) * 100) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Ortalama bal (bütün imtahanlar)</span>
              <span className="text-sm font-medium">{data.averageScore?.toFixed(1) || '0.0'} / 100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${data.averageScore || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
}

function KpiCard({ title, value, icon, subValue, trend, trendUp }: KpiCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-slate-100 rounded-lg">
            {icon}
          </div>
          {trend && (
            <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subValue && (
            <p className="text-xs text-slate-400">{subValue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
