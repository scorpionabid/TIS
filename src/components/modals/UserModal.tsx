import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormBuilder, createField, commonValidations } from '@/components/forms/FormBuilder';
import { useToast } from '@/hooks/use-toast';
import { User, userService } from '@/services/users';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (user: any) => Promise<void>;
}

export function UserModal({ open, onClose, user, onSave }: UserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{id: number, name: string, display_name: string, level: number}>>([]);
  const [availableInstitutions, setAvailableInstitutions] = useState<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Load available roles and institutions when modal opens
  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const [roles, institutions] = await Promise.all([
        userService.getAvailableRoles(),
        userService.getAvailableInstitutions()
      ]);
      
      setAvailableRoles(roles);
      setAvailableInstitutions(institutions);
    } catch (error) {
      console.error('Failed to load options:', error);
      toast({
        title: 'Xəta',
        description: 'Seçimlər yüklənə bilmədi',
        variant: 'destructive',
      });
    } finally {
      setLoadingOptions(false);
    }
  };

  // Generate form fields with dynamic options
  const getFields = () => [
    createField('first_name', 'Ad', 'text', {
      required: true,
      placeholder: 'İstifadəçinin adı',
      validation: commonValidations.required,
    }),
    createField('last_name', 'Soyad', 'text', {
      required: true,
      placeholder: 'İstifadəçinin soyadı',
      validation: commonValidations.required,
    }),
    createField('username', 'İstifadəçi adı', 'text', {
      required: true,
      placeholder: 'istifadeci_adi',
      validation: commonValidations.required,
    }),
    createField('email', 'Email', 'email', {
      required: true,
      placeholder: 'ornek@edu.gov.az',
      validation: commonValidations.email,
    }),
    createField('password', 'Şifrə', 'password', {
      required: !user, // Yeni istifadəçi üçün şifrə tələb olunur
      placeholder: 'Minimum 8 simvol',
      validation: !user ? commonValidations.required : undefined,
    }),
    createField('contact_phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('role_id', 'Rol', 'select', {
      required: true,
      options: availableRoles.map(role => ({ 
        label: role.display_name, 
        value: role.id.toString() 
      })),
      placeholder: loadingOptions ? 'Rollar yüklənir...' : 'Rol seçin',
      disabled: loadingOptions,
      validation: commonValidations.required,
    }),
    createField('institution_id', 'Müəssisə', 'select', {
      options: availableInstitutions.map(institution => ({ 
        label: `${institution.name} (${institution.type})`, 
        value: institution.id.toString() 
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Müəssisə seçin',
      disabled: loadingOptions,
    }),
    createField('is_active', 'Status', 'select', {
      required: true,
      options: [
        { label: 'Aktiv', value: true },
        { label: 'Deaktiv', value: false }
      ],
      defaultValue: true,
      validation: commonValidations.required,
    }),
  ];

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSave(data);
      toast({
        title: 'Uğurlu',
        description: user 
          ? 'İstifadəçi məlumatları yeniləndi' 
          : 'Yeni istifadəçi əlavə edildi',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Əməliyyat zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'İstifadəçi məlumatlarını redaktə et' : 'Yeni istifadəçi əlavə et'}
          </DialogTitle>
        </DialogHeader>
        
        <FormBuilder
          fields={getFields()}
          onSubmit={handleSubmit}
          submitLabel={user ? 'Yenilə' : 'Əlavə et'}
          loading={loading || loadingOptions}
          defaultValues={user || {}}
          columns={2}
        />
      </DialogContent>
    </Dialog>
  );
}