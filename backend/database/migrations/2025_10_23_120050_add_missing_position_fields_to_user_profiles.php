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
            if (! Schema::hasColumn('user_profiles', 'position_type')) {
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
                ])->nullable()->after('specialty');
            }

            if (! Schema::hasColumn('user_profiles', 'specialty_score')) {
                $table->decimal('specialty_score', 5, 2)->nullable()->after('position_type');
            }

            if (! Schema::hasColumn('user_profiles', 'specialty_level')) {
                $table->enum('specialty_level', [
                    'bakalavr',
                    'magistr',
                    'doktorantura',
                    'elmi_ishci',
                ])->nullable()->after('specialty_score');
            }
        });

        if (Schema::hasColumn('user_profiles', 'position_type') &&
            ! $this->indexExists('user_profiles', 'user_profiles_position_type_index')) {
            Schema::table('user_profiles', function (Blueprint $table) {
                $table->index('position_type', 'user_profiles_position_type_index');
            });
        }
    }

    /**
     * Check if index exists.
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $schema = $connection->getSchemaBuilder();
        $indexes = $schema->getIndexes($table);

        foreach ($indexes as $index) {
            if (($index['name'] ?? null) === $indexName) {
                return true;
            }
        }

        return false;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'position_type') &&
                $this->indexExists('user_profiles', 'user_profiles_position_type_index')) {
                $table->dropIndex('user_profiles_position_type_index');
            }

            if (Schema::hasColumn('user_profiles', 'specialty_level')) {
                $table->dropColumn('specialty_level');
            }

            if (Schema::hasColumn('user_profiles', 'specialty_score')) {
                $table->dropColumn('specialty_score');
            }

            if (Schema::hasColumn('user_profiles', 'position_type')) {
                $table->dropColumn('position_type');
            }
        });
    }
};
