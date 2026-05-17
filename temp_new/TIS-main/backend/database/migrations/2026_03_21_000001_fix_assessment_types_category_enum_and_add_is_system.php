<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Fix category enum: add 'monitoring', 'diagnostic', 'national' values
        DB::statement('ALTER TABLE assessment_types DROP CONSTRAINT IF EXISTS assessment_types_category_check');
        DB::statement("ALTER TABLE assessment_types ADD CONSTRAINT assessment_types_category_check CHECK (category IN ('ksq', 'bsq', 'monitoring', 'diagnostic', 'national', 'custom'))");

        // 2. Add is_system boolean field
        Schema::table('assessment_types', function (Blueprint $table) {
            $table->boolean('is_system')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_types', function (Blueprint $table) {
            $table->dropColumn('is_system');
        });

        DB::statement('ALTER TABLE assessment_types DROP CONSTRAINT IF EXISTS assessment_types_category_check');
        DB::statement("ALTER TABLE assessment_types ADD CONSTRAINT assessment_types_category_check CHECK (category IN ('ksq', 'bsq', 'custom'))");
    }
};
