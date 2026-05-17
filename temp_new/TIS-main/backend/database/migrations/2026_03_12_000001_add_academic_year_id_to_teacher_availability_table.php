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
        Schema::table('teacher_availability', function (Blueprint $table) {
            if (! Schema::hasColumn('teacher_availability', 'academic_year_id')) {
                $table->foreignId('academic_year_id')
                    ->nullable()
                    ->after('teacher_id')
                    ->constrained('academic_years')
                    ->nullOnDelete();

                $table->index(['teacher_id', 'academic_year_id']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_availability', function (Blueprint $table) {
            if (Schema::hasColumn('teacher_availability', 'academic_year_id')) {
                $table->dropForeign(['academic_year_id']);
                $table->dropIndex(['teacher_id', 'academic_year_id']);
                $table->dropColumn('academic_year_id');
            }
        });
    }
};
