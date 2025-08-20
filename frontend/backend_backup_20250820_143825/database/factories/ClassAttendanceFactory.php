<?php

namespace Database\Factories;

use App\Models\ClassAttendance;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClassAttendance>
 */
class ClassAttendanceFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ClassAttendance::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $totalStudents = $this->faker->numberBetween(20, 30);
        $presentStudents = $this->faker->numberBetween(15, $totalStudents);
        $absentExcused = $this->faker->numberBetween(0, ($totalStudents - $presentStudents));
        $absentUnexcused = $totalStudents - $presentStudents - $absentExcused;

        return [
            'class_id' => Classes::factory(),
            'subject_id' => Subject::factory(),
            'teacher_id' => User::factory(),
            'attendance_date' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'period_number' => $this->faker->numberBetween(1, 6),
            'start_time' => $this->faker->time('H:i'),
            'end_time' => $this->faker->time('H:i'),
            'total_students_registered' => $totalStudents,
            'students_present' => $presentStudents,
            'students_absent_excused' => $absentExcused,
            'students_absent_unexcused' => $absentUnexcused,
            'students_late' => $this->faker->numberBetween(0, 3),
            'lesson_status' => $this->faker->randomElement(['completed', 'cancelled', 'partial', 'substituted']),
            'approval_status' => $this->faker->randomElement(['pending', 'approved', 'rejected', 'needs_review']),
            'notes' => $this->faker->optional()->sentence(),
            'attendance_metadata' => json_encode([
                'created_by_ip' => $this->faker->ipv4(),
                'created_by_user_agent' => $this->faker->userAgent(),
                'total_accounted' => $presentStudents + $absentExcused + $absentUnexcused,
                'attendance_percentage' => $totalStudents > 0 ? round(($presentStudents / $totalStudents) * 100, 2) : 0
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the attendance is pending approval.
     */
    public function pending(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'approval_status' => 'pending',
                'approved_by' => null,
                'approved_at' => null,
            ];
        });
    }

    /**
     * Indicate that the attendance is approved.
     */
    public function approved(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'approval_status' => 'approved',
                'approved_by' => User::factory(),
                'approved_at' => now(),
            ];
        });
    }

    /**
     * Indicate that the attendance is rejected.
     */
    public function rejected(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'approval_status' => 'rejected',
                'approved_by' => User::factory(),
                'approved_at' => now(),
            ];
        });
    }

    /**
     * Indicate that the lesson was completed.
     */
    public function completed(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'lesson_status' => 'completed',
            ];
        });
    }

    /**
     * Indicate that the lesson was cancelled.
     */
    public function cancelled(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'lesson_status' => 'cancelled',
                'students_present' => 0,
                'students_absent_excused' => $attributes['total_students_registered'] ?? 25,
                'students_absent_unexcused' => 0,
                'students_late' => 0,
            ];
        });
    }

    /**
     * Perfect attendance (all students present).
     */
    public function perfectAttendance(): Factory
    {
        return $this->state(function (array $attributes) {
            $totalStudents = $attributes['total_students_registered'] ?? 25;
            
            return [
                'students_present' => $totalStudents,
                'students_absent_excused' => 0,
                'students_absent_unexcused' => 0,
                'students_late' => 0,
                'lesson_status' => 'completed',
                'attendance_metadata' => json_encode([
                    'created_by_ip' => $this->faker->ipv4(),
                    'created_by_user_agent' => $this->faker->userAgent(),
                    'total_accounted' => $totalStudents,
                    'attendance_percentage' => 100.0
                ]),
            ];
        });
    }
}