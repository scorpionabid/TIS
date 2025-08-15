<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition()
    {
        $types = ['maliyyə', 'inzibati', 'təsərrüfat', 'müəllim', 'psixoloq', 'ubr', 'müavin', 'general'];
        
        return [
            'name' => $this->faker->company . ' Şöbəsi',
            'short_name' => $this->faker->lexify('???'),
            'department_type' => $this->faker->randomElement($types),
            'institution_id' => Institution::factory(),
            'parent_department_id' => null,
            'description' => $this->faker->paragraph,
            'metadata' => [
                'established_year' => $this->faker->year,
                'capacity' => $this->faker->numberBetween(5, 50),
                'office_location' => $this->faker->streetAddress,
            ],
            'capacity' => $this->faker->numberBetween(5, 100),
            'budget_allocation' => $this->faker->randomFloat(2, 10000, 500000),
            'functional_scope' => $this->faker->sentence,
            'is_active' => $this->faker->boolean(80),
        ];
    }

    /**
     * Indicate that the department should be active.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function active()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
            ];
        });
    }

    /**
     * Indicate that the department should be inactive.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    /**
     * Create a finance department.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function finance()
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => 'Maliyyə Şöbəsi',
                'short_name' => 'Maliyyə',
                'department_type' => 'maliyyə',
                'description' => 'Maliyyə və büdcə idarəçiliyi',
                'functional_scope' => 'Budget planning, financial oversight, expense management',
            ];
        });
    }

    /**
     * Create an administrative department.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function administrative()
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => 'İnzibati Şöbəsi',
                'short_name' => 'İnzibati',
                'department_type' => 'inzibati',
                'description' => 'İnzibati idarəçilik və koordinasiya',
                'functional_scope' => 'Administrative coordination, staff management, general operations',
            ];
        });
    }

    /**
     * Create a facilities department.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function facilities()
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => 'Təsərrüfat Şöbəsi',
                'short_name' => 'Təsərrüfat',
                'department_type' => 'təsərrüfat',
                'description' => 'Təsərrüfat və infrastruktur idarəçiliyi',
                'functional_scope' => 'Facilities management, infrastructure maintenance, supplies',
            ];
        });
    }

    /**
     * Create a teaching department.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function teaching()
    {
        return $this->state(function (array $attributes) {
            return [
                'name' => 'Müəllim Şöbəsi',
                'short_name' => 'Müəllim',
                'department_type' => 'müəllim',
                'description' => 'Müəllim heyəti və tədris fəaliyyəti',
                'functional_scope' => 'Teaching staff coordination, curriculum development, educational activities',
            ];
        });
    }

    /**
     * Create a department with specific institution type.
     *
     * @param string $institutionType
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function forInstitutionType(string $institutionType)
    {
        return $this->state(function (array $attributes) use ($institutionType) {
            $validTypes = Department::getAllowedTypesForInstitution($institutionType);
            
            return [
                'department_type' => $this->faker->randomElement(array_keys($validTypes)),
                'institution_id' => Institution::factory()->create(['type' => $institutionType])->id,
            ];
        });
    }

    /**
     * Create a department with parent.
     *
     * @param Department|null $parent
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function withParent(?Department $parent = null)
    {
        return $this->state(function (array $attributes) use ($parent) {
            $parentDept = $parent ?? Department::factory()->create();
            
            return [
                'parent_department_id' => $parentDept->id,
                'institution_id' => $parentDept->institution_id,
            ];
        });
    }
}