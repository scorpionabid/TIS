<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            $table->text('expected_outcome')->nullable()->after('notes');
            $table->text('kpi_metrics')->nullable()->after('expected_outcome');
            $table->text('risks')->nullable()->after('kpi_metrics');
            $table->string('location_platform')->nullable()->after('risks');
            $table->text('monitoring_mechanism')->nullable()->after('location_platform');
        });
    }

    public function down(): void
    {
        Schema::table('project_activities', function (Blueprint $table) {
            $table->dropColumn([
                'expected_outcome',
                'kpi_metrics',
                'risks',
                'location_platform',
                'monitoring_mechanism'
            ]);
        });
    }
};
