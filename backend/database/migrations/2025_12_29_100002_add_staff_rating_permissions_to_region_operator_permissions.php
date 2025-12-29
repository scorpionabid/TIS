<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * STAFF RATING SYSTEM - Region Operator Permissions Update
     *
     * NOTE: region_operator_permissions table may not exist in all environments
     * This migration handles both scenarios - permissions managed via Spatie
     */
    public function up(): void
    {
        // Check if table exists before altering
        if (Schema::hasTable('region_operator_permissions')) {
            Schema::table('region_operator_permissions', function (Blueprint $table) {
                if (!Schema::hasColumn('region_operator_permissions', 'can_rate_staff')) {
                    $table->boolean('can_rate_staff')
                        ->default(false)
                        ->comment('Can give ratings to staff (directors, sector admins)');
                }

                if (!Schema::hasColumn('region_operator_permissions', 'can_view_ratings')) {
                    $table->boolean('can_view_ratings')
                        ->default(false)
                        ->comment('Can view staff ratings in their scope');
                }
            });

            // ════════════════════════════════════════════════════════
            // AUTO-GRANT PERMISSIONS
            // ════════════════════════════════════════════════════════
            // RegionOperators who can manage tasks/surveys should also be able to rate
            DB::statement("
                UPDATE region_operator_permissions
                SET can_rate_staff = true, can_view_ratings = true
                WHERE can_manage_tasks = true OR can_manage_surveys = true
            ");
        } else {
            // Table doesn't exist - permissions will be managed via Spatie permission system only
            echo "⚠️  region_operator_permissions table not found - using Spatie permissions instead\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('region_operator_permissions')) {
            Schema::table('region_operator_permissions', function (Blueprint $table) {
                if (Schema::hasColumn('region_operator_permissions', 'can_rate_staff')) {
                    $table->dropColumn('can_rate_staff');
                }
                if (Schema::hasColumn('region_operator_permissions', 'can_view_ratings')) {
                    $table->dropColumn('can_view_ratings');
                }
            });
        }
    }
};
