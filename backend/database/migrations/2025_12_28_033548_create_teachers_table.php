<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Teachers - UTIS əsaslı müəllim profili (CORE TABLE)
     * UTIS is mandatory, unique identifier
     * Links to users table if teacher has login access
     */
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->string('utis_code', 50)->unique()->comment('UTIS code - unique teacher identifier (MANDATORY)');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Link to users table if teacher has system access');
            $table->foreignId('school_id')->constrained('institutions')->onDelete('cascade')->comment('Teacher school (FK to institutions)');
            $table->foreignId('primary_subject_id')->nullable()->constrained('subjects')->onDelete('set null')->comment('Primary subject taught');
            $table->year('start_year')->nullable()->comment('Year teacher started working');
            $table->string('photo_path', 255)->nullable()->comment('Photo file path (optional, 5MB limit)');
            $table->enum('age_band', ['20-29', '30-39', '40-49', '50-59', '60+'])->nullable()->comment('Age range (PII protection)');
            $table->boolean('is_active')->default(true)->comment('Teacher active status');
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('utis_code');
            $table->index('school_id');
            $table->index('is_active');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};
