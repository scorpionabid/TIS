<?php

namespace Database\Factories;

use App\Models\Schedule;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Schedule>
 */
class ScheduleFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\App\Models\Schedule>
     */
    protected $model = Schedule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $effectiveFrom = Carbon::parse($this->faker->dateTimeBetween('now', '+1 month'));
        $effectiveTo = Carbon::parse($this->faker->dateTimeBetween($effectiveFrom, '+3 months'));
        $workingDays = [1, 2, 3, 4, 5];

        return [
            'name' => $this->faker->words(3, true) . ' Cədvəli',
            'type' => 'regular',
            'schedule_type' => 'regular',
            'institution_id' => Institution::factory(),
            'academic_year_id' => AcademicYear::factory(),
            'effective_from' => $effectiveFrom,
            'effective_date' => $effectiveFrom,
            'effective_to' => $effectiveTo,
            'end_date' => $effectiveTo,
            'working_days' => $workingDays,
            'total_periods_per_day' => 6,
            'total_teaching_periods' => 6,
            'schedule_data' => [
                'working_days' => $workingDays,
                'periods_per_day' => 6,
                'break_periods' => [3],
                'lunch_period' => 4,
                'slots' => [],
            ],
            'generation_settings' => [
                'auto_generate' => false,
                'conflict_resolution' => 'manual',
                'preferred_days' => $workingDays,
                'max_consecutive_periods' => 3,
                'min_break_between_subjects' => 1,
            ],
            'generation_method' => 'manual',
            'status' => $this->faker->randomElement(['draft', 'pending_review', 'approved', 'active', 'archived']),
            'created_by' => User::factory(),
            'approved_by' => null,
            'approved_at' => null,
            'metadata' => [],
            'notes' => $this->faker->optional()->paragraph(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the schedule is in draft status.
     */
    public function draft(): Factory
    {
        return $this->state(fn () => [
            'status' => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    /**
     * Indicate that the schedule is approved.
     */
    public function approved(): Factory
    {
        return $this->state(fn () => [
            'status' => 'approved',
            'approved_by' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    /**
     * Indicate that the schedule is active.
     */
    public function active(): Factory
    {
        return $this->state(fn () => [
            'status' => 'active',
            'approved_by' => User::factory(),
            'approved_at' => now(),
            'effective_from' => now()->subDays(7),
            'effective_date' => now()->subDays(7),
            'effective_to' => now()->addMonths(3),
            'end_date' => now()->addMonths(3),
        ]);
    }

    /**
     * Indicate that the schedule is weekly type.
     */
    public function weekly(): Factory
    {
        return $this->state(function () {
            $workingDays = [1, 2, 3, 4, 5];

            return [
                'type' => 'weekly',
                'schedule_type' => 'weekly',
                'schedule_data' => [
                    'working_days' => $workingDays,
                    'periods_per_day' => 6,
                    'break_periods' => [3],
                    'lunch_period' => 4,
                    'weekly_rotation' => false,
                    'slots' => [],
                ],
            ];
        });
    }

    /**
     * Indicate that the schedule is exam type.
     */
    public function exam(): Factory
    {
        return $this->state(function () {
            return [
                'type' => 'exam',
                'schedule_type' => 'exam',
                'schedule_data' => [
                    'exam_period' => true,
                    'working_days' => [1, 2, 3, 4, 5],
                    'periods_per_day' => 4,
                    'exam_duration' => 90,
                    'break_between_exams' => 30,
                    'slots' => [],
                ],
            ];
        });
    }

    /**
     * Indicate that the schedule has generation settings.
     */
    public function withGenerationSettings(): Factory
    {
        return $this->state(fn () => [
            'generation_settings' => [
                'auto_generate' => true,
                'conflict_resolution' => 'automatic',
                'preferred_days' => [1, 2, 3, 4, 5],
                'max_consecutive_periods' => 3,
                'min_break_between_subjects' => 1,
                'teacher_preferences' => [
                    'morning_only' => [],
                    'afternoon_only' => [],
                    'no_first_period' => [],
                    'no_last_period' => [],
                ],
                'room_constraints' => [
                    'specialized_rooms' => [],
                    'capacity_requirements' => [],
                ],
                'optimization_goals' => [
                    'minimize_gaps' => true,
                    'balance_daily_load' => true,
                    'respect_lunch_break' => true,
                ],
            ],
        ]);
    }

    /**
     * Indicate that the schedule has slots defined.
     */
    public function withSlots(): Factory
    {
        return $this->state(fn () => [
            'schedule_data' => [
                'slots' => [
                    [
                        'class_id' => 1,
                        'subject_id' => 1,
                        'teacher_id' => 1,
                        'day_of_week' => 1,
                        'period_number' => 1,
                        'start_time' => '08:00',
                        'end_time' => '08:45',
                        'room_location' => '101',
                        'slot_type' => 'regular',
                    ],
                    [
                        'class_id' => 1,
                        'subject_id' => 2,
                        'teacher_id' => 2,
                        'day_of_week' => 1,
                        'period_number' => 2,
                        'start_time' => '08:55',
                        'end_time' => '09:40',
                        'room_location' => '102',
                        'slot_type' => 'regular',
                    ],
                ],
            ],
        ]);
    }
}

