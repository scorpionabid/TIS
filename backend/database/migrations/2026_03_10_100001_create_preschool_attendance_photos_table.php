<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preschool_attendance_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('preschool_attendance_id')
                  ->constrained('preschool_attendance')
                  ->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->date('photo_date');
            $table->string('file_path', 500);
            $table->string('original_filename', 255);
            $table->string('mime_type', 50)->default('image/jpeg');
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->timestamps();

            $table->index(['institution_id', 'photo_date'], 'pap_inst_date_idx');
            $table->index('photo_date', 'pap_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preschool_attendance_photos');
    }
};
