<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Backfill teachers table with existing müəllim users.
     * This migration creates teacher rating profiles for all existing teachers.
     */
    public function up(): void
    {
        // Get all existing müəllim users with their profiles
        $existingTeachers = DB::table('users')
            ->join('model_has_roles', function ($join) {
                $join->on('users.id', '=', 'model_has_roles.model_id')
                    ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', '=', 'müəllim')
            ->whereNotNull('users.institution_id')
            ->select('users.*')
            ->get();

        echo "Found {$existingTeachers->count()} existing teachers to backfill.\n";

        $successCount = 0;
        $skipCount = 0;

        foreach ($existingTeachers as $user) {
            // Check if teacher profile already exists
            $exists = DB::table('teachers')->where('user_id', $user->id)->exists();
            if ($exists) {
                $skipCount++;
                continue;
            }

            // Get user profile for additional data
            $profile = DB::table('user_profiles')->where('user_id', $user->id)->first();

            // Calculate primary subject (first from subjects JSON array)
            $primarySubjectId = null;
            if ($profile && $profile->subjects) {
                $subjects = json_decode($profile->subjects, true);
                if (is_array($subjects) && count($subjects) > 0) {
                    // Get first subject ID
                    $subjectName = $subjects[0];
                    $subject = DB::table('subjects')->where('name', $subjectName)->first();
                    $primarySubjectId = $subject->id ?? null;
                }
            }

            // Calculate start year from experience_years
            $startYear = null;
            if ($profile && $profile->experience_years) {
                $startYear = now()->year - $profile->experience_years;
            }

            // Calculate age band from birth_date
            $ageBand = null;
            if ($profile && $profile->birth_date) {
                $birthDate = new DateTime($profile->birth_date);
                $age = $birthDate->diff(new DateTime())->y;

                if ($age < 30) $ageBand = '20-29';
                elseif ($age < 40) $ageBand = '30-39';
                elseif ($age < 50) $ageBand = '40-49';
                elseif ($age < 60) $ageBand = '50-59';
                else $ageBand = '60+';
            }

            // Generate UTIS code if not present
            $utisCode = $profile->utis_code ?? $user->utis_code ?? 'TEMP_' . $user->id;

            // Insert teacher rating profile
            DB::table('teachers')->insert([
                'user_id' => $user->id,
                'utis_code' => $utisCode,
                'school_id' => $user->institution_id,
                'primary_subject_id' => $primarySubjectId,
                'start_year' => $startYear,
                'photo_path' => $profile->profile_image_path ?? null,
                'age_band' => $ageBand,
                'is_active' => false, // Initially disabled, RegionAdmin will enable later
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $successCount++;
        }

        echo "✅ Backfill complete: {$successCount} teacher profiles created, {$skipCount} skipped (already exist).\n";
    }

    /**
     * Reverse the migrations.
     *
     * Note: This does NOT delete teacher profiles as they may have been manually created.
     * Only use this in development if you need to reset.
     */
    public function down(): void
    {
        // Uncomment below to delete all teacher profiles created by this migration
        // DB::table('teachers')->whereNotNull('user_id')->delete();
        
        echo "⚠️  Down migration skipped - teacher profiles preserved.\n";
        echo "If you need to delete all teacher profiles, run: DB::table('teachers')->delete();\n";
    }
};
