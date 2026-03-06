<?php

namespace Database\Factories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Room>
 */
class RoomFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $roomTypes = [
            'classroom', 'laboratory', 'library', 'office', 'meeting_room',
            'auditorium', 'gymnasium', 'cafeteria', 'storage', 'computer_lab',
            'art_room', 'music_room', 'workshop', 'medical_room', 'principal_office',
        ];

        $facilities = [
            'projector', 'whiteboard', 'computer', 'air_conditioning',
            'heating', 'windows', 'storage_cabinets', 'electrical_outlets',
            'internet_connection', 'audio_system', 'emergency_exit',
            'fire_extinguisher', 'first_aid_kit',
        ];

        return [
            'name' => fake()->words(2, true) . ' Room',
            'room_number' => fake()->bothify('###'),
            'institution_id' => Institution::factory(),
            'building' => fake()->optional()->randomElement(['Main Building', 'Science Block', 'Arts Wing', 'Administration Block', 'Sports Complex']),
            'floor' => fake()->numberBetween(0, 5), // Ground floor to 5th floor
            'room_type' => fake()->randomElement($roomTypes),
            'capacity' => fake()->numberBetween(10, 200),
            'facilities' => fake()->randomElements($facilities, fake()->numberBetween(2, 8)),
            'is_active' => fake()->boolean(90), // 90% chance of being active
        ];
    }

    /**
     * Indicate that the room is a classroom.
     */
    public function classroom(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_type' => 'classroom',
            'name' => 'Classroom ' . fake()->numberBetween(1, 50),
            'capacity' => fake()->numberBetween(20, 40),
            'facilities' => ['whiteboard', 'projector', 'electrical_outlets', 'windows', 'air_conditioning'],
        ]);
    }

    /**
     * Indicate that the room is a laboratory.
     */
    public function laboratory(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_type' => 'laboratory',
            'name' => fake()->randomElement(['Science', 'Chemistry', 'Physics', 'Biology', 'Computer']) . ' Lab',
            'capacity' => fake()->numberBetween(15, 30),
            'facilities' => ['specialized_equipment', 'fume_hood', 'emergency_shower', 'fire_extinguisher', 'electrical_outlets', 'water_supply'],
        ]);
    }

    /**
     * Indicate that the room is an office.
     */
    public function office(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_type' => 'office',
            'name' => fake()->randomElement(['Principal', 'Vice Principal', 'Admin', 'Teacher', 'Staff']) . ' Office',
            'capacity' => fake()->numberBetween(2, 10),
            'facilities' => ['desk', 'computer', 'phone', 'filing_cabinet', 'air_conditioning', 'internet_connection'],
        ]);
    }

    /**
     * Indicate that the room is a meeting room.
     */
    public function meetingRoom(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_type' => 'meeting_room',
            'name' => 'Meeting Room ' . fake()->randomElement(['A', 'B', 'C', '1', '2']),
            'capacity' => fake()->numberBetween(8, 25),
            'facilities' => ['conference_table', 'projector', 'whiteboard', 'audio_system', 'air_conditioning', 'internet_connection'],
        ]);
    }

    /**
     * Indicate that the room is a library.
     */
    public function library(): static
    {
        return $this->state(fn (array $attributes) => [
            'room_type' => 'library',
            'name' => fake()->randomElement(['Main', 'Reference', 'Digital', 'Children\'s']) . ' Library',
            'capacity' => fake()->numberBetween(50, 150),
            'facilities' => ['bookshelves', 'reading_tables', 'computer_terminals', 'quiet_zone', 'internet_connection', 'air_conditioning'],
        ]);
    }

    /**
     * Indicate that the room is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
        ]);
    }

    /**
     * Indicate that the room is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the room is on a specific floor.
     */
    public function onFloor(int $floor): static
    {
        return $this->state(fn (array $attributes) => [
            'floor' => $floor,
        ]);
    }

    /**
     * Indicate that the room is in a specific building.
     */
    public function inBuilding(string $building): static
    {
        return $this->state(fn (array $attributes) => [
            'building' => $building,
        ]);
    }

    /**
     * Indicate that the room has high capacity.
     */
    public function largeCapacity(): static
    {
        return $this->state(fn (array $attributes) => [
            'capacity' => fake()->numberBetween(100, 500),
            'facilities' => array_merge($attributes['facilities'] ?? [], ['audio_system', 'large_screen', 'microphone']),
        ]);
    }

    /**
     * Indicate that the room has low capacity.
     */
    public function smallCapacity(): static
    {
        return $this->state(fn (array $attributes) => [
            'capacity' => fake()->numberBetween(5, 15),
        ]);
    }
}
