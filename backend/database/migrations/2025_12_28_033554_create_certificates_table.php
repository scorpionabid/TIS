<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Certificates - Sertifikatlar (növə görə bal)
     */
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('certificate_type_id')->constrained('certificate_types')->onDelete('cascade');
            $table->date('issue_date')->comment('Certificate issue date');
            $table->string('issuer', 255)->nullable()->comment('Issuing organization');
            $table->string('file_path', 255)->nullable()->comment('Certificate document file path');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
            $table->index('certificate_type_id');
            $table->index('issue_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
