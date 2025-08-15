import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { InstitutionType } from '@/services/institutions';
import { institutionService } from '@/services/institutions';
import { useQuery } from '@tanstack/react-query';

interface InstitutionTypeModalProps {
  open: boolean;
  onClose: () => void;
  institutionType?: InstitutionType | null;
  onSave: (data: Partial<InstitutionType>) => Promise<void>;
}

interface FormData {
  key: string;
  label: string;
  label_az: string;
  label_en: string;
  default_level: number;
  allowed_parent_types: string[];
  icon: string;
  color: string;
  description: string;
  is_active: boolean;
}

const iconOptions = [
  'Building',
  'MapPin', 
  'Users',
  'School',
  'Baby',
  'GraduationCap',
  'Heart',
  'Wrench',
  'UserCheck',
  'BookOpen',
  'Home',
  'Star'
];

const colorOptions = [
  '#dc2626', // red
  '#2563eb', // blue
  '#059669', // green
  '#7c3aed', // purple
  '#db2777', // pink
  '#ea580c', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f97316', // orange
  '#8b5cf6', // violet
  '#6b7280', // gray
  '#0ea5e9', // sky
];

export const InstitutionTypeModal: React.FC<InstitutionTypeModalProps> = ({
  open,
  onClose,
  institutionType,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    key: '',
    label: '',
    label_az: '',
    label_en: '',
    default_level: 4,
    allowed_parent_types: [],
    icon: 'School',
    color: '#3b82f6',
    description: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load available institution types for parent selection
  const { data: availableTypesResponse } = useQuery({
    queryKey: ['institution-types-for-parent'],
    queryFn: () => institutionService.getInstitutionTypes(),
    enabled: open,
  });

  const availableTypes = availableTypesResponse?.institution_types || [];

  useEffect(() => {
    if (open && institutionType) {
      // Edit mode - populate with existing data
      setFormData({
        key: institutionType.key,
        label: institutionType.label,
        label_az: institutionType.label_az,
        label_en: institutionType.label_en,
        default_level: institutionType.default_level,
        allowed_parent_types: institutionType.allowed_parent_types,
        icon: institutionType.icon,
        color: institutionType.color,
        description: institutionType.description || '',
        is_active: institutionType.is_active,
      });
    } else if (open && !institutionType) {
      // Create mode - reset to defaults
      setFormData({
        key: '',
        label: '',
        label_az: '',
        label_en: '',
        default_level: 4,
        allowed_parent_types: [],
        icon: 'School',
        color: '#3b82f6',
        description: '',
        is_active: true,
      });
    }
    
    setErrors({});
  }, [institutionType, open]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddParentType = (typeKey: string) => {
    if (!formData.allowed_parent_types.includes(typeKey)) {
      handleInputChange('allowed_parent_types', [...formData.allowed_parent_types, typeKey]);
    }
  };

  const handleRemoveParentType = (typeKey: string) => {
    handleInputChange(
      'allowed_parent_types', 
      formData.allowed_parent_types.filter(key => key !== typeKey)
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.key.trim()) {
      newErrors.key = 'Açar sahəsi tələb olunur';
    } else if (!/^[a-z_]+$/.test(formData.key)) {
      newErrors.key = 'Açar yalnız kiçik hərflər və alt xətt istifadə edə bilər';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Etiket sahəsi tələb olunur';
    }

    if (!formData.label_az.trim()) {
      newErrors.label_az = 'Azərbaycan dilində etiket tələb olunur';
    }

    if (!formData.label_en.trim()) {
      newErrors.label_en = 'İngilis dilində etiket tələb olunur';
    }

    if (formData.default_level < 1 || formData.default_level > 4) {
      newErrors.default_level = 'Səviyyə 1-4 arası olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {institutionType ? 'Müəssisə Növünü Redaktə Et' : 'Yeni Müəssisə Növü Əlavə Et'}
          </DialogTitle>
          <DialogDescription>
            Müəssisə növü məlumatlarını daxil edin. Açar sahəsi unikal olmalıdır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="key">Açar (Key) *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                placeholder="məsələn: my_custom_type"
                className={errors.key ? 'border-destructive' : ''}
                disabled={!!institutionType} // Can't change key in edit mode
              />
              {errors.key && (
                <p className="text-sm text-destructive mt-1">{errors.key}</p>
              )}
              {institutionType && (
                <p className="text-xs text-muted-foreground mt-1">
                  Açar redaktə edilə bilməz
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="default_level">Default Səviyyə *</Label>
              <Select 
                value={formData.default_level.toString()} 
                onValueChange={(value) => handleInputChange('default_level', parseInt(value))}
              >
                <SelectTrigger className={errors.default_level ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Səviyyəni seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Səviyyə 1 (Nazirlik)</SelectItem>
                  <SelectItem value="2">Səviyyə 2 (Regional)</SelectItem>
                  <SelectItem value="3">Səviyyə 3 (Sektor)</SelectItem>
                  <SelectItem value="4">Səviyyə 4 (Müəssisə)</SelectItem>
                </SelectContent>
              </Select>
              {errors.default_level && (
                <p className="text-sm text-destructive mt-1">{errors.default_level}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">Əsas Etiket *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                placeholder="Müəssisə növünün adı"
                className={errors.label ? 'border-destructive' : ''}
              />
              {errors.label && (
                <p className="text-sm text-destructive mt-1">{errors.label}</p>
              )}
            </div>

            <div>
              <Label htmlFor="label_az">Azərbaycan dilində *</Label>
              <Input
                id="label_az"
                value={formData.label_az}
                onChange={(e) => handleInputChange('label_az', e.target.value)}
                placeholder="Azərbaycan dilində ad"
                className={errors.label_az ? 'border-destructive' : ''}
              />
              {errors.label_az && (
                <p className="text-sm text-destructive mt-1">{errors.label_az}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="label_en">İngilis dilində *</Label>
            <Input
              id="label_en"
              value={formData.label_en}
              onChange={(e) => handleInputChange('label_en', e.target.value)}
              placeholder="English name"
              className={errors.label_en ? 'border-destructive' : ''}
            />
            {errors.label_en && (
              <p className="text-sm text-destructive mt-1">{errors.label_en}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">İkon</Label>
              <Select 
                value={formData.icon} 
                onValueChange={(value) => handleInputChange('icon', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="İkon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="color">Rəng</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.color === color ? 'border-foreground' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                    title={color}
                  />
                ))}
              </div>
              <Input
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="#3b82f6"
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>İcazə Verilən Ana Növlər</Label>
            <div className="space-y-2">
              <Select 
                onValueChange={handleAddParentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ana növ əlavə et..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes
                    .filter(type => !formData.allowed_parent_types.includes(type.key))
                    .map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label_az} ({type.key})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2">
                {formData.allowed_parent_types.map((typeKey) => {
                  const type = availableTypes.find(t => t.key === typeKey);
                  return (
                    <Badge key={typeKey} variant="secondary" className="flex items-center gap-1">
                      {type ? type.label_az : typeKey}
                      <button
                        type="button"
                        onClick={() => handleRemoveParentType(typeKey)}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Bu müəssisə növü haqqında qısa açıqlama..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', !!checked)}
            />
            <Label htmlFor="is_active">Aktiv</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saxlanır...' : (institutionType ? 'Yenilə' : 'Əlavə et')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};