import React from 'react';
import { cn } from '@/lib/utils';
import { FormField, createField, commonValidations } from '@/components/forms/FormBuilder';
import { Institution } from '@/services/institutions';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wand2
} from 'lucide-react';
import { z } from 'zod';

interface ValidationState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  message?: string;
}

interface FormCompletenessState {
  percentage: number;
  missingFields: string[];
  validFields: string[];
  hasValidationIssues?: boolean;
  validationStatus?: {
    code: string;
    utisCode: string;
    allValid: boolean;
  };
}

interface InstitutionFormFieldsProps {
  institutionTypes: Array<{
    label: string;
    value: string;
    level: number;
    allowedParents: string[];
    icon: string;
    color: string;
    originalType: any;
  }>;
  parentInstitutionOptions: Array<{
    label: string;
    value: string;
  }>;
  selectedType: string;
  setSelectedType: (type: string) => void;
  setHasUserSelectedType: (hasSelected: boolean) => void;
  codeValidation: ValidationState;
  utisCodeValidation: ValidationState;
  similarInstitutions: Institution[];
  showSimilarWarning: boolean;
  formCompleteness: FormCompletenessState;
  codeGenerationLoading: boolean;
  typesLoading: boolean;
  typesError: boolean;
  parentsLoading: boolean;
  validationProgress: Record<string, { step: number; total: number; message: string }>;
  codeInputRef: React.RefObject<HTMLInputElement>;
  nameInputRef: React.RefObject<HTMLInputElement>;
  handleCodeValidation: (code: string) => void;
  handleUtisCodeValidation: (utisCode: string) => void;
  handleGenerateCode: (formControl: any) => void;
  updateFormCompleteness: (formData: any) => void;
  getCurrentSelectedLevel: () => number;
}

