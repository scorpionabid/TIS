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
            $table->decimal('split_foreign_lang_1', 8, 2)->nullable();
            $table->decimal('split_foreign_lang_2', 8, 2)->nullable();
            $table->decimal('split_physical_ed', 8, 2)->nullable();
            $table->decimal('split_informatics', 8, 2)->nullable();
            $table->decimal('split_technology', 8, 2)->nullable();
            $table->decimal('split_state_lang', 8, 2)->nullable();
            $table->decimal('split_steam', 8, 2)->nullable();
            $table->decimal('split_digital_skills', 8, 2)->nullable();
            $table->decimal('club_hours', 8, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn([
                'split_foreign_lang_1',
                'split_foreign_lang_2',
                'split_physical_ed',
                'split_informatics',
                'split_technology',
                'split_state_lang',
                'split_steam',
                'split_digital_skills',
                'club_hours',
            ]);
        });
    }
};
