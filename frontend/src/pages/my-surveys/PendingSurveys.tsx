import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Search, AlertCircle, Users, Play, Lock, Eye, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { Survey } from '@/services/surveys';
import { Loader2 } from 'lucide-react';

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
  React.useEffect(() => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 transition-colors';
      case 'low': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors';
      case 'not_started': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const isOverdue = (endDate?: string) => {
    if (!endDate) return false;
    return isAfter(new Date(), new Date(endDate));
  };

  const getDaysUntilDue = (endDate?: string) => {
    if (!endDate) return null;
    const due = new Date(endDate);
    const now = new Date();

    if (isAfter(now, due)) {
      return `${Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))} gün gecikib`;
    }

    return formatDistanceToNow(due, {
      addSuffix: true,
      locale: az
    });
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

  const handlePreviewSurvey = (surveyId: number) => {
    // Navigate to survey preview modal or page
    navigate(`/surveys/${surveyId}/preview`);
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
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Axtarış..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 py-1 h-9 text-sm border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
          
          {/* Priority Filter */}
          <Select 
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as any)}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün prioritetlər</SelectItem>
              <SelectItem value="high">Yüksək</SelectItem>
              <SelectItem value="medium">Orta</SelectItem>
              <SelectItem value="low">Aşağı</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select 
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as any)}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="not_started">Başlanmayıb</SelectItem>
              <SelectItem value="in_progress">Davam edir</SelectItem>
              <SelectItem value="overdue">Gecikmiş</SelectItem>
            </SelectContent>
          </Select>
          
          {isFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-sm text-gray-600 hover:text-gray-900"
            >
              Təmizlə
            </Button>
          )}
        </div>
      </div>

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
        <div className="grid gap-4">
          {filteredSurveys.map((survey: SurveyWithStatus) => (
            <Card key={survey.id} className={`transition-shadow hover:shadow-sm ${
              survey.response_status === 'overdue' ? 'border-l-2 border-l-red-500' : ''
            }`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold">
                      {survey.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {survey.description}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {/* Priority Indicator */}
                      {survey.priority && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              survey.priority === 'high' ? 'bg-red-500' : 
                              survey.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {survey.priority === 'high' ? 'Yüksək prioritet' : 
                             survey.priority === 'medium' ? 'Orta prioritet' : 'Aşağı prioritet'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Status Badge */}
                      <Badge 
                        variant="outline"
                        className={`text-xs font-normal px-2 h-5 ${getStatusColor(survey.response_status)}`}
                      >
                        {survey.response_status === 'overdue' ? 'Gecikmiş' : 
                         survey.response_status === 'in_progress' ? 'Davam edir' : 'Gözləyir'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Bitmə Tarixi</span>
                    </div>
                    {survey.end_date ? (
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-semibold ${
                          isOverdue(survey.end_date) ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {format(new Date(survey.end_date), 'dd MMMM yyyy', { locale: az })}
                        </span>
                        <Badge 
                          variant={isOverdue(survey.end_date) ? 'destructive' : 'outline'}
                          className="ml-2"
                        >
                          {isOverdue(survey.end_date) 
                            ? `${getDaysRemaining(survey.end_date) * -1} gün gecikib`
                            : getDaysRemaining(survey.end_date) === 0 
                              ? 'Bu gün son gün' 
                              : `${getDaysRemaining(survey.end_date)} gün qalıb`
                          }
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-500">Müəyyən edilməyib</span>
                    )}
                  </div>

                  {survey.estimated_duration && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Müddət:</span>
                      <span className="font-medium text-gray-900">{survey.estimated_duration} dəq</span>
                    </div>
                  )}

                  {survey.questions_count && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Suallar:</span>
                      <span className="font-medium text-gray-900">{survey.questions_count}</span>
                    </div>
                  )}
                </div>

                {survey.end_date && isOverdue(survey.end_date) && (
                  <div className="mb-3 p-2 rounded-md bg-red-50 border border-red-100 text-sm text-red-700">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Sorğunun müddəti bitib!</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleStartSurvey(survey.id)}
                    size="sm"
                    className={`h-8 text-sm w-full sm:w-auto ${
                      survey.response_status === 'overdue'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {survey.response_status === 'overdue' ? 'Təcili başla' : 'Başla'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingSurveys;
