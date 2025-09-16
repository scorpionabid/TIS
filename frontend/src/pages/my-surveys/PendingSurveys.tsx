import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Search, AlertCircle, Users, Play } from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { Survey } from '@/services/surveys';
import { Loader2 } from 'lucide-react';

interface SurveyWithStatus extends Survey {
  response_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  due_date?: string;
  estimated_duration?: number;
  priority?: 'low' | 'medium' | 'high';
}

const PendingSurveys: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const { data: surveys = [], isLoading, error } = useQuery({
    queryKey: ['pending-surveys'],
    queryFn: async () => {
      const response = await surveyService.getAssignedSurveys();
      return response.data.filter((survey: SurveyWithStatus) =>
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

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return isAfter(new Date(), new Date(dueDate));
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();

    if (isAfter(now, due)) {
      return `${Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))} gün gecikib`;
    }

    return formatDistanceToNow(due, {
      addSuffix: true,
      locale: az
    });
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gözləyən Sorğular</h1>
        <p className="text-gray-600 mt-1">
          Sizə təyin edilmiş və cavablandırılmağı gözləyən sorğular
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sorğu axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün prioritetlər</SelectItem>
                <SelectItem value="high">Yüksək</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Aşağı</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Bütün gözləyənlər</SelectItem>
                <SelectItem value="not_started">Başlanmamış</SelectItem>
                <SelectItem value="overdue">Gecikmiş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                  {survey.due_date && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Son tarix:</span>
                      <span className={isOverdue(survey.due_date) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        {format(new Date(survey.due_date), 'dd.MM.yyyy')}
                      </span>
                    </div>
                  )}

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

                {survey.due_date && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`h-4 w-4 ${
                        isOverdue(survey.due_date) ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isOverdue(survey.due_date) ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {getDaysUntilDue(survey.due_date)}
                      </span>
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