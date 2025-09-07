import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  Download, 
  Eye, 
  TrendingUp, 
  Search, 
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  PieChart,
  BarChart
} from "lucide-react";
import { surveyService, Survey, SurveyStats } from '@/services/surveys';
import { useToast } from '@/hooks/use-toast';

interface SurveyResultsStats {
  total_surveys: number;
  completed_surveys: number;
  total_responses: number;
  average_response_rate: number;
  pending_approvals: number;
}

export default function SurveyResults() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const navigate = useNavigate();

  // Get surveys data
  const { data: surveysData, isLoading: surveysLoading } = useQuery({
    queryKey: ['surveys', { status: 'published', search: searchTerm }],
    queryFn: () => surveyService.getAll({ 
      status: statusFilter === 'all' ? undefined : statusFilter as Survey['status'],
      search: searchTerm || undefined,
      per_page: 50
    }),
  });

  // Get dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['survey-results-stats'],
    queryFn: async (): Promise<SurveyResultsStats> => {
      // Mock data - replace with actual API call
      return {
        total_surveys: 47,
        completed_surveys: 42,
        total_responses: 12456,
        average_response_rate: 76,
        pending_approvals: 5
      };
    },
  });

  // Export functionality
  const exportMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const blob = await surveyService.exportResponses(surveyId, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `survey-${surveyId}-results.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success('Nəticələr uğurla yükləndi');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Yükləmə zamanı xəta baş verdi');
    }
  });

  const handleExportAll = async () => {
    if (!surveysData?.data?.data) return;
    
    try {
      for (const survey of surveysData.data.data) {
        await exportMutation.mutateAsync(survey.id);
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Bulk export error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'archived': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Aktiv';
      case 'draft': return 'Qaralama';
      case 'paused': return 'Dayandırılıb';
      case 'archived': return 'Arxivləşdirilib';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğu Nəticələri</h1>
          <p className="text-muted-foreground">Toplanmış nəticələrin təhlili və hesabatlar</p>
        </div>
        <Button 
          onClick={handleExportAll}
          disabled={exportMutation.isPending || !surveysData?.data?.data?.length}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? 'Yüklənir...' : 'Bütün Nəticələri Yüklə'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi sorğular</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.total_surveys || 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanmış sorğular</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.completed_surveys || 0}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi cavablar</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (statsData?.total_responses || 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orta cavab dərəcəsi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : `${statsData?.average_response_rate || 0}%`}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən təsdiqləmələr</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.pending_approvals || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrləmə və Axtarış
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Sorğu adı ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="published">Aktiv</SelectItem>
                  <SelectItem value="paused">Dayandırılıb</SelectItem>
                  <SelectItem value="archived">Arxivləşdirilib</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Sorğu Nəticələri
          </CardTitle>
          <CardDescription>
            Mövcud sorğuların ətraflı nəticələri və statistikalar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Yüklənir...</span>
            </div>
          ) : surveysData?.data?.data?.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm || statusFilter !== 'all' 
                  ? 'Axtarış şərtlərinə uyğun sorğu tapılmadı.' 
                  : 'Hələ heç bir sorğu yaradılmayıb.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {surveysData?.data?.data?.map((survey: Survey) => (
                <SurveyResultCard 
                  key={survey.id} 
                  survey={survey} 
                  onExport={() => exportMutation.mutate(survey.id)}
                  isExporting={exportMutation.isPending}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Survey Result Card Component
interface SurveyResultCardProps {
  survey: Survey;
  onExport: () => void;
  isExporting: boolean;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

function SurveyResultCard({ survey, onExport, isExporting, getStatusColor, getStatusText }: SurveyResultCardProps) {
  const { data: surveyStats } = useQuery({
    queryKey: ['survey-stats', survey.id],
    queryFn: () => surveyService.getStats(survey.id),
    enabled: !!survey.id
  });

  const responseRate = survey.max_responses 
    ? Math.round((survey.responses_count || 0) / survey.max_responses * 100)
    : 0;

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium">{survey.title}</h3>
          <Badge className={getStatusColor(survey.status)}>
            {getStatusText(survey.status)}
          </Badge>
          {survey.is_anonymous && (
            <Badge variant="outline">Anonim</Badge>
          )}
        </div>
        
        {survey.description && (
          <p className="text-sm text-muted-foreground mb-3 overflow-hidden text-ellipsis" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.5em'
          }}>
            {survey.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {survey.responses_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Cavab</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">
              {responseRate}%
            </div>
            <div className="text-xs text-muted-foreground">Cavab dərəcəsi</div>
            <Progress value={responseRate} className="mt-1 h-1" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">
              {survey.questions?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Sual</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {survey.target_institutions?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Hədəf müəssisə</div>
          </div>
        </div>

        {survey.start_date && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Başlama: {new Date(survey.start_date).toLocaleDateString('az-AZ')}</span>
            {survey.end_date && (
              <span>Bitmə: {new Date(survey.end_date).toLocaleDateString('az-AZ')}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 ml-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/survey-response/${survey.id}`)}
        >
          <Eye className="h-3 w-3 mr-1" />
          Ətraflı
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onExport}
          disabled={isExporting || !survey.responses_count}
        >
          <Download className="h-3 w-3 mr-1" />
          {isExporting ? 'Yüklənir...' : 'Yüklə'}
        </Button>
      </div>
    </div>
  );
}