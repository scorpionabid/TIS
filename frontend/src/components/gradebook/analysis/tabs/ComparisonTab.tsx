import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { GitCompare, GraduationCap, BookOpen } from 'lucide-react';

interface ComparisonTabProps {
  filters: AnalysisFilters;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface ClassComparison {
  subject: string;
  current: number;
  average: number;
  max: number;
}

interface RadarData {
  metric: string;
  value: number;
  average: number;
}

export function ComparisonTab({ filters, loading, setLoading }: ComparisonTabProps) {
  const { toast } = useToast();
  const [comparisonType, setComparisonType] = useState<'class' | 'subject' | 'time'>('subject');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [radarData, setRadarData] = useState<RadarData[]>([]);
  const [barData, setBarData] = useState<ClassComparison[]>([]);
  const [stats, setStats] = useState<{
    averageDiff: number;
    strongestSubject: string;
    weakestSubject: string;
    strongestScore: number;
    weakestScore: number;
  } | null>(null);

  useEffect(() => {
    loadComparisonData();
  }, [filters, comparisonType, selectedGrade, selectedSubject]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      
      // Build params from filters
      const params: any = {
        compare_by: comparisonType,
      };
      if (filters.institution_id) params.institution_id = filters.institution_id;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
      
      // Get comparison data from API
      const response = await gradeBookService.getComparisonData(params);
      
      if (response.success && response.data) {
        setRadarData(response.data.radarData || []);
        setBarData(response.data.barData || []);
        setStats(response.data.stats || null);
      } else {
        throw new Error('Failed to load comparison data');
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Müqayisə məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
      setRadarData([]);
      setBarData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ComparisonSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-slate-500" />
              <span className="font-medium">Müqayisə növü:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setComparisonType('class')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  comparisonType === 'class'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Sinif müqayisəsi
              </button>
              <button
                onClick={() => setComparisonType('subject')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  comparisonType === 'subject'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                Fənn müqayisəsi
              </button>
              <button
                onClick={() => setComparisonType('time')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  comparisonType === 'time'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Zaman müqayisəsi
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="h-9 border-slate-200">
            <GraduationCap className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Sinif seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1a">1-A</SelectItem>
            <SelectItem value="1b">1-B</SelectItem>
            <SelectItem value="2a">2-A</SelectItem>
            <SelectItem value="2b">2-B</SelectItem>
            <SelectItem value="3a">3-A</SelectItem>
            <SelectItem value="3b">3-B</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="h-9 border-slate-200">
            <BookOpen className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Fənn seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="math">Riyaziyyat</SelectItem>
            <SelectItem value="physics">Fizika</SelectItem>
            <SelectItem value="chemistry">Kimya</SelectItem>
            <SelectItem value="biology">Biologiya</SelectItem>
            <SelectItem value="literature">Ədəbyyat</SelectItem>
            <SelectItem value="history">Tarix</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Performans Profili (Radar)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Seçilmiş sinif"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Ümumi ortalama"
                  dataKey="average"
                  stroke="#16a34a"
                  fill="#22c55e"
                  fillOpacity={0.4}
                />
                <Legend />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} bal`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Fənn Üzrə Müqayisə</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="subject" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="current" 
                  name="Seçilmiş sinif" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
                <Bar 
                  dataKey="average" 
                  name="Ortalama" 
                  fill="#94a3b8" 
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
                <Bar 
                  dataKey="max" 
                  name="Maksimum" 
                  fill="#cbd5e1" 
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Ortalama fərq" 
          value={`${stats?.averageDiff ? (stats.averageDiff > 0 ? '+' : '') + stats.averageDiff.toFixed(1) : '0.0'}`} 
          trend="Ümumi ortalama" 
          positive={true} 
        />
        <StatCard 
          title="Ən güclü fənn" 
          value={stats?.strongestSubject || '-'} 
          trend={`${stats?.strongestScore?.toFixed(1) || '0.0'} bal`} 
          positive={true} 
        />
        <StatCard 
          title="Ən zəif fənn" 
          value={stats?.weakestSubject || '-'} 
          trend={`${stats?.weakestScore?.toFixed(1) || '0.0'} bal`} 
          positive={false} 
        />
        <StatCard 
          title="Fənn sayı" 
          value={`${barData.length}`} 
          trend="Aktiv fənn" 
          positive={true} 
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  positive: boolean;
}

function StatCard({ title, value, trend, positive }: StatCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className={`text-xs ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
