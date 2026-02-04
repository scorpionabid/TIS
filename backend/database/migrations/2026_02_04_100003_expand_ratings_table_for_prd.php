<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRD: RatingResult - hesablanmış total score + breakdown (komponentlər və illər üzrə)
     * Müəllim profilində TotalScore və bütün komponentlərin breakdown-ı göstərilməlidir.
     */
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            // PRD-yə uyğun komponent skorları (0-100)
            $table->decimal('academic_score', 5, 2)->nullable()->after('overall_score')
                ->comment('Şagirdlərin akademik göstəriciləri (sinif üzrə orta bal)');

            $table->decimal('observation_score', 5, 2)->nullable()->after('academic_score')
                ->comment('Dərs dinləmə nəticələri (yekun bal)');

            $table->decimal('assessment_score', 5, 2)->nullable()->after('observation_score')
                ->comment('Qiymətləndirmə balları: sertifikasiya, MİQ, diaqnostik');

            $table->decimal('certificate_score', 5, 2)->nullable()->after('assessment_score')
                ->comment('Sertifikatlar (növə görə bal)');

            $table->decimal('olympiad_score', 5, 2)->nullable()->after('certificate_score')
                ->comment('Olimpiada uğurları (şagirdlərin tutduğu yer və sayı)');

            $table->decimal('award_score', 5, 2)->nullable()->after('olympiad_score')
                ->comment('Təltiflər (əməkdar müəllim, medal və fəxri fərmanlar)');

            $table->decimal('growth_bonus', 5, 2)->default(0)->after('award_score')
                ->comment('PRD: Growth bonus - son illərdə yaxşılaşma bonusu (max +5)');

            // İllər üzrə breakdown
            $table->json('yearly_breakdown')->nullable()->after('growth_bonus')
                ->comment('2022-23, 2023-24, 2024-25 illər üzrə komponent balları');

            // Index for component-based queries
            $table->index(['institution_id', 'academic_year_id', 'overall_score'], 'ratings_leaderboard_idx');
        });

        // Add table comment
        DB::statement("COMMENT ON COLUMN ratings.yearly_breakdown IS 'PRD: Reytinq breakdown-ın hər müəllim profilində görünməsi'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropIndex('ratings_leaderboard_idx');
            $table->dropColumn([
                'academic_score',
                'observation_score',
                'assessment_score',
                'certificate_score',
                'olympiad_score',
                'award_score',
                'growth_bonus',
                'yearly_breakdown',
            ]);
        });
    }
};
