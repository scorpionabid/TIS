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
        Schema::table('academic_years', function (Blueprint $table) {
            if (!Schema::hasColumn('academic_years', 'semester_1_start')) {
                $table->date('semester_1_start')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('academic_years', 'semester_1_end')) {
                $table->date('semester_1_end')->nullable()->after('semester_1_start');
            }
            if (!Schema::hasColumn('academic_years', 'semester_2_start')) {
                $table->date('semester_2_start')->nullable()->after('semester_1_end');
            }
            if (!Schema::hasColumn('academic_years', 'semester_2_end')) {
                $table->date('semester_2_end')->nullable()->after('semester_2_start');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('academic_years', function (Blueprint $table) {
            if (Schema::hasColumn('academic_years', 'semester_2_end')) {
                $table->dropColumn('semester_2_end');
            }
            if (Schema::hasColumn('academic_years', 'semester_2_start')) {
                $table->dropColumn('semester_2_start');
            }
            if (Schema::hasColumn('academic_years', 'semester_1_end')) {
                $table->dropColumn('semester_1_end');
            }
            if (Schema::hasColumn('academic_years', 'semester_1_start')) {
                $table->dropColumn('semester_1_start');
            }
        });
    }
};
