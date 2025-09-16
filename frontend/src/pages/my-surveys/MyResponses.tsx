import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Eye, Save, AlertCircle, Clock, Calendar, BarChart3 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { SurveyResponse } from '@/services/surveys';
import { Loader2 } from 'lucide-react';

interface ResponseWithSurvey extends SurveyResponse {
  survey: {
    id: number;
    title: string;
    description?: string;
    due_date?: string;
    questions_count?: number;
  };
  last_saved_at?: string;
  progress_percentage?: number;
}

const MyResponses: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: responses = [], isLoading, error } = useQuery({
    queryKey: ['my-survey-responses'],
    queryFn: async () => {
      const response = await surveyService.getMyResponses();
      return response.data.filter((resp: ResponseWithSurvey) =>
        resp.status === 'in_progress' || resp.status === 'draft'
      );
    },
    refetchInterval: 30000,
  });

  const filteredResponses = responses.filter((response: ResponseWithSurvey) => {
    const matchesSearch = response.survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.survey.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Davam edir';
      case 'draft': return 'Qaralama';
      default: return status;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleContinueResponse = (responseId: number, surveyId: number) => {
    navigate(`/survey-response/${surveyId}/${responseId}`);
  };

  const handleViewResponse = (responseId: number) => {
    navigate(`/survey-responses/${responseId}/view`);
  };

  const handleDeleteDraft = async (responseId: number) => {
    if (window.confirm('Bu qara lamənı silmək istədiyinizə əminsiniz?')) {
      try {
        await surveyService.deleteResponse(responseId);
        // Refresh the list
        window.location.reload();
      } catch (error) {
        console.error('Error deleting draft:', error);
      }
    }
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
            <p className="text-gray-600">Cavablar yüklənərkən xəta baş verdi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mənim Cavablarım</h1>
        <p className="text-gray-600 mt-1">
          Davam edən və qaralama vəziyyətində olan sorğu cavablarınız
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sorğu axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="in_progress">Davam edir</SelectItem>
                <SelectItem value="draft">Qaralama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Responses List */}
      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Davam edən cavab yoxdur
              </h3>
              <p className="text-gray-600">
                Hazırda davam edən sorğu cavabınız yoxdur.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResponses.map((response: ResponseWithSurvey) => (
            <Card key={response.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold">
                      {response.survey.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {response.survey.description}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <Badge className={getStatusColor(response.status)}>
                      {getStatusText(response.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Progress Bar */}
                {response.progress_percentage !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Tərəqqi</span>
                      <span className="text-sm text-gray-600">{response.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(response.progress_percentage)}`}
                        style={{ width: `${response.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {response.last_saved_at && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Save className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Son saxlanma:</span>
                      <span className="text-gray-900">
                        {formatDistanceToNow(new Date(response.last_saved_at), {
                          addSuffix: true,
                          locale: az
                        })}
                      </span>
                    </div>
                  )}

                  {response.survey.due_date && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Son tarix:</span>
                      <span className="text-gray-900">
                        {format(new Date(response.survey.due_date), 'dd.MM.yyyy')}
                      </span>
                    </div>
                  )}

                  {response.survey.questions_count && (
                    <div className="flex items-center space-x-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Sual sayı:</span>
                      <span className="text-gray-900">{response.survey.questions_count}</span>
                    </div>
                  )}
                </div>

                {response.created_at && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">
                        Başlanıb: {format(new Date(response.created_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResponse(response.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Baxış
                    </Button>

                    {response.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDraft(response.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        Sil
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => handleContinueResponse(response.id, response.survey.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Davam et
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {responses.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">Davam edən</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {responses.filter(r => r.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">Qaralama</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(
                    responses.reduce((sum, r) => sum + (r.progress_percentage || 0), 0) / responses.length
                  )}%
                </div>
                <div className="text-sm text-gray-600">Orta tərəqqi</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyResponses;