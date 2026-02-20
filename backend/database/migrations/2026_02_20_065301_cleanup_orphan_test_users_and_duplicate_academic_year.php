<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Data Cleanup Migration:
 * 1. Delete orphan test users without institution_id (school1_admin, school2_admin, school3_admin)
 * 2. Delete duplicate academic year ID 1 (unused, ID 3 is the active one for 2025-2026)
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Delete orphan test users (institution_id IS NULL, created by BasicDataSeeder)
        $orphanUsernames = ['school1_admin', 'school2_admin', 'school3_admin'];

        $orphanUsers = DB::table('users')
            ->whereIn('username', $orphanUsernames)
            ->whereNull('institution_id')
            ->get();

        foreach ($orphanUsers as $user) {
            Log::info("Cleaning up orphan test user: {$user->username} (id: {$user->id})");

            // Clean up related records first
            DB::table('model_has_roles')->where('model_id', $user->id)->where('model_type', 'App\\Models\\User')->delete();
            DB::table('model_has_permissions')->where('model_id', $user->id)->where('model_type', 'App\\Models\\User')->delete();
            DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->where('tokenable_type', 'App\\Models\\User')->delete();
            DB::table('user_profiles')->where('user_id', $user->id)->delete();

            DB::table('users')->where('id', $user->id)->delete();
        }

        // 2. Delete duplicate academic year (ID 1) if it's not referenced by any data
        $academicYear1 = DB::table('academic_years')->where('id', 1)->first();
        if ($academicYear1) {
            // Check if any table references academic_year_id = 1
            $referencingTables = [
                'grades', 'classes', 'schedules', 'student_enrollments',
                'teaching_loads', 'attendance_records', 'class_bulk_attendance',
                'ratings', 'rating_configs', 'ksq_results', 'bsq_results',
            ];

            $hasReferences = false;
            foreach ($referencingTables as $table) {
                if (DB::table($table)->where('academic_year_id', 1)->exists()) {
                    $hasReferences = true;
                    Log::warning("Cannot delete academic_year ID 1 - referenced by {$table}");
                    break;
                }
            }

            if (! $hasReferences) {
                Log::info("Deleting duplicate academic year ID 1: {$academicYear1->name}");
                DB::table('academic_years')->where('id', 1)->delete();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-create the duplicate academic year if needed
        $exists = DB::table('academic_years')->where('id', 1)->exists();
        if (! $exists) {
            DB::table('academic_years')->insert([
                'id' => 1,
                'name' => '2025-2026 Ders Ili',
                'start_date' => '2025-09-14',
                'end_date' => '2026-06-30',
                'is_active' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Note: Orphan test users are not re-created in rollback
        // They were created by BasicDataSeeder and can be re-seeded if needed
    }
};
