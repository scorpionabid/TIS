<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AI LLM provider ayarlarını saxlayan cədvəl.
     *
     * Superadmin istədyi LLM provider-i (OpenAI, Anthropic, Gemini) seçib
     * API key-ini daxil edə bilir. Sistem həmin provider ilə işləyir.
     * Yalnız bir aktiv qeyd olur (is_active = true).
     */
    public function up(): void
    {
        Schema::create('ai_llm_settings', function (Blueprint $table) {
            $table->id();

            // Provider növü: openai | anthropic | gemini
            $table->string('provider', 30)->default('openai');

            // API key şifrəli (Laravel encrypt()) saxlanılır
            $table->string('api_key', 500);

            // Əgər göstərilməyibsə, provider-in default modeli istifadə edilir
            $table->string('model', 100)->nullable();

            // Yalnız bir aktiv qeyd olmalıdır
            $table->boolean('is_active')->default(true);

            // Sonuncu dəyişdirəni izlə
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();

            // Provider üzrə axtarış indeksi
            $table->index('provider');
            $table->index('is_active');
        });
    }

    /**
     * Migration-ı geri al.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_llm_settings');
    }
};
