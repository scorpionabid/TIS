<?php

namespace App\Http\Requests;

use App\Services\InstitutionAssignmentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('users.write');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'patronymic' => 'nullable|string|max:255',
            'username' => 'required|string|unique:users,username|max:255',
            'email' => 'nullable|email|unique:users,email|max:255',
            'password' => 'nullable|string|min:6',
            'contact_phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female',
            'national_id' => 'nullable|string|max:50',
            'role_id' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where(function ($query) {
                    $query->where('is_active', true);
                }),
                function ($attribute, $value, $fail) {
                    // Custom validation for role-institution compatibility
                    $institutionValue = $this->input('institution_id');
                    if ($institutionValue) {
                        $institutionService = app(InstitutionAssignmentService::class);
                        $institutionId = $institutionService->parseInstitutionId($institutionValue);

                        if ($institutionId && ! $institutionService->validateAssignment($value, $institutionId)) {
                            $fail("Bu rol ($value) seçilmiş quruma təyin oluna bilməz.");
                        }
                    }
                },
            ],
            'institution_id' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $institutionService = app(InstitutionAssignmentService::class);
                    $institutionId = $institutionService->parseInstitutionId($value);

                    if (! $institutionId) {
                        $fail("Qurum ID formatı düzgün deyil. '32' və ya '32 (Ad)' formatında olmalıdır.");

                        return;
                    }

                    // Check if institution exists
                    if (! \App\Models\Institution::where('id', $institutionId)->exists()) {
                        $fail("Qurum ID {$institutionId} mövcud deyil.");
                    }
                },
            ],
            'department' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_email' => 'nullable|email|max:255',
            'utis_code' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',

            // Teacher-specific fields
            'specialty' => 'nullable|string|max:255',
            'subjects' => 'nullable|string', // Comma-separated subject IDs
            'experience_years' => 'nullable|integer|min:0|max:50',
            'miq_score' => 'nullable|numeric|between:0,100',
            'certification_score' => 'nullable|numeric|between:0,100',
            'last_certification_date' => 'nullable|date',
            'degree_level' => 'nullable|in:bachelor,master,doctorate',
            'graduation_university' => 'nullable|string|max:255',
            'graduation_year' => 'nullable|integer|min:1950|max:2030',
            'university_gpa' => 'nullable|numeric|between:0,4',

            // Student-specific fields
            'student_miq_score' => 'nullable|numeric|between:0,100',
            'previous_school' => 'nullable|string|max:255',
        ];
    }

    /**
     * Get custom error messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'Ad sahəsi tələb olunur.',
            'last_name.required' => 'Soyad sahəsi tələb olunur.',
            'username.required' => 'İstifadəçi adı tələb olunur.',
            'username.unique' => 'Bu istifadəçi adı artıq mövcuddur.',
            'email.email' => 'Düzgün e-poçt ünvanı daxil edin.',
            'email.unique' => 'Bu e-poçt ünvanı artıq istifadə olunur.',
            'birth_date.before' => 'Doğum tarixi bugünkü tarixdən əvvəl olmalıdır.',
            'gender.in' => 'Cins yalnız kişi və ya qadın ola bilər.',
            'role_id.required' => 'Rol tələb olunur.',
            'role_id.exists' => 'Seçilmiş rol mövcud deyil.',
            'institution_id.required' => 'Qurum tələb olunur.',
            'status.in' => 'Status yalnız aktiv və ya qeyri-aktiv ola bilər.',
            'experience_years.integer' => 'Təcrübə ili rəqəm olmalıdır.',
            'experience_years.min' => 'Təcrübə ili 0-dan az ola bilməz.',
            'experience_years.max' => 'Təcrübə ili 50-dən çox ola bilməz.',
            'miq_score.between' => 'MIQ nəticəsi 0-100 arasında olmalıdır.',
            'certification_score.between' => 'Sertifikat nəticəsi 0-100 arasında olmalıdır.',
            'degree_level.in' => 'Təhsil səviyyəsi bakalavr, magistr və ya doktorluq ola bilər.',
            'graduation_year.min' => 'Məzuniyyət ili 1950-dən az ola bilməz.',
            'graduation_year.max' => 'Məzuniyyət ili 2030-dan çox ola bilməz.',
            'university_gpa.between' => 'Universitet GPA 0-4 arasında olmalıdır.',
            'student_miq_score.between' => 'Şagird MIQ nəticəsi 0-100 arasında olmalıdır.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'ad',
            'last_name' => 'soyad',
            'patronymic' => 'ata adı',
            'username' => 'istifadəçi adı',
            'email' => 'e-poçt',
            'password' => 'şifrə',
            'contact_phone' => 'telefon',
            'birth_date' => 'doğum tarixi',
            'gender' => 'cins',
            'national_id' => 'şəxsiyyət vəsiqəsi',
            'role_id' => 'rol',
            'institution_id' => 'qurum',
            'department' => 'şöbə',
            'address' => 'ünvan',
            'emergency_contact_name' => 'təcili əlaqə adı',
            'emergency_contact_phone' => 'təcili əlaqə telefonu',
            'emergency_contact_email' => 'təcili əlaqə e-poçtu',
            'utis_code' => 'UTIS kodu',
            'notes' => 'qeydlər',
            'status' => 'status',
            'specialty' => 'ixtisas',
            'subjects' => 'fənlər',
            'experience_years' => 'təcrübə ili',
            'miq_score' => 'MIQ nəticəsi',
            'certification_score' => 'sertifikat nəticəsi',
            'last_certification_date' => 'son sertifikat tarixi',
            'degree_level' => 'təhsil səviyyəsi',
            'graduation_university' => 'məzun olduğu universitet',
            'graduation_year' => 'məzuniyyət ili',
            'university_gpa' => 'universitet GPA',
            'student_miq_score' => 'şagird MIQ nəticəsi',
            'previous_school' => 'əvvəlki məktəb',
        ];
    }
}
