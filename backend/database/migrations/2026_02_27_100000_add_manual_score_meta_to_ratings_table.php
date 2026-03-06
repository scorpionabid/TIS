<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->string('manual_score_category')->nullable()->after('manual_score');
            $table->text('manual_score_reason')->nullable()->after('manual_score_category');
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropColumn(['manual_score_category', 'manual_score_reason']);
        });
    }
};
