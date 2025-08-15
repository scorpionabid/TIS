<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Update to match documentation structure
            $table->string('short_name', 20)->nullable()->after('name');
            $table->integer('class_level_start')->nullable()->after('category'); // Min class level (1-12)
            $table->integer('class_level_end')->nullable()->after('class_level_start'); // Max class level (1-12)
            $table->text('description')->nullable()->after('class_level_end');
            
            // Drop the grade_levels column as we're using class_level_start/end instead
            $table->dropColumn('grade_levels');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Reverse the changes
            $table->dropColumn(['short_name', 'class_level_start', 'class_level_end', 'description', 'updated_at']);
            
            // Add back the grade_levels column
            $table->json('grade_levels')->default('[]');
        });
        
    }
};