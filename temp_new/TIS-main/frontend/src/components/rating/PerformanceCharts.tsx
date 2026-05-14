import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { ratingService, RatingItem } from '@/services/ratingService';

interface PerformanceChartsProps {
  institutionId?: number;
  academicYearId?: number;
  period?: string;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  institutionId,
  academicYearId,
  period
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAll({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'müəllim'
      });
      setData(response.data.data || []);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreDistribution = () => {
    const ranges = [
      { name: '0-49', min: 0, max: 49, color: '#ef4444' },
      { name: '50-59', min: 50, max: 59, color: '#f97316' },
      { name: '60-69', min: 60, max: 69, color: '#eab308' },
      { name: '70-79', min: 70, max: 79, color: '#3b82f6' },
      { name: '80-89', min: 80, max: 89, color: '#06b6d4' },
      { name: '90-100', min: 90, max: 100, color: '#10b981' }
    ];

    return ranges.map(range => ({
      ...range,
      count: data.filter(item => {
        const score = item.overall_score || 0;
        return score >= range.min && score <= range.max;
      }).length
    }));
  };

  const getTopPerformers = () => {
    return data
      .filter(item => item.overall_score !== null)
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, 10)
      .map(item => ({
        name: item.user?.full_name || 'Bilinməyən',
        score: item.overall_score || 0,
        task_score: item.task_score || 0,
        survey_score: item.survey_score || 0
      }));
  };

  const getScoreComponents = () => {
    const validData = data.filter(item => item.overall_score !== null);
    
    if (validData.length === 0) {
      return [
        { name: 'Task', value: 0, color: '#3b82f6' },
        { name: 'Survey', value: 0, color: '#10b981' },
        { name: 'Manual', value: 0, color: '#f59e0b' }
      ];
    }

    const avgTask = validData.reduce((sum, item) => sum + (item.task_score || 0), 0) / validData.length;
    const avgSurvey = validData.reduce((sum, item) => sum + (item.survey_score || 0), 0) / validData.length;
    const avgManual = validData.reduce((sum, item) => sum + (item.manual_score || 0), 0) / validData.length;

    return [
      { name: 'Task', value: Math.round(avgTask), color: '#3b82f6' },
      { name: 'Survey', value: Math.round(avgSurvey), color: '#10b981' },
      { name: 'Manual', value: Math.round(avgManual), color: '#f59e0b' }
    ];
  };

  const distributionData = getScoreDistribution();
  const topPerformersData = getTopPerformers();
  const scoreComponentsData = getScoreComponents();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Bal Paylanması
          </CardTitle>
          <CardDescription>
            Müəllimlərin reytinq ballarının aralığa görə paylanması
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 10 Müəllim
          </CardTitle>
          <CardDescription>
            Ən yüksək reytinqə malik müəllimlər
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={topPerformersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="task_score" stroke="#3b82f6" strokeWidth={1} />
                <Line type="monotone" dataKey="survey_score" stroke="#f59e0b" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Score Components Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Komponentlər üzrə Bal
          </CardTitle>
          <CardDescription>
            Task, Survey və Manual komponentlərinin orta bal paylanması
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scoreComponentsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {scoreComponentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdvancedAnalytics: React.FC<PerformanceChartsProps> = ({
  institutionId,
  academicYearId,
  period
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAll({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'müəllim'
      });
      setData(response.data.data || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    if (data.length === 0) {
      return {
        averageTask: 0,
        averageSurvey: 0,
        averageManual: 0,
        averageOverall: 0,
        completionRate: 0,
        improvementPotential: 0,
        performanceVariation: 0
      };
    }

    const validData = data.filter(item => item.overall_score !== null);
    
    const averageTask = validData.reduce((sum, item) => sum + (item.task_score || 0), 0) / validData.length;
    const averageSurvey = validData.reduce((sum, item) => sum + (item.survey_score || 0), 0) / validData.length;
    const averageManual = validData.reduce((sum, item) => sum + (item.manual_score || 0), 0) / validData.length;
    const averageOverall = validData.reduce((sum, item) => sum + (item.overall_score || 0), 0) / validData.length;

    const completionRate = (validData.length / data.length) * 100;
    
    const scores = validData.map(item => item.overall_score || 0);
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageOverall, 2), 0) / scores.length;
    const performanceVariation = Math.sqrt(variance);

    const improvementPotential = Math.max(0, 100 - averageOverall);

    return {
      averageTask,
      averageSurvey,
      averageManual,
      averageOverall,
      completionRate,
      improvementPotential,
      performanceVariation
    };
  };

  const analytics = calculateAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Detallı Analitik
          </CardTitle>
          <CardDescription>
            Müəllim performansının dərin analizi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Task Komponenti</span>
                  <span className="text-sm font-bold">{analytics.averageTask.toFixed(1)}</span>
                </div>
                <Progress value={analytics.averageTask} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Survey Komponenti</span>
                  <span className="text-sm font-bold">{analytics.averageSurvey.toFixed(1)}</span>
                </div>
                <Progress value={analytics.averageSurvey} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Manual Komponenti</span>
                  <span className="text-sm font-bold">{analytics.averageManual.toFixed(1)}</span>
                </div>
                <Progress value={analytics.averageManual} className="h-2" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Tamamlama Nisbəti</span>
                  <span className="text-sm font-bold">{analytics.completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={analytics.completionRate} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Yaxşılaşma Potensialı</span>
                  <span className="text-sm font-bold">{analytics.improvementPotential.toFixed(1)}%</span>
                </div>
                <Progress value={analytics.improvementPotential} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Performans Dəyişkənliyi</span>
                  <span className="text-sm font-bold">{analytics.performanceVariation.toFixed(1)}</span>
                </div>
                <Progress value={Math.min(analytics.performanceVariation, 100)} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
