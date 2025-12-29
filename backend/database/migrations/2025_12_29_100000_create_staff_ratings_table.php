<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * STAFF RATING SYSTEM - Main Ratings Table
     *
     * Stores ratings for SchoolAdmin (Directors), SektorAdmin, and RegionOperator
     * - Manual ratings: Given by superiors (leadership, teamwork, etc.)
     * - Automatic ratings: System-calculated (tasks, surveys, documents, links)
     */
    public function up(): void
    {
        Schema::create('staff_ratings', function (Blueprint $table) {
            $table->id();

            // ════════════════════════════════════════════════════════
            // TARGET (Who is being rated)
            // ════════════════════════════════════════════════════════
            $table->foreignId('staff_user_id')
                ->constrained('users')
                ->onDelete('cascade')
                ->comment('User being rated (SchoolAdmin, SektorAdmin, RegionOperator)');

            $table->string('staff_role', 50)
                ->comment('Role: schooladmin, sektoradmin, regionoperator');

            $table->foreignId('institution_id')
                ->nullable()
                ->constrained('institutions')
                ->onDelete('set null')
                ->comment('Target user institution');

            // ════════════════════════════════════════════════════════
            // RATER (Who is giving the rating)
            // ════════════════════════════════════════════════════════
            $table->foreignId('rater_user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('User who gave the rating (NULL for automatic)');

            $table->string('rater_role', 50)
                ->nullable()
                ->comment('Rater role: superadmin, regionadmin, regionoperator, sektoradmin');

            // ════════════════════════════════════════════════════════
            // RATING DETAILS
            // ════════════════════════════════════════════════════════
            $table->string('rating_type', 20)
                ->comment('manual or automatic');

            $table->string('category', 50)
                ->comment('Manual: leadership, teamwork, communication, initiative, overall | Auto: task_performance, survey_performance, document_activity, link_management, overall');

            $table->decimal('score', 3, 2)
                ->comment('Score: 0.00 to 5.00');

            $table->string('period', 20)
                ->comment('Period: 2024-12 (month), 2024-Q4 (quarter), 2024 (year)');

            // ════════════════════════════════════════════════════════
            // METADATA
            // ════════════════════════════════════════════════════════
            $table->text('notes')->nullable()
                ->comment('Manual rating notes/comments');

            $table->json('auto_calculated_data')->nullable()
                ->comment('Automatic calculation breakdown (tasks, surveys, etc.)');

            $table->boolean('is_latest')->default(false)
                ->comment('Is this the latest rating for this period?');

            // ════════════════════════════════════════════════════════
            // TIMESTAMPS
            // ════════════════════════════════════════════════════════
            $table->timestamps();

            // ════════════════════════════════════════════════════════
            // CONSTRAINTS (Will be added via raw SQL after table creation)
            // ════════════════════════════════════════════════════════

            // ════════════════════════════════════════════════════════
            // INDEXES (Performance optimization)
            // ════════════════════════════════════════════════════════
            $table->index(['staff_user_id', 'period', 'rating_type'], 'idx_staff_ratings_user_period');
            $table->index(['staff_role', 'period'], 'idx_staff_ratings_role_period');
            $table->index(['institution_id', 'period'], 'idx_staff_ratings_institution');
            $table->index(['is_latest', 'period'], 'idx_staff_ratings_latest');
            $table->index(['period', 'score'], 'idx_staff_ratings_leaderboard');
            $table->index('created_at', 'idx_staff_ratings_created');

            // ════════════════════════════════════════════════════════
            // UNIQUE CONSTRAINT
            // ════════════════════════════════════════════════════════
            // Each user can have only ONE rating per type/category/period from each rater
            $table->unique(
                ['staff_user_id', 'rating_type', 'category', 'period', 'rater_user_id'],
                'unique_staff_rating_per_period'
            );
        });

        // ════════════════════════════════════════════════════════
        // ADD CHECK CONSTRAINTS (PostgreSQL)
        // ════════════════════════════════════════════════════════
        DB::statement("
            ALTER TABLE staff_ratings
            ADD CONSTRAINT check_rating_type CHECK (rating_type IN ('manual', 'automatic'))
        ");

        DB::statement("
            ALTER TABLE staff_ratings
            ADD CONSTRAINT check_score_range CHECK (score >= 0 AND score <= 5)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_ratings');
    }
};
