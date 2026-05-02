import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { surveyService, Survey, CreateSurveyData } from '@/services/surveys';
import { apiClient } from '@/services/api';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export function useSurveyListActions(confirm: ConfirmFn) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] });
    queryClient.invalidateQueries({ queryKey: ['survey-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateSurveyData) => surveyService.create(data),
    onSuccess: () => invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSurveyData> }) =>
      surveyService.update(id, data),
    onSuccess: () => invalidate(),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => surveyService.publish(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      toast({ title: 'Uğurlu', description: 'Sorğu yayımlandı' });
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Sorğu yayımlanarkən xəta baş verdi', variant: 'destructive' });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: number) => surveyService.pause(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      queryClient.invalidateQueries({ queryKey: ['survey-responses-approval'] });
      toast({ title: 'Uğurlu', description: 'Sorğu dayandırıldı' });
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Sorğu dayandırılarkən xəta baş verdi', variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => surveyService.archive(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      queryClient.invalidateQueries({ queryKey: ['survey-responses-approval'] });
      toast({ title: 'Uğurlu', description: 'Sorğu arxivə göndərildi' });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (surveyId: number) => surveyService.createTemplateFromSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-templates'] });
      queryClient.invalidateQueries({ queryKey: ['survey-template-stats'] });
      toast({ title: 'Uğurlu!', description: 'Sorğu template kimi yaradıldı' });
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Template yaradarkən xəta baş verdi', variant: 'destructive' });
    },
  });

  async function handleSaveSurvey(data: CreateSurveyData, survey: Survey | null): Promise<void> {
    if (survey) {
      await updateMutation.mutateAsync({ id: survey.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  }

  async function handleDeleteSurvey(id: number, forceDelete: boolean): Promise<void> {
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
        invalidate();
        toast({ title: 'Uğurlu', description: 'Sorğu tamamilə silindi' });
      } else {
        await archiveMutation.mutateAsync(id);
      }
    } catch {
      toast({
        title: 'Xəta',
        description: `Sorğu ${forceDelete ? 'silinərkən' : 'arxivə göndərilərkən'} xəta baş verdi`,
        variant: 'destructive',
      });
    }
  }

  async function handleCreateTemplate(survey: Survey): Promise<void> {
    const ok = await confirm({
      title: 'Template yarat',
      description: `"${survey.title}" sorğusundan template yaratmaq istəyirsiniz?`,
      confirmLabel: 'Yarat',
    });
    if (!ok) return;
    await createTemplateMutation.mutateAsync(survey.id);
  }

  return {
    createMutation,
    updateMutation,
    publishMutation,
    pauseMutation,
    archiveMutation,
    createTemplateMutation,
    handleSaveSurvey,
    handleDeleteSurvey,
    handleCreateTemplate,
  };
}
