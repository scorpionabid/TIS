import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Institution, CreateInstitutionData, InstitutionType } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
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

  // Load institution types from API
  const { data: institutionTypesResponse, isLoading: typesLoading } = useQuery({
    queryKey: ['institution-types'],
    queryFn: () => institutionService.getInstitutionTypes(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Transform institution types for UI
  const institutionTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.institution_types) return [];
    
    return institutionTypesResponse.institution_types.map((type: InstitutionType) => ({
      value: type.key,
      label: type.label_az || type.label,
      level: type.default_level,
      allowedParents: type.allowed_parent_types,
      icon: type.icon,
      color: type.color,
      originalType: type
    }));
  }, [institutionTypesResponse]);

  // Get potential parent institutions based on selected type
  const { data: parentInstitutions } = useQuery({
    queryKey: ['parent-institutions', formData.type],
    queryFn: async () => {
      console.log('🏢 Loading parent institutions for type:', formData.type);
      
      if (formData.type === 'ministry') {
        console.log('👑 Ministry selected - no parent institutions needed');
        return Promise.resolve({ data: [] });
      }
      
      // Map frontend form type to determine backend parent type  
      const parentType = 
        formData.type === 'region' ? 'ministry' :
        formData.type === 'sektor' ? 'regional_education_department' :
        formData.type === 'school' ? 'sector_education_office' : null;
        
      console.log('🔗 Parent type determination:', { formType: formData.type, parentType });
      
      console.log('🔍 Determined parent type:', parentType);
      
      if (!parentType) {
        console.log('❌ No valid parent type found');
        return Promise.resolve({ data: [] });
      }
      
      try {
        const result = await institutionService.getByType(parentType as any);
        console.log('📦 Parent institutions loaded:', result);
        return result;
      } catch (error) {
        console.error('❌ Failed to load parent institutions:', error);
        throw error;
      }
    },
    enabled: open && formData.type !== 'ministry',
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
        type: 'school',
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
      console.log('📤 Calling onSave with data:', formData);
      await onSave(formData);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                  <SelectValue placeholder="Müəssisə növünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>
                      Yüklənir...
                    </SelectItem>
                  ) : institutionTypes.length > 0 ? (
                    institutionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">
                            (Səviyyə {type.level})
                          </span>
                        </div>
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
                  {parentInstitutions?.institutions && parentInstitutions.institutions.length > 0 ? (
                    parentInstitutions.institutions.map((parent: Institution) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        <div className="flex flex-col">
                          <div className="font-medium">{parent.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {parent.type === 'ministry' ? 'Nazirlik' :
                             parent.type === 'regional_education_department' ? 'Regional Təhsil İdarəsi' :
                             parent.type === 'sector_education_office' ? 'Sektor Təhsil Şöbəsi' : 
                             parent.type}
                          </div>
                        </div>
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