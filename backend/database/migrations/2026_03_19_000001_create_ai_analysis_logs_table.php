<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AI analiz audit cədvəlini yaradır.
     *
     * Bu cədvəl hər AI sorğusunu izləyir:
     * - Kim sorğu göndərdi (user_id, user_role, user_institution_id)
     * - Nə sordu (original_prompt, clarifications, enhanced_prompt)
     * - Hansı SQL yaradıldı (generated_sql)
     * - Nəticə necə oldu (status, row_count, execution_ms, error_message)
     * - Haradan gəldi (ip_address)
     */
    public function up(): void
    {
        Schema::create('ai_analysis_logs', function (Blueprint $table) {
            $table->id();

            // İstifadəçi konteksti
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('user_role', 50);
            $table->unsignedBigInteger('user_institution_id')->nullable(); // RegionAdmin üçün region id

            // Sorğu məzmunu
            $table->text('original_prompt');
            $table->json('clarifications')->nullable();   // {question_id: answer} formatı
            $table->text('enhanced_prompt')->nullable();
            $table->text('generated_sql')->nullable();

            // Nəticə metrikalari
            $table->integer('row_count')->default(0)->nullable();
            $table->integer('execution_ms')->default(0)->nullable();

            // Status: pending | success | error | blocked
            $table->string('status', 20)->default('pending');
            $table->text('error_message')->nullable();

            // Şəbəkə məlumatı
            $table->ipAddress('ip_address')->nullable();

            $table->timestamps();

            // Index-lər
            $table->index('user_id');
            $table->index('status');
            $table->index([
                'created_at',
            ], 'idx_ai_logs_created_at');
        });
    }

    /**
     * Migration-ı geri al.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_analysis_logs');
    }
};
