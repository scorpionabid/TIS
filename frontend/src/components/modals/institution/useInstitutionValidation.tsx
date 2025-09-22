import React from 'react';
import { institutionService } from '@/services/institutions';
import { Institution } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface ValidationState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  message?: string;
}

interface ValidationProgress {
  step: number;
  total: number;
  message: string;
}

interface LoadingStates {
  institutionTypes: boolean;
  parentInstitutions: boolean;
  formSubmission: boolean;
  codeGeneration: boolean;
  validation: {
    code: boolean;
    utis: boolean;
    similar: boolean;
  };
  dataInitialization: boolean;
}

interface FormCompletenessState {
  percentage: number;
  missingFields: string[];
  validFields: string[];
  hasValidationIssues?: boolean;
  validationStatus?: {
    code: string;
    utisCode: string;
    allValid: boolean;
  };
  isCalculating?: boolean;
}

export const useInstitutionValidation = (institution?: Institution | null) => {
  const { toast } = useToast();

  // Validation states
  const [codeValidation, setCodeValidation] = React.useState<ValidationState>({ status: 'idle' });
  const [utisCodeValidation, setUtisCodeValidation] = React.useState<ValidationState>({ status: 'idle' });
  const [similarInstitutions, setSimilarInstitutions] = React.useState<Institution[]>([]);
  const [showSimilarWarning, setShowSimilarWarning] = React.useState(false);
  const [codeGenerationLoading, setCodeGenerationLoading] = React.useState(false);
  const [announcements, setAnnouncements] = React.useState<string>('');
  const [retryCount, setRetryCount] = React.useState<Record<string, number>>({});
  const [networkError, setNetworkError] = React.useState<boolean>(false);
  const [lastFailedOperation, setLastFailedOperation] = React.useState<{
    type: 'codeValidation' | 'utisValidation' | 'similarCheck' | 'generateCode';
    params: any;
  } | null>(null);
  const [validationProgress, setValidationProgress] = React.useState<Record<string, ValidationProgress>>({});
  const [loadingStates, setLoadingStates] = React.useState<LoadingStates>({
    institutionTypes: false,
    parentInstitutions: false,
    formSubmission: false,
    codeGeneration: false,
    validation: {
      code: false,
      utis: false,
      similar: false,
    },
    dataInitialization: false,
  });
  const [formCompleteness, setFormCompleteness] = React.useState<FormCompletenessState>({
    percentage: 0,
    missingFields: [],
    validFields: []
  });

  // Error detection and recovery utilities
  const isNetworkError = React.useCallback((error: any): boolean => {
    return error?.name === 'NetworkError' ||
           error?.code === 'NETWORK_ERROR' ||
           error?.message?.includes('fetch') ||
           error?.message?.includes('network') ||
           !navigator.onLine;
  }, []);

  const shouldRetry = React.useCallback((operationType: string, error: any): boolean => {
    const currentRetryCount = retryCount[operationType] || 0;
    const maxRetries = 3;

    const isRetryableError = isNetworkError(error) ||
                            (error?.status >= 500 && error?.status < 600) ||
                            error?.status === 429;

    return isRetryableError && currentRetryCount < maxRetries;
  }, [retryCount, isNetworkError]);

  const incrementRetryCount = React.useCallback((operationType: string) => {
    setRetryCount(prev => ({
      ...prev,
      [operationType]: (prev[operationType] || 0) + 1
    }));
  }, []);

  const resetRetryCount = React.useCallback((operationType: string) => {
    setRetryCount(prev => {
      const newState = { ...prev };
      delete newState[operationType];
      return newState;
    });
  }, []);

  const withRetry = React.useCallback(async <T,>(
    operationType: string,
    operation: () => Promise<T>,
    params: any = {}
  ): Promise<T> => {
    try {
      const result = await operation();
      resetRetryCount(operationType);
      setNetworkError(false);
      setLastFailedOperation(null);
      return result;
    } catch (error) {
      if (shouldRetry(operationType, error)) {
        incrementRetryCount(operationType);
        setLastFailedOperation({ type: operationType as any, params });

        if (isNetworkError(error)) {
          setNetworkError(true);
        }

        const delay = Math.pow(2, (retryCount[operationType] || 0)) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return withRetry(operationType, operation, params);
      } else {
        setLastFailedOperation({ type: operationType as any, params });
        throw error;
      }
    }
  }, [shouldRetry, incrementRetryCount, resetRetryCount, retryCount, isNetworkError]);

  const updateValidationProgress = React.useCallback((operationType: string, step: number, total: number, message: string) => {
    setValidationProgress(prev => ({
      ...prev,
      [operationType]: { step, total, message }
    }));
  }, []);

  const clearValidationProgress = React.useCallback((operationType: string) => {
    setValidationProgress(prev => {
      const newState = { ...prev };
      delete newState[operationType];
      return newState;
    });
  }, []);

  // Real-time validation handlers
  const handleCodeValidation = React.useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setCodeValidation({ status: 'idle' });
      clearValidationProgress('codeValidation');
      return;
    }

    setCodeValidation({ status: 'checking', message: 'Kod yoxlanılır...' });
    setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, code: true } }));
    updateValidationProgress('codeValidation', 1, 2, 'Kod formatı yoxlanılır...');

    try {
      const excludeId = institution?.id;

      updateValidationProgress('codeValidation', 2, 2, 'Kod unikallığı yoxlanılır...');

      const exists = await withRetry(
        'codeValidation',
        () => institutionService.checkCodeExists(code, excludeId),
        { code, excludeId }
      );

      clearValidationProgress('codeValidation');
      setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, code: false } }));

      if (exists) {
        setCodeValidation({
          status: 'invalid',
          message: 'Bu kod artıq istifadə olunur. Başqa kod seçin.'
        });
        setAnnouncements('Kod yoxlanması: kod artıq mövcuddur, başqa kod seçin.');
      } else {
        setCodeValidation({
          status: 'valid',
          message: 'Kod mövcuddur və istifadəyə yarayır.'
        });
        setAnnouncements('Kod yoxlanması: kod unikal və istifadəyə yarayır.');
      }
    } catch (error) {
      clearValidationProgress('codeValidation');
      setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, code: false } }));

      logger.warn('Code validation failed', error, {
        component: 'useInstitutionValidation',
        action: 'validateCode',
        retryCount: retryCount.codeValidation || 0
      });

      const errorMessage = isNetworkError(error)
        ? 'İnternet bağlantısı problemi. Kod yoxlanması təkrar cəhd ediləcək.'
        : 'Kod yoxlanması zamanı xəta baş verdi.';

      setCodeValidation({
        status: 'invalid',
        message: errorMessage
      });

      setAnnouncements(`Kod yoxlanması xətası: ${errorMessage}`);
    }
  }, [institution?.id, withRetry, retryCount.codeValidation, isNetworkError, updateValidationProgress, clearValidationProgress]);

  const handleUtisCodeValidation = React.useCallback(async (utisCode: string) => {
    if (!utisCode || utisCode.length !== 8) {
      setUtisCodeValidation({ status: 'idle' });
      clearValidationProgress('utisValidation');
      return;
    }

    setUtisCodeValidation({ status: 'checking', message: 'UTIS kodu yoxlanılır...' });
    setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, utis: true } }));
    updateValidationProgress('utisValidation', 1, 3, 'UTIS kod formatı yoxlanılır...');

    try {
      const excludeId = institution?.id;

      updateValidationProgress('utisValidation', 2, 3, 'UTIS kod strukturu təsdiq edilir...');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateValidationProgress('utisValidation', 3, 3, 'UTIS kod unikallığı yoxlanılır...');

      const exists = await withRetry(
        'utisValidation',
        () => institutionService.checkUtisCodeExists(utisCode, excludeId),
        { utisCode, excludeId }
      );

      clearValidationProgress('utisValidation');
      setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, utis: false } }));

      if (exists) {
        setUtisCodeValidation({
          status: 'invalid',
          message: 'Bu UTIS kodu artıq istifadə olunur.'
        });
        setAnnouncements('UTIS kod yoxlanması: kod artıq mövcuddur.');
      } else {
        setUtisCodeValidation({
          status: 'valid',
          message: 'UTIS kodu mövcuddur və istifadəyə yarayır.'
        });
        setAnnouncements('UTIS kod yoxlanması: kod unikal və etibarlıdır.');
      }
    } catch (error) {
      clearValidationProgress('utisValidation');
      setLoadingStates(prev => ({ ...prev, validation: { ...prev.validation, utis: false } }));

      logger.warn('UTIS code validation failed', error, {
        component: 'useInstitutionValidation',
        action: 'validateUtisCode',
        retryCount: retryCount.utisValidation || 0
      });

      const errorMessage = isNetworkError(error)
        ? 'İnternet bağlantısı problemi. UTIS kod yoxlanması təkrar cəhd ediləcək.'
        : 'UTIS kodu yoxlanması zamanı xəta baş verdi.';

      setUtisCodeValidation({
        status: 'invalid',
        message: errorMessage
      });

      setAnnouncements(`UTIS kod yoxlanması xətası: ${errorMessage}`);
    }
  }, [institution?.id, withRetry, retryCount.utisValidation, isNetworkError, updateValidationProgress, clearValidationProgress]);

  const handleSimilarInstitutionsCheck = React.useCallback(async (data: {
    name?: string;
    code?: string;
    type?: string;
    parent_id?: number;
  }) => {
    if (!data.name || data.name.length < 3) {
      setSimilarInstitutions([]);
      setShowSimilarWarning(false);
      return;
    }

    try {
      const similar = await withRetry(
        'similarCheck',
        () => institutionService.findSimilar({
          name: data.name,
          code: data.code,
          type: data.type,
          parent_id: data.parent_id
        }),
        data
      );

      const filteredSimilar = similar.filter(inst =>
        !institution || inst.id !== institution.id
      );

      setSimilarInstitutions(filteredSimilar);
      setShowSimilarWarning(filteredSimilar.length > 0);
    } catch (error) {
      logger.warn('Similar institutions check failed', error, {
        component: 'useInstitutionValidation',
        action: 'findSimilar',
        retryCount: retryCount.similarCheck || 0
      });

      setSimilarInstitutions([]);
      setShowSimilarWarning(false);
    }
  }, [institution?.id, withRetry, retryCount.similarCheck]);

  const handleGenerateCode = React.useCallback(async (formControl: any) => {
    const formValues = formControl.getValues();

    if (!formValues.name || !formValues.type) {
      toast({
        title: 'Xəta',
        description: 'Kod yaratmaq üçün müəssisə adı və növü seçilməlidir.',
        variant: 'destructive',
      });
      return;
    }

    setCodeGenerationLoading(true);
    setLoadingStates(prev => ({ ...prev, codeGeneration: true }));

    try {
      const generatedCode = await withRetry(
        'generateCode',
        () => institutionService.generateCode({
          type: formValues.type,
          name: formValues.name,
          parent_id: formValues.parent_id ? parseInt(formValues.parent_id) : undefined
        }),
        { type: formValues.type, name: formValues.name, parent_id: formValues.parent_id }
      );

      if (generatedCode) {
        formControl.setValue('code', generatedCode);
        handleCodeValidation(generatedCode);

        toast({
          title: 'Uğur',
          description: `Kod avtomatik yaradıldı: ${generatedCode}`,
          variant: 'default',
        });

        setAnnouncements(`Müəssisə kodu avtomatik yaradıldı: ${generatedCode}.`);
      } else {
        toast({
          title: 'Xəta',
          description: 'Kod yaradılmadı. Əl ilə kod daxil edin.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Code generation failed', error, {
        component: 'useInstitutionValidation',
        action: 'generateCode',
        retryCount: retryCount.generateCode || 0
      });

      const errorMessage = isNetworkError(error)
        ? 'İnternet bağlantısı problemi. Kod yaratmaq mümkün olmadı. Bir daha cəhd edin.'
        : 'Kod yaradılması zamanı xəta baş verdi.';

      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setCodeGenerationLoading(false);
      setLoadingStates(prev => ({ ...prev, codeGeneration: false }));
    }
  }, [toast, handleCodeValidation, withRetry, retryCount.generateCode, isNetworkError]);

  const handleManualRetry = React.useCallback(async () => {
    if (!lastFailedOperation) return;

    const { type, params } = lastFailedOperation;

    try {
      switch (type) {
        case 'codeValidation':
          await handleCodeValidation(params.code);
          break;
        case 'utisValidation':
          await handleUtisCodeValidation(params.utisCode);
          break;
        case 'similarCheck':
          await handleSimilarInstitutionsCheck(params);
          break;
        case 'generateCode':
          break;
      }

      setLastFailedOperation(null);
      setNetworkError(false);
    } catch (error) {
      logger.error('Manual retry failed', error, {
        component: 'useInstitutionValidation',
        action: 'manualRetry',
        operationType: type
      });
    }
  }, [lastFailedOperation, handleCodeValidation, handleUtisCodeValidation, handleSimilarInstitutionsCheck]);

  const updateFormCompleteness = React.useCallback((formData: any, institutionTypes: any[] = []) => {
    const requiredFields = [
      { key: 'name', label: 'Müəssisə adı' },
      { key: 'type', label: 'Müəssisə növü' },
      { key: 'code', label: 'Müəssisə kodu' },
    ];

    const selectedTypeData = institutionTypes.find(type => type.value === formData.type);

    if (selectedTypeData && selectedTypeData.level > 1) {
      requiredFields.push({ key: 'parent_id', label: 'Ana təşkilat' });
    }

    const optionalFields = [
      { key: 'short_name', label: 'Qısa ad' },
      { key: 'phone', label: 'Telefon' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Ünvan' },
      { key: 'website', label: 'Veb sayt' },
      { key: 'manager_name', label: 'Rəhbər adı' },
      { key: 'manager_phone', label: 'Rəhbər telefonu' },
      { key: 'established_date', label: 'Təsis tarixi' },
      { key: 'capacity_students', label: 'Şagird tutumu' },
      { key: 'utis_code', label: 'UTIS kodu' },
    ];

    const validRequiredFields = requiredFields.filter(field =>
      formData[field.key] && formData[field.key].toString().trim() !== ''
    );

    const validOptionalFields = optionalFields.filter(field =>
      formData[field.key] && formData[field.key].toString().trim() !== ''
    );

    const missingRequired = requiredFields.filter(field =>
      !formData[field.key] || formData[field.key].toString().trim() === ''
    );

    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = validRequiredFields.length + validOptionalFields.length;
    const percentage = Math.round((completedFields / totalFields) * 100);

    const hasValidCode = codeValidation.status === 'valid';
    const hasValidUtisCode = utisCodeValidation.status === 'valid' || !formData.utis_code;
    const hasValidationIssues = codeValidation.status === 'invalid' ||
                               (formData.utis_code && utisCodeValidation.status === 'invalid');

    setFormCompleteness({
      percentage,
      missingFields: missingRequired.map(field => field.label),
      validFields: [...validRequiredFields, ...validOptionalFields].map(field => field.label),
      hasValidationIssues,
      validationStatus: {
        code: codeValidation.status,
        utisCode: utisCodeValidation.status,
        allValid: hasValidCode && hasValidUtisCode
      }
    });
  }, [codeValidation.status, utisCodeValidation.status]);

  return {
    codeValidation,
    utisCodeValidation,
    similarInstitutions,
    showSimilarWarning,
    formCompleteness,
    codeGenerationLoading,
    announcements,
    networkError,
    lastFailedOperation,
    validationProgress,
    loadingStates,
    setLoadingStates,
    handleCodeValidation,
    handleUtisCodeValidation,
    handleSimilarInstitutionsCheck,
    handleGenerateCode,
    handleManualRetry,
    updateFormCompleteness,
    setCodeValidation,
    setUtisCodeValidation,
    setSimilarInstitutions,
    setShowSimilarWarning,
    setFormCompleteness,
    setAnnouncements,
    setNetworkError,
    setLastFailedOperation,
  };
};