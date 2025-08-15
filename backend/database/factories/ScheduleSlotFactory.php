<?php

namespace Database\Factories;

use App\Models\ScheduleSlot;
use App\Models\Schedule;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ScheduleSlot>
 */
class ScheduleSlotFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ScheduleSlot::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $dayOfWeek = $this->faker->numberBetween(1, 5); // Monday to Friday
        $periodNumber = $this->faker->numberBetween(1, 6);
        
        // Generate start and end times based on period
        $startHour = 7 + $periodNumber; // Starting from 8 AM
        $startTime = sprintf('%02d:00', $startHour);
        $endTime = sprintf('%02d:45', $startHour);

        return [
            'schedule_id' => Schedule::factory(),
            'class_id' => Classes::factory(),
            'subject_id' => Subject::factory(),
            'teacher_id' => User::factory(),
            'day_of_week' => $dayOfWeek,
            'period_number' => $periodNumber,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'room_location' => $this->faker->randomElement(['101', '102', '103', '201', '202', 'Lab1', 'Lab2', 'Gym']),
            'slot_type' => $this->faker->randomElement(['regular', 'exam', 'substitute', 'extra']),
            'status' => $this->faker->randomElement(['active', 'cancelled', 'rescheduled']),
            'notes' => $this->faker->optional()->sentence(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the slot is for Monday.
     */
    public function monday(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'day_of_week' => 1,
            ];
        });
    }

    /**
     * Indicate that the slot is for first period.
     */
    public function firstPeriod(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'period_number' => 1,
                'start_time' => '08:00',
                'end_time' => '08:45',
            ];
        });
    }

    /**
     * Indicate that the slot is regular type.
     */
    public function regular(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'slot_type' => 'regular',
                'status' => 'active',
            ];
        });
    }

    /**
     * Indicate that the slot is for exam.
     */
    public function exam(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'slot_type' => 'exam',
                'start_time' => '09:00',
                'end_time' => '10:30', // Longer duration for exams
                'room_location' => $this->faker->randomElement(['Exam Hall 1', 'Exam Hall 2', 'Assembly Hall']),
                'notes' => 'Final Exam',
            ];
        });
    }

    /**
     * Indicate that the slot is cancelled.
     */
    public function cancelled(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'cancelled',
                'notes' => 'Cancelled due to teacher unavailability',
            ];
        });
    }

    /**
     * Indicate that the slot is a substitute.
     */
    public function substitute(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'slot_type' => 'substitute',
                'notes' => 'Substitute teacher assigned',
            ];
        });
    }

    /**
     * Create a slot with specific time.
     */
    public function withTime(string $startTime, string $endTime): Factory
    {
        return $this->state(function (array $attributes) use ($startTime, $endTime) {
            return [
                'start_time' => $startTime,
                'end_time' => $endTime,
            ];
        });
    }

    /**
     * Create a slot for specific day and period.
     */
    public function forDayAndPeriod(int $dayOfWeek, int $periodNumber): Factory
    {
        return $this->state(function (array $attributes) use ($dayOfWeek, $periodNumber) {
            // Calculate time based on period
            $startHour = 7 + $periodNumber;
            $startTime = sprintf('%02d:00', $startHour);
            $endTime = sprintf('%02d:45', $startHour);

            return [
                'day_of_week' => $dayOfWeek,
                'period_number' => $periodNumber,
                'start_time' => $startTime,
                'end_time' => $endTime,
            ];
        });
    }

    /**
     * Create a slot in a specific room.
     */
    public function inRoom(string $roomLocation): Factory
    {
        return $this->state(function (array $attributes) use ($roomLocation) {
            return [
                'room_location' => $roomLocation,
            ];
        });
    }
}