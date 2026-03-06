<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Approval workflow-u "AND" məntiqi əvəzinə "OR" məntiqi ilə düzəldir.
     *
     * Problem: SektorAdmin VƏ RegionAdmin hər ikisi ardıcıl təsdiq etməli idi (3 mərhələ).
     * Düzəliş: SektorAdmin VƏ YA RegionAdmin — biri kifayətdir (2 mərhələ).
     *
     * Həmçinin level-3-də "stuck" qalmış 46 cavabı tamamlayır
     * (SektorAdmin artıq köhnə 3-mərhələli sistemdə level-2 olaraq təsdiqləmişdi,
     *  indi level-3 RegionAdmin gözlənilir — bu artıq lazım deyil).
     */
    public function up(): void
    {
        // --- 1. approval_chain-i 2 mərhələyə yenilə (OR məntiqi) ---
        DB::table('approval_workflows')
            ->where('workflow_type', 'survey_response')
            ->update([
                'approval_chain' => json_encode([
                    [
                        'level'         => 1,
                        'role'          => 'schooladmin',
                        'allowed_roles' => ['schooladmin', 'preschooladmin'],
                        'required'      => false,
                        'title'         => 'Məktəb Admini Təsdiqləməsi',
                    ],
                    [
                        'level'         => 2,
                        'role'          => 'sektoradmin',
                        'allowed_roles' => ['sektoradmin', 'regionadmin', 'regionoperator'],
                        'required'      => true,
                        'title'         => 'Sektor/Region Admini Təsdiqləməsi',
                    ],
                ]),
            ]);

        // --- 2. Level-3-də stuck qalan cavabları tamamla ---
        // Bu cavablar köhnə sistemdə level-2 (sektoradmin) tərəfindən
        // artıq təsdiqlənmişdi, lakin level-3 (regionadmin) gözlənirdi.
        // Yeni OR sistemdə level-2 təsdiqi yetərlidir → approved olaraq işarələ.
        $stuckRequests = DB::table('data_approval_requests')
            ->where('current_approval_level', 3)
            ->where('current_status', 'in_progress')
            ->where('approvalable_type', 'App\\Models\\SurveyResponse')
            ->get(['id', 'approvalable_id']);

        foreach ($stuckRequests as $req) {
            DB::table('data_approval_requests')
                ->where('id', $req->id)
                ->update([
                    'current_status'         => 'approved',
                    'current_approval_level' => 2,
                    'completed_at'           => now(),
                ]);

            DB::table('survey_responses')
                ->where('id', $req->approvalable_id)
                ->update([
                    'status'      => 'approved',
                    'approved_at' => now(),
                ]);
        }

        $count = count($stuckRequests);
        if ($count > 0) {
            \Illuminate\Support\Facades\Log::info(
                "OR logic migration: {$count} stuck approval requests fixed (level-3 → approved)."
            );
        }
    }

    public function down(): void
    {
        // Köhnə 3-mərhələli formatı bərpa edir.
        // Qeyd: stuck cavabları əvvəlki vəziyyətə qaytarmaq mümkün deyil
        // (data hazır deyil), down() yalnız schema-nı bərpa edir.
        DB::table('approval_workflows')
            ->where('workflow_type', 'survey_response')
            ->update([
                'approval_chain' => json_encode([
                    [
                        'level'         => 1,
                        'role'          => 'schooladmin',
                        'allowed_roles' => ['schooladmin', 'preschooladmin'],
                        'required'      => false,
                        'title'         => 'Məktəb Admini Təsdiqləməsi',
                    ],
                    [
                        'level'         => 2,
                        'role'          => 'sektoradmin',
                        'allowed_roles' => ['sektoradmin'],
                        'required'      => true,
                        'title'         => 'Sektor Admini Təsdiqləməsi',
                    ],
                    [
                        'level'         => 3,
                        'role'          => 'regionadmin',
                        'allowed_roles' => ['regionadmin', 'regionoperator'],
                        'required'      => true,
                        'title'         => 'Region Admini Təsdiqləməsi',
                    ],
                ]),
            ]);
    }
};
