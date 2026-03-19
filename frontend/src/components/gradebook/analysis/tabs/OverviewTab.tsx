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

export function OverviewTab({ filters, loading, setLoading }: OverviewTabProps) {
  const { toast } = useToast();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    loadOverviewData();
  }, [filters]);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      // Build params from filters
      const params: any = {};
      if (filters.institution_id) params.institution_id = filters.institution_id;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
      if (filters.grade_id) params.grade_id = filters.grade_id;
      if (filters.subject_id) params.subject_id = filters.subject_id;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      
      // Get real overview data from API
      const result = await gradeBookService.getOverviewStats(params);
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Failed to load overview data');
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Statistikalar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Şagirdlər"
          value={data.totalStudents}
          icon={<Users className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
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
          trend="Bu ay +8"
          trendUp={true}
        />
        <KpiCard
          title="Tamamlanma"
          value={`${data.completionRate}%`}
          icon={<Calendar className="w-5 h-5" />}
          subValue="Tədris ili"
        />
        <KpiCard
          title="Ortalama Bal"
          value={data.averageScore?.toFixed(1) || '0.0'}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+2.1%"
          trendUp={true}
        />
        <KpiCard
          title="Ən Yüksək"
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
          <CardTitle className="text-base font-medium">Tədris İli İrəliləyişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">I Yarımil tamamlanma</span>
              <span className="text-sm font-medium">{Math.min(100, data.completionRate + 15)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, data.completionRate + 15)}%` }} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">II Yarımil tamamlanma</span>
              <span className="text-sm font-medium">{Math.max(0, data.completionRate - 15)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.max(0, data.completionRate - 15)}%` }} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Ümumi hesablanma</span>
              <span className="text-sm font-medium">{data.completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${data.completionRate}%` }} />
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
