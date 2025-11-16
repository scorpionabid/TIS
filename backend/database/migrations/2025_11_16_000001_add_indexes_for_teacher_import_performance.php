<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add composite indexes for teacher import performance optimization
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Composite index for email + username uniqueness checks (bulk validation)
            $table->index(['email', 'username'], 'idx_users_email_username');

            // Index for institution-based queries
            $table->index('institution_id', 'idx_users_institution_id');

            // Index for active user filtering
            $table->index('is_active', 'idx_users_is_active');

            // Composite index for institution + role filtering
            $table->index(['institution_id', 'is_active'], 'idx_users_institution_active');
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            // Index for position type filtering
            if (!Schema::hasIndex('user_profiles', 'idx_user_profiles_position_type')) {
                $table->index('position_type', 'idx_user_profiles_position_type');
            }

            // Index for workplace type
            $table->index('workplace_type', 'idx_user_profiles_workplace_type');

            // Index for assessment type
            $table->index('assessment_type', 'idx_user_profiles_assessment_type');

            // Composite index for user + position lookup
            $table->index(['user_id', 'position_type'], 'idx_user_profiles_user_position');
        });

        Schema::table('institutions', function (Blueprint $table) {
            // Index for UTIS code lookup (prioritized in hybrid search)
            if (!Schema::hasColumn('institutions', 'utis_code')) {
                // Column might not exist yet, skip
            } else {
                $table->index('utis_code', 'idx_institutions_utis_code');
            }

            // Index for institution code lookup
            if (!Schema::hasColumn('institutions', 'institution_code')) {
                // Column might not exist yet, skip
            } else {
                $table->index('institution_code', 'idx_institutions_institution_code');
            }

            // Index for level-based queries
            $table->index('level', 'idx_institutions_level');

            // Composite index for parent + level hierarchy queries
            $table->index(['parent_id', 'level'], 'idx_institutions_parent_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_email_username');
            $table->dropIndex('idx_users_institution_id');
            $table->dropIndex('idx_users_is_active');
            $table->dropIndex('idx_users_institution_active');
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasIndex('user_profiles', 'idx_user_profiles_position_type')) {
                $table->dropIndex('idx_user_profiles_position_type');
            }
            $table->dropIndex('idx_user_profiles_workplace_type');
            $table->dropIndex('idx_user_profiles_assessment_type');
            $table->dropIndex('idx_user_profiles_user_position');
        });

        Schema::table('institutions', function (Blueprint $table) {
            if (Schema::hasIndex('institutions', 'idx_institutions_utis_code')) {
                $table->dropIndex('idx_institutions_utis_code');
            }
            if (Schema::hasIndex('institutions', 'idx_institutions_institution_code')) {
                $table->dropIndex('idx_institutions_institution_code');
            }
            $table->dropIndex('idx_institutions_level');
            $table->dropIndex('idx_institutions_parent_level');
        });
    }
};
