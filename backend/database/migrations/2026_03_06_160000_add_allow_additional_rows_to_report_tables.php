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
        Schema::table('report_tables', function (Blueprint $table) {
            $table->boolean('allow_additional_rows_after_confirmation')
                  ->default(true)
                  ->after('max_rows')
                  ->comment('RegionAdmin tərəfindən idarə olunur - default olaraq açıqdır, bağlananda məktəblər əlavə sətir göndərə bilməz');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            $table->dropColumn('allow_additional_rows_after_confirmation');
        });
    }
};
