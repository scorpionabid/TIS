import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ClipboardList, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSurveyListActions } from '@/hooks/useSurveyListActions';
import { SurveyStatsCards } from '@/components/surveys/management/SurveyStatsCards';
import { SurveyStatusFilter, StatusFilterValue } from '@/components/surveys/management/SurveyStatusFilter';
import { SurveyListRow } from '@/components/surveys/management/SurveyListRow';
import { SurveyModal } from '@/components/modals/SurveyModal';
import { SurveyViewModal } from '@/components/modals/SurveyViewModal';
import { SurveyTemplateGallery } from '@/components/surveys/SurveyTemplateGallery';
import { SurveyAccessRestricted } from '@/components/surveys/SurveyAccessRestricted';
import { surveyService, Survey, CreateSurveyData } from '@/services/surveys';

export default function SurveyList() {
  const { currentUser } = useAuth();
  const surveyAccess = useModuleAccess('surveys');
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [showSurveyModal,    setShowSurveyModal]    = useState(false);
  const [showViewModal,      setShowViewModal]       = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [selectedSurvey,    setSelectedSurvey]     = useState<Survey | null>(null);
  const [viewingSurvey,     setViewingSurvey]      = useState<Survey | null>(null);

  const canViewSurveys   = surveyAccess.canView;
  const canCreateSurveys = surveyAccess.canCreate;

  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys', statusFilter, currentUser?.role, currentUser?.institution?.id],
    enabled: canViewSurveys,
    queryFn: () => surveyService.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      per_page: 20,
    }),
  });

  const surveyList: Survey[] = surveys?.data?.data ?? [];
  const stats = {
    total:          surveys?.data?.total ?? 0,
    active:         surveyList.filter((s) => s.status === 'active').length,
    thisMonth:      surveyList.filter((s) => new Date(s.created_at).getMonth() === new Date().getMonth()).length,
    totalResponses: surveyList.reduce((sum, s) => sum + (s.response_count ?? 0), 0),
  };

  const {
    publishMutation,
    pauseMutation,
    handleSaveSurvey,
    handleDeleteSurvey,
    handleCreateTemplate,
  } = useSurveyListActions(confirm);

  const handleOpenCreate = useCallback(() => {
    if (!canCreateSurveys) {
      toast({ title: 'İcazə yoxdur', description: 'Sorğu yaratmaq səlahiyyətiniz yoxdur.', variant: 'destructive' });
      return;
    }
    setSelectedSurvey(null);
    setShowSurveyModal(true);
  }, [canCreateSurveys, toast]);

  const handleEdit = async (survey: Survey) => {
    const isEditable =
      survey.status === 'draft' ||
      survey.status === 'active' ||
      (survey.status === 'published' && (survey.response_count ?? 0) === 0);

    if (!isEditable) {
      toast({
        title: 'Düzəliş mümkün deyil',
        description: 'Yayımlanmış və cavabları olan sorğuları dəyişdirmək olmaz.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const full = await surveyService.getById(survey.id);
      setSelectedSurvey(full);
      setShowSurveyModal(true);
    } catch {
      toast({ title: 'Xəta', description: 'Sorğu məlumatları yüklənə bilmədi', variant: 'destructive' });
    }
  };

  const handleView = async (survey: Survey) => {
    try {
      const detailed = await surveyService.getById(survey.id);
      setViewingSurvey(detailed);
      setShowViewModal(true);
    } catch {
      toast({ title: 'Xəta', description: 'Sorğu məlumatları yüklənərkən xəta baş verdi', variant: 'destructive' });
    }
  };

  const handleModalSave = async (data: CreateSurveyData) => {
    await handleSaveSurvey(data, selectedSurvey);
    setShowSurveyModal(false);
    setSelectedSurvey(null);
  };

  if (!canViewSurveys) return <SurveyAccessRestricted />;

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="flex justify-end gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4 text-center">
        <p className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</p>
        <p className="text-muted-foreground">Sorğular yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Əməliyyat düymələri */}
      {canCreateSurveys && (
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowTemplateGallery(true)}>
            <Layout className="h-4 w-4" />
            Template-lər
          </Button>
          <Button className="flex items-center gap-2" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Yeni Sorğu
          </Button>
        </div>
      )}

      {/* Statistika kartları */}
      <SurveyStatsCards stats={stats} />

      {/* Status filteri */}
      <SurveyStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {/* Siyahı */}
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
                  <Button className="mt-4" variant="outline" onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk sorğunu yarat
                  </Button>
                )}
              </div>
            ) : (
              surveyList.map((survey) => (
                <SurveyListRow
                  key={survey.id}
                  survey={survey}
                  currentUserId={currentUser?.id}
                  currentUserRole={currentUser?.role}
                  canCreate={canCreateSurveys}
                  canDelete={surveyAccess.canDelete}
                  isPublishing={publishMutation.isPending}
                  isPausing={pauseMutation.isPending}
                  onView={handleView}
                  onEdit={handleEdit}
                  onPublish={(id) => publishMutation.mutate(id)}
                  onPause={(id) => pauseMutation.mutate(id)}
                  onDelete={handleDeleteSurvey}
                  onCreateTemplate={handleCreateTemplate}
                />
              ))
            )}
          </div>

          {surveyList.length > 0 && (
            <div className="mt-4 flex justify-center">
              <p className="text-sm text-muted-foreground">
                {surveyList.length} / {surveys?.data?.total ?? surveyList.length} sorğu göstərilir
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modallar */}
      <SurveyModal
        open={showSurveyModal}
        onClose={() => { setShowSurveyModal(false); setSelectedSurvey(null); }}
        survey={selectedSurvey}
        onSave={handleModalSave}
      />

      <SurveyViewModal
        open={showViewModal}
        onClose={() => { setShowViewModal(false); setViewingSurvey(null); }}
        survey={viewingSurvey}
      />

      <SurveyTemplateGallery
        open={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onUseTemplate={(template) => {
          setSelectedSurvey({
            id: 0,
            title: template.name,
            description: template.description,
            questions: template.questions ?? [],
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            response_count: 0,
            questions_count: template.questions?.length ?? 0,
          } as Survey);
          setShowTemplateGallery(false);
          setShowSurveyModal(true);
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
