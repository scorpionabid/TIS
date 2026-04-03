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
                ->comment('RegionAdmin tərəfindən idarə olunur - default olaraq açıqdır, bağlananda məktəblər əlavə sətir göndərə bilməz')
                ->change();
        });

        // Mövcud cədvəlləri default olaraq açıq vəziyyətə gətir (əgər null-dursa)
        \DB::table('report_tables')
            ->whereNull('allow_additional_rows_after_confirmation')
            ->update(['allow_additional_rows_after_confirmation' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_tables', function (Blueprint $table) {
            $table->boolean('allow_additional_rows_after_confirmation')
                ->default(false)
                ->comment('RegionAdmin tərəfindən idarə olunur - məktəblər təsdiqədən sonra əlavə sətir göndərə bilsin')
                ->change();
        });
    }
};
