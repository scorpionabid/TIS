import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Eye, Save, AlertCircle, Clock, Calendar, BarChart3, Download, CheckCircle, Star, Award } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    type?: string;
  };
  last_saved_at?: string;
  progress_percentage?: number;
  completion_time?: string;
  score?: number;
  feedback?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  submitted_on_time?: boolean;
}

const MyResponses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');

  const { data: responses = [], isLoading, error } = useQuery({
    queryKey: ['my-survey-responses'],
    queryFn: async () => {
      const response = await surveyService.getMyResponses();
      // YENİ: Show all responses, let client-side filtering handle status
      return response.data;
    },
    refetchInterval: 30000,
  });

  const filteredResponses = responses.filter((response: ResponseWithSurvey) => {
    const matchesSearch = response.survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.survey.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;

    // Period filtering
    let matchesPeriod = true;
    if (periodFilter !== 'all' && response.completion_time) {
      const completionDate = new Date(response.completion_time);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (periodFilter) {
        case 'week':
          matchesPeriod = daysDiff <= 7;
          break;
        case 'month':
          matchesPeriod = daysDiff <= 30;
          break;
        case 'quarter':
          matchesPeriod = daysDiff <= 90;
          break;
      }
    } else if (periodFilter !== 'all' && !response.completion_time) {
      matchesPeriod = false; // If no completion time, exclude from period filter
    }

    const matchesApproval = approvalFilter === 'all' || response.approval_status === approvalFilter;

    return matchesSearch && matchesStatus && matchesPeriod && matchesApproval;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'submitted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Qaralama';
      case 'in_progress': return 'Davam edir';
      case 'submitted': return 'Göndərilmiş';
      case 'approved': return 'Təsdiqlənmiş';
      case 'rejected': return 'Rədd edilmiş';
      case 'completed': return 'Tamamlanmış';
      default: return status;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getApprovalStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getApprovalStatusText = (status?: string) => {
    switch (status) {
      case 'approved': return 'Təsdiqlənib';
      case 'rejected': return 'Rədd edilib';
      case 'pending': return 'Gözləyir';
      default: return 'Naməlum';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score?: number) => {
    if (!score) return null;
    if (score >= 90) return <Award className="h-4 w-4 text-yellow-500" />;
    if (score >= 70) return <Star className="h-4 w-4 text-blue-500" />;
    return <BarChart3 className="h-4 w-4 text-gray-500" />;
  };

  const handleContinueResponse = (responseId: number, surveyId: number) => {
    navigate(`/survey-response/${surveyId}/${responseId}`);
  };

  const handleViewResponse = (responseId: number, surveyId: number) => {
    navigate(`/survey-response/${surveyId}/${responseId}`);
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

  // YENİ: Export response report
  const handleDownloadReport = async (responseId: number) => {
    try {
      const blob = await surveyService.downloadResponseReport(responseId);

      // Verify we have a valid blob
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Invalid file data received from server');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `survey-response-${responseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      // TODO: Add toast notification for error
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
          Cavablandırdığınız bütün sorğuların tarixçəsi və mövcud durumu
        </p>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="draft">Qaralama</SelectItem>
                <SelectItem value="in_progress">Davam edir</SelectItem>
                <SelectItem value="submitted">Göndərilmiş</SelectItem>
                <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
                <SelectItem value="rejected">Rədd edilmiş</SelectItem>
                <SelectItem value="completed">Tamamlanmış</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dövr" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün vaxtlar</SelectItem>
                <SelectItem value="week">Son həftə</SelectItem>
                <SelectItem value="month">Son ay</SelectItem>
                <SelectItem value="quarter">Son rüb</SelectItem>
              </SelectContent>
            </Select>

            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Təsdiq statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün təsdiq statusları</SelectItem>
                <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
                <SelectItem value="pending">Gözləyir</SelectItem>
                <SelectItem value="rejected">Rədd edilmiş</SelectItem>
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
                {statusFilter === 'all' ? 'Cavab tapılmadı' : 'Seçilmiş statusda cavab yoxdur'}
              </h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'Hazırda heç bir sorğu cavabınız yoxdur.'
                  : 'Seçilmiş filtrlərə uyğun cavab tapılmadı.'}
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
                    <div className="flex space-x-2">
                      {response.submitted_on_time && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Vaxtında
                        </Badge>
                      )}
                      <Badge className={getStatusColor(response.status)}>
                        {getStatusText(response.status)}
                      </Badge>
                      {response.approval_status && (
                        <Badge className={getApprovalStatusColor(response.approval_status)}>
                          {getApprovalStatusText(response.approval_status)}
                        </Badge>
                      )}
                    </div>

                    {response.score && (
                      <div className="flex items-center space-x-1">
                        {getScoreIcon(response.score)}
                        <span className={`text-sm font-medium ${getScoreColor(response.score)}`}>
                          {response.score}%
                        </span>
                      </div>
                    )}
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
                  {response.completion_time && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Tamamlanıb:</span>
                      <span className="text-gray-900">
                        {format(new Date(response.completion_time), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  )}

                  {response.last_saved_at && !response.completion_time && (
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

                {response.feedback && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Star className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-blue-900">Rəy:</span>
                        <p className="text-sm text-blue-800 mt-1">{response.feedback}</p>
                      </div>
                    </div>
                  </div>
                )}

                {response.completion_time && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(response.completion_time), {
                          addSuffix: true,
                          locale: az
                        })} tamamlandı
                      </span>
                    </div>
                  </div>
                )}

                {response.created_at && !response.completion_time && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">
                        Başlanıb: {format(new Date(response.created_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                )}

                {/* YENİ: Dynamic button layout based on status */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResponse(response.id, response.survey.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Baxış
                    </Button>

                    {/* Delete button only for draft status */}
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

                    {/* Export button for completed responses */}
                    {['submitted', 'approved', 'completed'].includes(response.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(response.id)}
                        className="text-green-600 hover:text-green-700 hover:border-green-300"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>

                  {/* Continue button only for editable statuses */}
                  {['draft', 'in_progress'].includes(response.status) ? (
                    <Button
                      onClick={() => handleContinueResponse(response.id, response.survey.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Davam et
                    </Button>
                  ) : (
                    // Status indicator for completed responses
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Tamamlanmış</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Stats */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cavab Statistikaları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {responses.length}
                </div>
                <div className="text-sm text-gray-600">Ümumi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {responses.filter(r => r.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">Qaralama</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {responses.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">Davam edən</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {responses.filter(r => r.status === 'submitted').length}
                </div>
                <div className="text-sm text-gray-600">Göndərilmiş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {responses.filter(r => r.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">Təsdiqlənmiş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {responses.filter(r => ['approved', 'completed'].includes(r.status)).length}
                </div>
                <div className="text-sm text-gray-600">Bitmiş</div>
              </div>
            </div>

            {/* Enhanced insights */}
            {responses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-700">
                      {Math.round(
                        (responses.filter(r => ['approved', 'completed', 'submitted'].includes(r.status)).length / responses.length) * 100
                      )}%
                    </div>
                    <div className="text-sm text-gray-500">Tamamlanma oranı</div>
                  </div>

                  {responses.filter(r => r.submitted_on_time).length > 0 && (
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {Math.round(
                          (responses.filter(r => r.submitted_on_time).length / responses.filter(r => ['approved', 'completed', 'submitted'].includes(r.status)).length) * 100
                        )}%
                      </div>
                      <div className="text-sm text-gray-500">Vaxtında təhvil oranı</div>
                    </div>
                  )}

                  {responses.filter(r => r.score).length > 0 && (
                    <div>
                      <div className="text-lg font-semibold text-purple-600">
                        {Math.round(
                          responses.filter(r => r.score).reduce((sum, r) => sum + (r.score || 0), 0) / responses.filter(r => r.score).length
                        )}%
                      </div>
                      <div className="text-sm text-gray-500">Orta bal</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyResponses;