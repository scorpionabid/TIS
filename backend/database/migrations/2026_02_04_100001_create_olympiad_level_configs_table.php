<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRD: Olimpiada bal cədvəlləri: səviyyə (rayon/region/ölkə/beynəlxalq),
     * tutduğu yer, şagird sayı bonusu
     */
    public function up(): void
    {
        Schema::create('olympiad_level_configs', function (Blueprint $table) {
            $table->id();
            $table->enum('level', ['rayon', 'region', 'country', 'international'])
                ->comment('Olimpiada səviyyəsi');
            $table->integer('placement')->comment('Tutduğu yer (1, 2, 3, ...)');
            $table->decimal('base_score', 5, 2)->comment('Bu yerləşmə üçün əsas bal');
            $table->decimal('student_bonus', 5, 2)->default(0)
                ->comment('Hər əlavə şagird üçün bonus bal');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Unique: hər səviyyə və yer kombinasiyası unikal olmalıdır
            $table->unique(['level', 'placement'], 'unique_level_placement');
            $table->index(['is_active', 'level'], 'olc_active_level_idx');
        });

        // Add comments (SQLite compatible)
        if (config('database.default') !== 'sqlite') {
            DB::statement("COMMENT ON TABLE olympiad_level_configs IS 'PRD: Region Admin tərəfindən konfiqurasiya olunan olimpiada bal cədvəlləri'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('olympiad_level_configs');
    }
};
