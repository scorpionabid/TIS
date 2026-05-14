import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AnalysisData } from '@/services/gradeBookAdmin';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { RefreshCw, TrendingUp, Award, Target } from 'lucide-react';

interface MultiLevelAnalysisProps {
  data: AnalysisData | null;
  loading: boolean;
  onRefresh: () => void;
}

export function MultiLevelAnalysis({ data, loading, onRefresh }: MultiLevelAnalysisProps) {
  if (loading) {
    return <AnalysisSkeleton />;
  }

  if (!data) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">Analiz məlumatları yüklənməyib</p>
          <Button onClick={onRefresh} className="mt-4 gap-2">
            <RefreshCw className="w-4 h-4" />
            Yenilə
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics */}
      {data.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Ortalama bal"
            value={data.metrics.average_score?.toFixed(1) || '0'}
            icon={Target}
            color="text-blue-600"
          />
          <MetricCard
            title="İnkişaf"
            value={`+${data.metrics.growth_rate || 0}%`}
            icon={TrendingUp}
            color="text-emerald-600"
          />
          <MetricCard
            title="Ən yaxşı ay"
            value={data.metrics.best_month || '-'}
            icon={Award}
            color="text-purple-600"
          />
          <MetricCard
            title="Ən zəif ay"
            value={data.metrics.worst_month || '-'}
            icon={Target}
            color="text-orange-600"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time Comparison Chart */}
        {data.chart_data && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vaxt üzrə müqayisə</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name="Cari il"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    name="Keçən il"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Hədəf"
                    stroke="#22c55e"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Comparison Bar Chart */}
        {data.comparison_data && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Səviyyə üzrə müqayisə</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.comparison_data}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="average"
                    name="Ortalama"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rankings Table */}
      {data.rankings && data.rankings.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sıralama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.rankings.map((item: any, index: number) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100'
                      }
                    >
                      #{item.rank}
                    </Badge>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      {item.grade_books || item.institutions} jurnal
                    </span>
                    <Badge variant="secondary">{item.average.toFixed(1)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 ${color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-20" />
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
