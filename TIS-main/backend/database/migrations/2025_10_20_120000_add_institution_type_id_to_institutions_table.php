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
        Schema::table('institutions', function (Blueprint $table) {
            if (! Schema::hasColumn('institutions', 'institution_type_id')) {
                $table->foreignId('institution_type_id')
                    ->nullable()
                    ->after('type')
                    ->constrained('institution_types')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            if (Schema::hasColumn('institutions', 'institution_type_id')) {
                $table->dropForeign(['institution_type_id']);
                $table->dropColumn('institution_type_id');
            }
        });
    }
};
