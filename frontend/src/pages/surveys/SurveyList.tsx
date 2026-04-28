import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, ClipboardList, Calendar, TrendingUp, Eye, Edit, Trash2, Play, Pause, BarChart3, AlertTriangle, Archive, MoreHorizontal, Layout, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService, Survey, CreateSurveyData } from "@/services/surveys";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SurveyModal } from "@/components/modals/SurveyModal";
import { SurveyViewModal } from "@/components/modals/SurveyViewModal";
import { SurveyTemplateGallery } from "@/components/surveys/SurveyTemplateGallery";
import { SurveyDelegationModal } from "@/components/surveys/SurveyDelegationModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { getSurveyDeadlineInfo, type SurveyDeadlineInfo, type DeadlineBadgeVariant } from "@/utils/surveyHelpers";
import { SurveyAccessRestricted } from "@/components/surveys/SurveyAccessRestricted";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function Surveys() {
  const { currentUser } = useAuth();
  const surveyAccess = useModuleAccess('surveys');
  const { confirm, dialogProps: confirmDialogProps } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'completed' | 'archived'>('all');
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [viewingSurvey, setViewingSurvey] = useState<Survey | null>(null);
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check if user is authorized
  const canViewSurveys = surveyAccess.canView;
  const canCreateSurveys = surveyAccess.canCreate;

  // ALL HOOKS MOVED BEFORE SECURITY CHECK
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys', statusFilter, currentUser?.role, currentUser?.institution?.id],
    enabled: canViewSurveys,
    queryFn: () => surveyService.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      per_page: 20
    }),
  });

  const surveyList: Survey[] = surveys?.data?.data ?? [];
  const surveyStats = {
    total: surveys?.data?.total || 0,
    active: surveyList.filter((s) => s.status === 'active').length,
    thisMonth: surveyList.filter((s) =>
      new Date(s.created_at).getMonth() === new Date().getMonth()
    ).length,
    totalResponses: surveyList.reduce((sum, s) => sum + (s.response_count || 0), 0),
  };

  // Create survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: (data: CreateSurveyData) => surveyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      setShowSurveyModal(false);
      setSelectedSurvey(null);
    },
  });

  // Update survey mutation
  const updateSurveyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSurveyData> }) => 
      surveyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      setShowSurveyModal(false);
      setSelectedSurvey(null);
    },
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: (id: number) => surveyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      queryClient.invalidateQueries({ queryKey: ['survey-responses-approval'] });
      toast({
        title: "Uğurlu",
        description: "Sorğu silindi",
      });
    },
  });

  // Create template from survey mutation
  const createTemplateMutation = useMutation({
    mutationFn: (surveyId: number) => apiClient.post(`/survey-templates/create-from-survey`, {
      survey_id: surveyId
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['survey-templates'] });
      queryClient.invalidateQueries({ queryKey: ['survey-template-stats'] });
      toast({
        title: "Uğurlu!",
        description: `"${response.data?.template?.title || 'Template'}" template kimi yaradıldı`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Template yaradarkən xəta baş verdi",
        variant: "destructive",
      });
    },
  });

  // Publish survey mutation
  const publishSurveyMutation = useMutation({
    mutationFn: (id: number) => surveyService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      toast({
        title: "Uğurlu",
        description: "Sorğu yayımlandı",
      });
    },
  });

  // Pause survey mutation
  const pauseSurveyMutation = useMutation({
    mutationFn: (id: number) => surveyService.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      queryClient.invalidateQueries({ queryKey: ['survey-responses-approval'] });
      toast({
        title: "Uğurlu",
        description: "Sorğu dayandırıldı",
      });
    },
  });

  // Archive mutation - MOVED FROM BELOW TO TOP WITH OTHER HOOKS
  const archiveSurveyMutation = useMutation({
    mutationFn: (id: number) => surveyService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      queryClient.invalidateQueries({ queryKey: ['survey-responses-approval'] });
      toast({
        title: "Uğurlu",
        description: "Sorğu arxivə göndərildi",
      });
    },
  });

  const handleOpenCreateModal = useCallback(() => {
    if (!canCreateSurveys) {
      toast({
        title: "İcazə yoxdur",
        description: "Sorğu yaratmaq səlahiyyətiniz yoxdur.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSurvey(null);
    setShowSurveyModal(true);
  }, [canCreateSurveys, toast]);
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string }> = {
      'draft': { variant: 'secondary', label: 'Layihə' },
      'active': { variant: 'default', label: 'Aktiv' },
      'paused': { variant: 'outline', label: 'Dayandırıldı' },
      'completed': { variant: 'success', label: 'Tamamlandı' },
      'archived': { variant: 'destructive', label: 'Arxivləndi' }
    };
    
    const config = variants[status] || { variant: 'secondary', label: status };
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveSurvey = async (data: CreateSurveyData) => {
    try {
      if (selectedSurvey) {
        await updateSurveyMutation.mutateAsync({ id: selectedSurvey.id, data });
      } else {
        await createSurveyMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Survey save error:', error);
      throw error;
    }
  };

  // Check if survey can be edited (not published with responses)
  const canEditSurvey = (survey: Survey) => {
    // Draft surveys can always be edited
    if (survey.status === 'draft') return true;
    
    // Active surveys can be edited
    if (survey.status === 'active') return true;
    
    // Published surveys can only be edited if they have no responses
    if (survey.status === 'published') {
      return (survey.response_count || 0) === 0;
    }
    
    return false;
  };

  const handleEditSurvey = async (survey: Survey) => {
    // Check if survey can be edited
    if (!canEditSurvey(survey)) {
      toast({
        title: "Düzəliş mümkün deyil",
        description: "Yayımlanmış və cavabları olan sorğuları dəyişdirmək olmaz. Məlumat tamlığını qorumaq üçün bu məhdudiyyət var.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fullSurvey = await surveyService.getById(survey.id);
      setSelectedSurvey(fullSurvey);
      setShowSurveyModal(true);
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Sorğu məlumatları yüklənə bilmədi",
        variant: "destructive",
      });
    }
  };

  const handleViewSurvey = async (survey: Survey) => {
    try {
      // Fetch detailed survey data with questions
      const detailedSurvey = await surveyService.getById(survey.id);
      setViewingSurvey(detailedSurvey);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch survey details:', error);
      toast({
        variant: "destructive",
        title: "Xəta",
        description: "Sorğu məlumatları yüklənərkən xəta baş verdi"
      });
    }
  };

  const handleDeleteSurvey = async (id: number, forceDelete = false) => {
    const ok = await confirm({
      title: forceDelete ? 'Sorğunu tamamilə sil' : 'Sorğunu arxivə göndər',
      description: forceDelete
        ? 'Bu sorğu və bütün məlumatları tamamilə silinəcək. Bu əməliyyat geri qaytarıla bilməz!'
        : 'Bu sorğu arxivə göndəriləcək. Gələcəkdə bərpa edə bilərsiniz.',
      confirmLabel: forceDelete ? 'Tamamilə sil' : 'Arxivə göndər',
      variant: forceDelete ? 'destructive' : 'default',
    });
    if (!ok) return;

    try {
      if (forceDelete) {
        await apiClient.delete(`/surveys/${id}?force=true`);
        toast({ title: 'Uğurlu', description: 'Sorğu tamamilə silindi' });
      } else {
        await archiveSurveyMutation.mutateAsync(id);
      }
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    } catch {
      toast({
        title: 'Xəta',
        description: `Sorğu ${forceDelete ? 'silinərkən' : 'arxivə göndərilərkən'} xəta baş verdi`,
        variant: 'destructive',
      });
    }
  };


  const handlePublishSurvey = async (id: number) => {
    try {
      await publishSurveyMutation.mutateAsync(id);
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Sorğu yayımlanarkən xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  const handlePauseSurvey = async (id: number) => {
    try {
      await pauseSurveyMutation.mutateAsync(id);
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Sorğu dayandırılarkən xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  const handleCreateTemplate = async (survey: Survey) => {
    if (window.confirm(`"${survey.title}" sorğusundan template yaratmaq istəyirsiniz?`)) {
      try {
        await createTemplateMutation.mutateAsync(survey.id);
      } catch (error) {
        // Error handling done by mutation
      }
    }
  };

  if (!canViewSurveys) {
    return <SurveyAccessRestricted />;
  }

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sorğular</h1>
            <p className="text-muted-foreground">Sorğuların yaradılması və idarə edilməsi</p>
          </div>
                {canCreateSurveys && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowTemplateGallery(true)}
              >
                <Layout className="h-4 w-4" />
                Template-lər
              </Button>
              <Button 
                className="flex items-center gap-2"
                onClick={handleOpenCreateModal}
              >
                <Plus className="h-4 w-4" />
                Yeni Sorğu
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Sorğular yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 justify-end">
        {canCreateSurveys && (
          <>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowTemplateGallery(true)}
            >
              <Layout className="h-4 w-4" />
              Template-lər
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={handleOpenCreateModal}
            >
              <Plus className="h-4 w-4" />
              Yeni Sorğu
            </Button>
          </>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'draft', 'active', 'completed', 'archived'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status as any)}
          >
            {status === 'all' ? 'Hamısı' : 
             status === 'draft' ? 'Layihə' :
             status === 'active' ? 'Aktiv' :
             status === 'completed' ? 'Tamamlandı' :
             status === 'archived' ? 'Arxivləndi' : status}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv Sorğular</p>
                <p className="text-2xl font-bold">{surveyStats?.active || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu ay yaradılan</p>
                <p className="text-2xl font-bold">{surveyStats?.thisMonth || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi sorğular</p>
                <p className="text-2xl font-bold">{surveyStats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi cavablar</p>
                <p className="text-2xl font-bold">{surveyStats?.totalResponses || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survey List */}
      <Card>
        <CardHeader>
          <CardTitle>Sorğular</CardTitle>
          <CardDescription>Bütün sorğuların siyahısı</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {surveyList.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Hələlik sorğu yoxdur</p>
                {canCreateSurveys && (
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={handleOpenCreateModal}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk sorğunu yarat
                  </Button>
                )}
              </div>
            ) : (
              surveyList.map((survey: Survey) => {
                const deadlineInfo = getSurveyDeadlineInfo(survey);
                const deadlineBadgeParts: string[] = [];
                if (deadlineInfo?.statusBadge) {
                  deadlineBadgeParts.push(deadlineInfo.statusBadge);
                }
                if (deadlineInfo?.relativeText) {
                  deadlineBadgeParts.push(deadlineInfo.relativeText);
                }
                const deadlineBadgeText = deadlineBadgeParts.join(' • ');

                const isSurveyOwner = survey.creator?.id === currentUser?.id;
                const showManagementActions =
                  currentUser?.role === 'superadmin' ||
                  isSurveyOwner ||
                  (['regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser?.role || ''));
                const canAccessDeletionMenu = surveyAccess.canDelete || isSurveyOwner;

                return (
                  <div
                    key={survey.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg hover:bg-surface/50 transition-colors gap-4 ${
                      deadlineInfo?.isExpired ? 'border-destructive/50 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">{survey.title}</h3>
                        {getStatusBadge(survey.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {survey.description && survey.description.length > 100 
                          ? `${survey.description.substring(0, 100)}...` 
                          : survey.description || 'Təsvir yoxdur'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>{survey.response_count || 0} cavab</span>
                        <span>{survey.questions_count || survey.questions?.length || 0} sual</span>
                        <span>Yaradıldı: {formatDate(survey.created_at)}</span>
                        {survey.creator && <span>Yaradan: {survey.creator.full_name || survey.creator.username}</span>}
                        {deadlineInfo && (
                          <span
                            className={`flex items-center gap-1 ${deadlineInfo.isExpired ? 'text-destructive font-semibold' : ''}`}
                          >
                            <Calendar className="h-3 w-3" />
                            Bitmə: {deadlineInfo.dueDateLabel}
                          </span>
                        )}
                      </div>
                      {deadlineInfo && deadlineBadgeText && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant={deadlineInfo.badgeVariant ?? 'outline'}
                            className={`flex items-center gap-1 ${
                              deadlineInfo.isExpired ? 'text-destructive' : ''
                            }`}
                          >
                            {deadlineInfo.isExpired && <AlertTriangle className="h-3 w-3" />}
                            <span>{deadlineBadgeText}</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewSurvey(survey)}
                        title="Sorğunu göstər"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate('/survey-results')}
                        title="Nəticələr"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      {showManagementActions && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditSurvey(survey)}
                            disabled={!canEditSurvey(survey)}
                            title={
                              canEditSurvey(survey) 
                                ? "Sorğunu düzəliş et" 
                                : "Yayımlanmış və cavabları olan sorğuları düzəliş etmək olmaz"
                            }
                          >
                            <Edit className={`h-4 w-4 ${!canEditSurvey(survey) ? 'text-muted-foreground' : ''}`} />
                          </Button>
                          {survey.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePublishSurvey(survey.id)}
                              disabled={publishSurveyMutation.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {survey.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePauseSurvey(survey.id)}
                              disabled={pauseSurveyMutation.isPending}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {canAccessDeletionMenu && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCreateTemplate(survey)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Template kimi saxla
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteSurvey(survey.id, false)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arxivə göndər
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSurvey(survey.id, true)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Tam sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {surveyList.length > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="text-sm text-muted-foreground">
                {surveyList.length} / {surveys?.data?.total ?? surveyList.length} sorğu göstərilir
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Modal */}
      <SurveyModal
        open={showSurveyModal}
        onClose={() => {
          setShowSurveyModal(false);
          setSelectedSurvey(null);
        }}
        survey={selectedSurvey}
        onSave={handleSaveSurvey}
      />

      {/* Survey View Modal */}
      <SurveyViewModal
        open={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingSurvey(null);
        }}
        survey={viewingSurvey}
      />

      {/* Survey Template Gallery Modal */}
      <SurveyTemplateGallery
        open={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onUseTemplate={(template) => {
          // Create new survey from template
          setSelectedSurvey({
            id: 0,
            title: template.name,
            description: template.description,
            questions: template.questions || [],
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            response_count: 0,
            questions_count: template.questions?.length || 0
          } as Survey);
          setShowTemplateGallery(false);
          setShowSurveyModal(true);
        }}
      />

      {/* Survey Delegation Modal */}
      <SurveyDelegationModal
        open={showDelegationModal}
        onClose={() => {
          setShowDelegationModal(false);
          setSelectedApprovalRequest(null);
        }}
        approvalRequest={selectedApprovalRequest}
        onDelegate={() => {
          setShowDelegationModal(false);
          setSelectedApprovalRequest(null);
          queryClient.invalidateQueries({ queryKey: ['surveys'] });
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

