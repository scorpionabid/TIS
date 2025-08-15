import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Archive, Calendar, Download, Eye, RotateCcw, Trash2, FileText, Users, Clock, BarChart3, Loader2, Filter, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveService, ArchiveFilters, ArchivedSurvey } from "@/services/archive";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

export default function SurveyArchive() {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSurvey, setSelectedSurvey] = useState<ArchivedSurvey | null>(null);
  const [restoreReason, setRestoreReason] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build filters
  const filters: ArchiveFilters = useMemo(() => {
    const f: ArchiveFilters = {};
    if (selectedYear !== 'all') f.year = parseInt(selectedYear);
    if (selectedCategory !== 'all') f.category = selectedCategory;
    if (selectedStatus !== 'all') f.status = selectedStatus;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    f.sort_by = 'archived_at';
    f.sort_order = 'desc';
    return f;
  }, [selectedYear, selectedCategory, selectedStatus, searchQuery]);

  // Load archived surveys
  const { data: surveysResponse, isLoading: surveysLoading, error } = useQuery({
    queryKey: ['archived-surveys', filters],
    queryFn: () => archiveService.getArchivedSurveys(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load archive statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['archive-statistics'],
    queryFn: () => archiveService.getArchiveStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Use real data or fallback to mock data
  const surveys = surveysResponse?.data || archiveService.getMockArchivedSurveys();
  const stats = statsResponse?.data || archiveService.getMockStatistics();

  // Mutations
  const restoreMutation = useMutation({
    mutationFn: (data: { id: number; restore_type: 'full' | 'template_only' }) => 
      archiveService.restoreSurvey(data.id, {
        survey_id: data.id,
        restore_type: data.restore_type,
        preserve_responses: data.restore_type === 'full',
        preserve_metadata: true
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['archive-statistics'] });
      setSelectedSurvey(null);
      setRestoreReason('');
      toast({
        title: "Uğurlu",
        description: "Sorğu uğurla bərpa edildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sorğu bərpa edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: (data: { survey_ids: number[]; format: 'pdf' | 'excel' | 'csv' }) => 
      archiveService.exportArchive({
        survey_ids: data.survey_ids,
        format: data.format,
        include_responses: true,
        include_analytics: true,
        include_metadata: true
      }),
    onSuccess: (response) => {
      if (response.data.download_url) {
        window.open(response.data.download_url, '_blank');
        toast({
          title: "Export uğurlu",
          description: "Arxiv faylı yükləndi.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Export xətası",
        description: "Arxiv export edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  // Get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'teacher': return 'Müəllim';
      case 'student': return 'Şagird';
      case 'parent': return 'Valideyn';
      case 'staff': return 'İşçi heyəti';
      case 'general': return 'Ümumi';
      default: return category;
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'archived': return 'secondary';
      case 'completed': return 'default';
      case 'expired': return 'outline';
      default: return 'outline';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'archived': return 'Arxivləndi';
      case 'completed': return 'Tamamlandı';
      case 'expired': return 'Müddəti keçdi';
      default: return status;
    }
  };

  const handleExport = (survey: ArchivedSurvey, format: 'pdf' | 'excel' | 'csv') => {
    exportMutation.mutate({ survey_ids: [survey.id], format });
  };

  const handleRestore = (restoreType: 'full' | 'template_only') => {
    if (!selectedSurvey) return;
    restoreMutation.mutate({ id: selectedSurvey.id, restore_type: restoreType });
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Arxiv məlumatları yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğu Arxivi</h1>
          <p className="text-muted-foreground">Keçmiş sorğuların arxivi və məlumat bazısı</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Axtarısh və Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Arxivdə axtarın..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="İl" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün illər</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kateqoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                <SelectItem value="teacher">Müəllim sorğuları</SelectItem>
                <SelectItem value="student">Şagird sorğuları</SelectItem>
                <SelectItem value="parent">Valideyn sorğuları</SelectItem>
                <SelectItem value="staff">Heyət sorğuları</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="archived">Arxivlənmiş</SelectItem>
                <SelectItem value="completed">Tamamlanmış</SelectItem>
                <SelectItem value="expired">Müddəti keçmiş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Arxivdə ümumi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_archived
                  )}
                </p>
              </div>
              <Archive className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {stats.by_year.slice(0, 3).map((yearData) => (
          <Card key={yearData.year}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{yearData.year}-cü il</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      yearData.count
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {yearData.total_responses.toLocaleString()} cavab
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Archive List */}
      <Card>
        <CardHeader>
          <CardTitle>Arxiv Siyahısı</CardTitle>
          <CardDescription>
            {surveys.length} arxivlənmiş sorğu tapıldı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Arxiv yüklənir...</span>
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Seçilmiş kriteriiyalara uyğun arxiv tapılmadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey: ArchivedSurvey) => (
                <div key={survey.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">{survey.title}</h3>
                        <Badge variant="outline">
                          {new Date(survey.archived_at).getFullYear()}
                        </Badge>
                        <Badge variant="secondary">
                          {getCategoryLabel(survey.category)}
                        </Badge>
                        <Badge variant={getStatusVariant(survey.status)}>
                          {getStatusLabel(survey.status)}
                        </Badge>
                        {survey.tags && survey.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground">
                              {survey.tags.slice(0, 2).join(', ')}
                              {survey.tags.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {survey.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Arxivləndi:</strong> {format(new Date(survey.archived_at), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Cavablar:</strong> {survey.total_responses.toLocaleString()} / {survey.target_responses.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Cavab nisbəti:</strong> {survey.response_rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Orta vaxt:</strong> {survey.average_completion_time} dəq
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <div className="flex items-center gap-4">
                          <span><strong>Yaradıcı:</strong> {survey.creator.first_name} {survey.creator.last_name}</span>
                          <span><strong>Müəssisələr:</strong> {survey.institutions_count}</span>
                          <span><strong>Suallar:</strong> {survey.questions_count}</span>
                          <span><strong>Tamamlama nisbəti:</strong> {survey.completion_rate}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Ətraflı bax"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedSurvey(survey)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Yüklə
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sorğunu yüklə</DialogTitle>
                            <DialogDescription>
                              Hansı formatda yükləmək istəyirsiniz?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => handleExport(survey, 'pdf')}
                              disabled={exportMutation.isPending}
                            >
                              {exportMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              PDF
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => handleExport(survey, 'excel')}
                              disabled={exportMutation.isPending}
                            >
                              Excel
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => handleExport(survey, 'csv')}
                              disabled={exportMutation.isPending}
                            >
                              CSV
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setSelectedSurvey(survey)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Bərpa et
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sorğunu bərpa et</DialogTitle>
                            <DialogDescription>
                              Sorğu necə bərpa etmək istəyirsiniz?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Bərpa səbəbi</label>
                              <Textarea 
                                value={restoreReason}
                                onChange={(e) => setRestoreReason(e.target.value)}
                                placeholder="Sorğunun nə üçün bərpa edildiyini qeyd edin..."
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setSelectedSurvey(null);
                              setRestoreReason('');
                            }}>
                              Ləğv et
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleRestore('template_only')}
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <RotateCcw className="h-4 w-4 mr-2" />
                              )}
                              Yalnız Şablon
                            </Button>
                            <Button 
                              onClick={() => handleRestore('full')}
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <RotateCcw className="h-4 w-4 mr-2" />
                              )}
                              Tam Bərpa
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}