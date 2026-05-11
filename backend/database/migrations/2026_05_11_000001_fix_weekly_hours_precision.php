<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes floating point precision for weekly hours in curriculum and workload tables.
     */
    public function up(): void
    {
        // 1. Update grade_subjects table
        if (Schema::hasTable('grade_subjects')) {
            Schema::table('grade_subjects', function (Blueprint $table) {
                $table->decimal('weekly_hours', 8, 2)->default(0)->change();
                $table->decimal('calculated_hours', 8, 2)->default(0)->change();
            });
        }

        // 2. Update teaching_loads table
        if (Schema::hasTable('teaching_loads')) {
            Schema::table('teaching_loads', function (Blueprint $table) {
                $table->decimal('weekly_hours', 8, 2)->default(0)->change();
                $table->decimal('total_hours', 8, 2)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('grade_subjects')) {
            Schema::table('grade_subjects', function (Blueprint $table) {
                $table->integer('weekly_hours')->default(1)->change();
                $table->integer('calculated_hours')->default(1)->change();
            });
        }

        if (Schema::hasTable('teaching_loads')) {
            Schema::table('teaching_loads', function (Blueprint $table) {
                $table->integer('weekly_hours')->default(1)->change();
                $table->integer('total_hours')->nullable()->change();
            });
        }
    }
};
