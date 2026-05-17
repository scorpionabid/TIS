<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRD: Region Admin konfiqurasiya paneli
     * - Komponent çəkiləri (Wi) - dəyişiklik audit log-da saxlanılır
     */
    public function up(): void
    {
        Schema::table('rating_configs', function (Blueprint $table) {
            // PRD-yə uyğun 6 komponent çəkisi
            // Cəmi 1.0 (100%) olmalıdır
            $table->decimal('academic_weight', 3, 2)->default(0.25)->after('manual_weight')
                ->comment('Akademik göstərici çəkisi (default 25%)');

            $table->decimal('observation_weight', 3, 2)->default(0.20)->after('academic_weight')
                ->comment('Dərs dinləmə çəkisi (default 20%)');

            $table->decimal('assessment_weight', 3, 2)->default(0.20)->after('observation_weight')
                ->comment('Qiymətləndirmə çəkisi (default 20%)');

            $table->decimal('certificate_weight', 3, 2)->default(0.15)->after('assessment_weight')
                ->comment('Sertifikat çəkisi (default 15%)');

            $table->decimal('olympiad_weight', 3, 2)->default(0.10)->after('certificate_weight')
                ->comment('Olimpiada çəkisi (default 10%)');

            $table->decimal('award_weight', 3, 2)->default(0.10)->after('olympiad_weight')
                ->comment('Təltif çəkisi (default 10%)');

            // PRD: İllər üzrə çəki konfiqurasiyası
            // Default: {"2022-2023": 0.25, "2023-2024": 0.30, "2024-2025": 0.45}
            $table->json('year_weights')->nullable()->after('award_weight')
                ->comment('İllər üzrə çəki: 2022-23 (25%), 2023-24 (30%), 2024-25 (45%)');
        });

        // Add comment (SQLite compatible)
        if (config('database.default') !== 'sqlite') {
            DB::statement("COMMENT ON TABLE rating_configs IS 'PRD: Region Admin tərəfindən idarə olunan reytinq konfiqurasiyası'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rating_configs', function (Blueprint $table) {
            $table->dropColumn([
                'academic_weight',
                'observation_weight',
                'assessment_weight',
                'certificate_weight',
                'olympiad_weight',
                'award_weight',
                'year_weights',
            ]);
        });
    }
};
