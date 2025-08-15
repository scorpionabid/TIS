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
        Schema::create('indicator_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('indicator_id')->constrained('indicators');
            $table->foreignId('institution_id')->constrained('institutions');
            $table->string('time_period', 20); // '2025-04', '2025-Q2', '2025', etc.
            $table->decimal('value_numeric', 15, 5)->nullable();
            $table->text('value_text')->nullable();
            $table->string('source', 100)->nullable();
            $table->boolean('is_estimated')->default(false);
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->json('metadata')->default('{}');
            $table->timestamps();
            
            $table->unique(['indicator_id', 'institution_id', 'time_period']);
            $table->index('indicator_id');
            $table->index('institution_id');
            $table->index('time_period');
            $table->index('is_approved');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('indicator_values');
    }
};