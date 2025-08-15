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
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->unique()->constrained('institutions')->onDelete('cascade');
            $table->string('code', 10)->unique();
            $table->string('name', 100);
            $table->decimal('area_km2', 10, 2)->nullable();
            $table->integer('population')->nullable();
            $table->json('metadata')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('regions');
    }
};