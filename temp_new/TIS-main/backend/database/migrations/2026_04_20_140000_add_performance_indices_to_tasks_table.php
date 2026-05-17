<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // First, convert JSON columns to JSONB to support GIN indexes
            DB::statement('ALTER TABLE tasks ALTER COLUMN target_institutions TYPE JSONB USING target_institutions::jsonb');
            DB::statement('ALTER TABLE tasks ALTER COLUMN target_roles TYPE JSONB USING target_roles::jsonb');
            DB::statement('ALTER TABLE tasks ALTER COLUMN target_departments TYPE JSONB USING target_departments::jsonb');

            // Add GIN indexes for JSONB columns to support fast whereJsonContains queries
            DB::statement('CREATE INDEX IF NOT EXISTS tasks_target_institutions_gin ON tasks USING GIN (target_institutions)');
            DB::statement('CREATE INDEX IF NOT EXISTS tasks_target_roles_gin ON tasks USING GIN (target_roles)');
            DB::statement('CREATE INDEX IF NOT EXISTS tasks_target_departments_gin ON tasks USING GIN (target_departments)');
            
            // Log for performance monitoring
            \Log::info('Task performance GIN indices created successfully.');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS tasks_target_institutions_gin');
            DB::statement('DROP INDEX IF EXISTS tasks_target_roles_gin');
            DB::statement('DROP INDEX IF EXISTS tasks_target_departments_gin');
        }
    }
};
