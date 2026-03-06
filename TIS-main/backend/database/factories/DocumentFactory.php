<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Document>
 */
class DocumentFactory extends Factory
{
    protected $model = Document::class;

    public function definition(): array
    {
        $originalName = $this->faker->unique()->words(2, true) . '.pdf';
        $storedName = Str::uuid() . '.pdf';

        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->sentence(),
            'original_filename' => $originalName,
            'stored_filename' => $storedName,
            'file_path' => 'documents/' . $storedName,
            'file_extension' => 'pdf',
            'mime_type' => 'application/pdf',
            'file_size' => $this->faker->numberBetween(10_000, 100_000),
            'file_hash' => Str::random(40),
            'file_type' => 'pdf',
            'access_level' => $this->faker->randomElement(['public', 'institution']),
            'uploaded_by' => User::factory(),
            'institution_id' => Institution::factory(),
            'allowed_users' => [],
            'allowed_roles' => [],
            'allowed_institutions' => [],
            'accessible_institutions' => [],
            'accessible_departments' => [],
            'version' => 1,
            'is_latest_version' => true,
            'category' => $this->faker->randomElement(array_keys(Document::CATEGORIES)),
            'tags' => [],
            'status' => 'active',
            'is_public' => false,
            'is_downloadable' => true,
            'is_viewable_online' => true,
            'metadata' => [],
            'cascade_deletable' => true,
        ];
    }
}