export const useInstitutionFormFields = ({
  institutionTypes,
  parentInstitutionOptions,
  selectedType,
  setSelectedType,
  setHasUserSelectedType,
  codeValidation,
  utisCodeValidation,
  similarInstitutions,
  showSimilarWarning,
  formCompleteness,
  codeGenerationLoading,
  typesLoading,
  typesError,
  parentsLoading,
  validationProgress,
  codeInputRef,
  nameInputRef,
  handleCodeValidation,
  handleUtisCodeValidation,
  handleGenerateCode,
  updateFormCompleteness,
  getCurrentSelectedLevel,
}: InstitutionFormFieldsProps) => {

  // Basic institution information fields
  const basicFields: FormField[] = [
    createField('name', 'Ad', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <input
            {...field}
            ref={nameInputRef}
            type="text"
            placeholder="Müəssisənin tam adı"
            aria-label="Müəssisənin adı"
            aria-describedby="name-help-text similar-institutions-warning"
            className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            onChange={(e) => {
              field.onChange(e);
              const formValues = formControl.getValues();
              updateFormCompleteness({ ...formValues, name: e.target.value });
            }}
          />
          <p id="name-help-text" className="text-xs text-muted-foreground">
            Müəssisənin tam rəsmi adı. Oxşar adlı müəssisələr yoxlanacaq.
          </p>
          {showSimilarWarning && similarInstitutions.length > 0 && (
            <div
              id="similar-institutions-warning"
              className="p-3 bg-amber-50 border border-amber-200 rounded-md"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    <span className="sr-only">Diqqət: </span>
                    Oxşar müəssisələr tapıldı ({similarInstitutions.length})
                  </p>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto" aria-label="Oxşar müəssisələrin siyahısı">
                    {similarInstitutions.slice(0, 3).map((similar, index) => (
                      <div
                        key={similar.id}
                        className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1"
                        role="listitem"
                      >
                        <span className="font-medium">{similar.name}</span>
                        {similar.code && <span className="ml-2 text-amber-600">({similar.code})</span>}
                      </div>
                    ))}
                    {similarInstitutions.length > 3 && (
                      <p className="text-xs text-amber-600 font-medium">
                        ...və {similarInstitutions.length - 3} digər
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Müəssisə adının unikal olduğundan əmin olun
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    }),

    createField('short_name', 'Qısa Ad', 'text', {
      placeholder: 'Müəssisənin qısa adı (ixtiyari)',
      description: 'Müəssisə üçün qısa ad. Məsələn: TM, REİ, HTŞ',
    }),

    createField('type', 'Növ', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="relative">
            <select
              {...field}
              aria-label="Müəssisə növü"
              aria-describedby="type-help-text"
              disabled={typesLoading}
              className={cn(
                "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                "appearance-none cursor-pointer"
              )}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value);
                setSelectedType(value);
                setHasUserSelectedType(true);
                const formValues = formControl?.getValues();
                if (formValues) {
                  updateFormCompleteness({ ...formValues, type: value });
                }
              }}
            >
              <option value="" disabled>
                {typesLoading ? 'Növlər yüklənir...' : 'Müəssisə növünü seçin'}
              </option>
              {institutionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {typesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
          <p id="type-help-text" className="text-xs text-muted-foreground">
            Müəssisənin növünü seçin. Növ ana təşkilat seçimlərini müəyyənləşdirir.
          </p>
          {typesError && (
            <p className="text-xs text-red-600" role="alert">
              Növlər yükləmədə xəta: Yenidən cəhd edin
            </p>
          )}
        </div>
      ),
    }),

    // Level 1 info field
    ...((() => {
      const currentLevel = getCurrentSelectedLevel();
      const isLevel1 = selectedType && currentLevel === 1;

      return isLevel1 ? [
        createField('parent_info', 'Ana Təşkilat', 'text', {
          disabled: true,
          placeholder: '🏛️ Səviyyə 1 müəssisələr ən üst səviyyədə olduğu üçün ana təşkilatı yoxdur',
          description: 'Nazirlik səviyyəsindəki müəssisələrin ana təşkilatı olmur',
          className: 'md:col-span-2'
        })
      ] : [];
    })()),

    // Parent institution field
    ...((() => {
      const level = getCurrentSelectedLevel();
      const shouldShow = selectedType && level > 1;
      return shouldShow;
    })() ? [
      createField('parent_id', 'Ana Təşkilat', 'custom', {
        required: getCurrentSelectedLevel() > 1,
        validation: getCurrentSelectedLevel() > 1 ? commonValidations.required : undefined,
        className: 'md:col-span-2',
        render: ({ field, formControl }: any) => (
          <div className="space-y-2">
            <div className="relative">
              <select
                {...field}
                aria-label="Ana təşkilat"
                aria-describedby="parent-help-text"
                disabled={parentsLoading}
                className={cn(
                  "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                  "appearance-none cursor-pointer"
                )}
              >
                <option value="" disabled>
                  {parentsLoading ? 'Ana təşkilatlar yüklənir...' :
                   selectedType === 'regional_education_department' ? 'Nazirliyi seçin' :
                   selectedType === 'sector_education_office' ? 'Regional idarəni seçin' :
                   selectedType === 'secondary_school' || selectedType === 'lyceum' || selectedType === 'gymnasium' ? 'Sektoru seçin' :
                   'Ana təşkilatı seçin'}
                </option>
                {parentInstitutionOptions.map((parent) => (
                  <option key={parent.value} value={parent.value}>
                    {parent.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {parentsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
            <p id="parent-help-text" className="text-xs text-muted-foreground">
              {`Səviyyə ${getCurrentSelectedLevel()} müəssisələrinin ana təşkilatı seçilməlidir. ${parentInstitutionOptions.length} seçim mövcuddur.`}
            </p>
            {parentsLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Ana təşkilatlar yüklənir...</span>
              </div>
            )}
            {!parentsLoading && parentInstitutionOptions.length === 0 && selectedType && (
              <p className="text-xs text-amber-600" role="alert">
                Bu növ üçün uyğun ana təşkilat tapılmadı
              </p>
            )}
          </div>
        ),
      })
    ] : []),

    // Code field
    createField('code', 'Müəssisə Kodu', 'custom', {
      required: true,
      validation: commonValidations.required,
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                {...field}
                ref={codeInputRef}
                type="text"
                placeholder="Müəssisə kodu (tələb olunur)"
                aria-label="Müəssisə kodu"
                aria-describedby="code-validation-message code-help-text"
                aria-invalid={codeValidation.status === 'invalid'}
                aria-busy={codeValidation.status === 'checking'}
                className={cn(
                  "flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                  codeValidation.status === 'valid' && "border-green-500 focus-visible:ring-green-500",
                  codeValidation.status === 'invalid' && "border-red-500 focus-visible:ring-red-500"
                )}
                onChange={(e) => {
                  field.onChange(e);
                  const formValues = formControl.getValues();
                  updateFormCompleteness({ ...formValues, code: e.target.value });
                  if (e.target.value.length >= 3) {
                    handleCodeValidation(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.altKey && e.key === 'g') {
                    e.preventDefault();
                    handleGenerateCode(formControl);
                  }
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {codeValidation.status === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {codeValidation.status === 'valid' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {codeValidation.status === 'invalid' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateCode(formControl)}
              disabled={codeGenerationLoading}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-3 py-3 sm:py-2 h-12 sm:h-10 text-base sm:text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors touch-manipulation",
                "min-w-[140px] sm:min-w-[120px] justify-center"
              )}
              title="Müəssisə adı və növünə əsasən avtomatik kod yaradın (Alt+G)"
              aria-label={codeGenerationLoading ? 'Kod yaradılır, gözləyin' : 'Avtomatik kod yaradın (Alt+G klaviş birləşməsi)'}
            >
              {codeGenerationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span>{codeGenerationLoading ? 'Yaradılır...' : 'Yaradın'}</span>
            </button>
          </div>
          {codeValidation.message && (
            <div
              id="code-validation-message"
              className={cn(
                "text-sm space-y-2",
                codeValidation.status === 'valid' && "text-green-600",
                codeValidation.status === 'invalid' && "text-red-600"
              )}
              role={codeValidation.status === 'invalid' ? 'alert' : 'status'}
              aria-live={codeValidation.status === 'checking' ? 'polite' : 'assertive'}
            >
              <div className="flex items-start gap-2">
                {codeValidation.status === 'valid' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {codeValidation.status === 'invalid' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {codeValidation.status === 'checking' && <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />}
                <span>{codeValidation.message}</span>
              </div>
              {validationProgress.codeValidation && (
                <div className="space-y-2 transition-all duration-300 ease-in-out">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-blue-700">{validationProgress.codeValidation.message}</span>
                    <span className="text-blue-600 font-mono">{validationProgress.codeValidation.step}/{validationProgress.codeValidation.total}</span>
                  </div>
                  <div className="relative w-full bg-blue-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{
                        width: `${(validationProgress.codeValidation.step / validationProgress.codeValidation.total) * 100}%`
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <p id="code-help-text" className="text-xs text-muted-foreground">
            Müəssisə üçün unikal kod. Məsələn: M001, REG01, SEC001, SCH001
          </p>
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1 py-0.5 text-xs bg-muted border rounded">Alt+G</kbd> avtomatik kod yaratmaq üçün
          </p>
        </div>
      ),
    }),

    // UTIS Code field
    createField('utis_code', 'UTIS Kodu', 'custom', {
      validation: z.string()
        .regex(/^\d{8}$/, 'UTIS kodu 8 rəqəmdən ibarət olmalıdır')
        .optional()
        .or(z.literal('')),
      render: ({ field, formControl }: any) => (
        <div className="space-y-2">
          <div className="relative">
            <input
              {...field}
              type="text"
              placeholder="8 rəqəmli UTIS kodu"
              maxLength={8}
              aria-label="UTIS kodu - 8 rəqəmli"
              aria-describedby="utis-validation-message utis-help-text"
              aria-invalid={utisCodeValidation.status === 'invalid'}
              aria-busy={utisCodeValidation.status === 'checking'}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                utisCodeValidation.status === 'valid' && "border-green-500 focus-visible:ring-green-500",
                utisCodeValidation.status === 'invalid' && "border-red-500 focus-visible:ring-red-500"
              )}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                field.onChange(value);
                const formValues = formControl.getValues();
                updateFormCompleteness({ ...formValues, utis_code: value });
                if (value.length === 8) {
                  handleUtisCodeValidation(value);
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {utisCodeValidation.status === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {utisCodeValidation.status === 'valid' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {utisCodeValidation.status === 'invalid' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          {utisCodeValidation.message && (
            <div
              id="utis-validation-message"
              className={cn(
                "text-sm",
                utisCodeValidation.status === 'valid' && "text-green-600",
                utisCodeValidation.status === 'invalid' && "text-red-600"
              )}
            >
              <div className="flex items-start gap-2">
                {utisCodeValidation.status === 'valid' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {utisCodeValidation.status === 'invalid' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                <span>{utisCodeValidation.message}</span>
              </div>
            </div>
          )}
          <p id="utis-help-text" className="text-xs text-muted-foreground">
            UTIS kodu 8 rəqəmdən ibarət olmalıdır (məsələn: 12345678). Könüllü sahədir.
          </p>
        </div>
      ),
    }),

    // Form progress tracker
    {
      name: 'form_progress',
      label: '',
      type: 'custom' as const,
      component: (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-700">
                Forma Tamamlanma Vəziyyəti
              </h4>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-700">
                {formCompleteness.percentage}%
              </div>
              <div className="text-xs text-gray-600">
                {formCompleteness.validFields.length} / {formCompleteness.validFields.length + formCompleteness.missingFields.length} sahə
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  "h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden",
                  formCompleteness.percentage < 30 ? "bg-gradient-to-r from-red-400 to-red-500" :
                  formCompleteness.percentage < 70 ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                  "bg-gradient-to-r from-green-400 to-emerald-500"
                )}
                style={{ width: `${formCompleteness.percentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              </div>
              {formCompleteness.percentage > 15 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                  {formCompleteness.percentage}%
                </div>
              )}
            </div>
          </div>

          {formCompleteness.missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Tələb olunan sahələr ({formCompleteness.missingFields.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {formCompleteness.missingFields.map((field, index) => (
                      <span
                        key={index}
                        className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {formCompleteness.percentage >= 70 && formCompleteness.missingFields.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Forma hazır! Bütün tələb olunan sahələr doldurulub.
                </p>
              </div>
            </div>
          )}
        </div>
      ),
      className: 'md:col-span-2'
    },
  ];

  // Contact information fields
  const contactFields: FormField[] = [
    createField('phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('email', 'Email', 'email', {
      placeholder: 'email@example.com',
      validation: commonValidations.email.optional(),
    }),
    createField('website', 'Veb sayt', 'text', {
      placeholder: 'https://example.com (ixtiyari)',
      validation: z.string()
        .url('Düzgün URL daxil edin (https://example.com)')
        .optional()
        .or(z.literal('')),
      description: 'Müəssisənin rəsmi veb saytının ünvanı'
    }),
    createField('address', 'Ünvan', 'textarea', {
      placeholder: 'Tam ünvan',
      rows: 3,
      className: 'md:col-span-2'
    }),
  ];

  // Manager and additional information fields
  const managerFields: FormField[] = [
    createField('manager_name', 'Rəhbərin adı', 'text', {
      placeholder: 'Rəhbərin tam adı',
    }),
    createField('manager_phone', 'Rəhbərin telefonu', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('established_date', 'Təsis tarixi', 'date', {
      placeholder: 'Müəssisənin təsis tarixi',
      description: 'Müəssisənin rəsmi təsis tarixi'
    }),
    createField('capacity_students', 'Şagird tutumu', 'number', {
      placeholder: 'Maksimum şagird sayı',
      validation: z.coerce.number().min(1, 'Minimum 1 şagird tutumu olmalıdır').optional().or(z.literal('')),
      description: 'Müəssisənin maksimum şagird tutumu (ixtiyari)'
    }),
  ];

  return { basicFields, contactFields, managerFields };
};