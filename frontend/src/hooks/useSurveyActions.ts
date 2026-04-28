import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { surveyService, Survey } from '@/services/surveys';
import { toast as sonnerToast } from 'sonner';

interface UseSurveyActionsProps {
  selectedSurvey: Survey | null;
  invalidateMy: () => void;
  onSelectSurvey: (id: number | null) => void;
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
}

export function useSurveyActions({
  selectedSurvey,
  invalidateMy,
  onSelectSurvey,
  confirm,
}: UseSurveyActionsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleting,    setIsDeleting]    = useState(false);
  const [isArchiving,   setIsArchiving]   = useState(false);
  const [isRestoring,   setIsRestoring]   = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [exportingId,   setExportingId]   = useState<number | null>(null);

  const publishMut = useMutation({
    mutationFn: (id: number) => surveyService.publish(id),
    onSuccess: () => { invalidateMy(); toast({ title: 'Sorğu yayımlandı' }); },
  });

  const pauseMut = useMutation({
    mutationFn: (id: number) => surveyService.pause(id),
    onSuccess: () => { invalidateMy(); toast({ title: 'Sorğu dayandırıldı' }); },
  });

  const handleEditSurvey = useCallback(() => {
    if (!selectedSurvey) return;
    navigate(`/surveys/edit/${selectedSurvey.id}`);
  }, [selectedSurvey, navigate]);

  const handleArchiveSurvey = useCallback(async () => {
    if (!selectedSurvey) return;
    const ok = await confirm({
      title: 'Sorğunu arxivə göndər',
      description: 'Bu sorğu arxivə göndəriləcək. Gələcəkdə bərpa edə bilərsiniz.',
      confirmLabel: 'Arxivə göndər',
      variant: 'default',
    });
    if (!ok) return;
    setIsArchiving(true);
    try {
      await surveyService.archive(selectedSurvey.id);
      toast({ title: 'Uğurlu', description: 'Sorğu arxivləşdirildi' });
      invalidateMy();
    } catch {
      toast({ title: 'Xəta', description: 'Arxivləşdirmə zamanı xəta baş verdi', variant: 'destructive' });
    } finally {
      setIsArchiving(false);
    }
  }, [selectedSurvey, invalidateMy, toast]);

  const handleRestoreSurvey = useCallback(async () => {
    if (!selectedSurvey) return;
    const ok = await confirm({
      title: 'Sorğunu arxivdən çıxar',
      description: 'Bu sorğu arxivdən çıxarılaraq qaralama (draft) vəziyyətinə qaytarılacaq.',
      confirmLabel: 'Bərpa et',
    });
    if (!ok) return;
    setIsRestoring(true);
    try {
      await surveyService.restore(selectedSurvey.id);
      toast({ title: 'Uğurlu', description: 'Sorğu arxivdən çıxarıldı' });
      invalidateMy();
    } catch {
      toast({ title: 'Xəta', description: 'Bərpa zamanı xəta baş verdi', variant: 'destructive' });
    } finally {
      setIsRestoring(false);
    }
  }, [selectedSurvey, invalidateMy, toast]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!selectedSurvey) return;
    const ok = await confirm({
      title: 'Şablon kimi saxla',
      description: `"${selectedSurvey.title}" sorğusundan rəsmi şablon yaradılacaq.`,
      confirmLabel: 'Şablon yarat',
    });
    if (!ok) return;
    setIsDuplicating(true);
    try {
      await surveyService.createTemplateFromSurvey(selectedSurvey.id);
      toast({ title: 'Uğurlu', description: 'Sorğu şablonlar siyahısına əlavə edildi' });
      invalidateMy();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : undefined;
      toast({ title: 'Xəta', description: msg ?? 'Şablon yaradılarkən xəta baş verdi', variant: 'destructive' });
    } finally {
      setIsDuplicating(false);
    }
  }, [selectedSurvey, invalidateMy, toast]);

  const handleDeleteSurvey = useCallback(async () => {
    if (!selectedSurvey) return;

    const isArchived   = selectedSurvey.status === 'archived';
    const hasResponses = (selectedSurvey.response_count ?? 0) > 0;

    const description = isArchived
      ? 'Bu sorğu arxivdən TAMAMİLƏ silinəcək. Bu əməliyyat geri qaytarıla bilməz!'
      : hasResponses
      ? 'Bu sorğunun cavabları var. Silmək yerinə arxivləşdirmə tövsiyə olunur. Bununla belə silmək istəyirsiniz?'
      : 'Bu sorğu silinəcək.';

    const ok = await confirm({
      title: isArchived ? 'Tam sil' : 'Sorğunu sil',
      description,
      confirmLabel: isArchived ? 'Tamamilə sil' : 'Sil',
      variant: 'destructive',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await surveyService.deleteSurvey(selectedSurvey.id, isArchived);
      toast({
        title: 'Uğurlu',
        description: isArchived ? 'Sorğu sistemdən tamamilə silindi' : 'Sorğu arxivləşdirildi',
      });
      onSelectSurvey(null);
      invalidateMy();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (!isArchived && (msg.includes('responses') || hasResponses)) {
        toast({
          title: 'Silmək mümkün deyil',
          description: 'Bu sorğuya artıq cavablar verilib. Zəhmət olmasa arxivləmə funksiyasından istifadə edin.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Xəta', description: 'Silinmə zamanı sistem xətası baş verdi', variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
    }
  }, [selectedSurvey, invalidateMy, onSelectSurvey, toast]);

  const handleExportXlsx = useCallback(async () => {
    if (!selectedSurvey) return;
    try {
      const blob = await surveyService.exportResponses(selectedSurvey.id, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sorgu-hesabati-${selectedSurvey.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Uğurlu', description: 'Hesabat XLSX formatında yükləndi' });
    } catch {
      toast({ title: 'Xəta', description: 'Yükləmə zamanı xəta baş verdi', variant: 'destructive' });
    }
  }, [selectedSurvey, toast]);

  const handleExportResponse = useCallback(async (responseId: number) => {
    try {
      setExportingId(responseId);
      const blob = await surveyService.downloadResponseReport(responseId);
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = `sorgu-${responseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      sonnerToast.success('Hesabat yükləndi');
    } catch {
      sonnerToast.error('Eksport xətası');
    } finally {
      setExportingId(null);
    }
  }, []);

  return {
    // mutations
    publishMut,
    pauseMut,
    // handlers
    handleEditSurvey,
    handleArchiveSurvey,
    handleRestoreSurvey,
    handleSaveAsTemplate,
    handleDeleteSurvey,
    handleExportXlsx,
    handleExportResponse,
    // loading states
    isDeleting,
    isArchiving,
    isRestoring,
    isDuplicating,
    exportingId,
  };
}
