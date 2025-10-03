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
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const { data: surveys = [], isLoading, error } = useQuery<SurveyWithStatus[]>({
    queryKey: ['pending-surveys'],
    queryFn: async () => {
      const response = await surveyService.getAssignedSurveys();
      // Add type assertion to ensure TypeScript understands the response structure
      return (response as { data: SurveyWithStatus[] }).data.filter((survey) =>
        survey.response_status === 'not_started' || survey.response_status === 'overdue'
      );
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const filteredSurveys = surveys.filter((survey: SurveyWithStatus) => {
    const matchesSearch = survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         survey.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || survey.priority === priorityFilter;
    const matchesStatus = statusFilter === 'pending' ||
                         (statusFilter === 'overdue' && survey.response_status === 'overdue') ||
                         (statusFilter === 'not_started' && survey.response_status === 'not_started');

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Gözləyən Sorğular</h2>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Axtarış */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Axtarış..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 py-1 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>
        
        {/* Prioritet Filtri */}
        <div className="flex items-center bg-gray-100 p-1 rounded-md">
          {['all', 'high', 'medium', 'low'].map((priority) => (
            <button
              key={priority}
              onClick={() => setPriorityFilter(priority)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                priorityFilter === priority 
                  ? 'bg-white shadow-sm border border-gray-200' 
                  : 'text-gray-700 hover:bg-white/50'
              }`}
            >
              {priority === 'all' && 'Hamısı'}
              {priority === 'high' && 'Yüksək'}
              {priority === 'medium' && 'Orta'}
              {priority === 'low' && 'Aşağı'}
            </button>
          ))}
        </div>
        
        {/* Status Filtri */}
        <div className="flex items-center bg-gray-100 p-1 rounded-md">
          {['pending', 'not_started', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                statusFilter === status 
                  ? 'bg-white shadow-sm border border-gray-200' 
                  : 'text-gray-700 hover:bg-white/50'
              }`}
            >
              {status === 'pending' && 'Hamısı'}
              {status === 'not_started' && 'Başlanmamış'}
              {status === 'overdue' && 'Gecikmiş'}
            </button>
          ))}
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
            <Card key={survey.id} className={`transition-shadow hover:shadow-md ${
              survey.response_status === 'overdue' ? 'border-red-200 bg-red-50' : ''
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

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      {survey.priority && (
                        <Badge className={getPriorityColor(survey.priority)}>
                          {survey.priority === 'high' && 'Yüksək'}
                          {survey.priority === 'medium' && 'Orta'}
                          {survey.priority === 'low' && 'Aşağı'}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(survey.response_status)}>
                        {survey.response_status === 'overdue' && 'Gecikmiş'}
                        {survey.response_status === 'not_started' && 'Başlanmamış'}
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
                      <span className="text-gray-600">Təxmini müddət:</span>
                      <span className="text-gray-900">{survey.estimated_duration} dəqiqə</span>
                    </div>
                  )}

                  {survey.questions_count && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Sual sayı:</span>
                      <span className="text-gray-900">{survey.questions_count}</span>
                    </div>
                  )}
                </div>

                {survey.end_date && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    isOverdue(survey.end_date) 
                      ? 'bg-red-50 border border-red-100' 
                      : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`h-5 w-5 ${
                        isOverdue(survey.end_date) ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          isOverdue(survey.end_date) ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          {isOverdue(survey.end_date)
                            ? 'Sorğunun müddəti bitib!'
                            : getDaysRemaining(survey.end_date) === 0
                              ? 'Bu gün son gündür!'
                              : `Bitməyinə ${getDaysRemaining(survey.end_date)} gün qalıb`
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(survey.end_date), 'd MMMM yyyy, EEEE', { locale: az })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewSurvey(survey.id)}
                  >
                    Önizləmə
                  </Button>

                  <Button
                    onClick={() => handleStartSurvey(survey.id)}
                    className={`${
                      survey.response_status === 'overdue'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {survey.response_status === 'overdue' ? 'Təcili Başla' : 'Başla'}
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