<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRD: Growth bonus qaydaları (opsional)
     * MVP üçün tövsiyə: 2024-2025 göstəricisi 2022-2023-dən 15+ bal yüksəkdirsə +2,
     * 25+ bal yüksəkdirsə +5 (cap +5)
     */
    public function up(): void
    {
        Schema::create('growth_bonus_configs', function (Blueprint $table) {
            $table->id();
            $table->decimal('threshold_min', 5, 2)
                ->comment('Minimum artım həddi (məs: 15)');
            $table->decimal('threshold_max', 5, 2)->nullable()
                ->comment('Maksimum artım həddi (məs: 24.99), null = limitsiz');
            $table->decimal('bonus_score', 5, 2)
                ->comment('Verilən bonus bal (məs: +2, +5)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'threshold_min'], 'gbc_active_threshold_idx');
        });

        // Add comments (SQLite compatible)
        if (config('database.default') !== 'sqlite') {
            DB::statement("COMMENT ON TABLE growth_bonus_configs IS 'PRD: İnkişaf (growth) bonus qaydaları - son illərdə yaxşılaşmanı təşviq etmək üçün'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('growth_bonus_configs');
    }
};
