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
        Schema::table('report_schedules', function (Blueprint $table) {
            if (! Schema::hasColumn('report_schedules', 'run_count')) {
                $table->unsignedInteger('run_count')->default(0)->after('last_run');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('report_schedules', 'run_count')) {
                $table->dropColumn('run_count');
            }
        });
    }
};
