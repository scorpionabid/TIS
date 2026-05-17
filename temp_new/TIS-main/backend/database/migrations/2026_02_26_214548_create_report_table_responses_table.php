<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_table_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_table_id')->constrained('report_tables')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions');
            $table->foreignId('respondent_id')->constrained('users');
            // [{col_1: 'dəyər', col_2: '42', col_3: '2024-01-01'}, ...]
            $table->json('rows')->nullable();
            $table->enum('status', ['draft', 'submitted'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            // Bir məktəb bir cədvəl üçün yalnız bir cavab verə bilər
            $table->unique(['report_table_id', 'institution_id']);
            $table->index('report_table_id');
            $table->index('institution_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_table_responses');
    }
};
