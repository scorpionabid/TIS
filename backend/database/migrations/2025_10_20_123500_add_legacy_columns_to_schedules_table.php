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
        Schema::table('schedules', function (Blueprint $table) {
            if (! Schema::hasColumn('schedules', 'type')) {
                $table->string('type')->default('regular')->after('name');
            }

            if (! Schema::hasColumn('schedules', 'effective_from')) {
                $table->date('effective_from')->nullable()->after('effective_date');
            }

            if (! Schema::hasColumn('schedules', 'effective_to')) {
                $table->date('effective_to')->nullable()->after('effective_from');
            }

            if (! Schema::hasColumn('schedules', 'schedule_data')) {
                $table->json('schedule_data')->nullable()->after('working_days');
            }

            if (! Schema::hasColumn('schedules', 'generation_settings')) {
                $table->json('generation_settings')->nullable()->after('schedule_data');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            if (Schema::hasColumn('schedules', 'generation_settings')) {
                $table->dropColumn('generation_settings');
            }

            if (Schema::hasColumn('schedules', 'schedule_data')) {
                $table->dropColumn('schedule_data');
            }

            if (Schema::hasColumn('schedules', 'effective_to')) {
                $table->dropColumn('effective_to');
            }

            if (Schema::hasColumn('schedules', 'effective_from')) {
                $table->dropColumn('effective_from');
            }

            if (Schema::hasColumn('schedules', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
