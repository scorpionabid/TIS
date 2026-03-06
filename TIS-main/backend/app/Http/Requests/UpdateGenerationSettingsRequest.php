<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGenerationSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->user() && (
            auth()->user()->hasRole(['superadmin', 'schooladmin']) ||
            auth()->user()->can('manage_schedule_settings')
        );
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'institution_id' => 'sometimes|integer|exists:institutions,id',
            'working_days' => 'required|array|min:1|max:7',
            'working_days.*' => 'integer|between:1,7',
            'daily_periods' => 'required|integer|between:1,12',
            'period_duration' => 'required|integer|between:30,120',
            'break_periods' => 'sometimes|array',
            'break_periods.*' => 'integer|min:1',
            'lunch_break_period' => 'nullable|integer|min:1',
            'first_period_start' => 'required|date_format:H:i',
            'break_duration' => 'required|integer|between:5,30',
            'lunch_duration' => 'required|integer|between:30,120',
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
            'is_active' => 'sometimes|boolean',
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'working_days.required' => 'İş günləri tələb olunur',
            'working_days.min' => 'Ən azı bir iş günü seçilməlidir',
            'working_days.max' => 'Maksimum 7 iş günü seçilə bilər',
            'working_days.*.between' => 'İş günü 1 (Bazar ertəsi) və 7 (Bazar) arasında olmalıdır',
            'daily_periods.required' => 'Günlük dərs sayı tələb olunur',
            'daily_periods.between' => 'Günlük dərs sayı 1 və 12 arasında olmalıdır',
            'period_duration.required' => 'Dərs müddəti tələb olunur',
            'period_duration.between' => 'Dərs müddəti 30 və 120 dəqiqə arasında olmalıdır',
            'break_periods.*.min' => 'Fasilə dövrü 1-dən kiçik ola bilməz',
            'lunch_break_period.min' => 'Nahar fasiləsi dövrü 1-dən kiçik ola bilməz',
            'first_period_start.required' => 'İlk dərsin başlama vaxtı tələb olunur',
            'first_period_start.date_format' => 'İlk dərsin başlama vaxtı HH:MM formatında olmalıdır',
            'break_duration.required' => 'Fasilə müddəti tələb olunur',
            'break_duration.between' => 'Fasilə müddəti 5 və 30 dəqiqə arasında olmalıdır',
            'lunch_duration.required' => 'Nahar fasiləsi müddəti tələb olunur',
            'lunch_duration.between' => 'Nahar fasiləsi müddəti 30 və 120 dəqiqə arasında olmalıdır',
            'generation_preferences.max_consecutive_same_subject.between' => 'Ardıcıl eyni fənn dərsi maksimum 1 və 6 arasında ola bilər',
            'generation_preferences.min_break_between_same_subject.between' => 'Eyni fənn dərsləri arasında minimum fasilə 0 və 3 arasında ola bilər',
            'generation_preferences.conflict_resolution_strategy.in' => 'Konflikt həlli strategiyası teacher_priority, class_priority və ya balanced olmalıdır',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'working_days' => 'iş günləri',
            'daily_periods' => 'günlük dərs sayı',
            'period_duration' => 'dərs müddəti',
            'break_periods' => 'fasilə dövrləri',
            'lunch_break_period' => 'nahar fasiləsi dövrü',
            'first_period_start' => 'ilk dərsin başlama vaxtı',
            'break_duration' => 'fasilə müddəti',
            'lunch_duration' => 'nahar fasiləsi müddəti',
            'generation_preferences' => 'yaratma tərcihləri',
            'is_active' => 'aktiv vəziyyət',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validate that break periods don't exceed daily periods
            $dailyPeriods = $this->input('daily_periods');
            $breakPeriods = $this->input('break_periods', []);

            foreach ($breakPeriods as $index => $breakPeriod) {
                if ($breakPeriod > $dailyPeriods) {
                    $validator->errors()->add(
                        "break_periods.{$index}",
                        "Fasilə dövrü ({$breakPeriod}) günlük dərs sayından ({$dailyPeriods}) çox ola bilməz"
                    );
                }
            }

            // Validate lunch break period
            $lunchBreakPeriod = $this->input('lunch_break_period');
            if ($lunchBreakPeriod && $lunchBreakPeriod > $dailyPeriods) {
                $validator->errors()->add(
                    'lunch_break_period',
                    "Nahar fasiləsi dövrü ({$lunchBreakPeriod}) günlük dərs sayından ({$dailyPeriods}) çox ola bilməz"
                );
            }

            // Validate working days uniqueness
            $workingDays = $this->input('working_days', []);
            if (count($workingDays) !== count(array_unique($workingDays))) {
                $validator->errors()->add(
                    'working_days',
                    'İş günləri təkrarlanmamalıdır'
                );
            }

            // Validate time constraints
            $firstPeriodStart = $this->input('first_period_start');
            if ($firstPeriodStart) {
                $startHour = (int) substr($firstPeriodStart, 0, 2);
                $startMinute = (int) substr($firstPeriodStart, 3, 2);

                // Check reasonable start time (not too early or too late)
                if ($startHour < 6 || $startHour > 12) {
                    $validator->errors()->add(
                        'first_period_start',
                        'İlk dərsin başlama vaxtı 06:00 və 12:00 arasında olmalıdır'
                    );
                }

                // Calculate total day duration to ensure it's reasonable
                $totalMinutes = ($dailyPeriods * $this->input('period_duration', 45)) +
                              (count($breakPeriods) * $this->input('break_duration', 10)) +
                              ($lunchBreakPeriod ? $this->input('lunch_duration', 60) : 0);

                $endHour = $startHour + floor(($startMinute + $totalMinutes) / 60);

                if ($endHour > 18) { // 6 PM
                    $validator->errors()->add(
                        'daily_periods',
                        "Cədvəlin ümumi müddəti gündən çox uzun olur (bitmə vaxtı: ~{$endHour}:00). Günlük dərs sayını və ya dərs müddətini azaldın"
                    );
                }
            }

            // Validate generation preferences consistency
            $preferences = $this->input('generation_preferences', []);

            if (isset($preferences['max_consecutive_same_subject']) &&
                isset($preferences['min_break_between_same_subject'])) {
                $maxConsecutive = $preferences['max_consecutive_same_subject'];
                $minBreak = $preferences['min_break_between_same_subject'];

                if ($maxConsecutive == 1 && $minBreak > 0) {
                    $validator->errors()->add(
                        'generation_preferences.min_break_between_same_subject',
                        'Maksimum ardıcıl dərs 1 olduqda minimum fasilə 0 olmalıdır'
                    );
                }
            }
        });
    }
}
