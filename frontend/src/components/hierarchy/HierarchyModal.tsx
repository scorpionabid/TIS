import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Move, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Building2, 
  MapPin,
  Users,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  HierarchyNode, 
  hierarchyService, 
  UpdateInstitutionData, 
  MoveInstitutionData 
} from '@/services/hierarchy';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface HierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'edit' | 'move';
  institution: HierarchyNode | null;
  availableParents?: HierarchyNode[];
  onSuccess?: () => void;
}

interface FormData extends UpdateInstitutionData {
  new_parent_id?: number;
}

const INSTITUTION_TYPES = [
  { value: 'ministry', label: 'Nazirlik', icon: '🏛️' },
  { value: 'region', label: 'Regional İdarə', icon: '🌍' },
  { value: 'regional_education_department', label: 'Regional Təhsil İdarəsi', icon: '🌍' },
  { value: 'sector_education_office', label: 'Sektor Təhsil Şöbəsi', icon: '🏢' },
  { value: 'sektor', label: 'Sektor', icon: '🏢' },
  { value: 'school', label: 'Məktəb', icon: '🏫' },
  { value: 'secondary_school', label: 'Tam Orta Məktəb', icon: '🏫' },
  { value: 'gymnasium', label: 'Gimnasiya', icon: '🏛️' },
  { value: 'lyceum', label: 'Lisey', icon: '🎓' },
  { value: 'kindergarten', label: 'Uşaq Bağçası', icon: '🧸' },
  { value: 'preschool_center', label: 'Məktəbəqədər Təhsil Mərkəzi', icon: '🎓' },
  { value: 'nursery', label: 'Uşaq Evləri', icon: '🏡' },
  { value: 'vocational', label: 'Peşə Məktəbi', icon: '⚙️' },
  { value: 'special', label: 'Xüsusi Məktəb', icon: '♿' },
  { value: 'private', label: 'Özəl Məktəb', icon: '🔒' },
];

