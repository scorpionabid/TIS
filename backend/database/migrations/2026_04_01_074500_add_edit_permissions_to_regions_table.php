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
        Schema::table('regions', function (Blueprint $table) {
            $table->boolean('can_sektor_edit')->default(true)->after('is_curriculum_locked');
            $table->boolean('can_operator_edit')->default(true)->after('can_sektor_edit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regions', function (Blueprint $table) {
            $table->dropColumn(['can_sektor_edit', 'can_operator_edit']);
        });
    }
};
