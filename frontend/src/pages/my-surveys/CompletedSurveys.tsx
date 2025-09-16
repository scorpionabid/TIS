import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Download, CheckCircle, Calendar, Clock, BarChart3, Star, Award } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { SurveyResponse } from '@/services/surveys';
import { Loader2 } from 'lucide-react';

interface CompletedResponseWithSurvey extends SurveyResponse {
  survey: {
    id: number;
    title: string;
    description?: string;
    due_date?: string;
    questions_count?: number;
    type?: string;
  };
  completion_time?: string;
  score?: number;
  feedback?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  submitted_on_time?: boolean;
}

const CompletedSurveys: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');

  const { data: responses = [], isLoading, error } = useQuery({
    queryKey: ['completed-survey-responses'],
    queryFn: async () => {
      const response = await surveyService.getMyResponses();
      return response.data.filter((resp: CompletedResponseWithSurvey) =>
        resp.status === 'completed' || resp.status === 'submitted'
      );
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredResponses = responses.filter((response: CompletedResponseWithSurvey) => {
    const matchesSearch = response.survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.survey.description?.toLowerCase().includes(searchTerm.toLowerCase());

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
    }

    const matchesApproval = approvalFilter === 'all' || response.approval_status === approvalFilter;

    return matchesSearch && matchesPeriod && matchesApproval;
  });

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

  const handleViewResponse = (responseId: number) => {
    navigate(`/survey-responses/${responseId}/view`);
  };

  const handleDownloadReport = async (responseId: number) => {
    try {
      const blob = await surveyService.downloadResponseReport(responseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `survey-response-${responseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const calculateStats = () => {
    const total = responses.length;
    const onTime = responses.filter(r => r.submitted_on_time).length;
    const approved = responses.filter(r => r.approval_status === 'approved').length;
    const avgScore = responses.reduce((sum, r) => sum + (r.score || 0), 0) / total;

    return { total, onTime, approved, avgScore: Math.round(avgScore) };
  };

  const stats = calculateStats();

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
            <CheckCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xəta baş verdi</h3>
            <p className="text-gray-600">Tamamlanmış sorğular yüklənərkən xəta baş verdi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tamamlanmış Sorğular</h1>
        <p className="text-gray-600 mt-1">
          Cavablandırdığınız və tamamladığınız sorğuların tarixçəsi
        </p>
      </div>

      {/* Stats Overview */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ümumi Statistika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Ümumi sorğu</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.onTime}</div>
                <div className="text-sm text-gray-600">Vaxtında</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.approved}</div>
                <div className="text-sm text-gray-600">Təsdiqlənmiş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgScore}%</div>
                <div className="text-sm text-gray-600">Orta bal</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
                <SelectItem value="pending">Gözləyir</SelectItem>
                <SelectItem value="rejected">Rədd edilmiş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Completed Surveys List */}
      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tamamlanmış sorğu tapılmadı
              </h3>
              <p className="text-gray-600">
                Seçilmiş filtrlərə uyğun tamamlanmış sorğu yoxdur.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResponses.map((response: CompletedResponseWithSurvey) => (
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

                  {response.survey.due_date && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Son tarix idi:</span>
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

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewResponse(response.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ətraflı bax
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport(response.id)}
                    className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Hesabat yüklə
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

export default CompletedSurveys;