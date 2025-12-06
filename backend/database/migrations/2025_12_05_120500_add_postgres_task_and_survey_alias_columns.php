<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Tasks table: add aliases for legacy column names
        if (! Schema::hasColumn('tasks', 'creator_id')) {
            DB::statement('ALTER TABLE tasks ADD COLUMN creator_id bigint GENERATED ALWAYS AS (created_by) STORED');
        }

        if (! Schema::hasColumn('tasks', 'assigned_to_institution')) {
            DB::statement('ALTER TABLE tasks ADD COLUMN assigned_to_institution bigint GENERATED ALWAYS AS (assigned_to_institution_id) STORED');
        }

        // Surveys table: add alias so legacy code referencing created_by keeps working
        if (! Schema::hasColumn('surveys', 'created_by')) {
            DB::statement('ALTER TABLE surveys ADD COLUMN created_by bigint GENERATED ALWAYS AS (creator_id) STORED');
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        if (Schema::hasColumn('tasks', 'creator_id')) {
            DB::statement('ALTER TABLE tasks DROP COLUMN creator_id');
        }

        if (Schema::hasColumn('tasks', 'assigned_to_institution')) {
            DB::statement('ALTER TABLE tasks DROP COLUMN assigned_to_institution');
        }

        if (Schema::hasColumn('surveys', 'created_by')) {
            DB::statement('ALTER TABLE surveys DROP COLUMN created_by');
        }
    }
};
