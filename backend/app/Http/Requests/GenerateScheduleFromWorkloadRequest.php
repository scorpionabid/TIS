<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateScheduleFromWorkloadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user has permission to generate schedules
        return auth()->user() && (
            auth()->user()->hasRole(['superadmin', 'schooladmin']) ||
            auth()->user()->can('create_schedules')
        );
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'workload_data' => 'required|array',
            'workload_data.institution' => 'required|array',
            'workload_data.institution.id' => 'required|integer|exists:institutions,id',
            'workload_data.institution.name' => 'required|string',
            'workload_data.academic_year_id' => 'required|integer|exists:academic_years,id',
            'workload_data.settings' => 'required|array',
            'workload_data.settings.working_days' => 'required|array|min:1|max:7',
            'workload_data.settings.working_days.*' => 'integer|between:1,7',
            'workload_data.settings.daily_periods' => 'required|integer|between:1,12',
            'workload_data.settings.period_duration' => 'required|integer|between:30,120',
            'workload_data.settings.break_periods' => 'sometimes|array',
            'workload_data.settings.break_periods.*' => 'integer',
            'workload_data.settings.first_period_start' => 'required|date_format:H:i',
            'workload_data.teaching_loads' => 'required|array|min:1',
            'workload_data.teaching_loads.*.id' => 'required|integer|exists:teaching_loads,id',
            'workload_data.teaching_loads.*.teacher' => 'required|array',
            'workload_data.teaching_loads.*.teacher.id' => 'required|integer|exists:users,id',
            'workload_data.teaching_loads.*.subject' => 'required|array',
            'workload_data.teaching_loads.*.subject.id' => 'required|integer|exists:subjects,id',
            'workload_data.teaching_loads.*.class' => 'required|array',
            'workload_data.teaching_loads.*.class.id' => 'required|integer|exists:school_classes,id',
            'workload_data.teaching_loads.*.weekly_hours' => 'required|integer|between:1,40',
            'workload_data.teaching_loads.*.priority_level' => 'sometimes|integer|between:1,10',
            'workload_data.teaching_loads.*.preferred_consecutive_hours' => 'sometimes|integer|between:1,6',
            'workload_data.teaching_loads.*.preferred_time_slots' => 'sometimes|array',
            'workload_data.teaching_loads.*.unavailable_periods' => 'sometimes|array',
            'workload_data.time_slots' => 'required|array|min:1',
            'workload_data.time_slots.*.period_number' => 'required|integer',
            'workload_data.time_slots.*.start_time' => 'required|date_format:H:i',
            'workload_data.time_slots.*.end_time' => 'required|date_format:H:i|after:workload_data.time_slots.*.start_time',
            'workload_data.time_slots.*.duration' => 'required|integer|min:1',
            'workload_data.validation' => 'required|array',
            'workload_data.validation.is_valid' => 'required|boolean',
            
            // Generation preferences (optional)
            'generation_preferences' => 'sometimes|array',
            'generation_preferences.prioritize_teacher_preferences' => 'sometimes|boolean',
            'generation_preferences.minimize_gaps' => 'sometimes|boolean',
            'generation_preferences.balance_daily_load' => 'sometimes|boolean',
            'generation_preferences.avoid_late_periods' => 'sometimes|boolean',
            'generation_preferences.prefer_morning_core_subjects' => 'sometimes|boolean',
            'generation_preferences.max_consecutive_same_subject' => 'sometimes|integer|between:1,6',
            'generation_preferences.min_break_between_same_subject' => 'sometimes|integer|between:0,3',
            'generation_preferences.room_optimization' => 'sometimes|boolean',
            'generation_preferences.conflict_resolution_strategy' => 'sometimes|string|in:teacher_priority,class_priority,balanced',
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'workload_data.required' => 'Dərs yükü məlumatları tələb olunur',
            'workload_data.institution.id.required' => 'Təhsil müəssisəsi ID-si tələb olunur',
            'workload_data.institution.id.exists' => 'Seçilmiş təhsil müəssisəsi mövcud deyil',
            'workload_data.academic_year_id.required' => 'Tədris ili ID-si tələb olunur',
            'workload_data.academic_year_id.exists' => 'Seçilmiş tədris ili mövcud deyil',
            'workload_data.settings.working_days.required' => 'İş günləri tələb olunur',
            'workload_data.settings.working_days.min' => 'Ən azı bir iş günü seçilməlidir',
            'workload_data.settings.working_days.*.between' => 'İş günü 1 (Bazar ertəsi) və 7 (Bazar) arasında olmalıdır',
            'workload_data.settings.daily_periods.required' => 'Günlük dərs sayı tələb olunur',
            'workload_data.settings.daily_periods.between' => 'Günlük dərs sayı 1 və 12 arasında olmalıdır',
            'workload_data.settings.period_duration.required' => 'Dərs müddəti tələb olunur',
            'workload_data.settings.period_duration.between' => 'Dərs müddəti 30 və 120 dəqiqə arasında olmalıdır',
            'workload_data.settings.first_period_start.required' => 'İlk dərsin başlama vaxtı tələb olunur',
            'workload_data.settings.first_period_start.date_format' => 'İlk dərsin başlama vaxtı HH:MM formatında olmalıdır',
            'workload_data.teaching_loads.required' => 'Dərs yükləri tələb olunur',
            'workload_data.teaching_loads.min' => 'Ən azı bir dərs yükü olmalıdır',
            'workload_data.teaching_loads.*.id.exists' => 'Seçilmiş dərs yükü mövcud deyil',
            'workload_data.teaching_loads.*.teacher.id.exists' => 'Seçilmiş müəllim mövcud deyil',
            'workload_data.teaching_loads.*.subject.id.exists' => 'Seçilmiş fənn mövcud deyil',
            'workload_data.teaching_loads.*.class.id.exists' => 'Seçilmiş sinif mövcud deyil',
            'workload_data.teaching_loads.*.weekly_hours.required' => 'Həftəlik dərs saatı tələb olunur',
            'workload_data.teaching_loads.*.weekly_hours.between' => 'Həftəlik dərs saatı 1 və 40 arasında olmalıdır',
            'workload_data.time_slots.required' => 'Dərs vaxt slotları tələb olunur',
            'workload_data.time_slots.min' => 'Ən azı bir vaxt slotu olmalıdır',
            'workload_data.validation.is_valid.required' => 'Validasiya vəziyyəti tələb olunur',
            'workload_data.validation.is_valid.boolean' => 'Validasiya vəziyyəti doğru/yanlış olmalıdır',
            'generation_preferences.conflict_resolution_strategy.in' => 'Konflikt həlli strategiyası teacher_priority, class_priority və ya balanced olmalıdır',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'workload_data' => 'dərs yükü məlumatları',
            'workload_data.institution.id' => 'təhsil müəssisəsi',
            'workload_data.academic_year_id' => 'tədris ili',
            'workload_data.settings.working_days' => 'iş günləri',
            'workload_data.settings.daily_periods' => 'günlük dərs sayı',
            'workload_data.settings.period_duration' => 'dərs müddəti',
            'workload_data.settings.first_period_start' => 'ilk dərsin başlama vaxtı',
            'workload_data.teaching_loads' => 'dərs yükləri',
            'workload_data.time_slots' => 'vaxt slotları',
            'generation_preferences' => 'yaratma tərcihləri',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Check if workload data is valid according to its own validation
            if ($this->input('workload_data.validation.is_valid') === false) {
                $validator->errors()->add(
                    'workload_data.validation',
                    'Dərs yükü məlumatları validasiyadan keçmədi. Xətalar: ' . 
                    implode(', ', $this->input('workload_data.validation.errors', []))
                );
            }

            // Validate that break periods don't exceed daily periods
            $dailyPeriods = $this->input('workload_data.settings.daily_periods');
            $breakPeriods = $this->input('workload_data.settings.break_periods', []);
            
            foreach ($breakPeriods as $index => $breakPeriod) {
                if ($breakPeriod > $dailyPeriods) {
                    $validator->errors()->add(
                        "workload_data.settings.break_periods.{$index}",
                        "Fasilə dövrü ({$breakPeriod}) günlük dərs sayından ({$dailyPeriods}) çox ola bilməz"
                    );
                }
            }

            // Validate that teacher loads don't exceed reasonable limits
            $teachingLoads = $this->input('workload_data.teaching_loads', []);
            $teacherHours = [];
            
            foreach ($teachingLoads as $index => $load) {
                $teacherId = $load['teacher']['id'] ?? null;
                if (!$teacherId) continue;
                
                if (!isset($teacherHours[$teacherId])) {
                    $teacherHours[$teacherId] = 0;
                }
                
                $teacherHours[$teacherId] += $load['weekly_hours'] ?? 0;
                
                // Warn if teacher has more than 25 hours
                if ($teacherHours[$teacherId] > 25) {
                    $validator->errors()->add(
                        "workload_data.teaching_loads.{$index}.weekly_hours",
                        "Müəllim {$load['teacher']['name']} üçün həftəlik dərs saatı ({$teacherHours[$teacherId]}) tövsiyə edilən maksimumdan (25 saat) çoxdur"
                    );
                }
            }
        });
    }
}