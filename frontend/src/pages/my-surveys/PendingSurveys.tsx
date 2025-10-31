import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { Survey } from '@/services/surveys';
import { Loader2 } from 'lucide-react';
import { FilterBar } from '@/components/common/FilterBar';
import { cn } from '@/lib/utils';

interface SurveyWithStatus extends Survey {
  response_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  end_date?: string;  // Changed from due_date to match backend
  estimated_duration?: number;
  priority?: 'low' | 'medium' | 'high';
  is_anonymous: boolean;  // Made required to match parent interface
  questions_count?: number;
  completion_percentage?: number;
  actual_responses?: number;
  estimated_recipients?: number | string;
}

const PendingSurveys: React.FC = () => {
  const navigate = useNavigate();
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'overdue'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: apiResponse, isLoading, error } = useQuery<SurveyWithStatus[]>({
    queryKey: ['pending-surveys'],
    queryFn: async () => {
      try {
        const response = await surveyService.getAssignedSurveys();
        console.log('API Response:', response);
        if (Array.isArray(response)) {
          return response as SurveyWithStatus[];
        }

        const payload = (response as any)?.data;
        if (payload && Array.isArray(payload.data)) {
          return payload.data as SurveyWithStatus[];
        }

        if (payload && Array.isArray(payload)) {
          return payload as SurveyWithStatus[];
        }

        return [];
      } catch (err) {
        console.error('Error fetching surveys:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Log any errors
  useEffect(() => {
    if (error) {
      console.error('Error in useQuery:', error);
    }
  }, [error]);

  // Process the surveys data
  const surveys = React.useMemo(() => {
    if (!apiResponse) return [];
    
    // Filter for pending, in-progress, and overdue surveys
    return apiResponse.filter(survey => {
      const status = (survey.response_status ?? (survey as any).status ?? '').toLowerCase();
      return (
        status === 'not_started' || 
        status === 'in_progress' ||
        status === 'overdue' ||
        status === 'draft' ||
        status === 'started' ||
        status === 'pending'
      );
    });
  }, [apiResponse]);

  // Filter surveys based on active filters
  const filteredSurveys = surveys.filter((survey: SurveyWithStatus) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (survey.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    // Priority filter
    const matchesPriority = priorityFilter === 'all' || survey.priority === priorityFilter;
    
    // Status filter
    const normalizedStatus = (survey.response_status ?? (survey as any).status ?? '').toLowerCase();
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'overdue' && normalizedStatus === 'overdue') ||
      (statusFilter === 'not_started' && normalizedStatus === 'not_started') ||
      (statusFilter === 'in_progress' && normalizedStatus === 'in_progress');

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  // Check if any filter is active
  const isFilterActive = searchTerm !== '' || 
    priorityFilter !== 'all' || 
    statusFilter !== 'all';

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case 'high':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'medium':
        return 'border-amber-300/60 bg-amber-50 text-amber-700';
      case 'low':
        return 'border-emerald-300/60 bg-emerald-50 text-emerald-700';
      default:
        return 'border-border/60 bg-muted/40 text-muted-foreground';
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'overdue':
        return 'border-destructive/40 bg-destructive/10 text-destructive';
      case 'not_started':
        return 'border-primary/30 bg-primary/10 text-primary';
      case 'in_progress':
        return 'border-amber-300/60 bg-amber-50 text-amber-700';
      default:
        return 'border-border/60 bg-muted/40 text-muted-foreground';
    }
  };

  const isOverdue = (endDate?: string) => {
    if (!endDate) return false;
    return isAfter(new Date(), new Date(endDate));
  };

  const getDaysRemaining = (endDate: string) => {
    const due = new Date(endDate);
    const now = new Date();
    // Reset time part to compare only dates
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    const diffTime = endDateOnly.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleStartSurvey = (surveyId: number) => {
    navigate(`/survey-response/${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xəta baş verdi</h3>
            <p className="text-gray-600">Sorğular yüklənərkən xəta baş verdi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Gözləyən Sorğular</h2>
        
        <FilterBar className="md:w-auto">
          <FilterBar.Group>
            <FilterBar.Field>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Axtarış..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-10 text-sm"
                />
              </div>
            </FilterBar.Field>

            <FilterBar.Field>
              <Select 
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as any)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Prioritet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün prioritetlər</SelectItem>
                  <SelectItem value="high">Yüksək</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Aşağı</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar.Field>

            <FilterBar.Field>
              <Select 
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="not_started">Başlanmayıb</SelectItem>
                  <SelectItem value="in_progress">Davam edir</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar.Field>
          </FilterBar.Group>

          <FilterBar.Actions>
            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Təmizlə
              </Button>
            )}
          </FilterBar.Actions>
        </FilterBar>
      </div>

      {isFilterActive && (
        <div className="filter-panel">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Aktiv filtrlər
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <X className="h-4 w-4" />
              Hamısını təmizlə
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="filter-chip">
                Axtarış: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label="Axtarışı sıfırla"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="filter-chip">
                Prioritet: {priorityFilter === 'high' ? 'Yüksək' : priorityFilter === 'medium' ? 'Orta' : 'Aşağı'}
                <button
                  onClick={() => setPriorityFilter('all')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label="Prioritet filtrini sıfırla"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="filter-chip">
                Status: {statusFilter === 'not_started' ? 'Başlanmayıb' : statusFilter === 'in_progress' ? 'Davam edir' : 'Gecikmiş'}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label="Status filtrini sıfırla"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Survey List */}
      {filteredSurveys.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gözləyən sorğu yoxdur
              </h3>
              <p className="text-gray-600">
                Hazırda sizə təyin edilmiş gözləyən sorğu yoxdur.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSurveys.map((survey: SurveyWithStatus) => {
            const overdue =
              survey.response_status === 'overdue' ||
              (survey.end_date ? isOverdue(survey.end_date) : false);
            const daysRemaining = survey.end_date ? getDaysRemaining(survey.end_date) : null;
            const statusLabel =
              survey.response_status === 'overdue'
                ? 'Gecikmiş'
                : survey.response_status === 'in_progress'
                ? 'Davam edir'
                : 'Gözləyir';
            const actionLabel = overdue
              ? 'Təcili başla'
              : survey.response_status === 'in_progress'
              ? 'Davam et'
              : 'Sorğunu başlat';

            return (
              <Card
                key={survey.id}
                variant="surface"
                align="start"
                className={cn(
                  "flex h-full flex-col border-border/70 transition-all duration-200",
                  "hover:border-primary/40 hover:shadow-card",
                  overdue && "ring-1 ring-inset ring-destructive/40 bg-destructive/5"
                )}
              >
                <CardHeader density="cozy" className="gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {survey.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full border px-2 py-0.5 font-medium",
                              getPriorityColor(survey.priority)
                            )}
                          >
                            {survey.priority === 'high'
                              ? 'Yüksək prioritet'
                              : survey.priority === 'medium'
                              ? 'Orta prioritet'
                              : 'Aşağı prioritet'}
                          </Badge>
                        )}
                        {survey.is_anonymous && (
                          <Badge
                            variant="outline"
                            className="rounded-full border px-2 py-0.5 font-medium text-muted-foreground"
                          >
                            Anonim sorğu
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {survey.title}
                      </CardTitle>
                      {survey.description && (
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                          {survey.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        getStatusColor(survey.response_status)
                      )}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent density="compact" className="flex flex-1 flex-col gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5",
                      "border-border/60 bg-muted/30",
                      overdue && "border-destructive/40 bg-destructive/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          overdue ? "bg-destructive/15 text-destructive" : "bg-amber-50 text-amber-600"
                        )}
                      >
                        <Calendar className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                          Bitmə tarixi
                        </p>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            overdue ? "text-destructive" : "text-foreground"
                          )}
                        >
                          {survey.end_date
                            ? format(new Date(survey.end_date), 'dd MMMM yyyy', { locale: az })
                            : 'Müəyyən edilməyib'}
                        </p>
                      </div>
                    </div>
                    {survey.end_date && (
                      <Badge
                        variant={overdue ? "destructive" : "outline"}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                          !overdue && "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {overdue
                          ? `${Math.abs(daysRemaining ?? 0)} gün gecikib`
                          : daysRemaining === 0
                          ? 'Bu gün son gün'
                          : `${daysRemaining} gün qalıb`}
                      </Badge>
                    )}
                  </div>

                  {overdue && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Sorğunun müddəti bitib. Cavablandırmaq üçün dərhal başlayın.</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter density="compact" className="flex-col gap-2 px-4 pb-4 pt-0 sm:flex-col sm:px-5">
                  <Button
                    onClick={() => handleStartSurvey(survey.id)}
                    size="sm"
                    variant={overdue ? "destructive" : "default"}
                    className="w-full justify-center gap-2"
                  >
                    {actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingSurveys;
