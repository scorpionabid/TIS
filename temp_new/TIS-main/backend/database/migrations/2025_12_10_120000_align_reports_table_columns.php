<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (! Schema::hasColumn('reports', 'name')) {
                $table->string('name', 255)->nullable()->after('id');
            }

            if (! Schema::hasColumn('reports', 'institution_id')) {
                $table->foreignId('institution_id')
                    ->nullable()
                    ->after('name')
                    ->constrained('institutions')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('reports', 'type')) {
                $table->string('type', 100)->nullable()->after('institution_id');
            }

            if (! Schema::hasColumn('reports', 'status')) {
                $table->string('status', 20)->default('draft')->after('type');
            }

            if (! Schema::hasColumn('reports', 'created_by')) {
                $table->foreignId('created_by')
                    ->nullable()
                    ->after('status')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('reports', 'updated_by')) {
                $table->foreignId('updated_by')
                    ->nullable()
                    ->after('created_by')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('reports', 'config')) {
                $table->json('config')->nullable()->after('description');
            }

            if (! Schema::hasColumn('reports', 'parameters')) {
                $table->json('parameters')->nullable()->after('config');
            }

            if (! Schema::hasColumn('reports', 'schedule_type')) {
                $table->string('schedule_type', 20)->default('manual')->after('parameters');
            }

            if (! Schema::hasColumn('reports', 'schedule_config')) {
                $table->json('schedule_config')->nullable()->after('schedule_type');
            }

            if (! Schema::hasColumn('reports', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('schedule_config');
            }

            if (! Schema::hasColumn('reports', 'result_data')) {
                $table->json('result_data')->nullable()->after('is_active');
            }

            if (! Schema::hasColumn('reports', 'result_files')) {
                $table->json('result_files')->nullable()->after('result_data');
            }

            if (! Schema::hasColumn('reports', 'file_path')) {
                $table->string('file_path')->nullable()->after('result_files');
            }

            if (! Schema::hasColumn('reports', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('reports', 'generation_time')) {
                $table->unsignedInteger('generation_time')->nullable()->after('file_size');
            }

            if (! Schema::hasColumn('reports', 'data_points_count')) {
                $table->unsignedInteger('data_points_count')->nullable()->after('generation_time');
            }

            if (! Schema::hasColumn('reports', 'generation_started_at')) {
                $table->timestamp('generation_started_at')->nullable()->after('data_points_count');
            }

            if (! Schema::hasColumn('reports', 'generated_at')) {
                $table->timestamp('generated_at')->nullable()->after('generation_started_at');
            }

            if (! Schema::hasColumn('reports', 'generation_completed_at')) {
                $table->timestamp('generation_completed_at')->nullable()->after('generated_at');
            }

            if (! Schema::hasColumn('reports', 'generation_failed_at')) {
                $table->timestamp('generation_failed_at')->nullable()->after('generation_completed_at');
            }
        });

        // Backfill new columns from legacy data where possible
        if (Schema::hasColumn('reports', 'title')) {
            DB::table('reports')
                ->whereNull('name')
                ->update(['name' => DB::raw('title')]);
        }

        if (Schema::hasColumn('reports', 'report_type')) {
            DB::table('reports')
                ->whereNull('type')
                ->update(['type' => DB::raw('report_type')]);
        }

        if (Schema::hasColumn('reports', 'creator_id')) {
            DB::table('reports')
                ->whereNull('created_by')
                ->update(['created_by' => DB::raw('creator_id')]);
        }

        if (Schema::hasColumn('reports', 'query_parameters')) {
            DB::table('reports')
                ->whereNull('parameters')
                ->update(['parameters' => DB::raw('query_parameters')]);
        }

        if (Schema::hasColumn('reports', 'visualization_config')) {
            DB::table('reports')
                ->whereNull('config')
                ->update(['config' => DB::raw('visualization_config')]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $dropColumn = function (string $column) use ($table) {
                if (Schema::hasColumn('reports', $column)) {
                    $table->dropColumn($column);
                }
            };

            if (Schema::hasColumn('reports', 'institution_id')) {
                $table->dropForeign(['institution_id']);
                $dropColumn('institution_id');
            }

            if (Schema::hasColumn('reports', 'created_by')) {
                $table->dropForeign(['created_by']);
                $dropColumn('created_by');
            }

            if (Schema::hasColumn('reports', 'updated_by')) {
                $table->dropForeign(['updated_by']);
                $dropColumn('updated_by');
            }

            $dropColumn('generation_failed_at');
            $dropColumn('generation_completed_at');
            $dropColumn('generated_at');
            $dropColumn('generation_started_at');
            $dropColumn('data_points_count');
            $dropColumn('generation_time');
            $dropColumn('file_size');
            $dropColumn('file_path');
            $dropColumn('result_files');
            $dropColumn('result_data');
            $dropColumn('is_active');
            $dropColumn('schedule_config');
            $dropColumn('schedule_type');
            $dropColumn('parameters');
            $dropColumn('config');
            $dropColumn('status');
            $dropColumn('type');
            $dropColumn('name');
        });
    }
};
