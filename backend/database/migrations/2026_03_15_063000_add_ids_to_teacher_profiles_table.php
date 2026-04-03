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
        Schema::table('teacher_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('teacher_profiles', 'institution_id')) {
                $table->foreignId('institution_id')->nullable()->after('user_id')->constrained('institutions')->onDelete('set null');
            }
            if (! Schema::hasColumn('teacher_profiles', 'subject_id')) {
                $table->foreignId('subject_id')->nullable()->after('institution_id')->constrained('subjects')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_profiles', function (Blueprint $table) {
            $table->dropForeign(['institution_id']);
            $table->dropForeign(['subject_id']);
            $table->dropColumn(['institution_id', 'subject_id']);
        });
    }
};
