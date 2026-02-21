<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add 'cancelled' to the assignment_status CHECK constraint
     */
    public function up(): void
    {
        if (config('database.default') === 'sqlite') {
            // SQLite doesn't support CHECK constraints in the same way
            // Skip constraint modification for SQLite
            return;
        }
        
        DB::statement("ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_assignment_status_check");
        DB::statement("ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_assignment_status_check CHECK (assignment_status::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text, 'delegated'::text, 'cancelled'::text]))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            // SQLite doesn't support CHECK constraints in the same way
            // Skip constraint modification for SQLite
            return;
        }
        
        DB::statement("ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_assignment_status_check");
        DB::statement("ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_assignment_status_check CHECK (assignment_status::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text, 'delegated'::text]))");
    }
};
