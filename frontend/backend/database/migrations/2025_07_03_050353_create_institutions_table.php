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
        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('short_name', 50)->nullable();
            $table->string('type', 50);
            $table->foreignId('parent_id')->nullable()->constrained('institutions');
            $table->integer('level');
            $table->string('region_code', 10)->nullable();
            $table->string('institution_code', 20)->unique()->nullable();
            $table->json('contact_info')->default('{}');
            $table->json('location')->default('{}');
            $table->json('metadata')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->date('established_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('institutions');
    }
};