import React from 'react';
import { Award, Target, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryStats {
  averageScore: number;
  totalAssessments: number;
  approvalRate: number;
  trendPercentage: number;
}

interface AssessmentSummaryStatsProps {
  summaryStats: SummaryStats | null;
  getScoreColor: (score: number) => string;
}

export const AssessmentSummaryStats: React.FC<AssessmentSummaryStatsProps> = ({
  summaryStats,
  getScoreColor
}) => {
  if (!summaryStats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Orta qiymət</p>
              <p className={`text-2xl font-bold ${getScoreColor(summaryStats.averageScore)}`}>
                {summaryStats.averageScore || 'N/A'}
              </p>
            </div>
            <Award className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Təsdiq nisbəti</p>
              <p className="text-2xl font-bold text-green-600">{summaryStats.approvalRate}%</p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
              <p className="text-2xl font-bold">{summaryStats.totalAssessments}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Trend</p>
              <p className={`text-2xl font-bold ${summaryStats.trendPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryStats.trendPercentage >= 0 ? '+' : ''}{summaryStats.trendPercentage}%
              </p>
            </div>
            {summaryStats.trendPercentage >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};