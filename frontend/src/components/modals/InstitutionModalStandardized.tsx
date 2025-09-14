import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/BaseModal';
import { HierarchyPath } from '@/components/common/HierarchyPath';
import { FormField, createField, commonValidations } from '@/components/forms/FormBuilder';
import { Institution, CreateInstitutionData } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionTypesSimple } from '@/hooks/useInstitutionTypes';
import { useToast } from '@/hooks/use-toast';
import { Building, MapPin, User, FileText, CheckCircle, AlertCircle, Loader2, Wand2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface InstitutionModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  institution?: Institution | null;
  onSave: (data: CreateInstitutionData) => Promise<void>;
}

const InstitutionModalStandardizedComponent: React.FC<InstitutionModalStandardizedProps> = ({
  open,
  onClose,
  institution,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!institution;
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [hasUserSelectedType, setHasUserSelectedType] = React.useState(false); // Track manual selections

  // Reset user selection flag when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setHasUserSelectedType(false); // Reset flag when modal opens
    }
  }, [open]);

  // Real-time validation states
  const [codeValidation, setCodeValidation] = React.useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  const [utisCodeValidation, setUtisCodeValidation] = React.useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  // Similar institutions detection
  const [similarInstitutions, setSimilarInstitutions] = React.useState<Institution[]>([]);
  const [showSimilarWarning, setShowSimilarWarning] = React.useState(false);
  
  // Code generation state
  const [codeGenerationLoading, setCodeGenerationLoading] = React.useState(false);
  
  // Accessibility and focus management
  const [announcements, setAnnouncements] = React.useState<string>('');
  const codeInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  
  // Error recovery and retry mechanisms
  const [retryCount, setRetryCount] = React.useState<Record<string, number>>({});
  const [networkError, setNetworkError] = React.useState<boolean>(false);
  const [lastFailedOperation, setLastFailedOperation] = React.useState<{
    type: 'codeValidation' | 'utisValidation' | 'similarCheck' | 'generateCode';
    params: any;
  } | null>(null);
  
  // Enhanced validation feedback states
  const [validationProgress, setValidationProgress] = React.useState<Record<string, {
    step: number;
    total: number;
    message: string;
  }>>({});
  
  // Enhanced loading states management
  const [loadingStates, setLoadingStates] = React.useState<{
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
  }>({
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
  const [formCompleteness, setFormCompleteness] = React.useState<{
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
  }>({ percentage: 0, missingFields: [], validFields: [] });
  
  // Progress indicator states
  const [globalProgress, setGlobalProgress] = React.useState<{
    stage: 'initializing' | 'loading_types' | 'loading_parents' | 'ready' | 'validating' | 'submitting';
    progress: number;
    message: string;
    subSteps?: { step: number; total: number; current: string; };
  }>({ 
    stage: 'initializing', 
    progress: 0, 
    message: 'Modal açılır...' 
  });

  // Load institution types with simplified hook
  const { institutionTypes: rawInstitutionTypes, isLoading: typesLoading, isError: typesError } = useInstitutionTypesSimple(currentUser?.role);

  // Debug log current user role and types loading
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Institution Types Loading Debug:', {
        currentUser: {
          id: currentUser?.id,
          name: currentUser?.name,
          username: currentUser?.username,
          role: currentUser?.role,
          roles: currentUser?.roles
        },
        currentUserRole: currentUser?.role,
        typesLoading,
        typesError,
        rawInstitutionTypesCount: rawInstitutionTypes?.length || 0,
        rawInstitutionTypes: rawInstitutionTypes?.map(t => ({ key: t.key, label: t.label_az, level: t.default_level })) || []
      });
    }
  }, [currentUser, typesLoading, typesError, rawInstitutionTypes]);
  
  // Update loading states based on types loading
  React.useEffect(() => {
    setLoadingStates(prev => ({ ...prev, institutionTypes: typesLoading }));
    
    if (typesLoading) {
      setGlobalProgress({
        stage: 'loading_types',
        progress: 25,
        message: 'Müəssisə növləri yüklənir...',
        subSteps: { step: 1, total: 3, current: 'Məlumat bazasından növlər alınır' }
      });
    } else if (!typesError && rawInstitutionTypes?.length > 0) {
      setGlobalProgress({
        stage: 'ready',
        progress: 75,
        message: 'Hazır - məlumatları daxil edin',
        subSteps: { step: 3, total: 3, current: 'Form hazır' }
      });
    }
  }, [typesLoading, typesError, rawInstitutionTypes]);

  // Transform institution types for UI
  const institutionTypes = React.useMemo(() => {
    if (!rawInstitutionTypes || rawInstitutionTypes.length === 0) {
      logger.warn('No institution types available', null, {
        component: 'InstitutionModalStandardized',
        data: { typesError, currentUserRole: currentUser?.role }
      });
      return [];
    }

    const mappedTypes = rawInstitutionTypes.map((type) => ({
      label: `${type.label_az || type.label} (Səviyyə ${type.default_level})`,
      value: type.key,
      level: type.default_level,
      allowedParents: type.allowed_parent_types || [],
      icon: type.icon,
      color: type.color,
      originalType: type
    }));

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Available institution types:', {
        total: mappedTypes.length,
        ministryExists: mappedTypes.some(t => t.value === 'ministry'),
        level1Types: mappedTypes.filter(t => t.level === 1),
        level2Types: mappedTypes.filter(t => t.level === 2),
        level3Types: mappedTypes.filter(t => t.level === 3),
        level4Types: mappedTypes.filter(t => t.level === 4),
        allTypes: mappedTypes.map(t => ({ key: t.value, level: t.level, label: t.label }))
      });
    }

    return mappedTypes;
  }, [rawInstitutionTypes, typesError, currentUser?.role]);

  // Get potential parent institutions based on selected type
  const { data: parentInstitutions, isLoading: parentsLoading } = useQuery({
    queryKey: ['parent-institutions', selectedType, institutionTypes.length],
    queryFn: async () => {
      if (!selectedType || institutionTypes.length === 0) {
        return { data: [] };
      }
      
      const selectedTypeData = institutionTypes.find(type => type.value === selectedType);
      if (!selectedTypeData) {
        return { data: [] };
      }
      
      const currentLevel = selectedTypeData.level;
      
      // Level 1 (ministry) has no parents
      if (currentLevel <= 1) {
        return { data: [] };
      }
      
      // Find parent types (level - 1)
      const parentLevel = currentLevel - 1;
      const parentTypes = institutionTypes
        .filter(type => type.level === parentLevel)
        .map(type => type.value);

      // Debug logging for parent loading
      if (process.env.NODE_ENV === 'development') {
        console.log('👥 Parent institutions loading:', {
          selectedType,
          currentLevel,
          parentLevel,
          availableTypes: institutionTypes.map(t => ({ key: t.value, level: t.level })),
          foundParentTypes: parentTypes,
          willLoadParents: parentTypes.length > 0
        });
      }

      if (parentTypes.length === 0) {
        console.warn('❌ No parent types found for level', currentLevel);
        return { data: [] };
      }
      
      // Load institutions of parent types
      try {
        const allParents = [];
        for (const parentType of parentTypes) {
          try {
            console.log(`🔍 Loading institutions for parent type: ${parentType}`);
            const result = await institutionService.getAll({ type: parentType });
            const institutions = result?.data?.data || result?.data;

            if (institutions && Array.isArray(institutions)) {
              console.log(`✅ Found ${institutions.length} institutions for type: ${parentType}`);
              allParents.push(...institutions);
            } else {
              console.warn(`⚠️ No institutions found for type: ${parentType}`, { result });
            }
          } catch (err) {
            console.error(`❌ Failed to load institutions for parent type: ${parentType}`, err);
            logger.warn('Failed to load institutions for parent type', err, {
              component: 'InstitutionModalStandardized',
              action: 'loadParents',
              data: { parentType }
            });
          }
        }

        console.log('🏢 Total parent institutions loaded:', allParents.length);
        
        return { data: allParents };
      } catch (error) {
        logger.error('Failed to load parent institutions', error, {
          component: 'InstitutionModalStandardized',
          action: 'loadParents'
        });
        throw error;
      }
    },
    enabled: !!selectedType && institutionTypes.length > 0 && open,
  });
  
  // Update loading states based on parents loading
  React.useEffect(() => {
    setLoadingStates(prev => ({ ...prev, parentInstitutions: parentsLoading }));
    
    if (parentsLoading && selectedType) {
      setGlobalProgress({
        stage: 'loading_parents',
        progress: 50,
        message: 'Ana təşkilatlar yüklənir...',
        subSteps: { step: 2, total: 3, current: `${selectedType} növü üçün uyğun ana təşkilatlar axtarılır` }
      });
    }
  }, [parentsLoading, selectedType]);

  const parentInstitutionOptions = React.useMemo(() => {
    if (!parentInstitutions?.data) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 No parent institutions data:', { parentInstitutions });
      }
      return [];
    }

    const options = parentInstitutions.data.map((parent: any) => {
      const typeKey = typeof parent.type === 'object' ? parent.type?.key : parent.type;
      const typeName = typeKey === 'ministry' ? 'Nazirlik' :
                     typeKey === 'regional_education_department' ? 'Regional Təhsil İdarəsi' :
                     typeKey === 'sector_education_office' ? 'Sektor Təhsil Şöbəsi' :
                     (typeof parent.type === 'object' ? parent.type?.name || typeKey : typeKey);
      return {
        label: `${parent.name} (${typeName})`,
        value: parent.id.toString()
      };
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Parent institution options generated:', {
        rawDataCount: parentInstitutions.data.length,
        optionsCount: options.length,
        options: options.map(opt => ({ label: opt.label, value: opt.value }))
      });
    }

    return options;
  }, [parentInstitutions]);

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
    
    // Only retry network errors and temporary server errors
    const isRetryableError = isNetworkError(error) || 
                            (error?.status >= 500 && error?.status < 600) ||
                            error?.status === 429; // Rate limiting
    
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

  // Enhanced retry wrapper function
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
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, (retryCount[operationType] || 0)) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Recursive retry
        return withRetry(operationType, operation, params);
      } else {
        // Max retries reached or non-retryable error
        setLastFailedOperation({ type: operationType as any, params });
        throw error;
      }
    }
  }, [shouldRetry, incrementRetryCount, resetRetryCount, retryCount, isNetworkError]);

  // Enhanced validation feedback utilities
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
        component: 'InstitutionModalStandardized',
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
      
      // Short delay for better UX feedback
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
        component: 'InstitutionModalStandardized',
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

  // Similar institutions detection handler
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

      // Filter out current institution if editing
      const filteredSimilar = similar.filter(inst =>
        !institution || inst.id !== institution.id
      );

      setSimilarInstitutions(filteredSimilar);
      setShowSimilarWarning(filteredSimilar.length > 0);
    } catch (error) {
      logger.warn('Similar institutions check failed', error, {
        component: 'InstitutionModalStandardized',
        action: 'findSimilar',
        retryCount: retryCount.similarCheck || 0
      });

      // Silently handle all errors - don't show warnings to user
      setSimilarInstitutions([]);
      setShowSimilarWarning(false);
    }
  }, [institution?.id, withRetry, retryCount.similarCheck, isNetworkError]);

  // Automatic code generation handler
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
    setGlobalProgress({
      stage: 'validating',
      progress: 60,
      message: 'Avtomatik kod yaradılır...',
      subSteps: { step: 1, total: 2, current: 'Kod şablonu hazırlanır' }
    });
    
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
        // Set the generated code in the form
        formControl.setValue('code', generatedCode);
        
        // Validate the generated code
        handleCodeValidation(generatedCode);
        
        toast({
          title: 'Uğur',
          description: `Kod avtomatik yaradıldı: ${generatedCode}`,
          variant: 'default',
        });
        
        // Announce to screen readers
        setAnnouncements(`Müəssisə kodu avtomatik yaradıldı: ${generatedCode}. Kod sahəsinə fokus verildi.`);
        
        // Focus the code input field
        setTimeout(() => {
          codeInputRef.current?.focus();
          codeInputRef.current?.select();
        }, 100);
      } else {
        toast({
          title: 'Xəta',
          description: 'Kod yaradılmadı. Əl ilə kod daxil edin.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Code generation failed', error, {
        component: 'InstitutionModalStandardized',
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

  // Manual retry handler for failed operations
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
          // For code generation, we need the form control
          // This will be handled separately by the generate button
          break;
      }
      
      setLastFailedOperation(null);
      setNetworkError(false);
    } catch (error) {
      logger.error('Manual retry failed', error, {
        component: 'InstitutionModalStandardized',
        action: 'manualRetry',
        operationType: type
      });
    }
  }, [lastFailedOperation, handleCodeValidation, handleUtisCodeValidation, handleSimilarInstitutionsCheck]);

  // Form completeness tracker
  const updateFormCompleteness = React.useCallback((formData: any) => {
    const requiredFields = [
      { key: 'name', label: 'Müəssisə adı' },
      { key: 'type', label: 'Müəssisə növü' },
      { key: 'code', label: 'Müəssisə kodu' },
    ];
    
    // Add parent_id as required if not level 1
    const selectedTypeData = institutionTypes.find(type => type.value === formData.type);

    // Debug logging for form completeness
    if (process.env.NODE_ENV === 'development' && formData.type) {
      console.log('📋 Form completeness check:', {
        selectedType: formData.type,
        selectedTypeData: selectedTypeData?.label,
        level: selectedTypeData?.level,
        shouldRequireParent: selectedTypeData && selectedTypeData.level > 1,
        currentRequiredFields: requiredFields.map(f => f.key)
      });
    }

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
    
    // Include validation states in completeness calculation
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
  }, [institutionTypes, codeValidation.status, utisCodeValidation.status]);

  // Get current selected level based on selected type
  const getCurrentSelectedLevel = React.useCallback(() => {
    if (!selectedType || institutionTypes.length === 0) return 1;
    const selectedTypeData = institutionTypes.find(type => type.value === selectedType);
    const level = selectedTypeData?.level || 1;

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🏛️ Level calculation:', {
        selectedType,
        selectedTypeData: selectedTypeData?.label,
        calculatedLevel: level,
        shouldShowParent: level > 1,
        isMinistry: selectedType === 'ministry',
        allInstitutionTypes: institutionTypes.map(t => ({ key: t.value, level: t.level, label: t.label }))
      });
    }

    return level;
  }, [selectedType, institutionTypes]);

  // Basic institution information fields
  const basicFields: FormField[] = [
    createField('name', 'Ad', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <input
            {...field}
            ref={nameInputRef}
            type="text"
            placeholder="Müəssisənin tam adı"
            aria-label="Müəssisənin adı"
            aria-describedby="name-help-text similar-institutions-warning"
            className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            onChange={(e) => {
              field.onChange(e);
              // Update form completeness
              const formValues = formControl.getValues();
              updateFormCompleteness({ ...formValues, name: e.target.value });
              // Debounced similar institutions check - temporarily disabled
              // const timer = setTimeout(() => {
              //   handleSimilarInstitutionsCheck({
              //     name: e.target.value,
              //     code: formValues.code,
              //     type: formValues.type,
              //     parent_id: formValues.parent_id ? parseInt(formValues.parent_id) : undefined
              //   });
              // }, 1000);
              // return () => clearTimeout(timer);
            }}
          />
          <p id="name-help-text" className="text-xs text-muted-foreground">
            Müəssisənin tam rəsmi adı. Oxşar adlı müəssisələr yoxlanacaq.
          </p>
          {showSimilarWarning && similarInstitutions.length > 0 && (
            <div 
              id="similar-institutions-warning"
              className="p-3 bg-amber-50 border border-amber-200 rounded-md"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <AlertCircle 
                  className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" 
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    <span className="sr-only">Diqqət: </span>
                    Oxşar müəssisələr tapıldı ({similarInstitutions.length})
                  </p>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto" aria-label="Oxşar müəssisələrin siyahısı">
                    {similarInstitutions.slice(0, 3).map((similar, index) => (
                      <div 
                        key={similar.id} 
                        className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1"
                        role="listitem"
                      >
                        <span className="font-medium">{similar.name}</span>
                        {similar.code && <span className="ml-2 text-amber-600">({similar.code})</span>}
                      </div>
                    ))}
                    {similarInstitutions.length > 3 && (
                      <p className="text-xs text-amber-600 font-medium">
                        ...və {similarInstitutions.length - 3} digər
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Müəssisə adının unikal olduğundan əmin olun
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    }),
    createField('short_name', 'Qısa Ad', 'text', {
      placeholder: 'Müəssisənin qısa adı (ixtiyari)',
      description: 'Müəssisə üçün qısa ad. Məsələn: TM, REİ, HTŞ',
    }),
    createField('type', 'Növ', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="relative">
            <select
              {...field}
              aria-label="Müəssisə növü"
              aria-describedby="type-help-text"
              disabled={typesLoading}
              className={cn(
                "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                "appearance-none cursor-pointer"
              )}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value);
                setSelectedType(value);
                setHasUserSelectedType(true); // Mark as user-selected to prevent auto-resets
                // Update form completeness when type changes
                const formValues = formControl?.getValues();
                if (formValues) {
                  updateFormCompleteness({ ...formValues, type: value });
                }
              }}
            >
              <option value="" disabled>
                {typesLoading ? 'Növlər yüklənir...' : 'Müəssisə növünü seçin'}
              </option>
              {institutionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {process.env.NODE_ENV === 'development' && type.value === 'ministry' ? '👑 MINISTRY' : ''}
                </option>
              ))}
              {process.env.NODE_ENV === 'development' && institutionTypes.length === 0 && (
                <option disabled>DEBUG: No types loaded</option>
              )}
              {process.env.NODE_ENV === 'development' && (
                <option disabled>DEBUG: Total {institutionTypes.length} types</option>
              )}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {typesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <svg 
                  className="h-4 w-4 text-muted-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          <p id="type-help-text" className="text-xs text-muted-foreground">
            Müəssisənin növünü seçin. Növ ana təşkilat seçimlərini müəyyənləşdirir.
          </p>
          {typesError && (
            <p className="text-xs text-red-600" role="alert">
              Növlər yükləmədə xəta: Yenidən cəhd edin
            </p>
          )}
        </div>
      ),
    }),
    // Add info field for level 1 institutions (ministry) - show disabled placeholder
    ...((() => {
      const currentLevel = getCurrentSelectedLevel();
      const isLevel1 = selectedType && currentLevel === 1;

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Level 1 Info Field:', {
          selectedType,
          currentLevel,
          isLevel1,
          shouldShowInfoField: isLevel1 ? 'YES - Level 1 info field will be shown' : 'NO - Level 1 info field will not be shown'
        });
      }

      return isLevel1 ? [
        createField('parent_info', 'Ana Təşkilat', 'text', {
          disabled: true,
          placeholder: '🏛️ Səviyyə 1 müəssisələr ən üst səviyyədə olduğu üçün ana təşkilatı yoxdur',
          description: 'Nazirlik səviyyəsindəki müəssisələrin ana təşkilatı olmur',
          className: 'md:col-span-2'
        })
      ] : [];
    })()),
    ...((() => {
      const level = getCurrentSelectedLevel();
      const shouldShow = selectedType && level > 1;

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Parent field condition:', {
          selectedType,
          level,
          shouldShowParent: shouldShow,
          reasoning: `Level ${level} ${level > 1 ? '> 1, showing parent field' : '<= 1, hiding parent field'}`,
          fieldsBeingRendered: shouldShow ? 'PARENT FIELD WILL BE ADDED' : 'PARENT FIELD WILL NOT BE ADDED',
          parentInstitutionsCount: parentInstitutions?.data?.length || 0,
          parentInstitutionsLoading: parentsLoading
        });
      }

      return shouldShow;
    })() ? [
      createField('parent_id', 'Ana Təşkilat', 'custom', {
        required: getCurrentSelectedLevel() > 1,
        validation: getCurrentSelectedLevel() > 1 ? commonValidations.required : undefined,
        className: 'md:col-span-2',
        render: ({ field, formControl }: any) => (
          <div className="space-y-2">
            <div className="relative">
              <select
                {...field}
                aria-label="Ana təşkilat"
                aria-describedby="parent-help-text"
                disabled={parentsLoading}
                className={cn(
                  "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                  "appearance-none cursor-pointer"
                )}
              >
                <option value="" disabled>
                  {parentsLoading ? 'Ana təşkilatlar yüklənir...' : 
                   selectedType === 'regional_education_department' ? 'Nazirliyi seçin' :
                   selectedType === 'sector_education_office' ? 'Regional idarəni seçin' :
                   selectedType === 'secondary_school' || selectedType === 'lyceum' || selectedType === 'gymnasium' ? 'Sektoru seçin' :
                   'Ana təşkilatı seçin'}
                </option>
                {parentInstitutionOptions.map((parent) => (
                  <option key={parent.value} value={parent.value}>
                    {parent.label}
                  </option>
                ))}
                {process.env.NODE_ENV === 'development' && (
                  <option disabled>DEBUG: Found {parentInstitutionOptions.length} parents</option>
                )}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {parentsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <svg 
                    className="h-4 w-4 text-muted-foreground" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
            <p id="parent-help-text" className="text-xs text-muted-foreground">
              {`Səviyyə ${getCurrentSelectedLevel()} müəssisələrinin ana təşkilatı seçilməlidir. ${parentInstitutionOptions.length} seçim mövcuddur.`}
            </p>
            {parentsLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Ana təşkilatlar yüklənir...</span>
              </div>
            )}
            {!parentsLoading && parentInstitutionOptions.length === 0 && selectedType && (
              <p className="text-xs text-amber-600" role="alert">
                Bu növ üçün uyğun ana təşkilat tapılmadı
              </p>
            )}
          </div>
        ),
      })
    ] : []),
    createField('code', 'Müəssisə Kodu', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                {...field}
                ref={codeInputRef}
                type="text"
                placeholder="Müəssisə kodu (tələb olunur)"
                aria-label="Müəssisə kodu"
                aria-describedby="code-validation-message code-help-text"
                aria-invalid={codeValidation.status === 'invalid'}
                aria-busy={codeValidation.status === 'checking'}
                className={cn(
                  "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                  codeValidation.status === 'valid' && "border-green-500 focus-visible:ring-green-500",
                  codeValidation.status === 'invalid' && "border-red-500 focus-visible:ring-red-500"
                )}
                onChange={(e) => {
                  field.onChange(e);
                  // Update form completeness
                  const formValues = formControl.getValues();
                  updateFormCompleteness({ ...formValues, code: e.target.value });
                  if (e.target.value.length >= 3) {
                    handleCodeValidation(e.target.value);
                  } else {
                    setCodeValidation({ status: 'idle' });
                  }
                }}
                onKeyDown={(e) => {
                  // Generate code with Alt+G keyboard shortcut
                  if (e.altKey && e.key === 'g') {
                    e.preventDefault();
                    handleGenerateCode(formControl);
                  }
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {codeValidation.status === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {codeValidation.status === 'valid' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {codeValidation.status === 'invalid' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateCode(formControl)}
              disabled={codeGenerationLoading}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-3 py-3 sm:py-2 h-12 sm:h-10 text-base sm:text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors touch-manipulation",
                "min-w-[140px] sm:min-w-[120px] justify-center"
              )}
              title="Müəssisə adı və növünə əsasən avtomatik kod yaradın (Alt+G)"
              aria-label={codeGenerationLoading ? 'Kod yaradılır, gözləyin' : 'Avtomatik kod yaradın (Alt+G klaviş birləşməsi)'}
              aria-describedby="code-generate-help"
            >
              {codeGenerationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span>{codeGenerationLoading ? 'Yaradılır...' : 'Yaradın'}</span>
            </button>
          </div>
          {codeValidation.message && (
            <div
              id="code-validation-message"
              className={cn(
                "text-sm space-y-2",
                codeValidation.status === 'valid' && "text-green-600",
                codeValidation.status === 'invalid' && "text-red-600"
              )}
              role={codeValidation.status === 'invalid' ? 'alert' : 'status'}
              aria-live={codeValidation.status === 'checking' ? 'polite' : 'assertive'}
            >
              <div className="flex items-start gap-2">
                {codeValidation.status === 'valid' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {codeValidation.status === 'invalid' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {codeValidation.status === 'checking' && <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />}
                <span>{codeValidation.message}</span>
              </div>
              {/* Enhanced progress bar for code validation */}
              {validationProgress.codeValidation && (
                <div className="space-y-2 transition-all duration-300 ease-in-out">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-blue-700">{validationProgress.codeValidation.message}</span>
                    <span className="text-blue-600 font-mono">{validationProgress.codeValidation.step}/{validationProgress.codeValidation.total}</span>
                  </div>
                  <div className="relative w-full bg-blue-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ 
                        width: `${(validationProgress.codeValidation.step / validationProgress.codeValidation.total) * 100}%` 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse" />
                    </div>
                    {/* Pulse effect for active progress */}
                    {validationProgress.codeValidation.step < validationProgress.codeValidation.total && (
                      <div className="absolute right-0 top-0 w-1 h-2 bg-blue-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Kod validasiyası</span>
                    <span>{Math.round((validationProgress.codeValidation.step / validationProgress.codeValidation.total) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <p id="code-help-text" className="text-xs text-muted-foreground">
            Müəssisə üçün unikal kod. Məsələn: M001, REG01, SEC001, SCH001
          </p>
          <p id="code-generate-help" className="text-xs text-muted-foreground">
            <kbd className="px-1 py-0.5 text-xs bg-muted border rounded">Alt+G</kbd> avtomatik kod yaratmaq üçün
          </p>
        </div>
      ),
    }),
    createField('utis_code', 'UTIS Kodu', 'custom', {
      validation: z.string()
        .regex(/^\d{8}$/, 'UTIS kodu 8 rəqəmdən ibarət olmalıdır')
        .optional()
        .or(z.literal('')),
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="relative">
            <input
              {...field}
              type="text"
              placeholder="8 rəqəmli UTIS kodu"
              maxLength={8}
              aria-label="UTIS kodu - 8 rəqəmli"
              aria-describedby="utis-validation-message utis-help-text"
              aria-invalid={utisCodeValidation.status === 'invalid'}
              aria-busy={utisCodeValidation.status === 'checking'}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                utisCodeValidation.status === 'valid' && "border-green-500 focus-visible:ring-green-500",
                utisCodeValidation.status === 'invalid' && "border-red-500 focus-visible:ring-red-500"
              )}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                field.onChange(value);
                // Update form completeness
                const formValues = formControl.getValues();
                updateFormCompleteness({ ...formValues, utis_code: value });
                if (value.length === 8) {
                  handleUtisCodeValidation(value);
                } else if (value.length === 0) {
                  setUtisCodeValidation({ status: 'idle' });
                } else {
                  setUtisCodeValidation({ 
                    status: 'invalid', 
                    message: `${8 - value.length} rəqəm əlavə olunmalıdır` 
                  });
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {utisCodeValidation.status === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {utisCodeValidation.status === 'valid' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {utisCodeValidation.status === 'invalid' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          {utisCodeValidation.message && (
            <div
              id="utis-validation-message"
              className={cn(
                "text-sm space-y-2",
                utisCodeValidation.status === 'valid' && "text-green-600",
                utisCodeValidation.status === 'invalid' && "text-red-600"
              )}
              role={utisCodeValidation.status === 'invalid' ? 'alert' : 'status'}
              aria-live={utisCodeValidation.status === 'checking' ? 'polite' : 'assertive'}
            >
              <div className="flex items-start gap-2">
                {utisCodeValidation.status === 'valid' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {utisCodeValidation.status === 'invalid' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {utisCodeValidation.status === 'checking' && <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />}
                <span>{utisCodeValidation.message}</span>
              </div>
              {/* Enhanced progress bar for UTIS validation */}
              {validationProgress.utisValidation && (
                <div className="space-y-2 transition-all duration-300 ease-in-out">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-purple-700">{validationProgress.utisValidation.message}</span>
                    <span className="text-purple-600 font-mono">{validationProgress.utisValidation.step}/{validationProgress.utisValidation.total}</span>
                  </div>
                  <div className="relative w-full bg-purple-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ 
                        width: `${(validationProgress.utisValidation.step / validationProgress.utisValidation.total) * 100}%` 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse" />
                    </div>
                    {/* Pulse effect for active progress */}
                    {validationProgress.utisValidation.step < validationProgress.utisValidation.total && (
                      <div className="absolute right-0 top-0 w-1 h-2 bg-purple-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-purple-600">
                    <span>UTIS kod validasiyası</span>
                    <span>{Math.round((validationProgress.utisValidation.step / validationProgress.utisValidation.total) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <p id="utis-help-text" className="text-xs text-muted-foreground">
            UTIS kodu 8 rəqəmdən ibarət olmalıdır (məsələn: 12345678). Könüllü sahədir.
          </p>
        </div>
      ),
    }),
    // Form progress tracker field
    {
      name: 'form_progress',
      label: '',
      type: 'custom' as const,
      component: (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-700">
                Forma Tamamlanma Vəziyyəti
              </h4>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-700">
                {formCompleteness.percentage}%
              </div>
              <div className="text-xs text-gray-600">
                {formCompleteness.validFields.length} / {formCompleteness.validFields.length + formCompleteness.missingFields.length} sahə
              </div>
            </div>
          </div>
          
          {/* Overall progress bar with gradient effect */}
          <div className="space-y-2 mb-4">
            <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={cn(
                  "h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden",
                  formCompleteness.percentage < 30 ? "bg-gradient-to-r from-red-400 to-red-500" :
                  formCompleteness.percentage < 70 ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                  "bg-gradient-to-r from-green-400 to-emerald-500"
                )}
                style={{ width: `${formCompleteness.percentage}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              </div>
              {/* Percentage label overlay */}
              {formCompleteness.percentage > 15 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                  {formCompleteness.percentage}%
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Minimum məlumatlar</span>
              <span>Tam məlumatlar</span>
            </div>
          </div>
          
          {/* Validation status indicators */}
          {(codeValidation.status !== 'idle' || utisCodeValidation.status !== 'idle') && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {codeValidation.status !== 'idle' && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium",
                  codeValidation.status === 'valid' ? "bg-green-100 text-green-800" :
                  codeValidation.status === 'invalid' ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                )}>
                  {codeValidation.status === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {codeValidation.status === 'valid' && <CheckCircle className="h-3 w-3" />}
                  {codeValidation.status === 'invalid' && <AlertCircle className="h-3 w-3" />}
                  <span>Müəssisə kodu</span>
                </div>
              )}
              {utisCodeValidation.status !== 'idle' && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium",
                  utisCodeValidation.status === 'valid' ? "bg-green-100 text-green-800" :
                  utisCodeValidation.status === 'invalid' ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                )}>
                  {utisCodeValidation.status === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {utisCodeValidation.status === 'valid' && <CheckCircle className="h-3 w-3" />}
                  {utisCodeValidation.status === 'invalid' && <AlertCircle className="h-3 w-3" />}
                  <span>UTIS kodu</span>
                </div>
              )}
            </div>
          )}
          
          {/* Missing required fields warning */}
          {formCompleteness.missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Tələb olunan sahələr ({formCompleteness.missingFields.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {formCompleteness.missingFields.map((field, index) => (
                      <span 
                        key={index}
                        className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success state */}
          {formCompleteness.percentage >= 70 && formCompleteness.missingFields.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Forma hazır! Bütün tələb olunan sahələr doldurulub.
                </p>
              </div>
            </div>
          )}
        </div>
      ),
      className: 'md:col-span-2'
    },
  ];

  // Contact information fields
  const contactFields: FormField[] = [
    createField('phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('email', 'Email', 'email', {
      placeholder: 'email@example.com',
      validation: commonValidations.email.optional(),
    }),
    createField('website', 'Veb sayt', 'text', {
      placeholder: 'https://example.com (ixtiyari)',
      validation: z.string()
        .url('Düzgün URL daxil edin (https://example.com)')
        .optional()
        .or(z.literal('')),
      description: 'Müəssisənin rəsmi veb saytının ünvanı'
    }),
    createField('address', 'Ünvan', 'textarea', {
      placeholder: 'Tam ünvan',
      rows: 3,
      className: 'md:col-span-2'
    }),
  ];

  // Manager and additional information fields
  const managerFields: FormField[] = [
    createField('manager_name', 'Rəhbərin adı', 'text', {
      placeholder: 'Rəhbərin tam adı',
    }),
    createField('manager_phone', 'Rəhbərin telefonu', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('established_date', 'Təsis tarixi', 'date', {
      placeholder: 'Müəssisənin təsis tarixi',
      description: 'Müəssisənin rəsmi təsis tarixi'
    }),
    createField('capacity_students', 'Şagird tutumu', 'number', {
      placeholder: 'Maksimum şagird sayı',
      validation: z.coerce.number().min(1, 'Minimum 1 şagird tutumu olmalıdır').optional().or(z.literal('')),
      description: 'Müəssisənin maksimum şagird tutumu (ixtiyari)'
    }),
  ];

  // Hierarchy display fields - COMPLETELY REMOVED to avoid initialization issues
  // Will be handled differently as a separate overlay or component

  // Performance optimized modal tabs with useMemo to prevent recreation on every render  
  const modalTabs = React.useMemo(() => {
    const baseTabs = [
      {
        id: 'basic',
        label: 'Əsas məlumatlar',
        icon: <Building className="h-4 w-4" />,
        fields: basicFields,
        description: 'Müəssisənin əsas məlumatları və növü',
        color: 'blue' as const,
      },
      {
        id: 'contact',
        label: 'Əlaqə məlumatları',
        icon: <MapPin className="h-4 w-4" />,
        fields: contactFields,
        description: 'Müəssisənin əlaqə məlumatları və ünvanı',
        color: 'green' as const,
      },
      {
        id: 'manager',
        label: 'Əlavə məlumatlar',
        icon: <FileText className="h-4 w-4" />,
        fields: managerFields,
        description: 'Rəhbər məlumatları və əlavə təfərrüatlar',
        color: 'purple' as const,
      },
    ];

    return baseTabs;
  }, [basicFields, contactFields, managerFields]);

  // Performance monitoring and cleanup for memory leak prevention
  React.useEffect(() => {
    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending timeouts that might cause memory leaks
      const timers = (globalThis as any).__institutionModalTimers || [];
      timers.forEach((timerId: number) => clearTimeout(timerId));
      (globalThis as any).__institutionModalTimers = [];
    };
  }, []);


  // Compute default values first
  const defaultValues = React.useMemo(() => {
    if (!institution) {
      // Intelligent default type selection based on user role
      let defaultType;
      if (selectedType) {
        defaultType = selectedType;
      } else if (institutionTypes.length > 0) {
        // For superadmin, prefer ministry; for others, prefer secondary_school
        if (currentUser?.role === 'superadmin') {
          defaultType = institutionTypes.find(type => type.value === 'ministry')?.value ||
                       institutionTypes.find(type => type.level === 1)?.value ||
                       institutionTypes[0].value;
        } else {
          defaultType = institutionTypes.find(type => type.value === 'secondary_school')?.value ||
                       institutionTypes.find(type => type.level === 4)?.value ||
                       institutionTypes[0].value;
        }
      } else {
        defaultType = 'secondary_school';
      }

      const typeData = institutionTypes.find(type => type.value === defaultType);
      const defaultLevel = typeData?.level || 4;
      
      return {
        name: '',
        short_name: '',
        type: defaultType,
        level: defaultLevel,
        code: '',
        address: '',
        phone: '',
        email: '',
        manager_name: '',
        manager_phone: '',
        parent_id: '',
        utis_code: '',
      };
    }

    // Extract type from institution
    const institutionType = typeof institution.type === 'object' ? institution.type.key : institution.type;

    // Safe JSON parsing helper
    const safeJsonParse = (jsonString: string | null | undefined, fallback = {}) => {
      if (!jsonString) return fallback;
      try {
        return JSON.parse(jsonString) || fallback;
      } catch (error) {
        logger.warn('Failed to parse JSON field', error, {
          component: 'InstitutionModalStandardized',
          data: { jsonString: jsonString?.substring(0, 100) }
        });
        return fallback;
      }
    };

    const contactInfo = safeJsonParse(institution.contact_info);
    const location = safeJsonParse(institution.location);

    return {
      name: institution.name || '',
      short_name: institution.short_name || '',
      type: institutionType,
      website: contactInfo.website || '',
      established_date: institution.established_date || '',
      capacity_students: institution.metadata ? safeJsonParse(institution.metadata).capacity_students || '' : '',
      level: institution.level || 4,
      code: institution.institution_code || institution.code || '',
      address: location.address || institution.address || '',
      phone: contactInfo.phone || institution.phone || '',
      email: contactInfo.email || institution.email || '',
      manager_name: contactInfo.manager_name || institution.manager_name || '',
      manager_phone: contactInfo.manager_phone || institution.manager_phone || '',
      parent_id: institution.parent_id?.toString() || '',
      utis_code: (institution as any).utis_code || '',
    };
  }, [institution, selectedType, institutionTypes, currentUser?.role]);

  // Set selected type when modal opens or institution changes - optimized
  React.useEffect(() => {
    if (!open) {
      // Reset state when modal closes - batch state updates
      setSelectedType('');
      setFormCompleteness({ percentage: 0, missingFields: [], validFields: [] });
      setCodeValidation({ status: 'idle' });
      setUtisCodeValidation({ status: 'idle' });
      setSimilarInstitutions([]);
      setShowSimilarWarning(false);
      return;
    }
    
    // Immediate sync without delay for better UX
    if (institution) {
      // Simple type extraction from institution
      const backendType = typeof institution.type === 'object' ? institution.type.key : institution.type;
      setSelectedType(backendType);
      // Update form completeness with existing institution data
      updateFormCompleteness(defaultValues);
    } else if (institutionTypes.length > 0 && !hasUserSelectedType) {
      // Only set default type if user hasn't manually selected one
      let defaultType;

      // For superadmin, prefer ministry (level 1), then secondary_school
      if (currentUser?.role === 'superadmin') {
        defaultType = institutionTypes.find(type => type.value === 'ministry')?.value ||
                     institutionTypes.find(type => type.level === 1)?.value ||
                     institutionTypes[0].value;
      } else {
        // For non-superadmin, default to secondary_school or lowest level available
        defaultType = institutionTypes.find(type => type.value === 'secondary_school')?.value ||
                     institutionTypes.find(type => type.level === 4)?.value ||
                     institutionTypes[0].value;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Default type selection:', {
          userRole: currentUser?.role,
          availableTypes: institutionTypes.map(t => ({ key: t.value, level: t.level })),
          selectedDefault: defaultType,
          reasoning: currentUser?.role === 'superadmin' ? 'SuperAdmin - prefer ministry' : 'Non-superadmin - prefer secondary_school',
          hasUserSelectedType
        });
      }

      setSelectedType(defaultType);
      // Initialize form completeness for new institution
      updateFormCompleteness({ ...defaultValues, type: defaultType });
    }
  }, [open, institution, institutionTypes.length, defaultValues, updateFormCompleteness, currentUser?.role, hasUserSelectedType]);

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      // Transform data for API
      const selectedTypeData = institutionTypes.find(type => type.value === data.type);
      
      // Generate region_code based on type and hierarchy
      const generateRegionCode = () => {
        const typePrefix = {
          'ministry': 'AZ',
          'regional_education_department': 'REG',
          'sector_education_office': 'SEC', 
          'secondary_school': 'SCH',
          'lyceum': 'LYC',
          'gymnasium': 'GYM',
          'kindergarten': 'KDG'
        }[data.type] || 'GEN';
        
        const timestamp = Date.now().toString().slice(-4);
        return `${typePrefix}${timestamp}`;
      };

      const transformedData = {
        name: data.name,
        short_name: data.short_name || '',
        type: data.type,
        institution_code: data.code, // Map 'code' to 'institution_code'
        region_code: generateRegionCode(), // Generate required region_code
        parent_id: data.parent_id ? parseInt(data.parent_id) : null,
        level: selectedTypeData?.level || 4,
        utis_code: data.utis_code || null,
        contact_info: {
          phone: data.phone || '',
          email: data.email || '',
          manager_name: data.manager_name || '',
          manager_phone: data.manager_phone || '',
        },
        location: {
          address: data.address || '',
        },
        metadata: {
          type_id: selectedTypeData?.originalType?.id,
        },
        is_active: true,
        established_date: data.established_date || null,
      };

      logger.info('InstitutionModal submitting data', {
        component: 'InstitutionModalStandardized',
        action: 'submit',
        data: { isEditMode, institutionId: institution?.id, type: data.type }
      });

      await onSave(transformedData);
      
      toast({
        title: "Uğurlu",
        description: isEditMode 
          ? "Müəssisə məlumatları yeniləndi" 
          : "Yeni müəssisə əlavə edildi",
      });
    } catch (error) {
      logger.error('InstitutionModal submit failed', error, {
        component: 'InstitutionModalStandardized',
        action: 'submit'
      });
      
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent modal from closing
    }
  }, [onSave, isEditMode, institution?.id, toast, institutionTypes]);

  const isLoading = typesLoading || parentsLoading;

  // Debug logging with better structure
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('InstitutionModalStandardized render state', {
        component: 'InstitutionModalStandardized',
        data: {
          open,
          isLoading,
          institutionTypesLength: institutionTypes.length,
          selectedType,
          hasInstitution: !!institution,
          parentInstitutionsCount: parentInstitutions?.data?.length || 0
        }
      });
    }
  }, [open, isLoading, institutionTypes.length, selectedType, institution, parentInstitutions?.data?.length]);

  // Check if any critical loading is happening
  const hasGlobalLoading = loadingStates.institutionTypes || 
                          loadingStates.parentInstitutions || 
                          loadingStates.formSubmission ||
                          globalProgress.stage === 'loading_types' ||
                          globalProgress.stage === 'loading_parents';

  return (
    <>
      {/* Global Loading Overlay - Mobile Optimized */}
      {hasGlobalLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8 max-w-sm sm:max-w-md w-full mx-3 sm:mx-4 border border-gray-200 min-h-0 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              {/* Loading Icon - Mobile Optimized */}
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-blue-200 rounded-full animate-spin">
                  <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
              
              {/* Progress Information - Mobile Optimized */}
              <div className="text-center space-y-2 sm:space-y-3 w-full">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 px-2">
                  {globalProgress.message}
                </h3>
                
                {/* Overall Progress Bar - Mobile Optimized */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Yükləmə mərhələsi</span>
                    <span className="font-medium">{globalProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${globalProgress.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                    </div>
                  </div>
                </div>
                
                {/* Sub-steps Progress */}
                {globalProgress.subSteps && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Addım {globalProgress.subSteps.step}/{globalProgress.subSteps.total}</span>
                      <span>{Math.round((globalProgress.subSteps.step / globalProgress.subSteps.total) * 100)}%</span>
                    </div>
                    <p className="text-sm text-gray-600">{globalProgress.subSteps.current}</p>
                    <div className="flex space-x-1">
                      {Array.from({ length: globalProgress.subSteps.total }, (_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 h-1 rounded-full transition-all duration-300",
                            i < globalProgress.subSteps.step 
                              ? "bg-green-500" 
                              : i === globalProgress.subSteps.step - 1
                              ? "bg-blue-500 animate-pulse"
                              : "bg-gray-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Loading States Summary - Mobile Optimized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-xs font-medium",
                    loadingStates.institutionTypes 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-green-100 text-green-800"
                  )}>
                    {loadingStates.institutionTypes ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>Növlər</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-xs font-medium",
                    loadingStates.parentInstitutions 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-green-100 text-green-800"
                  )}>
                    {loadingStates.parentInstitutions ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>Ana təşkilatlar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      
      <BaseModal
        open={open}
        onClose={onClose}
        title={isEditMode ? 'Müəssisəni redaktə et' : 'Yeni müəssisə əlavə et'}
        description="Müəssisə məlumatlarını daxil edin. İyerarxiya: Nazirlik → Regional İdarə → Sektor → Məktəb"
        loading={isLoading}
        loadingText="Müəssisə növləri yüklənir..."
        entityBadge={(institution as any)?.utis_code ? `UTIS: ${(institution as any).utis_code}` : undefined}
        entity={institution}
        tabs={modalTabs}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel={isEditMode ? 'Yenilə' : 'Əlavə et'}
        maxWidth="4xl"
        columns={1}
      />
      
      {/* Network Error Notification - Mobile Optimized */}
      {networkError && lastFailedOperation && (
        <div className="fixed bottom-2 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 max-w-sm sm:max-w-md z-50">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 sm:p-4 rounded-md shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <WifiOff className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-amber-800">
                  İnternet bağlantısı problemi
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Əməliyyat tamamlanamadı. İnternet bağlantınızı yoxlayın.
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleManualRetry}
                    className="inline-flex items-center gap-2 text-sm bg-amber-100 text-amber-800 px-4 py-2 rounded-md hover:bg-amber-200 active:bg-amber-300 transition-colors touch-manipulation min-h-[44px]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Yenidən cəhd et
                  </button>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => {
                    setNetworkError(false);
                    setLastFailedOperation(null);
                  }}
                  className="inline-flex text-amber-400 hover:text-amber-600 active:text-amber-700 p-1 rounded-md touch-manipulation min-h-[44px] min-w-[44px] items-center justify-center"
                >
                  <span className="sr-only">Bağla</span>
                  <AlertCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcements}
      </div>
    </>
  );
};

// Performance optimized export with React.memo to prevent unnecessary re-renders
// Deep comparison for props that are objects/functions
export const InstitutionModalStandardized = React.memo(InstitutionModalStandardizedComponent, (prevProps, nextProps) => {
  // Custom comparison logic for better performance
  const isEqual = (
    prevProps.open === nextProps.open &&
    prevProps.institution?.id === nextProps.institution?.id &&
    prevProps.institution?.updated_at === nextProps.institution?.updated_at &&
    // onSave and onClose are typically stable functions, but check reference equality
    prevProps.onSave === nextProps.onSave &&
    prevProps.onClose === nextProps.onClose
  );

  // Performance monitoring in development
  if (process.env.NODE_ENV === 'development') {
    if (!isEqual) {
      const changes = [];
      if (prevProps.open !== nextProps.open) changes.push('open');
      if (prevProps.institution?.id !== nextProps.institution?.id) changes.push('institution.id');
      if (prevProps.institution?.updated_at !== nextProps.institution?.updated_at) changes.push('institution.updated_at');
      if (prevProps.onSave !== nextProps.onSave) changes.push('onSave');
      if (prevProps.onClose !== nextProps.onClose) changes.push('onClose');
      
      console.log('🔄 InstitutionModal re-rendering due to:', changes.join(', '));
    } else {
      console.log('⚡ InstitutionModal render prevented by React.memo');
    }
  }

  return isEqual;
});

// Add display name for better debugging
InstitutionModalStandardized.displayName = 'InstitutionModalStandardized';