<?php

namespace Database\Factories;

use App\Models\ScheduleConflict;
use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Models\TimeSlot;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ScheduleConflictFactory extends Factory
{
    protected $model = ScheduleConflict::class;

    public function definition(): array
    {
        $conflictType = $this->faker->randomElement(['teacher', 'room', 'resource', 'time', 'capacity']);
        $severity = $this->faker->randomElement(['low', 'medium', 'high', 'critical']);
        
        return [
            'schedule_id' => Schedule::factory(),
            'session_id' => ScheduleSession::factory(),
            
            // Conflict identification
            'conflict_type' => $conflictType,
            'severity' => $severity,
            'title' => $this->generateTitleByType($conflictType),
            'description' => $this->generateDescriptionByType($conflictType),
            'affected_entities' => $this->generateAffectedEntities($conflictType),
            
            // Conflict source information
            'source_entity_type' => $this->getSourceEntityType($conflictType),
            'source_entity_id' => $this->faker->numberBetween(1, 100),
            'target_entity_type' => $this->getTargetEntityType($conflictType),
            'target_entity_id' => $this->faker->numberBetween(1, 100),
            
            // Time and location context
            'day_of_week' => $this->faker->randomElement(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
            'time_slot_id' => TimeSlot::factory(),
            'start_time' => $this->faker->time('H:i', '16:00'),
            'end_time' => $this->faker->time('H:i', '17:00'),
            'room_id' => Room::factory(),
            
            // Detection and resolution
            'detection_method' => $this->faker->randomElement(['automatic', 'manual', 'validation']),
            'detected_at' => $this->faker->dateTimeThisMonth(),
            'detected_by' => User::factory(),
            
            // Resolution tracking
            'status' => $this->faker->randomElement(['pending', 'acknowledged', 'in_progress', 'resolved']),
            'resolution_notes' => $this->faker->optional(30)->sentence(),
            'resolution_actions' => $this->faker->optional(20)->randomElements([
                'reschedule_session',
                'assign_substitute',
                'change_room',
                'modify_requirements'
            ], $this->faker->numberBetween(1, 2)),
            'resolved_at' => $this->faker->optional(40)->dateTimeThisMonth(),
            'resolved_by' => $this->faker->optional(40)->numberBetween(1, 50),
            
            // Impact assessment
            'impact_score' => $this->calculateImpactScore($severity, $conflictType),
            'impact_analysis' => $this->generateImpactAnalysis($conflictType, $severity),
            'blocks_approval' => $this->faker->boolean($severity === 'critical' ? 80 : 20),
            'requires_notification' => $this->faker->boolean(70),
            
            // Suggestions and alternatives
            'suggested_solutions' => $this->generateSuggestedSolutions($conflictType),
            'alternative_slots' => $this->faker->optional(30)->randomElements([
                ['day' => 'tuesday', 'period' => 3],
                ['day' => 'wednesday', 'period' => 5],
                ['day' => 'friday', 'period' => 2],
            ], $this->faker->numberBetween(1, 2)),
            'alternative_resources' => $this->faker->optional(20)->randomElements([
                'alternative_room',
                'different_equipment',
                'virtual_setup'
            ], $this->faker->numberBetween(1, 2)),
            
            // Recurrence and patterns
            'is_recurring' => $this->faker->boolean(30),
            'recurrence_pattern' => $this->faker->optional(30)->randomElement(['weekly', 'daily', 'specific_days']),
            'recurrence_data' => $this->faker->optional(30)->randomElements([
                'days' => ['monday', 'wednesday', 'friday'],
                'frequency' => 1
            ]),
            
            // Business rules and constraints
            'violated_constraint' => $this->getViolatedConstraint($conflictType),
            'constraint_data' => $this->generateConstraintData($conflictType),
            'constraint_weight' => $this->faker->randomFloat(2, 0.1, 1.0),
            
            // Notification and communication
            'stakeholders' => $this->generateStakeholders($conflictType),
            'notification_history' => null,
            'last_notification_sent' => null,
            
            // External integration
            'external_reference' => $this->faker->optional(10)->uuid(),
            'integration_data' => null,
            
            // Audit and metadata
            'metadata' => $this->faker->optional(20)->randomElements([
                'auto_detected' => true,
                'priority' => $this->faker->randomElement(['low', 'medium', 'high']),
                'category' => $this->faker->randomElement(['scheduling', 'resource', 'policy'])
            ]),
            'administrative_notes' => $this->faker->optional(15)->sentence(),
            'conflict_history' => null,
        ];
    }

    /**
     * Generate title by conflict type
     */
    private function generateTitleByType(string $type): string
    {
        return match($type) {
            'teacher' => $this->faker->randomElement([
                'Teacher Double Booking Detected',
                'Instructor Scheduling Conflict',
                'Teacher Availability Conflict'
            ]),
            'room' => $this->faker->randomElement([
                'Room Double Booking',
                'Classroom Scheduling Conflict',
                'Room Availability Issue'
            ]),
            'resource' => $this->faker->randomElement([
                'Resource Unavailable',
                'Equipment Conflict',
                'Facility Requirements Not Met'
            ]),
            'time' => $this->faker->randomElement([
                'Time Slot Overlap',
                'Schedule Timing Conflict',
                'Period Scheduling Issue'
            ]),
            'capacity' => $this->faker->randomElement([
                'Room Capacity Exceeded',
                'Enrollment Over Capacity',
                'Space Limitation Conflict'
            ]),
            default => 'Scheduling Conflict Detected'
        };
    }

    /**
     * Generate description by conflict type
     */
    private function generateDescriptionByType(string $type): string
    {
        return match($type) {
            'teacher' => 'The assigned teacher is already scheduled for another session at the same time.',
            'room' => 'The requested room is already booked for another session during this time slot.',
            'resource' => 'Required resources or equipment are not available during the scheduled time.',
            'time' => 'There is a timing conflict with another scheduled session or activity.',
            'capacity' => 'The number of students exceeds the maximum capacity of the assigned room.',
            default => 'A scheduling conflict has been detected that requires attention.'
        };
    }

    /**
     * Generate affected entities
     */
    private function generateAffectedEntities(string $type): array
    {
        return match($type) {
            'teacher' => [
                'teachers' => [$this->faker->numberBetween(1, 50)],
                'sessions' => [$this->faker->numberBetween(1, 200), $this->faker->numberBetween(1, 200)]
            ],
            'room' => [
                'rooms' => [$this->faker->numberBetween(1, 20)],
                'sessions' => [$this->faker->numberBetween(1, 200)]
            ],
            'resource' => [
                'resources' => [$this->faker->randomElement(['projector', 'lab_equipment', 'computer'])],
                'sessions' => [$this->faker->numberBetween(1, 200)]
            ],
            default => [
                'sessions' => [$this->faker->numberBetween(1, 200)]
            ]
        };
    }

    /**
     * Get source entity type
     */
    private function getSourceEntityType(string $conflictType): string
    {
        return match($conflictType) {
            'teacher' => 'teacher',
            'room' => 'room',
            'resource' => 'resource',
            'time' => 'session',
            'capacity' => 'room',
            default => 'session'
        };
    }

    /**
     * Get target entity type
     */
    private function getTargetEntityType(string $conflictType): string
    {
        return 'session';
    }

    /**
     * Calculate impact score
     */
    private function calculateImpactScore(string $severity, string $type): int
    {
        $baseScore = match($severity) {
            'critical' => 80,
            'high' => 60,
            'medium' => 40,
            'low' => 20,
            default => 10
        };

        $typeModifier = match($type) {
            'teacher' => 15,
            'room' => 10,
            'resource' => 8,
            'time' => 12,
            'capacity' => 10,
            default => 5
        };

        return min(100, $baseScore + $typeModifier + $this->faker->numberBetween(-5, 5));
    }

    /**
     * Generate impact analysis
     */
    private function generateImpactAnalysis(string $type, string $severity): array
    {
        return [
            'affected_students' => $this->faker->numberBetween(10, 50),
            'affected_teachers' => $this->faker->numberBetween(1, 3),
            'disruption_level' => $severity,
            'resolution_complexity' => $this->faker->randomElement(['low', 'medium', 'high']),
            'estimated_resolution_time' => $this->faker->numberBetween(15, 120) . ' minutes',
            'alternatives_available' => $this->faker->boolean(70),
        ];
    }

    /**
     * Generate suggested solutions
     */
    private function generateSuggestedSolutions(string $type): array
    {
        return match($type) {
            'teacher' => [
                ['type' => 'reschedule', 'title' => 'Reschedule one session', 'difficulty' => 'medium'],
                ['type' => 'substitute', 'title' => 'Assign substitute teacher', 'difficulty' => 'low'],
            ],
            'room' => [
                ['type' => 'alternative_room', 'title' => 'Use alternative room', 'difficulty' => 'low'],
                ['type' => 'reschedule', 'title' => 'Reschedule session', 'difficulty' => 'medium'],
            ],
            'resource' => [
                ['type' => 'alternative_resource', 'title' => 'Use alternative resources', 'difficulty' => 'medium'],
                ['type' => 'reschedule', 'title' => 'Reschedule when available', 'difficulty' => 'medium'],
            ],
            default => [
                ['type' => 'manual_review', 'title' => 'Manual review required', 'difficulty' => 'high'],
            ]
        };
    }

    /**
     * Get violated constraint
     */
    private function getViolatedConstraint(string $type): string
    {
        return match($type) {
            'teacher' => 'teacher_availability',
            'room' => 'room_availability',
            'resource' => 'resource_availability',
            'time' => 'time_slot_uniqueness',
            'capacity' => 'room_capacity_limit',
            default => 'general_scheduling_rule'
        };
    }

    /**
     * Generate constraint data
     */
    private function generateConstraintData(string $type): array
    {
        return match($type) {
            'teacher' => [
                'max_concurrent_sessions' => 1,
                'break_time_required' => '15 minutes',
            ],
            'room' => [
                'exclusive_use_required' => true,
                'setup_time_required' => '10 minutes',
            ],
            'capacity' => [
                'max_occupancy' => $this->faker->numberBetween(20, 50),
                'safety_margin' => '10%',
            ],
            default => [
                'rule_type' => 'scheduling',
                'priority' => 'high',
            ]
        };
    }

    /**
     * Generate stakeholders
     */
    private function generateStakeholders(string $type): array
    {
        $stakeholders = ['schedule_coordinator', 'department_head'];
        
        if ($type === 'teacher') {
            $stakeholders[] = 'affected_teachers';
        }
        
        if (in_array($type, ['room', 'resource'])) {
            $stakeholders[] = 'facilities_manager';
        }
        
        return $stakeholders;
    }

    /**
     * Create critical conflict
     */
    public function critical(): static
    {
        return $this->state(fn (array $attributes) => [
            'severity' => 'critical',
            'blocks_approval' => true,
            'requires_notification' => true,
            'impact_score' => $this->faker->numberBetween(80, 100),
        ]);
    }

    /**
     * Create resolved conflict
     */
    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'resolved',
            'resolved_at' => $this->faker->dateTimeThisMonth(),
            'resolved_by' => User::factory(),
            'resolution_notes' => 'Conflict successfully resolved',
            'resolution_actions' => ['reschedule_session', 'notify_stakeholders'],
        ]);
    }

    /**
     * Create teacher conflict
     */
    public function teacherConflict(): static
    {
        return $this->state(fn (array $attributes) => [
            'conflict_type' => 'teacher',
            'source_entity_type' => 'teacher',
            'target_entity_type' => 'session',
            'title' => 'Teacher Double Booking Detected',
            'description' => 'The assigned teacher is already scheduled for another session at the same time.',
            'violated_constraint' => 'teacher_availability',
        ]);
    }

    /**
     * Create room conflict
     */
    public function roomConflict(): static
    {
        return $this->state(fn (array $attributes) => [
            'conflict_type' => 'room',
            'source_entity_type' => 'room',
            'target_entity_type' => 'session',
            'title' => 'Room Double Booking',
            'description' => 'The requested room is already booked for another session during this time slot.',
            'violated_constraint' => 'room_availability',
        ]);
    }

    /**
     * Create recurring conflict
     */
    public function recurring(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_recurring' => true,
            'recurrence_pattern' => 'weekly',
            'recurrence_data' => [
                'days' => ['monday', 'wednesday', 'friday'],
                'frequency' => 1,
                'occurrences' => $this->faker->numberBetween(5, 15)
            ],
        ]);
    }

    /**
     * Create blocking conflict
     */
    public function blocking(): static
    {
        return $this->state(fn (array $attributes) => [
            'blocks_approval' => true,
            'severity' => $this->faker->randomElement(['high', 'critical']),
            'requires_notification' => true,
        ]);
    }

    /**
     * Create acknowledged conflict
     */
    public function acknowledged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'acknowledged',
            'administrative_notes' => 'Conflict acknowledged by coordinator',
        ]);
    }

    /**
     * Create auto-detected conflict
     */
    public function autoDetected(): static
    {
        return $this->state(fn (array $attributes) => [
            'detection_method' => 'automatic',
            'detected_at' => now(),
            'metadata' => [
                'auto_detected' => true,
                'detection_algorithm' => 'schedule_validator_v2',
                'confidence_score' => $this->faker->randomFloat(2, 0.7, 1.0),
            ],
        ]);
    }

    /**
     * Create for specific schedule
     */
    public function forSchedule(int $scheduleId): static
    {
        return $this->state(fn (array $attributes) => [
            'schedule_id' => $scheduleId,
        ]);
    }

    /**
     * Create for specific session
     */
    public function forSession(int $sessionId): static
    {
        return $this->state(fn (array $attributes) => [
            'session_id' => $sessionId,
        ]);
    }
}