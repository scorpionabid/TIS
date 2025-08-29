import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/BaseModal';
import { FormField, createField, commonValidations } from '@/components/forms/FormBuilder';
import { Institution, CreateInstitutionData } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionTypes } from '@/hooks/useInstitutionTypes';
import { useToast } from '@/hooks/use-toast';
import { Building, MapPin, User, FileText } from 'lucide-react';
import { logger } from '@/utils/logger';
import { z } from 'zod';

interface InstitutionModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  institution?: Institution | null;
  onSave: (data: CreateInstitutionData) => Promise<void>;
}

export const InstitutionModalStandardized: React.FC<InstitutionModalStandardizedProps> = ({
  open,
  onClose,
  institution,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!institution;
  const [selectedType, setSelectedType] = React.useState<string>('');

  // Load institution types with role-based fallback
  const { data: institutionTypesResponse, isLoading: typesLoading } = useInstitutionTypes({
    userRole: currentUser?.role,
    enabled: open // Always enabled when modal is open, don't wait for user
  });

  // Transform institution types for UI
  const institutionTypes = React.useMemo(() => {
    console.log('🔍 institutionTypesResponse:', institutionTypesResponse);
    
    // Check if we have data in the response
    let types = [];
    if (institutionTypesResponse?.institution_types) {
      types = institutionTypesResponse.institution_types;
    } else if (institutionTypesResponse?.data?.institution_types) {
      types = institutionTypesResponse.data.institution_types;
    } else if (Array.isArray(institutionTypesResponse?.data)) {
      types = institutionTypesResponse.data;
    } else if (Array.isArray(institutionTypesResponse)) {
      types = institutionTypesResponse;
    } else {
      console.warn('⚠️ No institution types found in response:', institutionTypesResponse);
      return [];
    }
    
    console.log('✅ Found institution types:', types);
    
    return types.map((type: any) => ({
      label: `${type.label_az || type.label} (Səviyyə ${type.default_level})`,
      value: type.key,
      level: type.default_level,
      allowedParents: type.allowed_parent_types || [],
      icon: type.icon,
      color: type.color,
      originalType: type
    }));
  }, [institutionTypesResponse]);

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
        
      if (parentTypes.length === 0) {
        return { data: [] };
      }
      
      // Load institutions of parent types
      try {
        const allParents = [];
        for (const parentType of parentTypes) {
          try {
            const result = await institutionService.getAll({ type: parentType });
            const institutions = result?.data?.data || result?.data;
            if (institutions && Array.isArray(institutions)) {
              allParents.push(...institutions);
            }
          } catch (err) {
            logger.warn('Failed to load institutions for parent type', err, {
              component: 'InstitutionModalStandardized',
              action: 'loadParents',
              data: { parentType }
            });
          }
        }
        
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

  const parentInstitutionOptions = React.useMemo(() => {
    if (!parentInstitutions?.data) return [];
    
    return parentInstitutions.data.map((parent: any) => {
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
  }, [parentInstitutions]);

  // Get current selected level based on selected type
  const getCurrentSelectedLevel = React.useCallback(() => {
    if (!selectedType || institutionTypes.length === 0) return 1;
    const selectedTypeData = institutionTypes.find(type => type.value === selectedType);
    return selectedTypeData?.level || 1;
  }, [selectedType, institutionTypes]);

  // Basic institution information fields
  const basicFields: FormField[] = [
    createField('name', 'Ad', 'text', {
      required: true,
      placeholder: 'Müəssisənin tam adı',
      validation: commonValidations.required,
    }),
    createField('short_name', 'Qısa Ad', 'text', {
      placeholder: 'Müəssisənin qısa adı (ixtiyari)',
      description: 'Müəssisə üçün qısa ad. Məsələn: TM, REİ, HTŞ',
    }),
    createField('type', 'Növ', 'select', {
      required: true,
      options: institutionTypes,
      placeholder: typesLoading ? 'Yüklənir...' : 'Müəssisə növünü seçin',
      disabled: typesLoading,
      validation: commonValidations.required,
      onChange: (value: string) => {
        setSelectedType(value);
      },
    }),
    // Add info field for level 1 institutions (ministry) - show disabled placeholder
    ...(selectedType && getCurrentSelectedLevel() === 1 ? [
      createField('parent_info', 'Ana Təşkilat', 'text', {
        disabled: true,
        placeholder: '🏛️ Səviyyə 1 müəssisələr ən üst səviyyədə olduğu üçün ana təşkilatı yoxdur',
        description: 'Nazirlik səviyyəsindəki müəssisələrin ana təşkilatı olmur',
        className: 'md:col-span-2'
      })
    ] : []),
    ...(selectedType && selectedType !== 'ministry' && getCurrentSelectedLevel() > 1 ? [
      createField('parent_id', 'Ana Təşkilat', 'select', {
        required: true,
        options: parentInstitutionOptions,
        placeholder: parentsLoading ? 'Yüklənir...' : 
                   selectedType === 'region' || selectedType === 'regional' ? 'Nazirliyi seçin' :
                   selectedType === 'sektor' || selectedType === 'sector' ? 'Regional idarəni seçin' :
                   selectedType === 'school' ? 'Sektoru seçin' :
                   'Ana təşkilatı seçin',
        disabled: parentsLoading,
        validation: commonValidations.required,
        className: 'md:col-span-2',
        description: `Səviyyə ${getCurrentSelectedLevel()} müəssisələrinin ana təşkilatı seçilməlidir`
      })
    ] : []),
    createField('code', 'Müəssisə Kodu', 'text', {
      required: true,
      placeholder: 'Müəssisə kodu (tələb olunur)',
      validation: commonValidations.required,
      description: 'Müəssisə üçün unikal kod. Məsələn: M001, REG01, SEC001, SCH001',
    }),
    createField('utis_code', 'UTIS Kodu', 'text', {
      placeholder: '8 rəqəmli UTIS kodu',
      description: 'UTIS kodu 8 rəqəmdən ibarət olmalıdır (məsələn: 12345678). Könüllü sahədir.',
      validation: z.string()
        .regex(/^\d{8}$/, 'UTIS kodu 8 rəqəmdən ibarət olmalıdır')
        .optional()
        .or(z.literal('')),
    }),
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
    createField('address', 'Ünvan', 'textarea', {
      placeholder: 'Tam ünvan',
      rows: 3,
      className: 'md:col-span-2'
    }),
  ];

  // Manager information fields
  const managerFields: FormField[] = [
    createField('manager_name', 'Rəhbərin adı', 'text', {
      placeholder: 'Rəhbərin tam adı',
    }),
    createField('manager_phone', 'Rəhbərin telefonu', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
  ];

  const modalTabs = [
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
      label: 'Rəhbər məlumatları',
      icon: <User className="h-4 w-4" />,
      fields: managerFields,
      description: 'Müəssisə rəhbərinin əlaqə məlumatları',
      color: 'orange' as const,
    },
  ];

  // Set selected type when modal opens or institution changes
  React.useEffect(() => {
    console.log('🔄 Modal useEffect triggered:', { open, institution, institutionTypes: institutionTypes.length });
    
    if (open) {
      if (institution) {
        // Map backend types to frontend types
        const typeMap = {
          'ministry': 'ministry',
          'regional_education_department': 'region',
          'sector_education_office': 'sektor',
          'region': 'region',
          'sektor': 'sektor',
          'school': 'school',
          'secondary_school': 'school',
          'lyceum': 'school',
          'gymnasium': 'school',
          'primary_school': 'school',
          'vocational': 'school',
          'university': 'school'
        };
        const normalizedType = typeMap[institution.type] || 'school';
        console.log('📝 Setting selected type for editing:', normalizedType);
        setSelectedType(normalizedType);
      } else {
        // For new institutions, set default type only if we have types available
        if (institutionTypes.length > 0) {
          const defaultType = institutionTypes.find(type => type.value === 'school')?.value || institutionTypes[0].value;
          console.log('📝 Setting default type for new institution:', defaultType);
          setSelectedType(defaultType);
        } else {
          console.log('⚠️ No institution types available, setting fallback default');
          setSelectedType('school');
        }
      }
    }
  }, [open, institution, institutionTypes]);

  const prepareDefaultValues = React.useCallback(() => {
    console.log('📋 Preparing default values:', { institution, selectedType, institutionTypesLength: institutionTypes.length });
    
    if (!institution) {
      const defaultType = selectedType || (institutionTypes.length > 0 ? institutionTypes[0].value : 'school');
      const typeData = institutionTypes.find(type => type.value === defaultType);
      const defaultLevel = typeData?.level || 4;
      
      console.log('📋 New institution defaults:', { defaultType, defaultLevel, typeData });
      
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
        parent_id: defaultLevel === 1 ? null : undefined, // Level 1 has no parent
        utis_code: '',
      };
    }

    // Map backend types to frontend types
    const typeMap = {
      'ministry': 'ministry',
      'regional_education_department': 'region',
      'sector_education_office': 'sektor',
      'region': 'region',
      'sektor': 'sektor',
      'school': 'school',
      'secondary_school': 'school',
      'lyceum': 'school',
      'gymnasium': 'school',
      'primary_school': 'school',
      'vocational': 'school',
      'university': 'school'
    };

    const normalizedType = typeMap[institution.type] || 'school';

    // Parse JSON fields from backend
    let contactInfo = {};
    let location = {};
    
    try {
      contactInfo = institution.contact_info ? JSON.parse(institution.contact_info) : {};
    } catch (e) {
      logger.warn('Failed to parse contact_info', null, {
        component: 'InstitutionModalStandardized',
        data: { contactInfo: institution.contact_info }
      });
    }
    
    try {
      location = institution.location ? JSON.parse(institution.location) : {};
    } catch (e) {
      logger.warn('Failed to parse location', null, {
        component: 'InstitutionModalStandardized',
        data: { location: institution.location }
      });
    }

    return {
      name: institution.name || '',
      short_name: institution.short_name || '',
      type: normalizedType,
      level: institution.level || 4,
      code: institution.institution_code || institution.code || '',
      address: location.address || institution.address || '',
      phone: contactInfo.phone || institution.phone || '',
      email: contactInfo.email || institution.email || '',
      manager_name: contactInfo.manager_name || institution.manager_name || '',
      manager_phone: contactInfo.manager_phone || institution.manager_phone || '',
      parent_id: institution.parent_id?.toString() || '',
      utis_code: institution.utis_code || '',
    };
  }, [institution]);

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      // Transform data for API
      const selectedTypeData = institutionTypes.find(type => type.value === data.type);
      
      // Generate region_code based on type and hierarchy
      const generateRegionCode = () => {
        const typePrefix = data.type === 'ministry' ? 'AZ' :
                          data.type === 'regional' ? 'REG' :
                          data.type === 'sector' ? 'SEC' :
                          data.type === 'school' ? 'SCH' : 'GEN';
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
        utis_code: data.utis_code || '',
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

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Müəssisəni redaktə et' : 'Yeni müəssisə əlavə et'}
      description="Müəssisə məlumatlarını daxil edin. İyerarxiya: Nazirlik → Regional İdarə → Sektor → Məktəb"
      loading={isLoading}
      loadingText="Müəssisə növləri yüklənir..."
      entityBadge={institution?.utis_code ? `UTIS: ${institution.utis_code}` : undefined}
      entity={institution}
      tabs={modalTabs}
      defaultValues={prepareDefaultValues()}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Yenilə' : 'Əlavə et'}
      maxWidth="3xl"
      columns={2}
    />
  );
};