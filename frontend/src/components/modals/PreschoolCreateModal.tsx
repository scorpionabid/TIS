import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreschoolCreateData } from '@/services/preschools';
import { sectorsService } from '@/services/sectors';
import { userService, User, UserFilters } from '@/services/users';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Phone, Mail, MapPin, User as UserIcon, Building2 } from 'lucide-react';

interface PreschoolCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: PreschoolCreateData) => void;
}

const PRESCHOOL_TYPES = [
  { value: 'kindergarten', label: 'Uşaq Bağçası', icon: '🏫' },
  { value: 'preschool_center', label: 'Məktəbəqədər Təhsil Mərkəzi', icon: '🎓' },
  { value: 'nursery', label: 'Uşaq Evləri', icon: '🏡' }
] as const;

export const PreschoolCreateModal: React.FC<PreschoolCreateModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<PreschoolCreateData>({
    name: '',
    type: 'kindergarten',
    parent_id: 0, // This is the sector_id
    short_name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    manager_id: undefined,
    is_active: true,
    established_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load sectors for parent selection
  const { data: sectorsResponse, isLoading: sectorsLoading } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorsService.getSectors(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load potential managers (bağçaadmin users)
  const { data: managersResponse, isLoading: managersLoading } = useQuery({
    queryKey: ['preschool-managers'],
    queryFn: () => userService.getUsers({ role: 'bağçaadmin', institution_id: null } as UserFilters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const sectors = Array.isArray(sectorsResponse?.data) ? sectorsResponse.data : [];
  const managers = Array.isArray(managersResponse?.data) ? managersResponse.data : 
                   Array.isArray(managersResponse?.users) ? managersResponse.users : [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        type: 'kindergarten',
        parent_id: 0,
        short_name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        manager_id: undefined,
        is_active: true,
        established_date: '',
      });
      setErrors({});
    }
  }, [open]);

  const handleInputChange = (field: keyof PreschoolCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Müəssisə adı tələb olunur';
    }

    if (!formData.parent_id) {
      newErrors.parent_id = 'Sektor seçimi tələb olunur';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Düzgün email ünvanı daxil edin';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]{7,}$/.test(formData.phone)) {
      newErrors.phone = 'Düzgün telefon nömrəsi daxil edin';
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
      console.error('Failed to create preschool:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    return PRESCHOOL_TYPES.find(t => t.value === type) || PRESCHOOL_TYPES[0];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{getTypeInfo(formData.type).icon}</span>
            Yeni Məktəbəqədər Müəssisə Yaradın
          </DialogTitle>
          <DialogDescription>
            Məktəbəqədər təhsil müəssisəsi (uşaq bağçası, məktəbəqədər təhsil mərkəzi və ya uşaq evi) yaradın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Əsas Məlumatlar
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Müəssisə Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Məs: Narıncı uşaq bağçası"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_name">Qısa Ad</Label>
                <Input
                  id="short_name"
                  value={formData.short_name || ''}
                  onChange={(e) => handleInputChange('short_name', e.target.value)}
                  placeholder="Məs: Narıncı"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Müəssisə Növü *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Növ seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESCHOOL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_id">Bağlı Sektor *</Label>
                <Select 
                  value={formData.parent_id.toString()} 
                  onValueChange={(value) => handleInputChange('parent_id', parseInt(value))}
                  disabled={sectorsLoading}
                >
                  <SelectTrigger className={errors.parent_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sektor seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parent_id && <p className="text-sm text-red-500">{errors.parent_id}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kod</Label>
                <Input
                  id="code"
                  value={formData.code || ''}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Məs: BAGCA-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="established_date">Təsis Tarixi</Label>
                <Input
                  id="established_date"
                  type="date"
                  value={formData.established_date || ''}
                  onChange={(e) => handleInputChange('established_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Əlaqə Məlumatları
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Ünvan</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Tam ünvan daxil edin"
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
                  placeholder="+994 12 555-0101"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="ornek@edu.az"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Manager Assignment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              Menecer Təyinatı
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_id">Bağça Adminini Təyin Edin</Label>
              <Select 
                value={formData.manager_id?.toString() || ''} 
                onValueChange={(value) => handleInputChange('manager_id', value ? parseInt(value) : undefined)}
                disabled={managersLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Menecer seçin (istəyə görə)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Hələlik menecersiz</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id.toString()}>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>
                          {manager.first_name && manager.last_name 
                            ? `${manager.first_name} ${manager.last_name}` 
                            : manager.username} ({manager.email})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Yaradılır...' : 'Yaradın'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};