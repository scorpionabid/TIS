<?php

namespace Database\Factories;

use App\Models\ScheduleGenerationSetting;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ScheduleGenerationSetting>
 */
class ScheduleGenerationSettingFactory extends Factory
{
    protected $model = ScheduleGenerationSetting::class;

    public function definition(): array
    {
        $workingDays = [1, 2, 3, 4, 5];

        return [
            'institution_id' => Institution::factory(),
            'working_days' => $workingDays,
            'daily_periods' => 7,
            'period_duration' => 45,
            'break_periods' => [3, 6],
            'lunch_break_period' => 4,
            'first_period_start' => '08:00',
            'break_duration' => 10,
            'lunch_duration' => 60,
            'generation_preferences' => [
                'minimize_gaps' => true,
                'balance_daily_load' => true,
                'avoid_late_periods' => false,
            ],
            'is_active' => true,
        ];
    }

    public function inactive(): Factory
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}

