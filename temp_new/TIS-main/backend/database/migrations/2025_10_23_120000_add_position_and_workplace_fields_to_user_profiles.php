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
            // Only add fields that don't exist yet
            // position_type, specialty_score, specialty_level already exist

            // Primary institution - Əsas iş yeri
            if (! Schema::hasColumn('user_profiles', 'primary_institution_id')) {
                $table->foreignId('primary_institution_id')
                    ->nullable()
                    ->after('specialty_level')
                    ->constrained('institutions')
                    ->onDelete('set null')
                    ->comment('Əsas iş yeri');
            }

            // Additional work info
            if (! Schema::hasColumn('user_profiles', 'has_additional_workplaces')) {
                $table->boolean('has_additional_workplaces')->default(false)
                    ->after('primary_institution_id')
                    ->comment('Əlavə iş yeri varmı?');
            }

            // Employment status
            if (! Schema::hasColumn('user_profiles', 'employment_status')) {
                $table->enum('employment_status', [
                    'full_time',      // Tam ştat
                    'part_time',      // Yarım ştat
                    'contract',       // Müqavilə əsasında
                    'temporary',      // Müvəqqəti
                    'substitute',     // Əvəzedici
                ])->default('full_time')->after('has_additional_workplaces')
                    ->comment('İşçi statusu');
            }

            // Contract information
            if (! Schema::hasColumn('user_profiles', 'contract_start_date')) {
                $table->date('contract_start_date')->nullable()
                    ->after('employment_status')
                    ->comment('Müqavilə başlama tarixi');
            }

            if (! Schema::hasColumn('user_profiles', 'contract_end_date')) {
                $table->date('contract_end_date')->nullable()
                    ->after('contract_start_date')
                    ->comment('Müqavilə bitmə tarixi');
            }

            // Add indexes only if they don't exist
            if (Schema::hasColumn('user_profiles', 'position_type')
                && ! $this->indexExists('user_profiles', 'user_profiles_position_type_index')) {
                $table->index('position_type', 'user_profiles_position_type_index');
            }
            if (! $this->indexExists('user_profiles', 'user_profiles_primary_institution_id_index')) {
                $table->index('primary_institution_id');
            }
            if (! $this->indexExists('user_profiles', 'user_profiles_employment_status_index')) {
                $table->index('employment_status');
            }
        });
    }

    /**
     * Check if index exists
     */
    private function indexExists($table, $indexName): bool
    {
        $connection = Schema::getConnection();
        $schema = $connection->getSchemaBuilder();
        $indexes = $schema->getIndexes($table);

        foreach ($indexes as $index) {
            if ($index['name'] === $indexName) {
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
            // Drop indexes
            foreach (['user_profiles_position_type_index', 'user_profiles_primary_institution_id_index', 'user_profiles_employment_status_index'] as $indexName) {
                if ($this->indexExists('user_profiles', $indexName)) {
                    $table->dropIndex($indexName);
                }
            }

            if (Schema::hasColumn('user_profiles', 'primary_institution_id')) {
                $table->dropForeign(['primary_institution_id']);
            }

            $dropColumns = array_filter([
                Schema::hasColumn('user_profiles', 'position_type') ? 'position_type' : null,
                Schema::hasColumn('user_profiles', 'specialty_score') ? 'specialty_score' : null,
                Schema::hasColumn('user_profiles', 'primary_institution_id') ? 'primary_institution_id' : null,
                Schema::hasColumn('user_profiles', 'has_additional_workplaces') ? 'has_additional_workplaces' : null,
                Schema::hasColumn('user_profiles', 'employment_status') ? 'employment_status' : null,
                Schema::hasColumn('user_profiles', 'contract_start_date') ? 'contract_start_date' : null,
                Schema::hasColumn('user_profiles', 'contract_end_date') ? 'contract_end_date' : null,
            ]);

            if (! empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
