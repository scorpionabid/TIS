import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Calendar, Filter } from 'lucide-react';

interface TrendsTabProps {
  filters: AnalysisFilters;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface TrendData {
  month: string;
  average: number;
  target: number;
  previous: number;
}

interface SubjectTrend {
  subject: string;
  data: { month: string; score: number }[];
}

export function TrendsTab({ filters, loading, setLoading }: TrendsTabProps) {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'semester' | 'year' | 'all'>('year');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [subjectTrends, setSubjectTrends] = useState<SubjectTrend[]>([]);

  const [stats, setStats] = useState<{
    averageScore: number;
    growthRate: number;
    highestMonth: string;
    lowestMonth: string;
    highestScore: number;
    lowestScore: number;
  } | null>(null);

  useEffect(() => {
    loadTrendsData();
  }, [filters, timeRange, selectedSubject]);

  const loadTrendsData = async () => {
    try {
      setLoading(true);

      // Build params from filters
      const params: any = {
        time_range: timeRange,
      };
      if (filters.institution_id) params.institution_id = filters.institution_id;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;

      // Get trends data from API
      const response = await gradeBookService.getTrendsData(params);

      if (response.success && response.data) {
        setTrendData(response.data.trendData || []);
        setSubjectTrends(response.data.subjectTrends || []);
        setStats(response.data.stats || null);
      } else {
        throw new Error('Failed to load trends data');
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Trend məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
      // Set empty data on error
      setTrendData([]);
      setSubjectTrends([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };


  const getGrowthRate = () => {
    return stats?.growthRate || 0;
  };

  const getAverageScore = () => {
    return stats?.averageScore || 0;
  };

  if (loading) {
    return <TrendsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <span className="font-medium">Vaxt aralığı:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'semester', label: 'Cari yarımil' },
                { value: 'year', label: 'Tədris ili' },
                { value: 'all', label: 'Bütün dövr' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    timeRange === option.value
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Ortalama bal"
          value={getAverageScore().toFixed(1)}
          trend="Bu dövr"
        />
        <StatCard
          title="İnkişaf"
          value={`+${getGrowthRate().toFixed(1)}%`}
          trend="Dövr üzrə"
          positive={getGrowthRate() > 0}
        />
        <StatCard
          title="Ən yüksək"
          value={stats?.highestScore?.toFixed(1) || '0.0'}
          trend={stats?.highestMonth || '-'}
        />
        <StatCard
          title="Ən aşağı"
          value={stats?.lowestScore?.toFixed(1) || '0.0'}
          trend={stats?.lowestMonth || '-'}
        />
      </div>

      {/* Main Trend Chart */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Ümumi Trend Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[60, 85]} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} bal`, '']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="average"
                name="Ortalama"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorAverage)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Hədəf"
                stroke="#16a34a"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="previous"
                name="Keçən il"
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subject Comparison Chart */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Fənn Üzrə Trend Müqayisəsi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" allowDuplicatedCategory={false} />
              <YAxis domain={[50, 90]} />
              <Tooltip />
              <Legend />
              {subjectTrends.map((subject, index) => (
                <Line
                  key={subject.subject}
                  data={subject.data}
                  type="monotone"
                  dataKey="score"
                  name={subject.subject}
                  stroke={['#3b82f6', '#22c55e', '#f59e0b'][index]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  positive?: boolean;
}

function StatCard({ title, value, trend, positive = true }: StatCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className={`text-2xl font-bold ${positive ? 'text-slate-900' : 'text-rose-600'}`}>
          {value}
        </p>
        <p className="text-xs text-slate-400">{trend}</p>
      </CardContent>
    </Card>
  );
}

function TrendsSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-6 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
