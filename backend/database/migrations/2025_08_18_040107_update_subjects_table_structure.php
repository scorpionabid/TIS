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
        Schema::table('subjects', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('subjects', 'description')) {
                $table->text('description')->nullable();
            }
            if (!Schema::hasColumn('subjects', 'grade_levels')) {
                $table->json('grade_levels')->nullable();
            }
            if (!Schema::hasColumn('subjects', 'weekly_hours')) {
                $table->integer('weekly_hours')->default(1);
            }
            if (!Schema::hasColumn('subjects', 'category')) {
                $table->enum('category', [
                    'core', 'science', 'humanities', 'language', 'arts', 'physical', 'technical', 'elective'
                ])->default('core');
            }
            if (!Schema::hasColumn('subjects', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            if (!Schema::hasColumn('subjects', 'metadata')) {
                $table->json('metadata')->nullable();
            }
            
            // Add indexes if columns exist
            if (Schema::hasColumn('subjects', 'code')) {
                $table->index('code');
            }
            if (Schema::hasColumn('subjects', 'category')) {
                $table->index('category');
            }
            if (Schema::hasColumn('subjects', 'is_active')) {
                $table->index('is_active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'grade_levels', 'weekly_hours', 
                'category', 'is_active', 'metadata'
            ]);
        });
    }
};
