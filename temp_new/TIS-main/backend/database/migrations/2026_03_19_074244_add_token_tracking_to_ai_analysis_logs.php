<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI analiz loglarına token izləmə sütunları əlavə edir.
 *
 * prompt_tokens:     AI-a göndərilən token sayı (input)
 * completion_tokens: AI-dan alınan token sayı (output)
 * total_tokens:      Ümumi token sayı
 * from_cache:        Nəticə Redis cache-dən gəlibsə true
 *
 * Bu məlumatlar API xərcini izləmək üçün lazımdır.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_analysis_logs', function (Blueprint $table) {
            $table->unsignedInteger('prompt_tokens')->nullable()->after('execution_ms');
            $table->unsignedInteger('completion_tokens')->nullable()->after('prompt_tokens');
            $table->unsignedInteger('total_tokens')->nullable()->after('completion_tokens');
            $table->boolean('from_cache')->default(false)->after('total_tokens');
        });
    }

    public function down(): void
    {
        Schema::table('ai_analysis_logs', function (Blueprint $table) {
            $table->dropColumn(['prompt_tokens', 'completion_tokens', 'total_tokens', 'from_cache']);
        });
    }
};
