import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/BaseModal';
import { FormField, createField } from '@/components/forms/FormBuilder';
import { InstitutionType, institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { institutionTypeFields } from '@/components/modals/configurations/modalFieldConfig';
import { Building, Palette, Settings, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InstitutionTypeModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  institutionType?: InstitutionType | null;
  onSave: (data: Partial<InstitutionType>) => Promise<void>;
}

export const InstitutionTypeModalStandardized: React.FC<InstitutionTypeModalStandardizedProps> = ({
  open,
  onClose,
  institutionType,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Load existing institution types for parent type selection
  const { data: institutionTypesResponse, isLoading: typesLoading } = useQuery({
    queryKey: ['institution-types'],
    queryFn: () => institutionService.getInstitutionTypes(),
    enabled: open,
  });

  const existingTypes = institutionTypesResponse?.institution_types || [];

  // Multi-select for allowed parent types
  const allowedParentTypesField: FormField = useMemo(() => ({
    name: 'allowed_parent_types',
    label: 'İcazə verilən ana növlər',
    type: 'multiselect',
    placeholder: 'Ana növlər seçin',
    description: 'Bu növ hansı ana növlərin altında ola bilər',
    options: existingTypes.map((type: any) => ({
      label: `${type.label_az || type.label} (${type.key})`,
      value: type.key
    })),
    validation: undefined,
  }), [existingTypes]);

  // Basic information fields
  const basicFields: FormField[] = useMemo(() => [
    institutionTypeFields.key,
    institutionTypeFields.label,
    institutionTypeFields.labelAz,
    institutionTypeFields.labelEn,
  ], []);

  // Configuration fields
  const configFields: FormField[] = useMemo(() => [
    institutionTypeFields.defaultLevel,
    allowedParentTypesField,
    institutionTypeFields.isActive,
  ], [allowedParentTypesField]);

  // Appearance fields
  const appearanceFields: FormField[] = useMemo(() => [
    institutionTypeFields.icon,
    institutionTypeFields.color,
  ], []);

  // Description field
  const detailFields: FormField[] = useMemo(() => [
    institutionTypeFields.description,
  ], []);

  // Default values for form
  const defaultValues = useMemo(() => {
    if (!institutionType) {
      return {
        key: '',
        label: '',
        label_az: '',
        label_en: '',
        default_level: '4',
        allowed_parent_types: [],
        icon: 'Building',
        color: '#3B82F6',
        description: '',
        is_active: true,
      };
    }

    return {
      key: institutionType.key || '',
      label: institutionType.label || '',
      label_az: institutionType.label_az || '',
      label_en: institutionType.label_en || '',
      default_level: institutionType.default_level?.toString() || '4',
      allowed_parent_types: institutionType.allowed_parent_types || [],
      icon: institutionType.icon || 'Building',
      color: institutionType.color || '#3B82F6',
      description: institutionType.description || '',
      is_active: institutionType.is_active !== false,
    };
  }, [institutionType]);

  // Form submission handler
  const handleSubmit = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const submitData: Partial<InstitutionType> = {
        key: data.key?.toLowerCase().replace(/\s+/g, '_'), // Ensure proper formatting
        label: data.label,
        label_az: data.label_az || data.label,
        label_en: data.label_en,
        default_level: parseInt(data.default_level),
        allowed_parent_types: data.allowed_parent_types || [],
        icon: data.icon,
        color: data.color,
        description: data.description,
        is_active: data.is_active !== false,
      };

      await onSave(submitData);
      
      toast({
        title: 'Uğur!',
        description: institutionType ? 'Müəssisə növü uğurla yeniləndi' : 'Müəssisə növü uğurla əlavə edildi',
      });
    } catch (error) {
      console.error('Institution type save failed:', error);
      toast({
        title: 'Xəta',
        description: 'Müəssisə növü yadda saxlanıla bilmədi',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onSave, institutionType, toast]);

  // Modal tabs configuration
  const tabs = [
    {
      id: 'basic',
      label: 'Əsas məlumatlar',
      icon: <Building className="h-4 w-4" />,
      fields: basicFields,
      description: 'Müəssisə növünün əsas adları və identifikatorları',
      color: 'blue' as const,
    },
    {
      id: 'config',
      label: 'Konfiqurasiya',
      icon: <Settings className="h-4 w-4" />,
      fields: configFields,
      description: 'İyerarxiya səviyyəsi və ana növ tənzimləmələri',
      color: 'green' as const,
    },
    {
      id: 'appearance',
      label: 'Görünüş',
      icon: <Palette className="h-4 w-4" />,
      fields: appearanceFields,
      description: 'İkon və rəng seçimləri',
      color: 'purple' as const,
    },
    {
      id: 'details',
      label: 'Təfərrüatlar',
      icon: <Info className="h-4 w-4" />,
      fields: detailFields,
      description: 'Əlavə təsvir və məlumatlar',
      color: 'orange' as const,
    },
  ];

  // Custom entity badge with preview
  const entityBadge = useMemo(() => {
    if (!institutionType && !defaultValues.key) return 'Yeni';
    
    const currentData = institutionType || defaultValues;
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" style={{ color: currentData.color }}>
          {currentData.icon} {currentData.label_az || currentData.label || 'Yeni'}
        </Badge>
      </div>
    );
  }, [institutionType, defaultValues]);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={institutionType ? 'Müəssisə növünü redaktə et' : 'Yeni müəssisə növü əlavə et'}
      description="Müəssisə növü təyinatları sistem daxilində müəssisələrin təsnifatı üçün istifadə olunur."
      loading={loading || typesLoading}
      loadingText={typesLoading ? 'Mövcud növlər yüklənir...' : undefined}
      entityBadge={entityBadge}
      entity={institutionType}
      tabs={tabs}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitLabel={institutionType ? 'Yenilə' : 'Əlavə et'}
      maxWidth="4xl"
      columns={2}
    />
  );
};