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
            if (! Schema::hasColumn('grades', 'extra_hours')) {
                $table->decimal('extra_hours', 8, 2)->default(0)->after('student_count');
            }
            if (! Schema::hasColumn('grades', 'individual_hours')) {
                $table->decimal('individual_hours', 8, 2)->default(0)->after('extra_hours');
            }
            if (! Schema::hasColumn('grades', 'home_hours')) {
                $table->decimal('home_hours', 8, 2)->default(0)->after('individual_hours');
            }
            if (! Schema::hasColumn('grades', 'special_hours')) {
                $table->decimal('special_hours', 8, 2)->default(0)->after('home_hours');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn(['extra_hours', 'individual_hours', 'home_hours', 'special_hours']);
        });
    }
};
