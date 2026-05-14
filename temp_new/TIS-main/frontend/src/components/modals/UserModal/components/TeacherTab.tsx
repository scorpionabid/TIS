import React from 'react';
import { GraduationCap } from 'lucide-react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { GENDER_OPTIONS, IS_ACTIVE_OPTIONS } from '../utils/constants';

interface TeacherTabProps {
  formKey: number;
  formData: any;
  setFormData: (data: any) => void;
  availableInstitutions: any[];
  loadingOptions: boolean;
  user?: any | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

const EMPLOYMENT_OPTIONS = [
  { label: 'Tam ştat', value: 'full_time' },
  { label: 'Yarım ştat', value: 'part_time' },
  { label: 'Müqaviləli', value: 'contract' },
];

const WORKPLACE_TYPES = [
  { label: 'Əsas məktəb', value: 'primary' },
  { label: 'Əlavə məktəb', value: 'secondary' },
];

export function TeacherTab({
  formKey,
  formData,
  setFormData,
  availableInstitutions,
  loadingOptions,
  user,
  onSubmit,
  loading,
}: TeacherTabProps) {
  const teacherInstitutions = availableInstitutions.filter(
    (inst) =>
      inst.level === 4 ||
      inst.type?.toLowerCase().includes('məktəb') ||
      inst.type?.toLowerCase().includes('school')
  );

  const fields = [
    { name: 'first_name', label: 'Ad', type: 'text', required: true },
    { name: 'last_name', label: 'Soyad', type: 'text', required: true },
    { name: 'username', label: 'İstifadəçi adı', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
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
      name: 'institution_id',
      label: 'Məktəb/Təhsil Müəssisəsi',
      type: 'select',
      required: true,
      options: teacherInstitutions.map((inst) => ({
        label: `${inst.name}${inst.type ? ` (${inst.type})` : ''}`,
        value: inst.id.toString(),
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Məktəb seçin',
      disabled: loadingOptions || teacherInstitutions.length === 0,
    },
    {
      name: 'position_type',
      label: 'Vəzifə',
      type: 'text',
      placeholder: 'Məsələn, Sinif müəllimi',
    },
    {
      name: 'employment_status',
      label: 'İş statusu',
      type: 'select',
      options: EMPLOYMENT_OPTIONS,
      placeholder: 'Status seçin',
    },
    {
      name: 'workplace_type',
      label: 'İş yeri növü',
      type: 'select',
      options: WORKPLACE_TYPES,
      placeholder: 'Əsas və ya əlavə',
    },
    {
      name: 'subjects',
      label: 'Fənlər',
      type: 'textarea',
      placeholder: 'Azərbaycan dili, Riyaziyyat (vergüllə ayırın)',
      rows: 3,
    },
    {
      name: 'grade_level',
      label: 'Əsas sinif səviyyəsi',
      type: 'text',
      placeholder: 'Məsələn, V-IX sinif',
    },
    {
      name: 'class_id',
      label: 'Sinif/Şagird qrupu',
      type: 'text',
      placeholder: '1A, 2B (vergüllə ayırın)',
    },
    {
      name: 'experience_years',
      label: 'İş təcrübəsi (il)',
      type: 'number',
      min: 0,
    },
    {
      name: 'gender',
      label: 'Cins',
      type: 'select',
      options: GENDER_OPTIONS,
      placeholder: 'Cins seçin',
    },
    {
      name: 'contact_phone',
      label: 'Əlaqə nömrəsi',
      type: 'text',
    },
    {
      name: 'birth_date',
      label: 'Doğum tarixi',
      type: 'date',
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
      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2 text-emerald-900 font-medium">
          <GraduationCap className="h-5 w-5" />
          Müəllim Yaradılması
        </div>
        <p className="text-sm text-emerald-600 mt-1">
          Müəllimlər üçün şəxsi və dərs məlumatlarını daxil edin. Sinif və fənn məlumatlarını bu bölmədən
          təyin edə bilərsiniz.
        </p>
      </div>

      <FormBuilder
        key={`teacher-form-${formKey}`}
        fields={fields}
        onSubmit={onSubmit}
        onChange={(values) => setFormData({ ...formData, ...values })}
        submitLabel={user ? 'Yenilə' : 'Müəllim Yarat'}
        loading={loading || loadingOptions}
        defaultValues={formData}
        columns={2}
        preserveValues={true}
        hideSubmit={true}
      />
    </div>
  );
}
