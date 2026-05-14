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
        Schema::table('user_profiles', function (Blueprint $table) {
            // Professional teacher fields
            $table->json('subjects')->nullable()->after('utis_code'); // Fənlər
            $table->string('specialty', 255)->nullable()->after('subjects'); // İxtisas
            $table->integer('experience_years')->nullable()->after('specialty'); // İş təcrübəsi (il)
            $table->decimal('miq_score', 5, 2)->nullable()->after('experience_years'); // MİQ balı (max 999.99)
            $table->decimal('certification_score', 5, 2)->nullable()->after('miq_score'); // Sertifikasiya balı
            $table->date('last_certification_date')->nullable()->after('certification_score'); // Son sertifikasiya tarixi
            $table->json('qualifications')->nullable()->after('last_certification_date'); // Kvalifikasiyalar
            $table->json('training_courses')->nullable()->after('qualifications'); // Təlim kursları
            $table->string('degree_level', 50)->nullable()->after('training_courses'); // Təhsil səviyyəsi
            $table->string('graduation_university', 255)->nullable()->after('degree_level'); // Bitirdiyi universitet
            $table->integer('graduation_year')->nullable()->after('graduation_university'); // Bitirmə ili
            $table->decimal('university_gpa', 4, 2)->nullable()->after('graduation_year'); // Universitet GPA

            // Student academic fields
            $table->decimal('student_miq_score', 5, 2)->nullable()->after('university_gpa'); // Şagird MİQ balı
            $table->json('academic_achievements')->nullable()->after('student_miq_score'); // Akademik nailiyyətlər
            $table->json('extracurricular_activities')->nullable()->after('academic_achievements'); // Əlavə fəaliyyətlər
            $table->json('health_info')->nullable()->after('extracurricular_activities'); // Sağlamlıq məlumatları
            $table->string('previous_school', 255)->nullable()->after('health_info'); // Əvvəlki məktəb
            $table->json('parent_occupation')->nullable()->after('previous_school'); // Valideyn peşəsi
            $table->decimal('family_income', 10, 2)->nullable()->after('parent_occupation'); // Ailə gəliri
            $table->json('special_needs')->nullable()->after('family_income'); // Xüsusi ehtiyaclar
            $table->text('notes')->nullable()->after('special_needs'); // Əlavə qeydlər

            // Add indexes for performance
            $table->index('experience_years');
            $table->index('miq_score');
            $table->index('certification_score');
            $table->index('degree_level');
            $table->index('graduation_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropIndex(['experience_years']);
            $table->dropIndex(['miq_score']);
            $table->dropIndex(['certification_score']);
            $table->dropIndex(['degree_level']);
            $table->dropIndex(['graduation_year']);

            $table->dropColumn([
                'subjects',
                'specialty',
                'experience_years',
                'miq_score',
                'certification_score',
                'last_certification_date',
                'qualifications',
                'training_courses',
                'degree_level',
                'graduation_university',
                'graduation_year',
                'university_gpa',
                'student_miq_score',
                'academic_achievements',
                'extracurricular_activities',
                'health_info',
                'previous_school',
                'parent_occupation',
                'family_income',
                'special_needs',
                'notes',
            ]);
        });
    }
};
