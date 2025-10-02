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
        Schema::table('document_collections', function (Blueprint $table) {
            // Folder scope and type
            $table->enum('scope', ['personal', 'regional', 'sectoral'])
                  ->default('personal')
                  ->after('collection_type');

            // Template/folder identifier
            $table->string('folder_key')->nullable()->after('scope');
            // Keys: 'schedules', 'action_plans', 'orders', 'custom'

            $table->boolean('is_system_folder')->default(false)->after('folder_key');
            // System folders created by RegionAdmin/SuperAdmin

            $table->unsignedBigInteger('owner_institution_id')->nullable()->after('institution_id');
            // Track which region/sector owns this folder

            $table->enum('owner_institution_level', ['1', '2', '3', '4'])->nullable()->after('owner_institution_id');
            // 1=Ministry, 2=Region, 3=Sector, 4=School

            // Permissions and settings
            $table->boolean('allow_school_upload')->default(true)->after('owner_institution_level');
            $table->boolean('is_locked')->default(false)->after('allow_school_upload');
            // Locked folders can't be deleted/renamed except by creator

            // Soft deletes for recovery
            $table->softDeletes()->after('updated_at');

            // Foreign key for owner institution
            $table->foreign('owner_institution_id')
                  ->references('id')
                  ->on('institutions')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_collections', function (Blueprint $table) {
            $table->dropForeign(['owner_institution_id']);
            $table->dropColumn([
                'scope',
                'folder_key',
                'is_system_folder',
                'owner_institution_id',
                'owner_institution_level',
                'allow_school_upload',
                'is_locked',
                'deleted_at',
            ]);
        });
    }
};
