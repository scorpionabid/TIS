<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->decimal('attendance_score', 5, 2)->default(0)->after('survey_score');
            $table->decimal('link_score', 5, 2)->default(0)->after('attendance_score');
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropColumn(['attendance_score', 'link_score']);
        });
    }
};
