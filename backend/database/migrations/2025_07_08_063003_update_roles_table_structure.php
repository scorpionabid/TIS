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
        Schema::table('roles', function (Blueprint $table) {
            // Add display_name if it doesn't exist
            if (!Schema::hasColumn('roles', 'display_name')) {
                $table->string('display_name')->nullable()->after('name');
            }
            
            // Add description if it doesn't exist
            if (!Schema::hasColumn('roles', 'description')) {
                $table->text('description')->nullable()->after('display_name');
            }
            
            // Add level if it doesn't exist
            if (!Schema::hasColumn('roles', 'level')) {
                $table->integer('level')->nullable()->after('description');
            }
            
            // Add department_access if it doesn't exist
            if (!Schema::hasColumn('roles', 'department_access')) {
                $table->json('department_access')->nullable()->after('level');
            }
            
            // Add max_institutions if it doesn't exist
            if (!Schema::hasColumn('roles', 'max_institutions')) {
                $table->integer('max_institutions')->nullable()->after('department_access');
            }
            
            // Add is_active if it doesn't exist
            if (!Schema::hasColumn('roles', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('max_institutions');
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
