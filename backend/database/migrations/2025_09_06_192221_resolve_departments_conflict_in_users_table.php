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
        // Strategy: Use departments JSON for multiple departments, 
        // keep department_id as primary department for backward compatibility
        
        Schema::table('users', function (Blueprint $table) {
            // Add comment to clarify the relationship
            $table->comment('departments JSON contains all department IDs, department_id is the primary department');
        });

        // Migrate existing department_id data to departments JSON if needed
        DB::statement("
            UPDATE users 
            SET departments = CASE 
                WHEN department_id IS NOT NULL AND (departments IS NULL OR departments = '[]' OR departments = '{}')
                THEN JSON_ARRAY(department_id)
                ELSE departments
            END
            WHERE department_id IS NOT NULL
        ");

        // Add index for better JSON query performance
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS users_departments_gin_idx ON users USING gin (departments)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the GIN index if it exists
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS users_departments_gin_idx');
        }
        
        Schema::table('users', function (Blueprint $table) {
            $table->comment('');
        });
    }
};
