<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite does not support modifying columns directly
        // We need to handle NULL values by setting defaults

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite workaround: Update existing NULL values to defaults
            DB::statement('PRAGMA foreign_keys=OFF');

            // Update existing NULL values
            DB::table('survey_questions')
                ->whereNull('max_file_size')
                ->update(['max_file_size' => 10240]);

            DB::table('survey_questions')
                ->whereNull('rating_min')
                ->update(['rating_min' => 1]);

            DB::table('survey_questions')
                ->whereNull('rating_max')
                ->update(['rating_max' => 10]);

            DB::statement('PRAGMA foreign_keys=ON');
        } else {
            // PostgreSQL can modify columns directly
            Schema::table('survey_questions', function (Blueprint $table) {
                $table->integer('max_file_size')->nullable()->default(10240)->change();
                $table->integer('rating_min')->nullable()->default(1)->change();
                $table->integer('rating_max')->nullable()->default(10)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'sqlite') {
            Schema::table('survey_questions', function (Blueprint $table) {
                $table->integer('max_file_size')->default(10240)->change();
                $table->integer('rating_min')->default(1)->change();
                $table->integer('rating_max')->default(10)->change();
            });
        }
    }
};
