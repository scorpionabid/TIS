<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Sistem imtahan növlərini sabitləşdir:
     * BSQ, KSQ, Buraxılış, Diaqnostik, Monitorinq, Milli
     */
    public function up(): void
    {
        $superAdminId = \Illuminate\Support\Facades\DB::table('users')->where('username', 'superadmin')->value('id');

        if (! $superAdminId) {
            return; // Skip if superadmin doesn't exist (fresh install will use seeder)
        }

        // 1. Update existing types with correct categories and mark as system
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where('category', 'ksq')
            ->update(['is_system' => true]);

        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where('category', 'bsq')
            ->update(['is_system' => true]);

        // Fix Monitorinq: custom → monitoring
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where(\Illuminate\Support\Facades\DB::raw('LOWER(name)'), 'LIKE', '%monitor%')
            ->update(['category' => 'monitoring', 'is_system' => true]);

        // Fix Milli: custom → national
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where(\Illuminate\Support\Facades\DB::raw('LOWER(name)'), 'LIKE', '%milli%')
            ->update(['category' => 'national', 'is_system' => true]);

        // Fix Buraxılış: mark as system
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where(\Illuminate\Support\Facades\DB::raw('LOWER(name)'), 'LIKE', '%burax%')
            ->update(['is_system' => true]);

        // 2. Insert Diaqnostik if it doesn't exist
        $hasDiagnostic = \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where(\Illuminate\Support\Facades\DB::raw('LOWER(name)'), 'LIKE', '%diaqno%')
            ->exists();

        if (! $hasDiagnostic) {
            \Illuminate\Support\Facades\DB::table('assessment_types')->insert([
                'name' => 'Diaqnostik',
                'description' => 'Diaqnostik qiymətləndirmə (DQ)',
                'category' => 'diagnostic',
                'is_active' => true,
                'is_system' => true,
                'criteria' => json_encode(['Bilik səviyyəsi' => 60, 'Bacarıqlar' => 40]),
                'max_score' => 100,
                'scoring_method' => 'percentage',
                'grade_levels' => json_encode(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']),
                'subjects' => json_encode(['Bütün fənlər']),
                'created_by' => $superAdminId,
                'institution_id' => null,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);
        } else {
            \Illuminate\Support\Facades\DB::table('assessment_types')
                ->whereNull('institution_id')
                ->where(\Illuminate\Support\Facades\DB::raw('LOWER(name)'), 'LIKE', '%diaqno%')
                ->update(['category' => 'diagnostic', 'is_system' => true]);
        }
    }

    public function down(): void
    {
        // Revert category fixes
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where('category', 'monitoring')
            ->update(['category' => 'custom']);

        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where('category', 'national')
            ->update(['category' => 'custom']);

        // Remove diagnostic if it was inserted by this migration
        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->where('category', 'diagnostic')
            ->delete();

        \Illuminate\Support\Facades\DB::table('assessment_types')
            ->whereNull('institution_id')
            ->update(['is_system' => false]);
    }
};
