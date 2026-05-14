import { useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * useAssignedInstitutionSync - Hədəf müəssisələr və təyin edilmiş müəssisə arasında sinxronizasiya
 *
 * Bu hook target_institutions array-indəki ilk müəssisəni avtomatik olaraq
 * assigned_institution_id və target_institution_id kimi təyin edir.
 *
 * Bu, tapşırığın hansı müəssisəyə aid olduğunu müəyyən etmək üçün lazımdır.
 *
 * @param form - React Hook Form instance
 * @param watchField - İzlənilən field adı (default: 'target_institutions')
 * @param autoSync - Avtomatik sinxronizasiya aktiv olsun (default: true)
 *
 * @example
 * ```tsx
 * const form = useForm();
 * useAssignedInstitutionSync(form);
 * ```
 */
export function useAssignedInstitutionSync(
  form: any,
  watchField: string = 'target_institutions',
  autoSync: boolean = true
) {
  const selectedInstitutions = form.watch(watchField);

  useEffect(() => {
    if (!autoSync) return;

    if (Array.isArray(selectedInstitutions) && selectedInstitutions.length > 0) {
      const primary = Number(selectedInstitutions[0]);

      // Yalnız dəyişiklik varsa yenilə (infinite loop-dan qaçmaq üçün)
      const currentAssignedId = form.getValues('assigned_institution_id');
      const currentTargetId = form.getValues('target_institution_id');

      if (currentAssignedId !== primary || currentTargetId !== primary) {
        logger.debug('useAssignedInstitutionSync: Syncing primary institution', {
          primaryInstitution: primary,
          selectedInstitutions,
          previousAssignedId: currentAssignedId,
          previousTargetId: currentTargetId
        });

        form.setValue('assigned_institution_id', primary, { shouldValidate: false });
        form.setValue('target_institution_id', primary, { shouldValidate: false });
      }
    } else {
      // Əgər heç bir müəssisə seçilməyibsə, null təyin et
      const currentAssignedId = form.getValues('assigned_institution_id');
      const currentTargetId = form.getValues('target_institution_id');

      if (currentAssignedId !== null || currentTargetId !== null) {
        logger.debug('useAssignedInstitutionSync: Clearing institution assignments', {
          previousAssignedId: currentAssignedId,
          previousTargetId: currentTargetId
        });

        form.setValue('assigned_institution_id', null, { shouldValidate: false });
        form.setValue('target_institution_id', null, { shouldValidate: false });
      }
    }
  }, [selectedInstitutions, form, autoSync, watchField]);

  return {
    selectedInstitutions,
    primaryInstitution: Array.isArray(selectedInstitutions) && selectedInstitutions.length > 0
      ? Number(selectedInstitutions[0])
      : null
  };
}

/**
 * Manual sync function for cases where automatic sync is disabled
 */
export function syncInstitutionAssignment(
  form: any,
  selectedInstitutions: (string | number)[]
) {
  if (Array.isArray(selectedInstitutions) && selectedInstitutions.length > 0) {
    const primary = Number(selectedInstitutions[0]);
    form.setValue('assigned_institution_id', primary);
    form.setValue('target_institution_id', primary);

    logger.debug('Manual institution sync completed', {
      primaryInstitution: primary,
      totalSelected: selectedInstitutions.length
    });

    return primary;
  }

  form.setValue('assigned_institution_id', null);
  form.setValue('target_institution_id', null);
  return null;
}
