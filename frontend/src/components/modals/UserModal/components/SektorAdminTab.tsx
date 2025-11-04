/**
 * SektorAdminTab Component
 * Dedicated tab for creating/editing SektorAdmin users
 */

import React from 'react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { Building } from 'lucide-react';
import {
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
} from '../utils/constants';

interface SektorAdminTabProps {
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function SektorAdminTab({
  formData,
  setFormData,
  availableInstitutions,
  loadingOptions,
  user,
  onSubmit,
  loading,
}: SektorAdminTabProps) {
  // Filter only sector institutions (level 3)
  const sectorInstitutions = availableInstitutions.filter(
    inst => inst.level === 3 || inst.type?.toLowerCase().includes('sektor')
  );

  // Fields for SektorAdmin
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
      label: 'Sektor Müəssisəsi',
      type: 'select',
      required: true,
      options: sectorInstitutions.map(inst => ({
        label: `${inst.name} (${inst.type})`,
        value: inst.id.toString(),
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Sektor müəssisəsi seçin',
      disabled: loadingOptions,
      helperText: '✓ SektorAdmin sektor səviyyəsində müəssisəyə təyin edilir',
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
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex items-center gap-2 text-orange-900 font-medium">
          <Building className="h-5 w-5" />
          SektorAdmin Yaradılması
        </div>
        <p className="text-sm text-orange-600 mt-1">
          SektorAdmin sektor səviyyəsində məktəblərə nəzarət edən administrator rolundadır.
          Sektor daxilindəki məktəbləri idarə edir.
        </p>
      </div>

      {/* Form */}
      <FormBuilder
        fields={fields}
        onSubmit={onSubmit}
        onChange={(values) => setFormData({ ...formData, ...values })}
        submitLabel={user ? 'Yenilə' : 'SektorAdmin Yarat'}
        loading={loading || loadingOptions}
        defaultValues={formData}
        columns={2}
        preserveValues={true}
      />
    </div>
  );
}
