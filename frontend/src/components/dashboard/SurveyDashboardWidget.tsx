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
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import type { DeadlineHighlight, SurveyStats } from '@/services/surveys';
import { cn } from '@/lib/utils';

interface SurveyDashboardWidgetProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export const SurveyDashboardWidget: React.FC<SurveyDashboardWidgetProps> = ({
  className,
  variant = 'default'
}) => {
  const navigate = useNavigate();

  const { data: statsData, isLoading, error } = useQuery<SurveyStats>({
    queryKey: ['survey-dashboard-stats'],
    queryFn: async () => {
      const response = await surveyService.getDashboardStats();
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        completion_rate: 0,
        total_responses: 0,
        average_completion_time: 0,
        responses_by_day: [],
        demographic_breakdown: {},
        deadline_summary: {
          pending_assignments: 0,
          overdue: 0,
          approaching: 0,
          on_track: 0,
          no_deadline: 0,
          threshold_days: 3
        },
        deadline_highlights: {
          overdue: [],
          approaching: []
        },
        ...(response.data || {}),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
  const stats = statsData;

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
    navigate('/my-surveys/responses?status=completed');
  };

  const navigateToDeadlineFilter = (filter: 'overdue' | 'approaching') => {
    const targetStatus = filter === 'overdue' ? 'overdue' : 'in_progress';
    navigate(`/my-surveys/pending?status=${targetStatus}`);
  };

  const renderHighlightList = (items: DeadlineHighlight[] = [], variant: 'overdue' | 'approaching') => {
    if (!items.length) {
      return null;
    }

    const title = variant === 'overdue' ? 'Gecikən sorğular' : 'Yaxınlaşan son tarixlər';
    const tone =
      variant === 'overdue'
        ? 'border-destructive/40 bg-destructive/5'
        : 'border-amber-200/50 bg-amber-50';

    return (
      <Card className={cn('rounded-xl', tone)}>
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigateToDeadlineFilter(variant)}
          >
            Hamısını göstər
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.slice(0, 3).map((item) => (
            <div key={`${variant}-${item.survey_id}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.end_date && (
                  <p className="text-xs text-muted-foreground">
                    {variant === 'overdue'
                      ? `${item.days_overdue ?? 0} gün gecikib`
                      : `${item.days_remaining ?? 0} gün qalıb`} ·{' '}
                    {formatDistanceToNow(new Date(item.end_date), { addSuffix: true, locale: az })}
                  </p>
                )}
              </div>
              <Badge variant={variant === 'overdue' ? 'destructive' : 'secondary'}>
                {variant === 'overdue' ? 'Gecikib' : 'Yaxınlaşır'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    );
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

          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className={cn("flex items-center justify-center mb-1", getStatColor('overdue'))}>
              {getStatIcon('overdue')}
            </div>
            <div className="font-bold text-lg text-red-600">{stats.overdue ?? 0}</div>
            <div className="text-xs text-red-700">Gecikmiş</div>
          </div>
        </div>

        {stats.deadline_summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-destructive/30 p-4 bg-red-50">
              <p className="text-xs font-semibold text-destructive uppercase">Gecikmiş sorğular</p>
              <p className="text-2xl font-bold text-destructive mt-1">
                {stats.deadline_summary.overdue}
              </p>
              <p className="text-xs text-muted-foreground">Cavab gözləyən tapşırıqlar</p>
            </div>
            <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
              <p className="text-xs font-semibold text-amber-800 uppercase">Yaxınlaşan son tarixlər</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">
                {stats.deadline_summary.approaching}
              </p>
              <p className="text-xs text-amber-700/80">
                {stats.deadline_summary.threshold_days} gün ərzində bitir
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 p-4 bg-emerald-50">
              <p className="text-xs font-semibold text-emerald-700 uppercase">Vaxtında</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {stats.deadline_summary.on_track}
              </p>
              <p className="text-xs text-emerald-700/70">Gözlənilən plan üzrə</p>
            </div>
          </div>
        )}

        {(stats.deadline_highlights?.overdue?.length ||
          stats.deadline_highlights?.approaching?.length) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderHighlightList(stats.deadline_highlights?.overdue, 'overdue')}
              {renderHighlightList(stats.deadline_highlights?.approaching, 'approaching')}
            </div>
          )}

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
                      {survey.deadline_details?.end_date && ` • Son: ${new Date(survey.deadline_details.end_date).toLocaleDateString('az-AZ')}`}
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
