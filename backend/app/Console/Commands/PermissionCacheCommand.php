<?php

namespace App\Console\Commands;

use App\Services\PermissionCacheService;
use Illuminate\Console\Command;

class PermissionCacheCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permission:cache {action=stats : Action to perform (stats|warmup|clear)}
                            {--users : Warmup user permissions cache}
                            {--roles : Warmup role permissions cache}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage permission cache (stats, warmup, clear)';

    /**
     * Execute the console command.
     */
    public function handle(PermissionCacheService $cacheService): int
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'stats':
                return $this->showStats($cacheService);

            case 'warmup':
                return $this->warmupCache($cacheService);

            case 'clear':
                return $this->clearCache($cacheService);

            default:
                $this->error("Unknown action: {$action}");
                $this->info('Available actions: stats, warmup, clear');

                return 1;
        }
    }

    /**
     * Show cache statistics.
     */
    private function showStats(PermissionCacheService $cacheService): int
    {
        $this->info('📊 Permission Cache Statistics');
        $this->newLine();

        $stats = $cacheService->getCacheStats();

        $this->table(
            ['Cache Type', 'Cached Count'],
            [
                ['User Permissions', $stats['user_permissions_cached']],
                ['Role Permissions', $stats['role_permissions_cached']],
                ['Permission Users', $stats['permission_users_cached']],
                ['Permission Roles', $stats['permission_roles_cached']],
                ['---', '---'],
                ['TOTAL', $stats['total_cached_keys']],
            ]
        );

        return 0;
    }

    /**
     * Warm up permission caches.
     */
    private function warmupCache(PermissionCacheService $cacheService): int
    {
        $this->info('🔥 Warming up permission caches...');
        $this->newLine();

        $warmupUsers = $this->option('users') || ! $this->option('roles');
        $warmupRoles = $this->option('roles') || ! $this->option('users');

        if ($warmupUsers) {
            $this->info('Warming up user permissions...');
            $userCount = $cacheService->warmupAllUserCaches();
            $this->info("✅ {$userCount} users cached");
        }

        if ($warmupRoles) {
            $this->info('Warming up role permissions...');
            $roleCount = $cacheService->warmupAllRoleCaches();
            $this->info("✅ {$roleCount} roles cached");
        }

        $this->newLine();
        $this->showStats($cacheService);

        return 0;
    }

    /**
     * Clear all permission caches.
     */
    private function clearCache(PermissionCacheService $cacheService): int
    {
        if (! $this->confirm('Are you sure you want to clear ALL permission caches?', false)) {
            $this->info('Operation cancelled');

            return 0;
        }

        $this->warn('🗑️  Clearing all permission caches...');
        $cacheService->clearAllCaches();
        $this->info('✅ All permission caches cleared');

        $this->newLine();
        $this->showStats($cacheService);

        return 0;
    }
}
