/**
 * RegionOperatorTab Component
 * Dedicated tab for creating/editing RegionOperator users with permissions
 * UPDATED: Now uses minimalist CRUD-based Permission Matrix (25 permissions)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { UserCog } from 'lucide-react';
import { IS_ACTIVE_OPTIONS, CRUD_PERMISSIONS, PERMISSION_TEMPLATES_CRUD } from '../utils/constants';
import { PermissionAssignmentPanel } from './PermissionAssignmentPanel';
import type { PermissionMetadata } from '@/services/regionAdmin';

interface RegionOperatorTabProps {
  formKey: number;
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  availableDepartments: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  permissionMetadata?: PermissionMetadata | null;
  permissionMetadataLoading?: boolean;
}

export function RegionOperatorTab({
  formKey,
  formData,
  setFormData,
  availableInstitutions,
  availableDepartments,
  loadingOptions,
  user,
  onSubmit,
  loading,
  permissionMetadata,
  permissionMetadataLoading = false,
}: RegionOperatorTabProps) {
  const actionKeys = useMemo(
    () => Object.values(CRUD_PERMISSIONS).flatMap(module => module.actions.map(action => action.key)),
    []
  );

  const selectedPermissionKeys = useMemo(() => {
    const assignable = Array.isArray(formData.assignable_permissions)
      ? formData.assignable_permissions
      : [];
    const legacySelection = actionKeys.filter((key) => formData[key] === true);
    return Array.from(new Set([...assignable, ...legacySelection]));
  }, [actionKeys, formData]);

  // Filter departments based on selected institution
  const selectedInstitutionId = formData.institution_id ? parseInt(formData.institution_id) : null;
  const filteredDepartments = selectedInstitutionId
    ? availableDepartments.filter(dept => dept.institution_id === selectedInstitutionId)
    : [];

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

  const fallbackMetadata = useMemo<PermissionMetadata>(() => {
    const modules = Object.entries(CRUD_PERMISSIONS).map(([moduleKey, module]) => ({
      key: moduleKey,
      label: module.label,
      description: module.description,
      roles: ['regionoperator'],
      permissions: module.actions.map((action) => ({
        key: action.key,
        label: action.label,
        description: action.description,
      })),
    }));

    const templates = Object.entries(PERMISSION_TEMPLATES_CRUD).map(([templateKey, template]) => ({
      key: templateKey,
      label: template.label,
      description: template.description,
      permissions: Object.entries(template.permissions)
        .filter(([, allowed]) => allowed === true)
        .map(([permissionKey]) => permissionKey),
    }));

    return { modules, templates };
  }, []);

  const panelMetadata = useMemo<PermissionMetadata>(() => {
    if (!permissionMetadata) {
      return fallbackMetadata;
    }
    return permissionMetadata;
  }, [permissionMetadata, fallbackMetadata]);

  const handlePermissionSelectionChange = (next: string[]) => {
    const permissionUpdates = actionKeys.reduce((acc, key) => {
      acc[key] = next.includes(key);
      return acc;
    }, {} as Record<string, boolean>);

    setFormData({
      ...formData,
      ...permissionUpdates,
      assignable_permissions: next,
    });
  };

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
          key={`region-operator-form-${formKey}`}
          fields={basicFields}
          onSubmit={onSubmit}
          onChange={(values) => setFormData({ ...formData, ...values })}
          submitLabel={user ? 'Yenilə' : 'RegionOperator Yarat'}
          loading={loading || loadingOptions}
          defaultValues={formData}
          columns={2}
          preserveValues={true}
          hideSubmit={true}
        />
      </div>

      {/* Unified Permission Assignment Panel */}
      <PermissionAssignmentPanel
        metadata={panelMetadata}
        roleName="regionoperator"
        value={selectedPermissionKeys}
        onChange={handlePermissionSelectionChange}
        loading={Boolean(permissionMetadataLoading && !permissionMetadata)}
      />

    </div>
  );
}
