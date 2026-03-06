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
        Schema::table('users', function (Blueprint $table) {
            // Add soft deletes column
            $table->softDeletes();

            // Add index for better query performance
            $table->index('deleted_at');
        });

        // Convert existing inactive users to soft deleted
        // Keep is_active field for business logic (suspended vs deleted)
        DB::statement('
            UPDATE users 
            SET deleted_at = COALESCE(updated_at, created_at)
            WHERE is_active = false 
            AND deleted_at IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove soft deletes
            $table->dropSoftDeletes();
            $table->dropIndex(['deleted_at']);
        });
    }
};
