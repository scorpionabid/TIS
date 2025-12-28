<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Education History - Ali təhsil, orta ixtisas
     */
    public function up(): void
    {
        Schema::create('education_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->enum('level', ['ali_tehsil', 'orta_ixtisas'])->comment('Education level');
            $table->string('institution_name', 255)->comment('University/institution name');
            $table->year('start_year')->comment('Start year');
            $table->year('end_year')->nullable()->comment('End year (null if ongoing)');
            $table->string('specialty', 255)->nullable()->comment('Specialty/major');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('education_history');
    }
};
