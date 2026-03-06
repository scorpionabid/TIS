import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Download,
  TrendingUp,
  Search,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { surveyService, Survey } from '../../../services/surveys';
import { useToast } from '../../../hooks/use-toast';
import SurveyResultCard from './SurveyResultCard';

const SurveyResultsTab: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const { data: surveysData, isLoading: surveysLoading, error: surveysError } = useQuery({
    queryKey: ['surveys', { status: statusFilter, search: searchTerm }],
    queryFn: () => surveyService.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter as Survey['status'],
      search: searchTerm || undefined,
      per_page: 50
    }),
    enabled: true,
  });

  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['survey-analytics-overview'],
    queryFn: () => surveyService.getAnalyticsOverview(),
    enabled: true,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const surveysArray = surveysData?.data?.data || surveysData?.data || [];
  const statsData = analyticsData || {
    overview: {
      total_surveys: Array.isArray(surveysArray) ? surveysArray.length : 0,
      active_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'published').length : 0,
      draft_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'draft').length : 0,
    },
    response_stats: {
      total_responses: Array.isArray(surveysArray) ? surveysArray.reduce((sum: number, s: Survey) => sum + (s.response_count || 0), 0) : 0,
      average_response_rate: 76,
    }
  };

  const statsLoading = analyticsLoading;

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
      toast({ title: "Uğurlu", description: "Nəticələr uğurla yükləndi" });
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.message || 'Yükləmə zamanı xəta baş verdi',
        variant: "destructive"
      });
    }
  });

  const handleExportAll = async () => {
    if (!Array.isArray(surveysArray) || surveysArray.length === 0) {
      toast({ title: "Xəta", description: "Export ediləcək sorğu tapılmadı", variant: "destructive" });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      for (const survey of surveysArray) {
        try {
          await exportMutation.mutateAsync(survey.id);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          errorCount++;
        }
      }
      toast({
        title: "Tamamlandı",
        description: `${successCount} sorğu uğurla export edildi${errorCount > 0 ? `, ${errorCount} sorğuda xəta` : ''}`
      });
    } catch (error) {
      toast({ title: "Xəta", description: "Bulk export zamanı xəta", variant: "destructive" });
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
          <h1 className="text-3xl font-bold">Sorğu Nəticələri</h1>
          <p className="text-muted-foreground">Toplanmış nəticələrin təhlili və hesabatlar</p>
        </div>
        <Button
          onClick={handleExportAll}
          disabled={exportMutation.isPending || !Array.isArray(surveysArray) || surveysArray.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? 'Yüklənir...' : 'Bütün Nəticələri Yüklə'}
        </Button>
      </div>

      {(surveysError || analyticsError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Məlumatlar yüklənərkən xəta. Səhifəni yeniləyin.
          </AlertDescription>
        </Alert>
      )}

      {/* Minimalist Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Ümumi</p>
          </div>
          <p className="text-2xl font-semibold">
            {statsLoading ? '...' : statsData?.overview?.total_surveys || 0}
          </p>
        </div>

        <div className="p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Aktiv</p>
          </div>
          <p className="text-2xl font-semibold text-green-600">
            {statsLoading ? '...' : statsData?.overview?.active_surveys || 0}
          </p>
        </div>

        <div className="p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Cavablar</p>
          </div>
          <p className="text-2xl font-semibold text-blue-600">
            {statsLoading ? '...' : (statsData?.response_stats?.total_responses || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Dərəcə</p>
          </div>
          <p className="text-2xl font-semibold text-emerald-600">
            {statsLoading ? '...' : `${statsData?.response_stats?.average_response_rate || 0}%`}
          </p>
        </div>

        <div className="p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">Qaralama</p>
          </div>
          <p className="text-2xl font-semibold text-orange-600">
            {statsLoading ? '...' : statsData?.overview?.draft_surveys || 0}
          </p>
        </div>
      </div>

      {/* Minimalist Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Sorğu adı ilə axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hamısı</SelectItem>
            <SelectItem value="published">Aktiv</SelectItem>
            <SelectItem value="paused">Dayandırılıb</SelectItem>
            <SelectItem value="archived">Arxiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Survey List */}
      <div className="space-y-3">
        {surveysLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Yüklənir...</span>
          </div>
        ) : !Array.isArray(surveysArray) || surveysArray.length === 0 ? (
          <div className="p-8 text-center bg-muted/30 rounded-lg border border-dashed">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'Axtarış şərtlərinə uyğun sorğu tapılmadı.'
                : 'Hələ heç bir sorğu yaradılmayıb.'}
            </p>
          </div>
        ) : (
          <>
            {surveysArray.map((survey: Survey) => (
              <SurveyResultCard
                key={survey.id}
                survey={survey}
                onExport={() => exportMutation.mutate(survey.id)}
                isExporting={exportMutation.isPending}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                navigate={navigate}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(SurveyResultsTab);
