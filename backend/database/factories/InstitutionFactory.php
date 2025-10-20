<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\InstitutionType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Institution>
 */
class InstitutionFactory extends Factory
{
    protected $model = Institution::class;

    /**
     * Cached institution type ids to avoid duplicate lookups
     *
     * @var array<string, int>
     */
    protected static array $typeCache = [];

    /**
     * Default hierarchy levels for legacy institution type keys
     *
     * @var array<string, int>
     */
    protected static array $typeLevelMap = [
        'ministry' => 1,
        'region' => 2,
        'sektor' => 3,
        'school' => 4,
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = $this->faker->randomElement(['school', 'sektor', 'region', 'ministry']);

        return [
            'name' => $this->faker->company() . ' School',
            'type' => $type,
            'institution_type_id' => $this->resolveInstitutionTypeId($type),
            'level' => $this->faker->numberBetween(1, 4),
            'institution_code' => strtoupper($this->faker->lexify('???')),
            'region_code' => $this->faker->regexify('[A-Z]{2}[0-9]{2}'),
            'short_name' => $this->faker->lexify('???'),
            'established_date' => $this->faker->date(),
            'parent_id' => null,
            'contact_info' => [
                'phone' => $this->faker->phoneNumber(),
                'email' => $this->faker->email(),
                'address' => $this->faker->address(),
            ],
            'location' => [
                'latitude' => $this->faker->latitude(),
                'longitude' => $this->faker->longitude(),
            ],
            'metadata' => [],
            'is_active' => true,
        ];
    }

    /**
     * Resolve or create an institution type for the given legacy key.
     */
    protected function resolveInstitutionTypeId(string $type): ?int
    {
        if (isset(self::$typeCache[$type])) {
            $cachedId = self::$typeCache[$type];
            if (InstitutionType::query()->whereKey($cachedId)->exists()) {
                return $cachedId;
            }

            unset(self::$typeCache[$type]);
        }

        $label = match ($type) {
            'ministry' => 'Nazirlik',
            'region' => 'Regional İdarə',
            'sektor' => 'Sektor',
            default => 'Məktəb',
        };

        $institutionType = InstitutionType::query()->firstOrCreate(
            ['key' => $type],
            [
                'label' => $label,
                'label_az' => $label,
                'label_en' => ucfirst($type),
                'default_level' => self::$typeLevelMap[$type] ?? 4,
                'allowed_parent_types' => [],
                'icon' => 'Building',
                'color' => '#3b82f6',
                'is_active' => true,
                'is_system' => false,
                'metadata' => [],
                'description' => null,
            ]
        );

        return self::$typeCache[$type] = $institutionType->id;
    }

    /**
     * Create a ministry level institution
     */
    public function ministry(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Təhsil Nazirliyi',
            'type' => 'ministry',
            'level' => 1,
            'institution_code' => 'MIN',
            'parent_id' => null,
        ]);
    }

    /**
     * Create a regional level institution
     */
    public function regional(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->city() . ' Regional Office',
            'type' => 'region', 
            'level' => 2,
            'institution_code' => 'REG' . $this->faker->numberBetween(1, 10),
        ]);
    }

    /**
     * Create a sector level institution
     */
    public function sector(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->city() . ' Sector',
            'type' => 'sektor',
            'level' => 3,
            'institution_code' => 'SEC' . $this->faker->numberBetween(1, 20),
        ]);
    }

    /**
     * Create a school level institution
     */
    public function school(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->numberBetween(1, 100) . ' nömrəli orta məktəb',
            'type' => 'school',
            'level' => 4,
            'institution_code' => 'SCH' . $this->faker->numberBetween(1, 999),
        ]);
    }

    /**
     * Create an inactive institution
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
