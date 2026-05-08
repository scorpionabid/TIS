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

  // 🔍 DEBUG: Log user permissions data
  console.log('🔍 [RegionOperatorTab] User permissions data:', {
    hasUser: !!user,
    userId: user?.id,
    hasPermissionsObject: !!user?.permissions,
    permissionsObject: user?.permissions,
    permissionsDirect: user?.permissions?.direct,
    permissionsViaRoles: user?.permissions?.via_roles,
    assignablePermissions: user?.assignable_permissions,
  });

  const selectedPermissionKeys = useMemo(() => {
    // For RegionOperator, prefer formData (edited state), fallback to user prop + CRUD (initial state)
    // This ensures permissions show on first render AND after edits
    let selection: string[] = [];

    if (Array.isArray(formData.assignable_permissions) && formData.assignable_permissions.length > 0) {
      // Use formData if available (after transform completes - includes both CRUD + Modern)
      selection = formData.assignable_permissions;
    } else if (user) {
      // Fallback for initial render: manually merge CRUD + Modern permissions
      const modernPermissions = Array.isArray(user.assignable_permissions) ? user.assignable_permissions : [];
      const crudPermissions: string[] = [];

      // Extract CRUD permissions from region_operator_permissions object
      if (user.region_operator_permissions) {
        actionKeys.forEach((key) => {
          if (user.region_operator_permissions?.[key] === true) {
            crudPermissions.push(key);
          }
        });
      }

      selection = [...crudPermissions, ...modernPermissions];
    }

    console.log('[RegionOperatorTab] Derived selection', {
      fromFormData: formData.assignable_permissions?.length || 0,
      fromUser_modern: user?.assignable_permissions?.length || 0,
      fromUser_crud: user?.region_operator_permissions ? actionKeys.filter(k => user.region_operator_permissions?.[k]).length : 0,
      final: selection.length,
    });

    return selection;
  }, [formData.assignable_permissions, user, actionKeys]);

  // Filter departments based on selected institution
  const selectedInstitutionId = formData.institution_id ? parseInt(formData.institution_id) : null;
  const filteredDepartments = selectedInstitutionId
    ? availableDepartments.filter(dept => dept.institution_id === selectedInstitutionId)
    : [];

  // Clear department selection when institution changes
  const institutionId = formData.institution_id;

  useEffect(() => {
    if (institutionId) {
      const currentDepts: number[] = formData.departments ?? [];
      const validDepts = currentDepts.filter(id =>
        availableDepartments.some(d => d.id === id && d.institution_id === selectedInstitutionId)
      );
      if (validDepts.length !== currentDepts.length) {
        setFormData((prev: any) => ({ ...prev, departments: validDepts, department_id: validDepts[0] ?? null }));
      }
    }
  }, [institutionId, availableDepartments, selectedInstitutionId]);

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
      name: 'departments',
      label: 'Departamentlər',
      type: 'multiselect',
      required: false,
      options: filteredDepartments.map(dept => ({
        label: dept.name,
        value: dept.id,
      })),
      placeholder: !selectedInstitutionId
        ? '⚠️ Əvvəl müəssisə seçin'
        : loadingOptions
          ? 'Departamentlər yüklənir...'
          : filteredDepartments.length === 0
            ? '⚠️ Bu müəssisədə departament yoxdur'
            : 'Departament(lər) seçin',
      disabled: loadingOptions || !selectedInstitutionId || filteredDepartments.length === 0,
      helperText: !selectedInstitutionId
        ? '⚠️ Müəssisə seçildikdən sonra aktiv olacaq'
        : filteredDepartments.length === 0
          ? '⚠️ Bu müəssisədə aktiv departament tapılmadı'
          : `✓ ${filteredDepartments.length} departament mövcuddur — seçilməsə hamısı görünür`,
      onChange: (values: number[]) => {
        setFormData((prev: any) => ({
          ...prev,
          departments: values,
          department_id: values[0] ?? null,
        }));
      },
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
        shareable: true,
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

    const allowed = modules.flatMap((module) => module.permissions.map((permission) => permission.key));

    return {
      modules,
      templates,
      granted_permissions: [],
      role_matrix: {
        regionoperator: {
          allowed,
          defaults: [],
          required: [],
        },
      },
    };
  }, []);

  const panelMetadata = useMemo<PermissionMetadata>(() => {
    if (!permissionMetadata) {
      return fallbackMetadata;
    }
    return permissionMetadata;
  }, [permissionMetadata, fallbackMetadata]);

  const regionOperatorRoleInfo =
    permissionMetadata?.role_matrix?.regionoperator ??
    panelMetadata.role_matrix?.regionoperator ??
    null;

  const handlePermissionSelectionChange = (next: string[]) => {
    console.log('🔍 [RegionOperatorTab] handlePermissionSelectionChange called', {
      next,
      count: next.length,
    });

    // For RegionOperator, ONLY update assignable_permissions array
    // Don't set individual can_* fields to avoid duplication
    setFormData({
      ...formData,
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

      <PermissionAssignmentPanel
        metadata={panelMetadata}
        userPermissions={user?.permissions || null}
        roleName="regionoperator"
        value={selectedPermissionKeys}
        onChange={handlePermissionSelectionChange}
        loading={Boolean(permissionMetadataLoading && !permissionMetadata)}
        roleInfo={regionOperatorRoleInfo}
      />
    </div>
  );
}
