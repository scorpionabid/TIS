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
        Schema::table('teaching_loads', function (Blueprint $table) {
            $table->decimal('weekly_hours', 8, 2)->change();
            $table->decimal('total_hours', 8, 2)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teaching_loads', function (Blueprint $table) {
            $table->integer('weekly_hours')->change();
            $table->integer('total_hours')->change();
        });
    }
};
