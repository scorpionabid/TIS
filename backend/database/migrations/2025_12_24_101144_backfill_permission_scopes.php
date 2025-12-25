<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // GLOBAL SCOPE - System səviyyəli (SuperAdmin only)
        // Yalnız SuperAdmin istifadə edə bilər
        DB::table('permissions')
            ->whereIn('name', [
                'system.config',
                'roles.create',
                'roles.update',
                'roles.delete',
            ])
            ->update(['scope' => 'global']);

        // SYSTEM SCOPE - System əməliyyatları (Level 1-2: SuperAdmin, RegionAdmin)
        // Sistem idarəetməsi və konfiqurasiya
        DB::table('permissions')
            ->where(function($query) {
                $query->where('category', 'system')
                      ->orWhere('category', 'roles')
                      ->orWhere('name', 'like', '%bulk%')
                      ->orWhere('name', 'like', '%import%')
                      ->orWhere('name', 'like', '%export%');
            })
            ->where('scope', 'institution') // Only update if not already set
            ->update(['scope' => 'system']);

        // REGIONAL SCOPE - Regional əməliyyatlar (Level 1-4: up to SektorAdmin)
        // Region və sektor səviyyəli idarəetmə
        DB::table('permissions')
            ->where(function($query) {
                $query->where('category', 'institutions')
                      ->orWhere('resource', 'institutions')
                      ->orWhere('resource', 'regions')
                      ->orWhere('resource', 'sectors')
                      ->orWhere('name', 'like', 'region%')
                      ->orWhere('name', 'like', '%regional%');
            })
            ->where('scope', 'institution')
            ->update(['scope' => 'regional']);

        // SECTOR SCOPE - Sektor əməliyyatları (Level 1-6: up to school staff)
        // Sektor səviyyəli idarəetmə
        DB::table('permissions')
            ->where(function($query) {
                $query->where('resource', 'sectors')
                      ->orWhere('name', 'like', 'sector%')
                      ->orWhere('name', 'like', '%sector%');
            })
            ->where('scope', 'institution')
            ->update(['scope' => 'sector']);

        // CLASSROOM SCOPE - Sinif səviyyəsi (Level 1-10: all roles)
        // Müəllim və sinif səviyyəli əməliyyatlar
        DB::table('permissions')
            ->where(function($query) {
                $query->whereIn('category', [
                    'students',
                    'classes',
                    'subjects',
                    'assessments',
                    'academic',
                ])
                ->orWhere('resource', 'students')
                ->orWhere('resource', 'classes')
                ->orWhere('resource', 'grades')
                ->orWhere('resource', 'attendance')
                ->orWhere('resource', 'schedules')
                ->orWhere('name', 'like', '%student%')
                ->orWhere('name', 'like', '%class%')
                ->orWhere('name', 'like', '%grade%')
                ->orWhere('name', 'like', '%attendance%');
            })
            ->where('scope', 'institution')
            ->update(['scope' => 'classroom']);

        // INSTITUTION SCOPE - Default (Level 1-8: up to SchoolAdmin)
        // Məktəb səviyyəsi - qalan hər şey
        // Already set as default 'institution', so no action needed

        // Specific overrides for clarity
        DB::table('permissions')
            ->whereIn('category', [
                'documents',
                'tasks',
                'approvals',
                'events',
                'psychology',
                'inventory',
                'teachers',
                'departments',
                'rooms',
                'reports',
                'surveys'
            ])
            ->where('scope', 'institution')
            ->update(['scope' => 'institution']); // Explicit set (already default)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reset all scopes to default 'institution'
        DB::table('permissions')->update(['scope' => 'institution']);
    }
};
