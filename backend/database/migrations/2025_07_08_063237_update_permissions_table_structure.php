<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            // Add description if it doesn't exist
            if (!Schema::hasColumn('permissions', 'description')) {
                $table->text('description')->nullable()->after('display_name');
            }
            
            // Add department if it doesn't exist
            if (!Schema::hasColumn('permissions', 'department')) {
                $table->string('department')->nullable()->after('category');
            }
            
            // Add is_active if it doesn't exist
            if (!Schema::hasColumn('permissions', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('action');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We won't drop columns in the down method to prevent data loss
        // If you need to rollback, create a new migration to handle it
    }
};
