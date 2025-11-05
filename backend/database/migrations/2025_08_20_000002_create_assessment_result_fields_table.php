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
        Schema::create('assessment_result_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->string('field_key');
            $table->string('label');
            $table->enum('input_type', ['number', 'decimal', 'text'])->default('number');
            $table->enum('scope', ['class', 'overall'])->default('class');
            $table->enum('aggregation', ['sum', 'average', 'max', 'min'])->default('sum');
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable();
            $table->unsignedTinyInteger('display_order')->default(1);
            $table->timestamps();

            $table->unique(['assessment_type_id', 'field_key'], 'unique_field_per_type');
            $table->index(['assessment_type_id', 'display_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_result_fields');
    }
};
