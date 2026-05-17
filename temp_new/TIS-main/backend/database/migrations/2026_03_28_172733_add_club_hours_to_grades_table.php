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
        // club_hours may already exist from 2026_03_28_162500_add_split_hour_overrides_to_grades_table
        if (! Schema::hasColumn('grades', 'club_hours')) {
            Schema::table('grades', function (Blueprint $table) {
                $table->decimal('club_hours', 8, 2)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('grades', 'club_hours')) {
            Schema::table('grades', function (Blueprint $table) {
                $table->dropColumn('club_hours');
            });
        }
    }
};
