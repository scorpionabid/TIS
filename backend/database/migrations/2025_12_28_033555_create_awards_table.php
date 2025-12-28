<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Awards - Əməkdar müəllim, Medal, Fəxri fərman
     */
    public function up(): void
    {
        Schema::create('awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('award_type_id')->constrained('award_types')->onDelete('cascade');
            $table->date('award_date')->comment('Award date');
            $table->string('file_path', 255)->nullable()->comment('Award document file path');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
            $table->index('award_type_id');
            $table->index('award_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('awards');
    }
};
