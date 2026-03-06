<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Teacher workplaces - Müəllimlərin əlavə iş yerləri
     * Bu cədvəl bir müəllimin 2-4 iş yerində çalışmasını izləmək üçündür
     */
    public function up(): void
    {
        Schema::create('teacher_workplaces', function (Blueprint $table) {
            $table->id();

            // Teacher reference
            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade')
                ->comment('Müəllim ID-si');

            // Institution reference
            $table->foreignId('institution_id')
                ->constrained('institutions')
                ->onDelete('cascade')
                ->comment('Müəssisə ID-si');

            // Workplace details
            $table->enum('workplace_priority', ['primary', 'secondary', 'tertiary', 'quaternary'])
                ->default('secondary')
                ->comment('İş yeri prioriteti (primary=əsas, secondary=2-ci, tertiary=3-cü, quaternary=4-cü)');

            $table->enum('position_type', [
                'direktor',
                'direktor_muavini_tedris',
                'direktor_muavini_inzibati',
                'terbiye_isi_uzre_direktor_muavini',
                'metodik_birlesme_rəhbəri',
                'muəllim_sinif_rəhbəri',
                'muəllim',
                'psixoloq',
                'kitabxanaçı',
                'laborant',
                'tibb_işçisi',
                'təsərrüfat_işçisi',
            ])->comment('Bu iş yerində vəzifə');

            $table->enum('employment_type', [
                'full_time',      // Tam ştat
                'part_time',      // Yarım ştat
                'contract',       // Müqavilə
                'hourly',         // Saatlıq
            ])->default('part_time')->comment('İşçi növü');

            // Work schedule
            $table->decimal('weekly_hours', 5, 2)->nullable()
                ->comment('Həftəlik saat sayı');

            $table->json('work_days')->nullable()
                ->comment('İş günləri (JSON array)');

            // Subject information
            $table->json('subjects')->nullable()
                ->comment('Bu iş yerində tədris etdiyi fənlər');

            // Department
            $table->foreignId('department_id')->nullable()
                ->constrained('departments')
                ->onDelete('set null')
                ->comment('Şöbə ID-si');

            // Contract dates
            $table->date('start_date')->nullable()
                ->comment('Başlama tarixi');

            $table->date('end_date')->nullable()
                ->comment('Bitmə tarixi');

            // Status
            $table->enum('status', ['active', 'inactive', 'suspended', 'terminated'])
                ->default('active')
                ->comment('Status');

            // Salary information (optional)
            $table->decimal('salary_amount', 10, 2)->nullable()
                ->comment('Maaş məbləği');

            $table->string('salary_currency', 3)->default('AZN')
                ->comment('Valyuta');

            // Additional info
            $table->text('notes')->nullable()
                ->comment('Əlavə qeydlər');

            $table->json('metadata')->nullable()
                ->comment('Əlavə metadata');

            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['institution_id', 'status']);
            $table->index(['user_id', 'workplace_priority']);
            $table->index(['start_date', 'end_date']);

            // Unique constraint - bir müəllim eyni müəssisədə eyni prioritetdə ola bilməz
            $table->unique(['user_id', 'institution_id', 'workplace_priority'], 'unique_teacher_workplace');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_workplaces');
    }
};
