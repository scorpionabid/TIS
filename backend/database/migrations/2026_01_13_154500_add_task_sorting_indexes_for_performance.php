<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add indexes for task sorting and filtering performance
     * Related to: Task Page Improvement Plan - Server-side sorting implementation
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Index for title sorting and searching
            $table->index('title', 'idx_tasks_title');

            // Index for category filtering and sorting
            $table->index('category', 'idx_tasks_category');

            // Index for progress sorting
            $table->index('progress', 'idx_tasks_progress');

            // Composite index for overdue task queries (deadline + status)
            $table->index(['deadline', 'status'], 'idx_tasks_deadline_status');

            // Composite index for common filtering (status + priority)
            $table->index(['status', 'priority'], 'idx_tasks_status_priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('idx_tasks_title');
            $table->dropIndex('idx_tasks_category');
            $table->dropIndex('idx_tasks_progress');
            $table->dropIndex('idx_tasks_deadline_status');
            $table->dropIndex('idx_tasks_status_priority');
        });
    }
};
