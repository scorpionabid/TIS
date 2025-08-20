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
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Fənn adı
            $table->string('code', 10)->unique(); // Fənn kodu (RIY, AZD, İNG, TRX və s.)
            $table->text('description')->nullable(); // Açıqlama
            $table->json('grade_levels')->nullable(); // Hansı sinif səviyyələrində tədris olunur
            $table->integer('weekly_hours')->default(1); // Həftəlik saat sayı
            $table->enum('category', [
                'core', // Əsas fənlər (Riyaziyyat, Azərbaycan dili və s.)
                'science', // Elm fənləri (Fizika, Kimya, Biologiya)
                'humanities', // Humanitar fənlər (Tarix, Coğrafiya)
                'language', // Dil fənləri (İngilis dili, Rus dili)
                'arts', // İncəsənət (Musiqi, Təsviri sənət)
                'physical', // Bədən tərbiyəsi
                'technical', // Texniki fənlər (İnformatika, Texnologiya)
                'elective' // Seçmə fənlər
            ])->default('core');
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable(); // Əlavə məlumatlar
            $table->timestamps();
            
            // Indexes
            $table->index('code');
            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};