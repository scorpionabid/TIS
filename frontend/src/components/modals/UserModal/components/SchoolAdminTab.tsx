/**
 * SchoolAdminTab Component
 * Dedicated tab for creating/editing SchoolAdmin users
 */

import React from 'react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { School } from 'lucide-react';
import {
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
} from '../utils/constants';

interface SchoolAdminTabProps {
  formKey: number;
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function SchoolAdminTab({
  formKey,
  formData,
  setFormData,
  availableInstitutions,
  loadingOptions,
  user,
  onSubmit,
  loading,
}: SchoolAdminTabProps) {
  // Filter only school institutions (level 4)
  const schoolInstitutions = availableInstitutions.filter(
    inst => inst.level === 4 ||
           inst.type?.toLowerCase().includes('məktəb') ||
           inst.type?.toLowerCase().includes('school')
  );

  // Fields for SchoolAdmin
  const fields = [
    {
      name: 'first_name',
      label: 'Ad',
      type: 'text',
      required: true,
    },
    {
      name: 'last_name',
      label: 'Soyad',
      type: 'text',
      required: true,
    },
    // REMOVED: patronymic (ata adı) - database column does not exist
    {
      name: 'username',
      label: 'İstifadəçi adı',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'ornek@edu.gov.az',
    },
    {
      name: 'password',
      label: 'Şifrə',
      type: 'password',
      required: !user,
      placeholder: 'Minimum 8 simvol',
    },
    {
      name: 'password_confirmation',
      label: 'Şifrə təkrarı',
      type: 'password',
      required: !user,
    },
    // REMOVED: contact_phone, birth_date, gender, national_id - database columns do not exist
    {
      name: 'utis_code',
      label: 'UTIS Kodu',
      type: 'text',
      placeholder: '12 rəqəmə qədər',
    },
    {
      name: 'institution_id',
      label: 'Məktəb/Təhsil Müəssisəsi',
      type: 'select',
      required: true,
      options: schoolInstitutions.map(inst => ({
        label: `${inst.name} (${inst.type})`,
        value: inst.id.toString(),
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Məktəb seçin',
      disabled: loadingOptions,
      helperText: '✓ SchoolAdmin məktəb səviyyəsində müəssisəyə təyin edilir',
    },
    {
      name: 'is_active',
      label: 'Status',
      type: 'select',
      required: true,
      options: IS_ACTIVE_OPTIONS,
      defaultValue: 'true',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-900 font-medium">
          <School className="h-5 w-5" />
          SchoolAdmin Yaradılması
        </div>
        <p className="text-sm text-green-600 mt-1">
          SchoolAdmin məktəb səviyyəsində müəllim, şagird və məktəb əməliyyatlarını idarə edən
          administrator rolundadır.
        </p>
      </div>

      {/* Form */}
      <FormBuilder
        key={`school-admin-form-${formKey}`}
        fields={fields}
        onSubmit={onSubmit}
        onChange={(values) => setFormData({ ...formData, ...values })}
        submitLabel={user ? 'Yenilə' : 'SchoolAdmin Yarat'}
        loading={loading || loadingOptions}
        defaultValues={formData}
        columns={2}
        preserveValues={true}
      />
    </div>
  );
}
