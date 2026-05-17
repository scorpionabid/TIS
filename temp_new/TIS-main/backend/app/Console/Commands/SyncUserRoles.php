<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncUserRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:user-roles
                            {--dry-run : Dəyişiklik etmədən nəticəni göstər}
                            {--fix-conflicts : Ziddiyyətli rolları düzəlt}
                            {--delete-orphans : Rolsuz test istifadəçilərini sil}
                            {--all : Bütün düzəlişləri tətbiq et}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Spatie model_has_roles cədvəlindən users.role_id sütununu sinxronlaşdırır';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('');
        $this->info('╔═══════════════════════════════════════════════════════════╗');
        $this->info('║       USER ROLES SİNXRONİZASİYA COMMAND                   ║');
        $this->info('╚═══════════════════════════════════════════════════════════╝');
        $this->info('');

        $dryRun = $this->option('dry-run');
        $fixConflicts = $this->option('fix-conflicts') || $this->option('all');
        $deleteOrphans = $this->option('delete-orphans') || $this->option('all');

        if ($dryRun) {
            $this->warn('⚠️  DRY-RUN REJİMİ - Heç bir dəyişiklik edilməyəcək');
            $this->info('');
        }

        // 1. Statistika göstər
        $this->showStatistics();

        // 2. Rolsuz istifadəçiləri yoxla
        $orphanUsers = $this->getOrphanUsers();
        if ($orphanUsers->isNotEmpty()) {
            $this->info('');
            $this->error('🚫 ROLSUZ İSTİFADƏÇİLƏR (heç bir rol yoxdur):');
            $this->table(
                ['ID', 'Username', 'Email', 'Yaradılma'],
                $orphanUsers->map(fn ($u) => [$u->id, $u->username, $u->email, $u->created_at])->toArray()
            );

            if ($deleteOrphans && ! $dryRun) {
                if ($this->confirm('Bu istifadəçiləri silmək istəyirsiniz?', true)) {
                    $this->deleteOrphanUsers($orphanUsers);
                }
            }
        }

        // 3. Ziddiyyətli rolları yoxla
        $conflictingUsers = $this->getConflictingUsers();
        if ($conflictingUsers->isNotEmpty()) {
            $this->info('');
            $this->error('⚠️  ZİDDİYYƏTLİ ROLLAR (role_id ≠ Spatie role):');
            $this->table(
                ['ID', 'Username', 'role_id', 'role_id adı', 'Spatie role_id', 'Spatie rol adı', 'Düzgün rol'],
                $conflictingUsers->map(function ($u) {
                    return [
                        $u->id,
                        $u->username,
                        $u->role_id,
                        $u->role_id_name,
                        $u->spatie_role_id,
                        $u->spatie_role_name,
                        $u->correct_role,
                    ];
                })->toArray()
            );

            if ($fixConflicts && ! $dryRun) {
                if ($this->confirm('Ziddiyyətli rolları düzəltmək istəyirsiniz? (Spatie rolu əsas götürüləcək)', true)) {
                    $this->fixConflictingUsers($conflictingUsers);
                }
            }
        }

        // 4. role_id NULL olan istifadəçiləri sinxronlaşdır
        $usersToSync = $this->getUsersToSync();
        if ($usersToSync->isNotEmpty()) {
            $this->info('');
            $this->info("📊 Sinxronizasiya ediləcək istifadəçi sayı: {$usersToSync->count()}");

            if (! $dryRun) {
                if ($this->confirm('role_id sütununu Spatie rollarından sinxronlaşdırmaq istəyirsiniz?', true)) {
                    $this->syncUserRoles($usersToSync);
                }
            } else {
                $this->info('');
                $this->warn('💡 Sinxronizasiya etmək üçün --dry-run olmadan çalışdırın:');
                $this->info('   php artisan sync:user-roles --all');
            }
        }

        // 5. Son statistika
        if (! $dryRun) {
            $this->info('');
            $this->info('═══════════════════════════════════════════════════════════');
            $this->info('📊 YENİLƏNMİŞ STATİSTİKA:');
            $this->showStatistics();
        }

        $this->info('');
        $this->info('✅ Əmr tamamlandı!');
        $this->info('');

        return Command::SUCCESS;
    }

    /**
     * Statistika göstər
     */
    private function showStatistics(): void
    {
        $stats = DB::select("
            SELECT
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
                (SELECT COUNT(*) FROM users WHERE role_id IS NULL AND deleted_at IS NULL) as null_role_id,
                (SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL AND deleted_at IS NULL) as has_role_id,
                (SELECT COUNT(DISTINCT model_id) FROM model_has_roles WHERE model_type = 'App\\Models\\User') as has_spatie_role
        ")[0];

        $this->table(
            ['Metrik', 'Sayı', 'Faiz'],
            [
                ['Ümumi aktiv istifadəçi', $stats->total_users, '100%'],
                ['role_id NULL olan', $stats->null_role_id, round(($stats->null_role_id / $stats->total_users) * 100, 1) . '%'],
                ['role_id təyin olunmuş', $stats->has_role_id, round(($stats->has_role_id / $stats->total_users) * 100, 1) . '%'],
                ['Spatie rolu olan', $stats->has_spatie_role, round(($stats->has_spatie_role / $stats->total_users) * 100, 1) . '%'],
            ]
        );
    }

    /**
     * Heç bir rolu olmayan istifadəçiləri tap
     */
    private function getOrphanUsers()
    {
        return User::whereNull('role_id')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('model_has_roles')
                    ->whereColumn('model_has_roles.model_id', 'users.id')
                    ->where('model_has_roles.model_type', 'App\\Models\\User');
            })
            ->whereNull('deleted_at')
            ->get();
    }

    /**
     * role_id və Spatie rolu fərqli olan istifadəçiləri tap
     */
    private function getConflictingUsers()
    {
        return DB::table('users as u')
            ->join('roles as r1', 'u.role_id', '=', 'r1.id')
            ->join('model_has_roles as m', function ($join) {
                $join->on('u.id', '=', 'm.model_id')
                    ->where('m.model_type', '=', 'App\\Models\\User');
            })
            ->join('roles as r2', 'm.role_id', '=', 'r2.id')
            ->whereRaw('u.role_id <> m.role_id')
            ->whereNull('u.deleted_at')
            ->select([
                'u.id',
                'u.username',
                'u.role_id',
                'r1.name as role_id_name',
                'm.role_id as spatie_role_id',
                'r2.name as spatie_role_name',
                DB::raw('r2.name as correct_role'), // Spatie rolu düzgün hesab edilir
            ])
            ->get();
    }

    /**
     * role_id NULL olan amma Spatie rolu olan istifadəçiləri tap
     */
    private function getUsersToSync()
    {
        return DB::table('users as u')
            ->join('model_has_roles as m', function ($join) {
                $join->on('u.id', '=', 'm.model_id')
                    ->where('m.model_type', '=', 'App\\Models\\User');
            })
            ->join('roles as r', 'm.role_id', '=', 'r.id')
            ->whereNull('u.role_id')
            ->whereNull('u.deleted_at')
            ->select(['u.id', 'u.username', 'm.role_id', 'r.name as role_name'])
            ->get();
    }

    /**
     * Rolsuz istifadəçiləri sil
     */
    private function deleteOrphanUsers($users): void
    {
        $count = $users->count();
        $ids = $users->pluck('id')->toArray();

        User::whereIn('id', $ids)->forceDelete();

        Log::info('SyncUserRoles: Rolsuz istifadəçilər silindi', [
            'count' => $count,
            'ids' => $ids,
        ]);

        $this->info("✅ {$count} rolsuz istifadəçi silindi.");
    }

    /**
     * Ziddiyyətli rolları düzəlt (Spatie rolu əsas götürülür)
     */
    private function fixConflictingUsers($users): void
    {
        $count = 0;

        foreach ($users as $user) {
            User::where('id', $user->id)->update(['role_id' => $user->spatie_role_id]);
            $count++;

            Log::info('SyncUserRoles: Ziddiyyətli rol düzəldildi', [
                'user_id' => $user->id,
                'username' => $user->username,
                'old_role_id' => $user->role_id,
                'new_role_id' => $user->spatie_role_id,
            ]);
        }

        $this->info("✅ {$count} ziddiyyətli rol düzəldildi.");
    }

    /**
     * role_id-ni Spatie rollarından sinxronlaşdır
     */
    private function syncUserRoles($users): void
    {
        $count = 0;
        $bar = $this->output->createProgressBar($users->count());
        $bar->start();

        foreach ($users as $user) {
            User::where('id', $user->id)->update(['role_id' => $user->role_id]);
            $count++;
            $bar->advance();
        }

        $bar->finish();
        $this->info('');

        Log::info('SyncUserRoles: role_id sinxronizasiyası tamamlandı', [
            'synced_count' => $count,
        ]);

        $this->info("✅ {$count} istifadəçinin role_id sütunu sinxronlaşdırıldı.");
    }
}
