/**
 * RegionOperatorTab Component
 * Dedicated tab for creating/editing RegionOperator users with permissions
 * UPDATED: Now uses granular CRUD-based Permission Matrix (25 permissions)
 */

import React, { useState, useEffect } from 'react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCog, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  DEFAULT_FORM_VALUES,
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
  CRUD_PERMISSIONS,
  PERMISSION_TEMPLATES_CRUD,
} from '../utils/constants';
import { PermissionMatrix } from './PermissionMatrix';

interface RegionOperatorTabProps {
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  availableDepartments: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function RegionOperatorTab({
  formData,
  setFormData,
  availableInstitutions,
  availableDepartments,
  loadingOptions,
  user,
  onSubmit,
  loading,
}: RegionOperatorTabProps) {
  const [hasSelectedPermissions, setHasSelectedPermissions] = useState(false);

  // Filter departments based on selected institution
  const selectedInstitutionId = formData.institution_id ? parseInt(formData.institution_id) : null;
  const filteredDepartments = selectedInstitutionId
    ? availableDepartments.filter(dept => dept.institution_id === selectedInstitutionId)
    : [];

  // Check if at least one CRUD permission is selected (NEW: 25 permissions)
  useEffect(() => {
    const hasAnyCRUD = Object.values(CRUD_PERMISSIONS).some(module =>
      module.actions.some(action => formData[action.key] === true)
    );
    setHasSelectedPermissions(hasAnyCRUD);
  }, [formData]);

  // Clear department selection when institution changes
  useEffect(() => {
    if (formData.institution_id && formData.department_id) {
      const selectedDept = availableDepartments.find(d => d.id.toString() === formData.department_id);
      if (selectedDept && selectedDept.institution_id !== selectedInstitutionId) {
        // Clear department if it doesn't belong to selected institution
        setFormData({ ...formData, department_id: '' });
      }
    }
  }, [formData.institution_id]);

  // Basic fields for RegionOperator (without permission checkboxes)
  const basicFields = [
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
      label: 'Müəssisə',
      type: 'select',
      required: true,
      options: availableInstitutions.map(inst => ({
        label: `${inst.name}${inst.type ? ` (${inst.type})` : ''}`,
        value: inst.id.toString(),
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Müəssisə seçin',
      disabled: loadingOptions || availableInstitutions.length === 0,
      helperText: '✓ Əvvəl müəssisə seçin, sonra departament',
      onChange: (value: string) => {
        // Clear department when institution changes
        setFormData({ ...formData, institution_id: value, department_id: '' });
      },
    },
    {
      name: 'department_id',
      label: 'Departament',
      type: 'select',
      required: true,
      options: filteredDepartments.map(dept => ({
        label: dept.name,
        value: dept.id.toString(),
      })),
      placeholder: !selectedInstitutionId
        ? '⚠️ Əvvəl müəssisə seçin'
        : loadingOptions
          ? 'Departamentlər yüklənir...'
          : filteredDepartments.length === 0
            ? '⚠️ Bu müəssisədə departament yoxdur'
            : 'Departament seçin',
      disabled: loadingOptions || !selectedInstitutionId || filteredDepartments.length === 0,
      helperText: !selectedInstitutionId
        ? '⚠️ Müəssisə seçildikdən sonra aktiv olacaq'
        : filteredDepartments.length === 0
          ? '⚠️ Bu müəssisədə aktiv departament tapılmadı'
          : `✓ ${filteredDepartments.length} departament mövcuddur`,
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
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-2 text-indigo-900 font-medium">
          <UserCog className="h-5 w-5" />
          RegionOperator Yaradılması
        </div>
        <p className="text-sm text-indigo-600 mt-1">
          RegionOperator regional səviyyədə müəyyən modullara nəzarət edən istifadəçidir.
          Aşağıda şəxsi məlumatlar və detallı səlahiyyətləri təyin edin.
        </p>
      </div>

      {/* Basic Information Form */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Şəxsi Məlumatlar</h3>
        <FormBuilder
          fields={basicFields}
          onSubmit={onSubmit}
          onChange={(values) => setFormData({ ...formData, ...values })}
          submitLabel={user ? 'Yenilə' : 'RegionOperator Yarat'}
          loading={loading || loadingOptions}
          defaultValues={formData}
          columns={2}
          preserveValues={true}
          showSubmitButton={false}
        />
      </div>

      {/* NEW: Granular CRUD Permission Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Detallı Səlahiyyətlər</h3>
          <span className="text-xs text-muted-foreground">
            25 granular CRUD səlahiyyəti
          </span>
        </div>
        <PermissionMatrix
          formData={formData}
          setFormData={setFormData}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          onClick={() => onSubmit(formData)}
          disabled={loading || loadingOptions || !hasSelectedPermissions}
          className="min-w-[200px]"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {user ? 'Yenilənir...' : 'Yaradılır...'}
            </>
          ) : (
            user ? 'Yenilə' : 'RegionOperator Yarat'
          )}
        </Button>
      </div>
    </div>
  );
}
