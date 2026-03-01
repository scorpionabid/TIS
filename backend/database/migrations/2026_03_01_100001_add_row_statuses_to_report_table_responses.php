<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_table_responses', function (Blueprint $table) {
            $table->jsonb('row_statuses')->nullable()->default(null)->after('submitted_at');
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_rtr_row_statuses_gin ON report_table_responses USING GIN (row_statuses)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_rtr_row_statuses_gin');

        Schema::table('report_table_responses', function (Blueprint $table) {
            $table->dropColumn('row_statuses');
        });
    }
};
