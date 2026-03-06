<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add fixed_rows to report_tables for "stabil dinamik cədvəl" feature.
 * When fixed_rows is set, schools can only fill cells, not add/remove rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            // Fixed rows schema: [{id: 'row_1', label: '9-cu sinif'}, ...]
            // If null/empty, table works as before (dynamic rows)
            $table->json('fixed_rows')->nullable()->after('columns');
        });
    }

    public function down(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            $table->dropColumn('fixed_rows');
        });
    }
};
