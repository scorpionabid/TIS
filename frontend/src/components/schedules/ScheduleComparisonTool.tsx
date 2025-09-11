import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  Clock,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Download,
  RefreshCw,
  Zap,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Schedule {
  id: number;
  name: string;
  institution: {
    id: number;
    name: string;
    type: string;
  };
  created_at: string;
  performance_rating: number;
  sessions_count: number;
  conflicts_count: number;
  teacher_satisfaction: number;
  utilization_rate: number;
  efficiency_score: number;
  status: string;
}

interface ComparisonMetric {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  format: 'number' | 'percentage' | 'rating';
  higherIsBetter: boolean;
}

interface ComparisonData {
  schedules: Schedule[];
  metrics_comparison: {
    [key: string]: {
      values: number[];
      average: number;
      best: number;
      worst: number;
      variance: number;
    };
  };
  ranking: {
    overall: { schedule_id: number; score: number; rank: number; }[];
    by_metric: { [key: string]: { schedule_id: number; value: number; rank: number; }[] };
  };
  insights: {
    strengths: { schedule_id: number; metrics: string[]; }[];
    weaknesses: { schedule_id: number; metrics: string[]; }[];
    recommendations: string[];
  };
}

const comparisonMetrics: ComparisonMetric[] = [
  {
    key: 'performance_rating',
    name: 'Performans Reytingi',
    description: 'Ümumi cədvəl performansı',
    icon: Award,
    format: 'rating',
    higherIsBetter: true
  },
  {
    key: 'teacher_satisfaction',
    name: 'Müəllim Məmnunluğu',
    description: 'Müəllimlərin cədvəldən məmnunluq dərəcəsi',
    icon: Users,
    format: 'percentage',
    higherIsBetter: true
  },
  {
    key: 'utilization_rate',
    name: 'İstifadə Səviyyəsi',
    description: 'Vaxt slotlarının istifadə dərəcəsi',
    icon: Clock,
    format: 'percentage',
    higherIsBetter: true
  },
  {
    key: 'efficiency_score',
    name: 'Effektivlik',
    description: 'Cədvəlin ümumi effektivliyi',
    icon: Zap,
    format: 'percentage',
    higherIsBetter: true
  },
  {
    key: 'conflicts_count',
    name: 'Konflikt Sayı',
    description: 'Həll edilməmiş konfliktlərin sayı',
    icon: AlertTriangle,
    format: 'number',
    higherIsBetter: false
  },
  {
    key: 'sessions_count',
    name: 'Dərs Seansları',
    description: 'Ümumi dərs seanslarının sayı',
    icon: Calendar,
    format: 'number',
    higherIsBetter: true
  }
];

