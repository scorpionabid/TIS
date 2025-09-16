import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Eye,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { cn } from '@/lib/utils';

interface SurveyStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  completion_rate: number;
}

interface SurveyDashboardWidgetProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export const SurveyDashboardWidget: React.FC<SurveyDashboardWidgetProps> = ({
  className,
  variant = 'default'
}) => {
  const navigate = useNavigate();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['survey-dashboard-stats'],
    queryFn: async () => {
      const response = await surveyService.getDashboardStats();
      return response.data as SurveyStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  const { data: recentSurveys = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-assigned-surveys'],
    queryFn: async () => {
      const response = await surveyService.getRecentAssignedSurveys(3);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const getStatColor = (type: string) => {
    switch (type) {
      case 'pending': return 'text-blue-600';
      case 'in_progress': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <ClipboardList className="h-4 w-4" />;
    }
  };

  const handleQuickStart = (surveyId: number) => {
    navigate(`/survey-response/${surveyId}`);
  };

  const handleViewAll = () => {
    navigate('/my-surveys/pending');
  };

  const handleViewResponses = () => {
    navigate('/my-surveys/responses');
  };

  const handleViewCompleted = () => {
    navigate('/my-surveys/completed');
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Sorğular</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
            <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Sorğular</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Sorğu məlumatları yüklənə bilmədi</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Sorğular</span>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-blue-600">{stats.pending}</div>
                <div className="text-xs text-gray-500">Gözləyən</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-yellow-600">{stats.in_progress}</div>
                <div className="text-xs text-gray-500">Davam</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Sorğu Vəziyyəti</CardTitle>
          </div>
          {stats.completion_rate !== undefined && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {Math.round(stats.completion_rate)}% tamamlanıb
            </Badge>
          )}
        </div>
        {stats.total > 0 && (
          <CardDescription>
            Ümumi {stats.total} sorğu təyin edilib
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className={cn("flex items-center justify-center mb-1", getStatColor('pending'))}>
              {getStatIcon('pending')}
            </div>
            <div className="font-bold text-lg text-blue-600">{stats.pending}</div>
            <div className="text-xs text-blue-700">Gözləyən</div>
          </div>

          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className={cn("flex items-center justify-center mb-1", getStatColor('in_progress'))}>
              {getStatIcon('in_progress')}
            </div>
            <div className="font-bold text-lg text-yellow-600">{stats.in_progress}</div>
            <div className="text-xs text-yellow-700">Davam edir</div>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className={cn("flex items-center justify-center mb-1", getStatColor('completed'))}>
              {getStatIcon('completed')}
            </div>
            <div className="font-bold text-lg text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-700">Tamamlanıb</div>
          </div>

          {stats.overdue > 0 && (
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className={cn("flex items-center justify-center mb-1", getStatColor('overdue'))}>
                {getStatIcon('overdue')}
              </div>
              <div className="font-bold text-lg text-red-600">{stats.overdue}</div>
              <div className="text-xs text-red-700">Gecikmiş</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {stats.completion_rate !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tamamlanma faizi</span>
              <span className="font-medium">{Math.round(stats.completion_rate)}%</span>
            </div>
            <Progress
              value={stats.completion_rate}
              className="h-2"
            />
          </div>
        )}

        {/* Recent Surveys */}
        {!loadingRecent && recentSurveys.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Son təyin edilənlər</h4>
            <div className="space-y-2">
              {recentSurveys.slice(0, 2).map((survey: any) => (
                <div key={survey.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {survey.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      {survey.questions_count} sual
                      {survey.due_date && ` • Son: ${new Date(survey.due_date).toLocaleDateString('az-AZ')}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickStart(survey.id)}
                    className="ml-2 shrink-0"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          {stats.pending > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleViewAll}
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Gözləyən sorğulara bax ({stats.pending})
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {stats.in_progress > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewResponses}
              >
                <Eye className="h-4 w-4 mr-1" />
                Cavablarım ({stats.in_progress})
              </Button>
            )}

            {stats.completed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewCompleted}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Tamamlanmış ({stats.completed})
              </Button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="text-center py-6">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Sorğu təyin edilməyib
            </h4>
            <p className="text-xs text-gray-600">
              Yeni sorğular təyin edildikdə burada görünəcək
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SurveyDashboardWidget;