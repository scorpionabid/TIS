import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/BaseModal';
import { Institution, CreateInstitutionData } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionTypesSimple } from '@/hooks/useInstitutionTypes';
import { useToast } from '@/hooks/use-toast';
import { Building, MapPin, FileText, CheckCircle, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useInstitutionFormFields } from './institution/InstitutionFormFields';
import { useInstitutionValidation } from './institution/useInstitutionValidation';

interface InstitutionModalProps {
  open: boolean;
  onClose: () => void;
  institution?: Institution | null;
  onSave: (data: CreateInstitutionData) => Promise<void>;
}

const InstitutionModalComponent: React.FC<InstitutionModalProps> = ({
  open,
  onClose,
  institution,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!institution;
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [hasUserSelectedType, setHasUserSelectedType] = React.useState(false);

  // Refs for accessibility and focus management
  const codeInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

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

  // Reset user selection flag when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setHasUserSelectedType(false);
    }
  }, [open]);

  // Load institution types with simplified hook
  const { institutionTypes: rawInstitutionTypes, isLoading: typesLoading, isError: typesError } = useInstitutionTypesSimple(currentUser?.role);

  // Initialize validation hooks
  const {
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
    handleGenerateCode,
    handleManualRetry,
    updateFormCompleteness,
  } = useInstitutionValidation(institution);

  // Debug log current user role and types loading
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Institution Types Loading Debug:', {
        currentUser: {
          id: currentUser?.id,
          name: currentUser?.name,
          username: currentUser?.username,
          role: currentUser?.role,
          roles: currentUser?.role
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
  }, [typesLoading, typesError, rawInstitutionTypes, setLoadingStates]);

  // Transform institution types for UI
  const institutionTypes = React.useMemo(() => {
    if (!rawInstitutionTypes || rawInstitutionTypes.length === 0) {
      logger.warn('No institution types available', {
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

      if (currentLevel <= 1) {
        return { data: [] };
      }

      const parentLevel = currentLevel - 1;
      const parentTypes = institutionTypes
        .filter(type => type.level === parentLevel)
        .map(type => type.value);

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

      try {
        const allParents = [];
        for (const parentType of parentTypes) {
          try {
            console.log(`🔍 Loading institutions for parent type: ${parentType}`);
            const result = await institutionService.getAll({ search: `type:${parentType}` });
            const institutions = result?.data?.data || result?.data;

            if (institutions && Array.isArray(institutions)) {
              console.log(`✅ Found ${institutions.length} institutions for type: ${parentType}`);
              allParents.push(...institutions);
            } else {
              console.warn(`⚠️ No institutions found for type: ${parentType}`, { result });
            }
          } catch (err) {
            console.error(`❌ Failed to load institutions for parent type: ${parentType}`, err);
            logger.warn('Failed to load institutions for parent type', {
              component: 'InstitutionModalStandardized',
              action: 'loadParents',
              data: { parentType, errorMessage: err instanceof Error ? err.message : String(err) }
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
  }, [parentsLoading, selectedType, setLoadingStates]);

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

  // Get current selected level based on selected type
  const getCurrentSelectedLevel = React.useCallback(() => {
    if (!selectedType || institutionTypes.length === 0) return 1;
    const selectedTypeData = institutionTypes.find(type => type.value === selectedType);
    const level = selectedTypeData?.level || 1;

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

  // Get form fields from hook
  const { basicFields, contactFields, managerFields } = useInstitutionFormFields({
    institutionTypes,
    parentInstitutionOptions,
    selectedType,
    setSelectedType,
    setHasUserSelectedType,
    codeValidation,
    utisCodeValidation,
    similarInstitutions,
    showSimilarWarning,
    formCompleteness,
    codeGenerationLoading,
    typesLoading,
    typesError,
    parentsLoading,
    validationProgress,
    codeInputRef,
    nameInputRef,
    handleCodeValidation,
    handleUtisCodeValidation,
    handleGenerateCode,
    updateFormCompleteness,
    getCurrentSelectedLevel,
  });

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

  // Compute default values
  const defaultValues = React.useMemo(() => {
    if (!institution) {
      let defaultType: string;
      if (selectedType) {
        defaultType = selectedType;
      } else if (institutionTypes.length > 0) {
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

    const institutionType = typeof institution.type === 'object' ? institution.type.key : institution.type;

    const safeJsonParse = (jsonString: string | null | undefined, fallback = {}) => {
      if (!jsonString) return fallback;
      try {
        return JSON.parse(jsonString) || fallback;
      } catch (error) {
        logger.warn('Failed to parse JSON field', {
          component: 'InstitutionModalStandardized',
          data: {
            jsonString: typeof jsonString === 'string' ? jsonString.substring(0, 100) : String(jsonString),
            errorMessage: error instanceof Error ? error.message : String(error)
          }
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

  // Set selected type when modal opens or institution changes
  React.useEffect(() => {
    if (!open) {
      setSelectedType('');
      return;
    }

    if (institution) {
      const backendType = typeof institution.type === 'object' ? institution.type.key : institution.type;
      setSelectedType(backendType);
      updateFormCompleteness(defaultValues, institutionTypes);
    } else if (institutionTypes.length > 0 && !hasUserSelectedType) {
      let defaultType: string;

      if (currentUser?.role === 'superadmin') {
        defaultType = institutionTypes.find(type => type.value === 'ministry')?.value ||
                     institutionTypes.find(type => type.level === 1)?.value ||
                     institutionTypes[0].value;
      } else {
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
      updateFormCompleteness({ ...defaultValues, type: defaultType }, institutionTypes);
    }
  }, [open, institution, institutionTypes.length, defaultValues, updateFormCompleteness, currentUser?.role, hasUserSelectedType, institutionTypes]);

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      const selectedTypeData = institutionTypes.find(type => type.value === data.type);

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
        institution_code: data.code,
        region_code: generateRegionCode(),
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
      throw error;
    }
  }, [onSave, isEditMode, institution?.id, toast, institutionTypes]);

  const isLoading = typesLoading || parentsLoading;

  // Check if any critical loading is happening
  const hasGlobalLoading = loadingStates.institutionTypes ||
                          loadingStates.parentInstitutions ||
                          loadingStates.formSubmission ||
                          globalProgress.stage === 'loading_types' ||
                          globalProgress.stage === 'loading_parents';

  return (
    <>
      {/* Global Loading Overlay */}
      {hasGlobalLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8 max-w-sm sm:max-w-md w-full mx-3 sm:mx-4 border border-gray-200 min-h-0 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-blue-200 rounded-full animate-spin">
                  <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>

              <div className="text-center space-y-2 sm:space-y-3 w-full">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 px-2">
                  {globalProgress.message}
                </h3>

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

      {/* Network Error Notification */}
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

// Performance optimized export with React.memo
export const InstitutionModalStandardized = React.memo(InstitutionModalComponent, (prevProps, nextProps) => {
  const isEqual = (
    prevProps.open === nextProps.open &&
    prevProps.institution?.id === nextProps.institution?.id &&
    prevProps.institution?.updated_at === nextProps.institution?.updated_at &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onClose === nextProps.onClose
  );

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

InstitutionModalStandardized.displayName = 'InstitutionModalStandardized';