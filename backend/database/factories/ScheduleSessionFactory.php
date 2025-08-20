<?php

namespace Database\Factories;

use App\Models\ScheduleSession;
use App\Models\Schedule;
use App\Models\Subject;
use App\Models\User;
use App\Models\Room;
use App\Models\TimeSlot;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class ScheduleSessionFactory extends Factory
{
    protected $model = ScheduleSession::class;

    public function definition(): array
    {
        $startTime = $this->faker->time('H:i', '16:00');
        $endTime = Carbon::createFromFormat('H:i', $startTime)->addMinutes($this->faker->numberBetween(45, 90))->format('H:i');
        $duration = Carbon::createFromFormat('H:i', $startTime)->diffInMinutes(Carbon::createFromFormat('H:i', $endTime));

        return [
            'schedule_id' => Schedule::factory(),
            'subject_id' => Subject::factory(),
            'teacher_id' => User::factory(),
            'room_id' => Room::factory(),
            'time_slot_id' => TimeSlot::factory(),
            
            // Session timing
            'day_of_week' => $this->faker->randomElement(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
            'period_number' => $this->faker->numberBetween(1, 8),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'duration_minutes' => $duration,
            
            // Session classification
            'session_type' => $this->faker->randomElement(['regular', 'lab', 'practical', 'exam', 'quiz', 'review']),
            'recurrence_pattern' => $this->faker->randomElement(['weekly', 'bi_weekly', 'one_time']),
            'recurrence_config' => null,
            
            // Session details
            'topic' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph(1),
            'lesson_plan_reference' => $this->faker->optional()->word(),
            
            // Resource requirements
            'requires_projector' => $this->faker->boolean(30),
            'requires_computer' => $this->faker->boolean(20),
            'requires_lab_equipment' => $this->faker->boolean(15),
            'requires_special_setup' => $this->faker->boolean(10),
            'required_resources' => $this->faker->optional()->randomElements(['whiteboard', 'speakers', 'microphone'], $this->faker->numberBetween(0, 2)),
            'room_setup_requirements' => null,
            
            // Student and class information
            'expected_student_count' => $this->faker->numberBetween(15, 35),
            'student_groups' => null,
            'is_mandatory' => $this->faker->boolean(90),
            
            // Status and modifications
            'status' => $this->faker->randomElement(['scheduled', 'confirmed', 'cancelled', 'completed']),
            'substitute_teacher_id' => null,
            'original_teacher_id' => null,
            'substitution_reason' => null,
            'last_modified_at' => null,
            'last_modified_by' => null,
            
            // Attendance and completion
            'actual_student_count' => null,
            'attendance_percentage' => null,
            'session_started_at' => null,
            'session_ended_at' => null,
            'completion_notes' => null,
            
            // Conflicts and warnings
            'has_conflicts' => $this->faker->boolean(10),
            'conflict_details' => null,
            'conflict_severity' => 'none',
            
            // Quality and feedback
            'session_rating' => $this->faker->optional(30)->randomFloat(2, 1, 5),
            'teacher_feedback' => $this->faker->optional(20)->sentence(),
            'student_feedback' => $this->faker->optional(15)->sentence(),
            'session_analytics' => null,
            
            // Notification and alerts
            'notify_students' => $this->faker->boolean(80),
            'notify_parents' => $this->faker->boolean(30),
            'notifications_sent_at' => null,
            'notification_history' => null,
            
            // External integration
            'external_reference' => null,
            'integration_data' => null,
            
            // Audit and metadata
            'metadata' => null,
            'administrative_notes' => $this->faker->optional(10)->sentence(),
        ];
    }

    /**
     * Create active session
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'scheduled',
            'has_conflicts' => false,
            'conflict_severity' => 'none',
        ]);
    }

    /**
     * Create completed session
     */
    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            $startTime = now()->subDays($this->faker->numberBetween(1, 30));
            $endTime = $startTime->copy()->addMinutes($attributes['duration_minutes']);
            
            return [
                'status' => 'completed',
                'session_started_at' => $startTime,
                'session_ended_at' => $endTime,
                'actual_student_count' => $this->faker->numberBetween(10, $attributes['expected_student_count']),
                'attendance_percentage' => $this->faker->randomFloat(2, 70, 100),
                'session_rating' => $this->faker->randomFloat(2, 3, 5),
                'teacher_feedback' => $this->faker->sentence(),
                'completion_notes' => $this->faker->optional()->sentence(),
            ];
        });
    }

    /**
     * Create cancelled session
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'administrative_notes' => 'Session cancelled: ' . $this->faker->randomElement([
                'Teacher illness',
                'School event',
                'Holiday',
                'Maintenance',
                'Weather conditions'
            ]),
        ]);
    }

    /**
     * Create session with conflicts
     */
    public function withConflicts(): static
    {
        return $this->state(fn (array $attributes) => [
            'has_conflicts' => true,
            'conflict_severity' => $this->faker->randomElement(['low', 'medium', 'high', 'critical']),
            'conflict_details' => [
                [
                    'type' => $this->faker->randomElement(['teacher', 'room', 'resource']),
                    'description' => 'Auto-detected conflict',
                    'severity' => $this->faker->randomElement(['medium', 'high']),
                ]
            ],
        ]);
    }

    /**
     * Create session with substitute teacher
     */
    public function withSubstitute(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'substituted',
            'substitute_teacher_id' => User::factory(),
            'original_teacher_id' => $attributes['teacher_id'],
            'substitution_reason' => $this->faker->randomElement([
                'Original teacher sick',
                'Professional development',
                'Emergency leave',
                'Conference attendance'
            ]),
        ]);
    }

    /**
     * Create lab session
     */
    public function labSession(): static
    {
        return $this->state(fn (array $attributes) => [
            'session_type' => 'lab',
            'requires_lab_equipment' => true,
            'requires_special_setup' => true,
            'duration_minutes' => 90,
            'expected_student_count' => $this->faker->numberBetween(10, 20), // Smaller lab groups
            'required_resources' => ['lab_equipment', 'safety_gear', 'computers'],
        ]);
    }

    /**
     * Create exam session
     */
    public function examSession(): static
    {
        return $this->state(fn (array $attributes) => [
            'session_type' => 'exam',
            'topic' => 'Final Examination',
            'duration_minutes' => 120,
            'requires_special_setup' => true,
            'is_mandatory' => true,
            'notify_students' => true,
            'notify_parents' => true,
        ]);
    }

    /**
     * Create session for specific day
     */
    public function forDay(string $dayOfWeek): static
    {
        return $this->state(fn (array $attributes) => [
            'day_of_week' => $dayOfWeek,
        ]);
    }

    /**
     * Create session for specific teacher
     */
    public function forTeacher(int $teacherId): static
    {
        return $this->state(fn (array $attributes) => [
            'teacher_id' => $teacherId,
        ]);
    }

    /**
     * Create session for specific subject
     */
    public function forSubject(int $subjectId): static
    {
        return $this->state(fn (array $attributes) => [
            'subject_id' => $subjectId,
        ]);
    }

    /**
     * Create session in specific room
     */
    public function inRoom(int $roomId): static
    {
        return $this->state(fn (array $attributes) => [
            'room_id' => $roomId,
        ]);
    }

    /**
     * Create session for specific schedule
     */
    public function forSchedule(int $scheduleId): static
    {
        return $this->state(fn (array $attributes) => [
            'schedule_id' => $scheduleId,
        ]);
    }

    /**
     * Create morning session
     */
    public function morning(): static
    {
        return $this->state(function (array $attributes) {
            $startTime = $this->faker->time('H:i', '11:30');
            $endTime = Carbon::createFromFormat('H:i', $startTime)->addMinutes($attributes['duration_minutes'])->format('H:i');
            
            return [
                'start_time' => $startTime,
                'end_time' => $endTime,
                'period_number' => $this->faker->numberBetween(1, 4),
            ];
        });
    }

    /**
     * Create afternoon session
     */
    public function afternoon(): static
    {
        return $this->state(function (array $attributes) {
            $startTime = $this->faker->time('H:i', '16:30');
            $endTime = Carbon::createFromFormat('H:i', $startTime)->addMinutes($attributes['duration_minutes'])->format('H:i');
            
            return [
                'start_time' => $startTime,
                'end_time' => $endTime,
                'period_number' => $this->faker->numberBetween(5, 8),
            ];
        });
    }

    /**
     * Create high-rated session
     */
    public function highRated(): static
    {
        return $this->state(fn (array $attributes) => [
            'session_rating' => $this->faker->randomFloat(2, 4, 5),
            'teacher_feedback' => 'Excellent class participation and engagement',
            'student_feedback' => 'Very informative and well-structured lesson',
            'attendance_percentage' => $this->faker->randomFloat(2, 85, 100),
        ]);
    }

    /**
     * Create recurring weekly session
     */
    public function weeklyRecurring(): static
    {
        return $this->state(fn (array $attributes) => [
            'recurrence_pattern' => 'weekly',
            'recurrence_config' => [
                'frequency' => 1,
                'interval' => 'week',
                'days' => [$attributes['day_of_week']],
            ],
        ]);
    }
}