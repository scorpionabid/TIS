/**
 * RegionAdminTab Component
 * Dedicated tab for creating/editing RegionAdmin users
 */

import React from 'react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { Shield } from 'lucide-react';
import {
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
} from '../utils/constants';

interface RegionAdminTabProps {
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function RegionAdminTab({
  formData,
  setFormData,
  availableInstitutions,
  loadingOptions,
  user,
  onSubmit,
  loading,
}: RegionAdminTabProps) {
  // Filter only regional institutions (level 2)
  const regionalInstitutions = availableInstitutions.filter(
    inst => inst.level === 2 || inst.type?.toLowerCase().includes('region')
  );

  // Fields for RegionAdmin
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
    {
      name: 'patronymic',
      label: 'Ata adı',
      type: 'text',
    },
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
    {
      name: 'contact_phone',
      label: 'Telefon',
      type: 'text',
    },
    {
      name: 'birth_date',
      label: 'Doğum tarixi',
      type: 'date',
    },
    {
      name: 'gender',
      label: 'Cins',
      type: 'select',
      options: GENDER_OPTIONS,
    },
    {
      name: 'national_id',
      label: 'Şəxsiyyət vəsiqəsi',
      type: 'text',
    },
    {
      name: 'utis_code',
      label: 'UTIS Kodu',
      type: 'text',
      placeholder: '12 rəqəmə qədər',
    },
    {
      name: 'institution_id',
      label: 'Regional Müəssisə',
      type: 'select',
      required: true,
      options: regionalInstitutions.map(inst => ({
        label: `${inst.name} (${inst.type})`,
        value: inst.id.toString(),
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Regional müəssisə seçin',
      disabled: loadingOptions,
      helperText: '✓ RegionAdmin regional səviyyədə müəssisəyə təyin edilir',
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
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-900 font-medium">
          <Shield className="h-5 w-5" />
          RegionAdmin Yaradılması
        </div>
        <p className="text-sm text-blue-600 mt-1">
          RegionAdmin regional səviyyədə bütün təhsil müəssisələrinə nəzarət edən administrator rolundadır.
          Tam səlahiyyətə malikdir.
        </p>
      </div>

      {/* Form */}
      <FormBuilder
        fields={fields}
        onSubmit={onSubmit}
        onChange={(values) => setFormData({ ...formData, ...values })}
        submitLabel={user ? 'Yenilə' : 'RegionAdmin Yarat'}
        loading={loading || loadingOptions}
        defaultValues={formData}
        columns={2}
        preserveValues={true}
      />
    </div>
  );
}
