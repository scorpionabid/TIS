<?php

namespace Tests\Feature\LinkSharing;

use App\Models\Institution;
use App\Models\LinkAccessLog;
use App\Models\LinkShare;
use App\Models\User;
use App\Services\LinkSharing\Domains\Statistics\LinkStatisticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LinkStatisticsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_groups_daily_access_counts_cross_database(): void
    {
        $now = Carbon::parse('2025-12-05 10:00:00');
        Carbon::setTestNow($now);

        $role = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $user = User::factory()->create();
        $user->assignRole($role);

        $institution = Institution::factory()->create();
        $linkShare = LinkShare::factory()
            ->for($user, 'sharedBy')
            ->for($institution)
            ->create(['status' => 'active', 'share_scope' => 'public']);

        // Today
        LinkAccessLog::factory()
            ->for($linkShare)
            ->for($user)
            ->create(['created_at' => $now, 'updated_at' => $now]);

        // Yesterday (2 hits)
        LinkAccessLog::factory()
            ->for($linkShare)
            ->for($user)
            ->count(2)
            ->create([
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now->copy()->subDay(),
            ]);

        // Older entry
        LinkAccessLog::factory()
            ->for($linkShare)
            ->for($user)
            ->create([
                'created_at' => $now->copy()->subDays(3),
                'updated_at' => $now->copy()->subDays(3),
            ]);

        $service = app(LinkStatisticsService::class);
        $stats = $service->getLinkStatistics($linkShare->fresh(), $user);

        $this->assertSame(1, $stats['overview']['access_today']);
        $this->assertSame(4, $stats['overview']['access_this_week']);
        $this->assertArrayHasKey($now->toDateString(), $stats['daily_access']);
        $this->assertArrayHasKey($now->copy()->subDay()->toDateString(), $stats['daily_access']);
        $this->assertSame(2, $stats['daily_access'][$now->copy()->subDay()->toDateString()]);

        Carbon::setTestNow();
    }
}