export const ScheduleComparisonTool: React.FC = () => {
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['performance_rating', 'teacher_satisfaction', 'utilization_rate', 'efficiency_score']);
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'radar'>('table');
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableSchedules();
  }, []);

  const loadAvailableSchedules = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockSchedules: Schedule[] = [
        {
          id: 1,
          name: 'Winter Term 2025 - Main',
          institution: { id: 1, name: 'Baku School #1', type: 'Secondary School' },
          created_at: '2025-01-01',
          performance_rating: 4.2,
          sessions_count: 234,
          conflicts_count: 3,
          teacher_satisfaction: 87,
          utilization_rate: 94,
          efficiency_score: 89,
          status: 'active'
        },
        {
          id: 2,
          name: 'Spring Semester 2025',
          institution: { id: 2, name: 'Ganja School #45', type: 'Primary School' },
          created_at: '2025-01-05',
          performance_rating: 4.7,
          sessions_count: 156,
          conflicts_count: 1,
          teacher_satisfaction: 93,
          utilization_rate: 98,
          efficiency_score: 95,
          status: 'active'
        },
        {
          id: 3,
          name: 'Technical Program 2025',
          institution: { id: 3, name: 'Sumgayit Technical School', type: 'Vocational School' },
          created_at: '2025-01-03',
          performance_rating: 3.8,
          sessions_count: 312,
          conflicts_count: 8,
          teacher_satisfaction: 78,
          utilization_rate: 85,
          efficiency_score: 82,
          status: 'active'
        }
      ];

      setAvailableSchedules(mockSchedules);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Cədvəllər yüklənə bilmədi',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addScheduleToComparison = (schedule: Schedule) => {
    if (selectedSchedules.length >= 5) {
      toast({
        title: 'Limit',
        description: 'Maksimum 5 cədvəl müqayisə edilə bilər',
        variant: 'destructive'
      });
      return;
    }

    if (selectedSchedules.some(s => s.id === schedule.id)) {
      toast({
        title: 'Diqqət',
        description: 'Bu cədvəl artıq müqayisədə mövcuddur',
        variant: 'destructive'
      });
      return;
    }

    setSelectedSchedules(prev => [...prev, schedule]);
  };

  const removeScheduleFromComparison = (scheduleId: number) => {
    setSelectedSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  const runComparison = async () => {
    if (selectedSchedules.length < 2) {
      toast({
        title: 'Xəta',
        description: 'Ən az 2 cədvəl seçilməlidir',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Mock comparison data generation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockComparisonData: ComparisonData = {
        schedules: selectedSchedules,
        metrics_comparison: generateMockMetricsComparison(selectedSchedules),
        ranking: generateMockRanking(selectedSchedules),
        insights: generateMockInsights(selectedSchedules)
      };

      setComparisonData(mockComparisonData);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Müqayisə aparıla bilmədi',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockMetricsComparison = (schedules: Schedule[]) => {
    const metrics: any = {};
    
    selectedMetrics.forEach(metricKey => {
      const values = schedules.map(s => s[metricKey as keyof Schedule] as number);
      metrics[metricKey] = {
        values,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        best: Math.max(...values),
        worst: Math.min(...values),
        variance: calculateVariance(values)
      };
    });

    return metrics;
  };

  const generateMockRanking = (schedules: Schedule[]) => {
    const overallScores = schedules.map(schedule => ({
      schedule_id: schedule.id,
      score: (schedule.performance_rating * 20 + schedule.teacher_satisfaction + schedule.utilization_rate + schedule.efficiency_score) / 4,
      rank: 0
    }));

    overallScores.sort((a, b) => b.score - a.score);
    overallScores.forEach((item, index) => {
      item.rank = index + 1;
    });

    const byMetric: any = {};
    selectedMetrics.forEach(metricKey => {
      const metric = comparisonMetrics.find(m => m.key === metricKey);
      const metricRanking = schedules.map(schedule => ({
        schedule_id: schedule.id,
        value: schedule[metricKey as keyof Schedule] as number,
        rank: 0
      }));

      metricRanking.sort((a, b) => 
        metric?.higherIsBetter ? b.value - a.value : a.value - b.value
      );

      metricRanking.forEach((item, index) => {
        item.rank = index + 1;
      });

      byMetric[metricKey] = metricRanking;
    });

    return { overall: overallScores, by_metric: byMetric };
  };

  const generateMockInsights = (schedules: Schedule[]) => {
    return {
      strengths: schedules.map(schedule => ({
        schedule_id: schedule.id,
        metrics: schedule.teacher_satisfaction > 85 ? ['teacher_satisfaction'] : 
                schedule.utilization_rate > 90 ? ['utilization_rate'] : ['efficiency_score']
      })),
      weaknesses: schedules.map(schedule => ({
        schedule_id: schedule.id,
        metrics: schedule.conflicts_count > 5 ? ['conflicts_count'] : 
                schedule.utilization_rate < 80 ? ['utilization_rate'] : []
      })),
      recommendations: [
        'Konfliktləri azaltmaq üçün vaxt slotlarının paylanmasını optimallaşdırın',
        'Müəllim məmnunluğunu artırmaq üçün tərcihləri daha çox nəzərə alın',
        'Resurs istifadəsini artırmaq üçün boş vaxtları azaldın'
      ]
    };
  };

  const calculateVariance = (values: number[]): number => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.round(variance * 100) / 100;
  };

  const formatMetricValue = (value: number, format: 'number' | 'percentage' | 'rating'): string => {
    switch (format) {
      case 'percentage':
        return `${Math.round(value)}%`;
      case 'rating':
        return `${value.toFixed(1)}/5.0`;
      case 'number':
      default:
        return value.toString();
    }
  };

  const getBestPerformer = (metricKey: string): number => {
    if (!comparisonData) return 0;
    const ranking = comparisonData.ranking.by_metric[metricKey];
    return ranking?.[0]?.schedule_id || 0;
  };

  const getWorstPerformer = (metricKey: string): number => {
    if (!comparisonData) return 0;
    const ranking = comparisonData.ranking.by_metric[metricKey];
    return ranking?.[ranking.length - 1]?.schedule_id || 0;
  };

  const renderScheduleSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Cədvəl Seçimi
        </CardTitle>
        <CardDescription>
          Müqayisə etmək istədiyiniz cədvəlləri seçin (maksimum 5)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSchedules
            .filter(schedule => !selectedSchedules.some(s => s.id === schedule.id))
            .map(schedule => (
              <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                <div className="space-y-2">
                  <h4 className="font-medium">{schedule.name}</h4>
                  <p className="text-sm text-gray-600">{schedule.institution.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{schedule.institution.type}</Badge>
                    <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                      {schedule.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {schedule.sessions_count} dərs • {schedule.conflicts_count} konflikt
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => addScheduleToComparison(schedule)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Əlavə et
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectedSchedules = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Seçilmiş Cədvəllər ({selectedSchedules.length})
          </span>
          {selectedSchedules.length >= 2 && (
            <Button onClick={runComparison} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              Müqayisə Et
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedSchedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Müqayisə üçün cədvəl seçin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSchedules.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{schedule.name}</h4>
                  <p className="text-sm text-gray-600">{schedule.institution.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs">⭐ {schedule.performance_rating.toFixed(1)}</span>
                    <span className="text-xs">👥 {schedule.teacher_satisfaction}%</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => removeScheduleFromComparison(schedule.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderComparisonTable = () => {
    if (!comparisonData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Müqayisə Nəticələri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metrik</th>
                  {comparisonData.schedules.map(schedule => (
                    <th key={schedule.id} className="text-center p-2 min-w-[120px]">
                      <div className="font-medium">{schedule.name}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {schedule.institution.name}
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-2">Ortalama</th>
                </tr>
              </thead>
              <tbody>
                {selectedMetrics.map(metricKey => {
                  const metric = comparisonMetrics.find(m => m.key === metricKey);
                  const MetricIcon = metric?.icon || Target;
                  const metricData = comparisonData.metrics_comparison[metricKey];
                  const bestId = getBestPerformer(metricKey);
                  const worstId = getWorstPerformer(metricKey);

                  return (
                    <tr key={metricKey} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MetricIcon className="w-4 h-4 text-gray-600" />
                          <div>
                            <div className="font-medium">{metric?.name}</div>
                            <div className="text-xs text-gray-500">{metric?.description}</div>
                          </div>
                        </div>
                      </td>
                      {comparisonData.schedules.map(schedule => {
                        const value = schedule[metricKey as keyof Schedule] as number;
                        const isBest = schedule.id === bestId;
                        const isWorst = schedule.id === worstId && comparisonData.schedules.length > 2;

                        return (
                          <td key={schedule.id} className="p-3 text-center">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                              isBest ? 'bg-green-100 text-green-800' :
                              isWorst ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {isBest && <TrendingUp className="w-3 h-3" />}
                              {isWorst && <TrendingDown className="w-3 h-3" />}
                              <span className="font-medium">
                                {formatMetricValue(value, metric?.format || 'number')}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-medium text-gray-600">
                        {formatMetricValue(metricData.average, metric?.format || 'number')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInsights = () => {
    if (!comparisonData) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Ümumi Reyting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparisonData.ranking.overall.map((item, index) => {
                const schedule = comparisonData.schedules.find(s => s.id === item.schedule_id);
                if (!schedule) return null;

                return (
                  <div key={item.schedule_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                    }`}>
                      {item.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{schedule.name}</div>
                      <div className="text-sm text-gray-600">{schedule.institution.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{Math.round(item.score)}</div>
                      <div className="text-xs text-gray-500">bal</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Tövsiyyələr
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparisonData.insights.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cədvəl Müqayisəsi</h1>
          <p className="text-gray-600">Müxtəlif cədvəlləri müqayisə edərək performansı analiz edin</p>
        </div>
        {comparisonData && (
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Nəticələri İxrac Et
          </Button>
        )}
      </div>

      <Tabs defaultValue="selection" className="space-y-6">
        <TabsList>
          <TabsTrigger value="selection">Seçim</TabsTrigger>
          <TabsTrigger value="comparison" disabled={!comparisonData}>
            Müqayisə
          </TabsTrigger>
          <TabsTrigger value="insights" disabled={!comparisonData}>
            Təhlil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="selection" className="space-y-6">
          {renderScheduleSelector()}
          {renderSelectedSchedules()}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {renderComparisonTable()}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {renderInsights()}
        </TabsContent>
      </Tabs>
    </div>
  );
};