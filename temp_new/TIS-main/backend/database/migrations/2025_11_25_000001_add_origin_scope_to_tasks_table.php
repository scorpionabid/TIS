<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Deprecated migration - replaced by 2025_10_31_100424_add_origin_scope_to_tasks_table.
        // Intentionally left blank to avoid duplicate schema changes.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to keep rollback behaviour aligned with deprecated migration.
    }
};
