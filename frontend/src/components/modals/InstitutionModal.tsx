import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Institution, CreateInstitutionData } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionTypes } from '@/hooks/useInstitutionTypes';
import { useQuery } from '@tanstack/react-query';

interface InstitutionModalProps {
  open: boolean;
  onClose: () => void;
  institution?: Institution | null;
  onSave: (data: CreateInstitutionData) => Promise<void>;
}

// Remove hardcoded types - we'll load them dynamically

export const InstitutionModal: React.FC<InstitutionModalProps> = ({
  open,
  onClose,
  institution,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<CreateInstitutionData>({
    name: '',
    type: 'school',
    level: 4, // Default to school level
    code: '',
    address: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    parent_id: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load institution types with role-based fallback
  const { data: institutionTypesResponse, isLoading: typesLoading } = useInstitutionTypes({
    userRole: currentUser?.role,
    enabled: !!currentUser && open
  });

  // Transform institution types for UI
  const institutionTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.institution_types) {
      console.log('❌ No institution types in response:', institutionTypesResponse);
      return [];
    }
    
    const transformed = institutionTypesResponse.institution_types.map((type: InstitutionType) => ({
      value: type.key,
      label: type.label_az || type.label,
      level: type.default_level,
      allowedParents: type.allowed_parent_types,
      icon: type.icon,
      color: type.color,
      originalType: type
    }));
    
    console.log('✅ Transformed institution types:', transformed);
    return transformed;
  }, [institutionTypesResponse]);

  // Get potential parent institutions based on selected type
  const { data: parentInstitutions } = useQuery({
    queryKey: ['parent-institutions', formData.type, institutionTypes.length],
    queryFn: async () => {
      console.log('🏢 Loading parent institutions for type:', formData.type);
      
      if (!formData.type || institutionTypes.length === 0) {
        return Promise.resolve({ data: [] });
      }
      
      // Find selected type details
      const selectedType = institutionTypes.find(type => type.value === formData.type);
      if (!selectedType) {
        console.log('❌ Selected type not found in institutionTypes');
        return Promise.resolve({ data: [] });
      }
      
      const currentLevel = selectedType.level;
      console.log('📊 Current type level:', currentLevel);
      
      // Level 1 (ministry) has no parents
      if (currentLevel <= 1) {
        console.log('👑 Level 1 - no parent institutions needed');
        return Promise.resolve({ data: [] });
      }
      
      // Find parent types (level - 1)
      const parentLevel = currentLevel - 1;
      const parentTypes = institutionTypes
        .filter(type => type.level === parentLevel)
        .map(type => type.value);
        
      console.log('🔗 Parent types for level', parentLevel, ':', parentTypes);
      
      if (parentTypes.length === 0) {
        console.log('❌ No parent types found for level', parentLevel);
        return Promise.resolve({ data: [] });
      }
      
      // Load institutions of parent types
      try {
        const allParents = [];
        for (const parentType of parentTypes) {
          try {
            console.log('🔄 Loading institutions for parent type:', parentType);
            // Use getAll with type filter instead of getByType
            const result = await institutionService.getAll({ type: parentType });
            console.log('📋 GetAll result structure for type', parentType, ':', result);
            
            // Handle paginated response structure: result.data.data contains the actual institutions array
            const institutions = result?.data?.data || result?.data;
            if (institutions && Array.isArray(institutions)) {
              console.log('✅ Found', institutions.length, 'institutions for type', parentType);
              allParents.push(...institutions);
            } else {
              console.log('⚠️ Unexpected result format for type', parentType, ':', typeof result, result);
              console.log('⚠️ Expected institutions array, got:', institutions);
            }
          } catch (err) {
            console.warn('⚠️ Failed to load institutions for type:', parentType, err);
          }
        }
        
        console.log('📦 All parent institutions loaded:', allParents.length, allParents);
        return Promise.resolve({ data: allParents });
      } catch (error) {
        console.error('❌ Failed to load parent institutions:', error);
        throw error;
      }
    },
    enabled: !!formData.type && institutionTypes.length > 0 && open,
  });

  useEffect(() => {
    console.log('🔄 InstitutionModal useEffect triggered', { 
      hasInstitution: !!institution, 
      institutionId: institution?.id,
      institutionName: institution?.name,
      open 
    });
    
    if (open && institution) {
      console.log('📝 EDIT MODE: Setting form data for existing institution:', {
        id: institution.id,
        name: institution.name,
        type: institution.type,
        level: institution.level,
        parent_id: institution.parent_id,
        code: institution.code,
        fullInstitution: institution
      });
      
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
      
      const levelMap = {
        'ministry': 1,
        'region': 2,
        'sektor': 3,
        'school': 4
      };
      
      const normalizedType = typeMap[institution.type] || 'school';
      console.log('🔄 Type mapping:', { originalType: institution.type, normalizedType });
      
      // Parse JSON fields from backend
      let contactInfo = {};
      let location = {};
      let metadata = {};
      
      try {
        contactInfo = institution.contact_info ? JSON.parse(institution.contact_info) : {};
      } catch (e) {
        console.warn('Failed to parse contact_info:', institution.contact_info);
      }
      
      try {
        location = institution.location ? JSON.parse(institution.location) : {};
      } catch (e) {
        console.warn('Failed to parse location:', institution.location);
      }
      
      try {
        metadata = institution.metadata ? JSON.parse(institution.metadata) : {};
      } catch (e) {
        console.warn('Failed to parse metadata:', institution.metadata);
      }
      
      console.log('📋 Parsed JSON fields:', { contactInfo, location, metadata });
      
      const newFormData = {
        name: institution.name || '',
        type: normalizedType,
        level: institution.level || levelMap[normalizedType] || 4,
        code: institution.institution_code || institution.code || '',
        address: location.address || institution.address || '',
        phone: contactInfo.phone || institution.phone || '',
        email: contactInfo.email || institution.email || '',
        manager_name: contactInfo.manager_name || institution.manager_name || '',
        manager_phone: contactInfo.manager_phone || institution.manager_phone || '',
        parent_id: institution.parent_id,
      };
      
      console.log('📋 EDIT MODE: Setting form data:', newFormData);
      setFormData(newFormData);
    } else if (open && !institution) {
      console.log('➕ CREATE MODE: Setting empty form data');
      
      const emptyFormData = {
        name: '',
        type: '',
        level: 4,
        code: '',
        address: '',
        phone: '',
        email: '',
        manager_name: '',
        manager_phone: '',
        parent_id: undefined,
      };
      
      console.log('📋 CREATE MODE: Setting form data:', emptyFormData);
      setFormData(emptyFormData);
      setErrors({});
    }
    
    console.log('🧹 Clearing errors');
    setErrors({});
  }, [institution, open]);

  const handleInputChange = (field: keyof CreateInstitutionData, value: any) => {
    let updatedData = { ...formData, [field]: value };
    
    // Auto-set level based on type
    if (field === 'type') {
      const levelMap = {
        'ministry': 1,
        'region': 2,
        'sektor': 3,
        'school': 4
      };
      updatedData.level = levelMap[value as keyof typeof levelMap] || 4;
      
      // Clear parent_id when changing type as parent options will change
      updatedData.parent_id = undefined;
    }
    
    setFormData(updatedData);
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ad sahəsi tələb olunur';
    }

    if (!formData.type) {
      newErrors.type = 'Növ seçilməlidir';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Düzgün email ünvanı daxil edin';
    }

    if (formData.type !== 'ministry' && !formData.parent_id) {
      newErrors.parent_id = 
        formData.type === 'region' ? 'Nazirlik seçilməlidir' :
        formData.type === 'sektor' ? 'Regional idarə seçilməlidir' :
        formData.type === 'school' ? 'Sektor seçilməlidir' :
        'Ana təşkilat seçilməlidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Modal handleSubmit called', formData);

    if (!validateForm()) {
      console.log('❌ Validation failed', errors);
      return;
    }

    setLoading(true);
    try {
      // Transform formData for API - send both type and type_id
      const selectedType = institutionTypes.find(type => type.value === formData.type);
      const apiData = {
        ...formData,
        type: formData.type,  // Keep the type key for model
        type_id: selectedType?.originalType?.id,  // Add type_id for validation
      };
      
      console.log('📤 Transformed data for API:', apiData);
      console.log('🔍 Selected type details:', { selectedType, typeKey: formData.type, typeId: selectedType?.originalType?.id });
      
      await onSave(apiData);
      console.log('✅ Save successful, closing modal');
      onClose();
    } catch (error) {
      console.error('❌ Save failed:', error);
      // Show error to user
      alert('Xəta: ' + (error instanceof Error ? error.message : 'Naməlum xəta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          // Prevent auto focus to avoid aria-hidden conflicts
          e.preventDefault();
          setTimeout(() => {
            const nameInput = e.currentTarget?.querySelector<HTMLInputElement>('#name');
            if (nameInput) {
              nameInput.focus();
            }
          }, 100);
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {institution ? 'Müəssisəni redaktə et' : 'Yeni müəssisə əlavə et'}
          </DialogTitle>
          <DialogDescription>
            Müəssisə məlumatlarını daxil edin. İyerarxiya: Nazirlik → Regional İdarə → Sektor → Məktəb
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Ad *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Müəssisənin adı"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Növ *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                  {formData.type && institutionTypes.length > 0 ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(() => {
                        const selectedType = institutionTypes.find(type => type.value === formData.type);
                        console.log('🔍 Rendering selected type:', { formType: formData.type, selectedType, allTypes: institutionTypes });
                        return selectedType ? (
                          <>
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: selectedType.color }}
                            />
                            <span className="truncate">{selectedType.label} (Səviyyə {selectedType.level})</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground truncate">
                            Növ: {formData.type}
                          </span>
                        )
                      })()}
                    </div>
                  ) : (
                    <SelectValue placeholder="Müəssisə növünü seçin" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>
                      Yüklənir...
                    </SelectItem>
                  ) : institutionTypes.length > 0 ? (
                    institutionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} (Səviyyə {type.level})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-types" disabled>
                      Müəssisə növləri tapılmadı
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive mt-1">{errors.type}</p>
              )}
            </div>
          </div>

          {formData.type !== 'ministry' && (
            <div>
              <Label htmlFor="parent_id">
                {formData.type === 'region' ? 'Nazirlik *' :
                 formData.type === 'sektor' ? 'Regional İdarə *' :
                 formData.type === 'school' ? 'Sektor *' :
                 'Ana Təşkilat *'}
              </Label>
              <Select 
                value={formData.parent_id?.toString() || ''} 
                onValueChange={(value) => {
                  console.log('🔄 Parent select changed:', { value, parsed: parseInt(value) });
                  if (value && value !== 'no-parent' && !isNaN(parseInt(value))) {
                    handleInputChange('parent_id', parseInt(value));
                  }
                }}
              >
                <SelectTrigger className={errors.parent_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder={
                    formData.type === 'region' ? 'Nazirliyi seçin' :
                    formData.type === 'sektor' ? 'Regional idarəni seçin' :
                    formData.type === 'school' ? 'Sektoru seçin' :
                    'Ana təşkilatı seçin'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {parentInstitutions?.data && parentInstitutions.data.length > 0 ? (
                    parentInstitutions.data.map((parent: Institution) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {(() => {
                          const typeKey = typeof parent.type === 'object' ? parent.type?.key : parent.type;
                          const typeName = typeKey === 'ministry' ? 'Nazirlik' :
                                         typeKey === 'regional_education_department' ? 'Regional Təhsil İdarəsi' :
                                         typeKey === 'sector_education_office' ? 'Sektor Təhsil Şöbəsi' : 
                                         (typeof parent.type === 'object' ? parent.type?.name || typeKey : typeKey);
                          return `${parent.name} (${typeName})`;
                        })()}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-parent" disabled>
                      {formData.type === 'region' ? 'Nazirlik tapılmadı' :
                       formData.type === 'sektor' ? 'Regional idarə tapılmadı' :
                       formData.type === 'school' ? 'Sektor tapılmadı' :
                       'Ana təşkilat tapılmadı'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.parent_id && (
                <p className="text-sm text-destructive mt-1">{errors.parent_id}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kod</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Müəssisə kodu"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+994 XX XXX XX XX"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@example.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address">Ünvan</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Tam ünvan"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manager_name">Rəhbərin adı</Label>
              <Input
                id="manager_name"
                value={formData.manager_name}
                onChange={(e) => handleInputChange('manager_name', e.target.value)}
                placeholder="Rəhbərin tam adı"
              />
            </div>

            <div>
              <Label htmlFor="manager_phone">Rəhbərin telefonu</Label>
              <Input
                id="manager_phone"
                value={formData.manager_phone}
                onChange={(e) => handleInputChange('manager_phone', e.target.value)}
                placeholder="+994 XX XXX XX XX"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saxlanır...' : (institution ? 'Yenilə' : 'Əlavə et')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};