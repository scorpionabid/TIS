import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Award, Target, Activity } from 'lucide-react';
import { ratingService, RatingItem } from '@/services/ratingService';

interface TeacherSummaryCardsProps {
  institutionId?: number;
  academicYearId?: number;
  period?: string;
}

export const TeacherSummaryCards: React.FC<TeacherSummaryCardsProps> = ({
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
      console.error('Error loading teacher summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (data.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        excellent: 0,
        good: 0,
        average_count: 0,
        poor: 0
      };
    }

    const scores = data.map(item => item.overall_score || 0);
    const total = data.length;
    const average = scores.reduce((sum, score) => sum + score, 0) / total;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    const excellent = data.filter(item => (item.overall_score || 0) >= 90).length;
    const good = data.filter(item => (item.overall_score || 0) >= 80 && (item.overall_score || 0) < 90).length;
    const average_count = data.filter(item => (item.overall_score || 0) >= 70 && (item.overall_score || 0) < 80).length;
    const poor = data.filter(item => (item.overall_score || 0) < 70).length;

    return {
      total,
      average,
      highest,
      lowest,
      excellent,
      good,
      average_count,
      poor
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ümumi Müəllim</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Müəllim</p>
          <div className="mt-2">
            <Progress value={(stats.total / Math.max(stats.total, 1)) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ortalama Reytinq</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.average.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Ümumi bal</p>
          <div className="mt-2">
            <Progress value={stats.average} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ən Yüksək</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highest.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Maksimum bal</p>
          <div className="mt-2">
            <Progress value={stats.highest} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ən Alçaq</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lowest.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Minimum bal</p>
          <div className="mt-2">
            <Progress value={stats.lowest} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TeacherDetailedStats: React.FC<TeacherSummaryCardsProps> = ({
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
      console.error('Error loading detailed stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistribution = () => {
    if (data.length === 0) {
      return {
        excellent: { count: 0, percentage: 0 },
        good: { count: 0, percentage: 0 },
        average: { count: 0, percentage: 0 },
        poor: { count: 0, percentage: 0 }
      };
    }

    const total = data.length;
    const excellent = data.filter(item => (item.overall_score || 0) >= 90).length;
    const good = data.filter(item => (item.overall_score || 0) >= 80 && (item.overall_score || 0) < 90).length;
    const average = data.filter(item => (item.overall_score || 0) >= 70 && (item.overall_score || 0) < 80).length;
    const poor = data.filter(item => (item.overall_score || 0) < 70).length;

    return {
      excellent: { count: excellent, percentage: (excellent / total) * 100 },
      good: { count: good, percentage: (good / total) * 100 },
      average: { count: average, percentage: (average / total) * 100 },
      poor: { count: poor, percentage: (poor / total) * 100 }
    };
  };

  const distribution = calculateDistribution();

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
            Reytinq Paylanması
          </CardTitle>
          <CardDescription>
            Müəllimlərin reytinq kateqoriyaları üzrə paylanması
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Əla (90-100)</span>
                <span className="text-sm font-bold">{distribution.excellent.count} ({distribution.excellent.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={distribution.excellent.percentage} className="h-2" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-600">Yaxşı (80-89)</span>
                <span className="text-sm font-bold">{distribution.good.count} ({distribution.good.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={distribution.good.percentage} className="h-2" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-yellow-600">Orta (70-79)</span>
                <span className="text-sm font-bold">{distribution.average.count} ({distribution.average.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={distribution.average.percentage} className="h-2" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-600">Zəif (0-69)</span>
                <span className="text-sm font-bold">{distribution.poor.count} ({distribution.poor.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={distribution.poor.percentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
