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
        Schema::table('document_shares', function (Blueprint $table) {
            if (!Schema::hasColumn('document_shares', 'shared_with_users')) {
                $table->json('shared_with_users')->nullable()->after('shared_by');
            }

            if (!Schema::hasColumn('document_shares', 'shared_with_roles')) {
                $table->json('shared_with_roles')->nullable()->after('shared_with_users');
            }

            if (!Schema::hasColumn('document_shares', 'shared_with_institutions')) {
                $table->json('shared_with_institutions')->nullable()->after('shared_with_roles');
            }

            if (!Schema::hasColumn('document_shares', 'share_type')) {
                $table->string('share_type', 50)->default('view')->after('share_name');
            }

            if (!Schema::hasColumn('document_shares', 'message')) {
                $table->text('message')->nullable()->after('share_type');
            }

            if (!Schema::hasColumn('document_shares', 'allow_download')) {
                $table->boolean('allow_download')->default(true)->after('max_downloads');
            }

            if (!Schema::hasColumn('document_shares', 'allow_reshare')) {
                $table->boolean('allow_reshare')->default(false)->after('allow_download');
            }

            if (!Schema::hasColumn('document_shares', 'public_token')) {
                $table->string('public_token', 64)->nullable()->unique()->after('allow_reshare');
            }

            if (!Schema::hasColumn('document_shares', 'password_protected')) {
                $table->boolean('password_protected')->default(false)->after('requires_password');
            }

            if (!Schema::hasColumn('document_shares', 'access_password')) {
                $table->string('access_password')->nullable()->after('password_protected');
            }

            if (!Schema::hasColumn('document_shares', 'access_count')) {
                $table->unsignedInteger('access_count')->default(0)->after('view_count');
            }
        });

        Schema::table('document_downloads', function (Blueprint $table) {
            if (!Schema::hasColumn('document_downloads', 'downloaded_at')) {
                $table->timestamp('downloaded_at')->nullable()->after('user_agent');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_downloads', function (Blueprint $table) {
            if (Schema::hasColumn('document_downloads', 'downloaded_at')) {
                $table->dropColumn('downloaded_at');
            }
        });

        Schema::table('document_shares', function (Blueprint $table) {
            $columns = [
                'shared_with_users',
                'shared_with_roles',
                'shared_with_institutions',
                'share_type',
                'message',
                'allow_download',
                'allow_reshare',
                'public_token',
                'password_protected',
                'access_password',
                'access_count',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('document_shares', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
