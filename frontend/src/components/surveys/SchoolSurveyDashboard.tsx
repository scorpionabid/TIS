import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardList, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Edit,
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react';
import { schoolAdminService, schoolAdminKeys, SchoolSurvey, SchoolSurveyFilters } from '@/services/schoolAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SchoolSurveyDashboardProps {
  className?: string;
}

export const SchoolSurveyDashboard: React.FC<SchoolSurveyDashboardProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SchoolSurveyFilters>({
    page: 1,
    per_page: 20,
  });
  const [selectedTab, setSelectedTab] = useState('all');

  // Fetch school surveys
  const { 
    data: surveys, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.surveys(),
    queryFn: () => schoolAdminService.getSchoolSurveys(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Survey response start mutation
  const startResponseMutation = useMutation({
    mutationFn: (surveyId: number) => schoolAdminService.startSurveyResponse(surveyId),
    onSuccess: (response) => {
      toast.success('Sorğu cavablandırılması başladı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.surveys() });
      // Navigate to response form
      window.location.href = `/surveys/response/${response.id}`;
    },
    onError: () => {
      toast.error('Sorğu başlatıla bilmədi');
    },
  });

  const getStatusIcon = (status: SchoolSurvey['response_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SchoolSurvey['response_status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning'; 
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: SchoolSurvey['response_status']) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'Davam edir';
      case 'overdue': return 'Gecikmiş';
      case 'not_started': return 'Başlanmayıb';
      default: return 'Naməlum';
    }
  };

  const getPriorityFromDueDate = (dueDate?: string) => {
    if (!dueDate) return 'low';
    const now = new Date();
    const due = new Date(dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 3) return 'high';
    if (daysLeft <= 7) return 'medium';
    return 'low';
  };

  const handleStartResponse = (survey: SchoolSurvey) => {
    if (survey.response_status === 'in_progress' && survey.response_id) {
      // Continue existing response
      window.location.href = `/surveys/response/${survey.response_id}`;
    } else if (survey.response_status === 'not_started') {
      // Start new response
      startResponseMutation.mutate(survey.id);
    }
  };

  const handleViewResponse = (survey: SchoolSurvey) => {
    if (survey.response_id) {
      window.location.href = `/surveys/response/${survey.response_id}/view`;
    }
  };

  const filteredSurveys = surveys?.filter(survey => {
    const matchesSearch = !searchTerm || 
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || survey.response_status === selectedTab;
    
    return matchesSearch && matchesTab;
  }) || [];

  const surveyStats = {
    total: surveys?.length || 0,
    completed: surveys?.filter(s => s.response_status === 'completed').length || 0,
    in_progress: surveys?.filter(s => s.response_status === 'in_progress').length || 0,
    pending: surveys?.filter(s => s.response_status === 'not_started').length || 0,
    overdue: surveys?.filter(s => s.response_status === 'overdue').length || 0,
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sorğular yüklənərkən xəta baş verdi</h3>
              <p className="text-muted-foreground mb-4">
                Zəhmət olmasa yenidən cəhd edin
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sorğu İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəbə təyin edilmiş sorğuları cavablandırın və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac Et
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{surveyStats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən</p>
                <p className="text-2xl font-bold text-orange-600">{surveyStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Davam edir</p>
                <p className="text-2xl font-bold text-blue-600">{surveyStats.in_progress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlandı</p>
                <p className="text-2xl font-bold text-green-600">{surveyStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gecikmiş</p>
                <p className="text-2xl font-bold text-red-600">{surveyStats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sorğu adı və ya açıqlama ilə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.status || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="not_started">Başlanmayıb</SelectItem>
                  <SelectItem value="in_progress">Davam edir</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.priority || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Prioritet seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün prioritetlər</SelectItem>
                  <SelectItem value="high">Yüksək</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Aşağı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Hamısı ({surveyStats.total})
          </TabsTrigger>
          <TabsTrigger value="not_started">
            Gözləyən ({surveyStats.pending})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            Davam edir ({surveyStats.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlandı ({surveyStats.completed})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Gecikmiş ({surveyStats.overdue})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 animate-pulse">
                      <div className="w-12 h-12 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="w-3/4 h-5 bg-muted rounded" />
                        <div className="w-full h-4 bg-muted rounded" />
                        <div className="w-1/2 h-3 bg-muted rounded" />
                      </div>
                      <div className="w-24 h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSurveys.length > 0 ? (
            filteredSurveys.map((survey) => {
              const priority = getPriorityFromDueDate(survey.due_date);
              return (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Survey Icon */}
                      <div className={cn(
                        "p-3 rounded-lg",
                        survey.response_status === 'completed' ? "bg-green-100" :
                        survey.response_status === 'in_progress' ? "bg-blue-100" :
                        survey.response_status === 'overdue' ? "bg-red-100" : "bg-gray-100"
                      )}>
                        <ClipboardList className={cn(
                          "h-6 w-6",
                          survey.response_status === 'completed' ? "text-green-600" :
                          survey.response_status === 'in_progress' ? "text-blue-600" :
                          survey.response_status === 'overdue' ? "text-red-600" : "text-gray-600"
                        )} />
                      </div>

                      {/* Survey Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {survey.title}
                            </h3>
                            {survey.description && (
                              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                                {survey.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {getStatusIcon(survey.response_status)}
                            <Badge variant={getStatusColor(survey.response_status)}>
                              {getStatusText(survey.response_status)}
                            </Badge>
                          </div>
                        </div>

                        {/* Survey Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                          {survey.assigned_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Təyin tarixi: {format(new Date(survey.assigned_at), 'dd MMM yyyy', { locale: az })}</span>
                            </div>
                          )}
                          
                          {survey.due_date && (
                            <div className={cn(
                              "flex items-center gap-1",
                              priority === 'overdue' && "text-red-600",
                              priority === 'high' && "text-orange-600"
                            )}>
                              <Clock className="h-4 w-4" />
                              <span>Son tarix: {format(new Date(survey.due_date), 'dd MMM yyyy', { locale: az })}</span>
                              {priority === 'overdue' && (
                                <Badge variant="destructive" className="ml-1">Gecikmiş</Badge>
                              )}
                              {priority === 'high' && (
                                <Badge variant="warning" className="ml-1">Təcili</Badge>
                              )}
                            </div>
                          )}

                          {survey.questions && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{survey.questions.length} sual</span>
                            </div>
                          )}

                          {survey.completion_percentage !== undefined && survey.response_status === 'in_progress' && (
                            <div className="flex items-center gap-1">
                              <BarChart3 className="h-4 w-4" />
                              <span>{survey.completion_percentage}% tamamlandı</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar for In Progress */}
                        {survey.response_status === 'in_progress' && survey.completion_percentage !== undefined && (
                          <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${survey.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {survey.response_status === 'not_started' && (
                            <Button 
                              onClick={() => handleStartResponse(survey)}
                              disabled={startResponseMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <Play className="h-4 w-4" />
                              Cavablandırmaya başla
                            </Button>
                          )}
                          
                          {survey.response_status === 'in_progress' && (
                            <Button 
                              onClick={() => handleStartResponse(survey)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Davam et
                            </Button>
                          )}
                          
                          {survey.response_status === 'completed' && (
                            <Button 
                              onClick={() => handleViewResponse(survey)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Cavabı görüntülə
                            </Button>
                          )}
                          
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ətraflı
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sorğu tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun sorğu tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki sizə təyin edilmiş sorğu yoxdur' :
                        `${getStatusText(selectedTab as any)} statusunda sorğu yoxdur`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};