<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('region_operator_permissions')) {
            return;
        }

        DB::table('region_operator_permissions')
            ->orderBy('id')
            ->chunk(200, function ($rows) {
                foreach ($rows as $row) {
                    if ($row->can_view_surveys) {
                        continue;
                    }

                    $hasAnyPermission = false;
                    foreach (config('region_operator_permissions.fields', []) as $field) {
                        if ($field === 'can_view_surveys') {
                            continue;
                        }

                        if (! empty($row->{$field})) {
                            $hasAnyPermission = true;
                            break;
                        }
                    }

                    if ($hasAnyPermission) {
                        continue;
                    }

                    DB::table('region_operator_permissions')
                        ->where('id', $row->id)
                        ->update(['can_view_surveys' => true]);
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('region_operator_permissions')) {
            return;
        }

        DB::table('region_operator_permissions')
            ->orderBy('id')
            ->chunk(200, function ($rows) {
                foreach ($rows as $row) {
                    if (! $row->can_view_surveys) {
                        continue;
                    }

                    $hasAnyPermission = false;
                    foreach (config('region_operator_permissions.fields', []) as $field) {
                        if ($field === 'can_view_surveys') {
                            continue;
                        }

                        if (! empty($row->{$field})) {
                            $hasAnyPermission = true;
                            break;
                        }
                    }

                    if ($hasAnyPermission) {
                        continue;
                    }

                    DB::table('region_operator_permissions')
                        ->where('id', $row->id)
                        ->update(['can_view_surveys' => false]);
                }
            });
    }
};
