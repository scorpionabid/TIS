<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL requires direct statement to alter ENUM
            // Check if 'locked' already exists to avoid errors on retry
            DB::statement("ALTER TABLE folder_audit_logs DROP CONSTRAINT IF EXISTS folder_audit_logs_action_check");
            
            // We'll use a more flexible VARCHAR for now to avoid future enum issues
            DB::statement("ALTER TABLE folder_audit_logs ALTER COLUMN action TYPE VARCHAR(255)");
        } else if ($driver === 'mysql') {
            DB::statement("ALTER TABLE folder_audit_logs MODIFY COLUMN action VARCHAR(255)");
        }
        // SQLite already handled or uses VARCHAR in fix migration
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to revert
    }
};
