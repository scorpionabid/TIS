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
        Schema::table('grades', function (Blueprint $table) {
            if (!Schema::hasColumn('grades', 'class_type')) {
                $table->string('class_type', 120)->nullable()->after('grade_type')
                    ->comment('Excel sinfin tipi dəyərinin saxlanılması üçün sahə');
            }

            if (!Schema::hasColumn('grades', 'class_profile')) {
                $table->string('class_profile', 120)->nullable()->after('class_type')
                    ->comment('Excel profil sütunu');
            }

            if (!Schema::hasColumn('grades', 'teaching_shift')) {
                $table->string('teaching_shift', 50)->nullable()->after('teaching_week')
                    ->comment('Növbə məlumatı: 1 növbə, 2 növbə və s.');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            if (Schema::hasColumn('grades', 'class_type')) {
                $table->dropColumn('class_type');
            }

            if (Schema::hasColumn('grades', 'class_profile')) {
                $table->dropColumn('class_profile');
            }

            if (Schema::hasColumn('grades', 'teaching_shift')) {
                $table->dropColumn('teaching_shift');
            }
        });
    }
};
