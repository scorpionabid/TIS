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
            if (!Schema::hasColumn('teaching_loads', 'institution_id')) {
                $table->foreignId('institution_id')
                    ->nullable()
                    ->constrained()
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teaching_loads', function (Blueprint $table) {
            if (Schema::hasColumn('teaching_loads', 'institution_id')) {
                $table->dropForeign(['institution_id']);
                $table->dropColumn('institution_id');
            }
        });
    }
};