export const HierarchyModal: React.FC<HierarchyModalProps> = ({
  isOpen,
  onClose,
  mode,
  institution,
  availableParents = [],
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    description: '',
    is_active: true,
    address: '',
    phone: '',
    email: '',
    capacity: 0,
    established_date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateInstitutionData) => 
      hierarchyService.updateInstitution(institution!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      toast({
        title: 'Uğurlu əməliyyat',
        description: 'Müəssisə məlumatları yeniləndi',
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error?.message || 'Müəssisə yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: (data: MoveInstitutionData) => 
      hierarchyService.moveInstitution(institution!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      toast({
        title: 'Uğurlu əməliyyat',
        description: 'Müəssisə yeni yerə köçürüldü',
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error?.message || 'Müəssisə köçürülən zaman xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Initialize form data when institution changes
  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        type: institution.type || '',
        description: institution.description || '',
        is_active: institution.is_active ?? true,
        address: institution.address || '',
        phone: institution.phone || '',
        email: institution.email || '',
        capacity: institution.capacity || 0,
        established_date: institution.established_date || '',
      });
    }
  }, [institution]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Müəssisə adı tələb olunur';
    }

    if (!formData.type) {
      newErrors.type = 'Müəssisə növü seçilməlidir';
    }

    if (mode === 'move' && !formData.new_parent_id) {
      newErrors.new_parent_id = 'Yeni valideyn müəssisə seçilməlidir';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Düzgün email daxil edin';
    }

    if (formData.capacity && formData.capacity < 0) {
      newErrors.capacity = 'Tutum mənfi ola bilməz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !institution) return;

    // Check if this is a department node (can't be edited/moved)
    if (typeof institution.id === 'string' && institution.id.startsWith('dept_')) {
      toast({
        title: 'Xəta',
        description: 'Departmentlər hierarchy modalı ilə redaktə edilə bilməz',
        variant: 'destructive',
      });
      return;
    }

    if (mode === 'move') {
      setShowConfirmation(true);
    } else {
      const { new_parent_id, ...updateData } = formData;
      updateMutation.mutate(updateData);
    }
  };

  const handleConfirmMove = () => {
    if (!formData.new_parent_id || !institution) return;
    
    moveMutation.mutate({
      new_parent_id: formData.new_parent_id,
      reason: formData.description || 'Hierarchy yenidən təşkili',
    });
    setShowConfirmation(false);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      is_active: true,
      address: '',
      phone: '',
      email: '',
      capacity: 0,
      established_date: '',
    });
    setErrors({});
    setShowConfirmation(false);
    onClose();
  };

  if (!institution) return null;

  const isLoading = updateMutation.isPending || moveMutation.isPending;
  const getTypeInfo = (type: string) => INSTITUTION_TYPES.find(t => t.value === type);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <Edit className="h-5 w-5" />
                Müəssisə Redaktə Et
              </>
            ) : (
              <>
                <Move className="h-5 w-5" />
                Müəssisəni Köçür
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Müəssisə məlumatlarını yeniləyin'
              : 'Müəssisəni yeni valideyn müəssisəyə köçürün'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Current Institution Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Cari Müəssisə
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getTypeInfo(institution.type)?.icon || '🏢'}
                </span>
                <div>
                  <div className="font-medium">{institution.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getTypeInfo(institution.type)?.label} - Səviyyə {institution.level}
                  </div>
                </div>
              </div>
              <Badge variant={institution.is_active ? 'default' : 'secondary'}>
                {institution.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {mode === 'move' ? (
            // Move Mode Form
            <>
              <div className="space-y-2">
                <Label htmlFor="new-parent">Yeni Valideyn Müəssisə</Label>
                <Select
                  value={formData.new_parent_id?.toString() || ''}
                  onValueChange={(value) => handleInputChange('new_parent_id', parseInt(value))}
                >
                  <SelectTrigger className={errors.new_parent_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Valideyn müəssisə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParents.map((parent) => {
                      const typeInfo = getTypeInfo(parent.type);
                      return (
                        <SelectItem key={parent.id} value={parent.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{typeInfo?.icon || '🏢'}</span>
                            <span>{parent.name}</span>
                            <span className="text-xs text-muted-foreground">
                              L{parent.level}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.new_parent_id && (
                  <p className="text-sm text-red-600">{errors.new_parent_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="move-reason">Köçürmə Səbəbi</Label>
                <Textarea
                  id="move-reason"
                  placeholder="Müəssisənin köçürülmə səbəbini qeyd edin..."
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            // Edit Mode Form
            <>
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Əsas Məlumatlar
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Müəssisə Adı *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                      placeholder="Müəssisə adını daxil edin"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Müəssisə Növü *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                    >
                      <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Növ seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-red-600">{errors.type}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Müəssisə haqqında əlavə məlumat..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is-active">Müəssisə aktiv statusda</Label>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Əlaqə Məlumatları
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Ünvan</Label>
                    <Textarea
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Müəssisənin ünvanını daxil edin..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+994 XX XXX XX XX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={errors.email ? 'border-red-500' : ''}
                        placeholder="email@example.az"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Əlavə Məlumatlar
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Tutum</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="0"
                      value={formData.capacity || ''}
                      onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                      className={errors.capacity ? 'border-red-500' : ''}
                      placeholder="0"
                    />
                    {errors.capacity && (
                      <p className="text-sm text-red-600">{errors.capacity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="established-date">Təsis Tarixi</Label>
                    <Input
                      id="established-date"
                      type="date"
                      value={formData.established_date || ''}
                      onChange={(e) => handleInputChange('established_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Ləğv et
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saxlanılır...' : (mode === 'edit' ? 'Saxla' : 'Köçür')}
          </Button>
        </div>

        {/* Move Confirmation Dialog */}
        {showConfirmation && mode === 'move' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Köçürməni Təsdiq Et
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Bu əməliyyat müəssisəni və bütün alt müəssisələrini yeni valideyn müəssisəyə köçürəcək. 
                    Bu əməliyyat geri alına bilməz.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Köçürüləcək müəssisə:</div>
                  <div className="text-sm text-muted-foreground">{institution.name}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Yeni valideyn:</div>
                  <div className="text-sm text-muted-foreground">
                    {availableParents.find(p => p.id === formData.new_parent_id)?.name}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                    Ləğv et
                  </Button>
                  <Button onClick={handleConfirmMove} disabled={isLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Təsdiq et
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HierarchyModal;