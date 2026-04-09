<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ImportTeachersCsv extends Command
{
    protected $signature = 'teachers:import-csv
                            {file : CSV faylının tam yolu}
                            {--chunk=300 : Hər dəfə işlənən müəllim sayı}
                            {--dry-run : DB-yə yazmadan test et}';

    protected $description = 'CSV faylından müəllimləri UTIS koduna görə import et';

    // ── Lookup caches ─────────────────────────────────────────────────────────
    private array $schoolMap   = []; // institution_code => institution_id
    private array $roleMap     = []; // role_name        => role_id
    private array $subjectMap  = []; // subject_name     => subject_id

    // ── Counters ──────────────────────────────────────────────────────────────
    private int $usersCreated    = 0;
    private int $usersUpdated    = 0;
    private int $wpCreated       = 0;
    private int $wpUpdated       = 0;
    private int $skipped         = 0;

    private array $failed = [];

    // ── position_type: CSV → DB enum ─────────────────────────────────────────
    private const POSITION_MAP = [
        'direktor'                                                              => 'direktor',
        'psixoloq'                                                              => 'psixoloq',
        'kitabxanaçı'                                                           => 'kitabxanaçı',
        'laborant'                                                              => 'laborant',
        'tibb işçisi'                                                           => 'tibb_işçisi',
        'təsərrüfat işçisi'                                                     => 'təsərrüfat_işçisi',
        'metodik birləşmə rəhbəri'                                              => 'metodik_birlesme_rəhbəri',
        'tədris və təlim işləri üzrə direktor müavini'                          => 'direktor_muavini_tedris',
        'direktorun litsey (gimnaziya) və sair profil üzrə müavini'             => 'direktor_muavini_tedris',
        'direktorun litsey'                                                     => 'direktor_muavini_tedris',
        'təlim-tərbiyə işləri üzrə direktor müavini (əsas)'                    => 'terbiye_isi_uzre_direktor_muavini',
        'təlim-tərbiyə işləri üzrə direktor müavini'                           => 'terbiye_isi_uzre_direktor_muavini',
        'tərbiyə işləri üzrə direktor müavini'                                  => 'terbiye_isi_uzre_direktor_muavini',
    ];

    // ── position → role ───────────────────────────────────────────────────────
    private const ROLE_MAP = [
        'direktor'                          => 'schooladmin',
        'direktor_muavini_tedris'           => 'muavin',
        'terbiye_isi_uzre_direktor_muavini' => 'muavin',
        'direktor_muavini_inzibati'         => 'muavin',
    ];

    // ── workplace_priority sequence ───────────────────────────────────────────
    private const WP_PRIORITY = ['primary', 'secondary', 'tertiary', 'quaternary'];

    public function handle(): int
    {
        ini_set('memory_limit', '512M');

        $filePath  = $this->argument('file');
        $chunkSize = (int) $this->option('chunk');
        $dryRun    = $this->option('dry-run');

        if (! file_exists($filePath)) {
            $this->error("Fayl tapılmadı: {$filePath}");
            return 1;
        }

        if ($dryRun) {
            $this->warn('[DRY-RUN] DB-yə heç nə yazılmayacaq.');
        }

        $this->info('Cache yüklənir...');
        $this->loadCaches();
        $this->info(count($this->schoolMap) . ' məktəb, ' . count($this->subjectMap) . ' fənn cache-ə yükləndi.');

        // ── CSV oxu ──────────────────────────────────────────────────────────
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            $this->error("Fayl açıla bilmədi.");
            return 1;
        }

        $firstLine = fgets($handle);
        $firstLine = ltrim($firstLine, "\xEF\xBB\xBF");
        $headers   = str_getcsv(trim($firstLine));

        // Bütün sətirləri oxu (10k sətir — RAM-a sığır)
        $allRows = [];
        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);
            if ($trimmed === '') continue;
            $row = str_getcsv($trimmed);
            if (count($row) < 6) continue;
            $data = array_combine($headers, array_pad($row, count($headers), ''));
            $allRows[] = $data;
        }
        fclose($handle);

        $this->info('Cəmi sətir: ' . count($allRows));

        // ── Müəllimə görə qruplaşdır ─────────────────────────────────────────
        // Hər unikal utis_code = bir müəllim, birdən çox workplace ola bilər
        $grouped = []; // utis_code => [row1, row2, ...]
        foreach ($allRows as $row) {
            $utis = trim($row['utis_code *'] ?? '');
            if ($utis === '' || ! ctype_digit($utis)) {
                $this->recordFail($row, 'Yanlış/boş UTİS kod: ' . $utis);
                continue;
            }
            $grouped[$utis][] = $row;
        }

        $this->info('Unikal müəllim: ' . count($grouped));
        $this->newLine();

        // ── Chunk ilə işlə ───────────────────────────────────────────────────
        $teachers = array_keys($grouped);
        $total    = count($teachers);
        $done     = 0;

        foreach (array_chunk($teachers, $chunkSize) as $chunkKeys) {
            foreach ($chunkKeys as $utis) {
                $this->processTeacher($utis, $grouped[$utis], $dryRun);
                $done++;
            }

            if ($done % 1000 === 0 || $done === $total) {
                $mem = round(memory_get_usage(true) / 1024 / 1024, 1);
                $this->info("  {$done}/{$total} müəllim | +{$this->usersCreated} yeni | ~{$this->usersUpdated} yeniləndi | {$this->wpCreated} iş yeri | {$this->skipped} xəta | RAM: {$mem}MB");
            }
        }

        // ── Nəticə ───────────────────────────────────────────────────────────
        $this->newLine();
        $this->info('════════════════════════════════════════');
        $this->info("  Cəmi müəllim       : {$total}");
        $this->info("  User yaradıldı     : {$this->usersCreated}");
        $this->info("  User yeniləndi     : {$this->usersUpdated}");
        $this->info("  İş yeri yaradıldı  : {$this->wpCreated}");
        $this->info("  İş yeri yeniləndi  : {$this->wpUpdated}");
        $this->info("  Xəta / keçildi     : {$this->skipped}");
        $this->info('════════════════════════════════════════');

        // ── Xətalı CSV ───────────────────────────────────────────────────────
        $failedPath = dirname($filePath) . '/failed_teachers.csv';
        $this->writeFailed($failedPath, $headers);
        $this->info("Xətalı CSV: {$failedPath} (" . count($this->failed) . ' sətir)');

        return 0;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function processTeacher(string $utis, array $rows, bool $dryRun): void
    {
        // İlk sətir əsas məlumat mənbəyidir
        $main = $rows[0];

        $firstName = trim($main['first_name *'] ?? '');
        $lastName  = trim($main['last_name *']  ?? '');
        $email     = trim($main['email *']      ?? '');
        $username  = trim($main['username *']   ?? '');
        $rawPass   = trim($main['password *']   ?? '');

        if ($firstName === '' || $lastName === '') {
            $this->recordFail($main, 'Ad və ya soyad boşdur');
            return;
        }

        // ── İş yerləri üçün məktəb ID-lərini topla ───────────────────────────
        $workplaces = [];
        foreach ($rows as $row) {
            $instCode = trim($row['institution_code'] ?? '');
            if ($instCode === '' || ! isset($this->schoolMap[$instCode])) {
                // Institution tapılmadısa bu sətiri xətalı say, amma müəllimi bloklama
                if ($instCode !== '') {
                    $this->recordFail($row, "Məktəb tapılmadı (institution_code: {$instCode})");
                }
                continue;
            }
            $workplaces[] = [
                'institution_id' => $this->schoolMap[$instCode],
                'position_type'  => $this->mapPosition(trim($row['position_type *'] ?? '')),
                'start_date'     => $this->parseDate(trim($row['contract_start_date'] ?? '')),
                'end_date'       => $this->parseDate(trim($row['contract_end_date']   ?? '')),
                'subjects_raw'   => trim($row['main_subject'] ?? ''),
            ];
        }

        // Heç bir valid iş yeri yoxdursa müəllimi xətalı say
        if (empty($workplaces)) {
            $this->recordFail($main, 'Heç bir tanınan məktəb tapılmadı');
            return;
        }

        if ($dryRun) {
            $this->usersCreated++;
            $this->wpCreated += count($workplaces);
            return;
        }

        try {
            DB::transaction(function () use ($utis, $firstName, $lastName, $email, $username, $rawPass, $main, $workplaces) {

                // ── 1. User upsert ────────────────────────────────────────────
                $primaryInstitutionId = $workplaces[0]['institution_id'];
                $primaryPosition      = $workplaces[0]['position_type'];

                $existing = DB::table('users')->where('utis_code', $utis)->whereNull('deleted_at')->first();

                if ($existing) {
                    DB::table('users')->where('id', $existing->id)->update([
                        'first_name'     => $firstName,
                        'last_name'      => $lastName,
                        'institution_id' => $primaryInstitutionId,
                        'updated_at'     => now(),
                    ]);
                    $userId = $existing->id;
                    $this->usersUpdated++;
                } else {
                    // Email / username unikallığı
                    $safeEmail    = $this->resolveEmail($email, $utis);
                    $safeUsername = $this->resolveUsername($username ?: $utis);

                    $userId = DB::table('users')->insertGetId([
                        'utis_code'               => $utis,
                        'first_name'              => $firstName,
                        'last_name'               => $lastName,
                        'email'                   => $safeEmail,
                        'username'                => $safeUsername,
                        'password'                => Hash::make($rawPass ?: 'Pass-' . $utis),
                        'institution_id'          => $primaryInstitutionId,
                        'is_active'               => true,
                        'email_verified_at'       => now(),
                        'password_changed_at'     => now(),
                        'failed_login_attempts'   => 0,
                        'password_change_required'=> false,
                        'departments'             => '[]',
                        'created_at'              => now(),
                        'updated_at'              => now(),
                    ]);
                    $this->usersCreated++;
                }

                // ── 2. Rol təyin et ──────────────────────────────────────────
                $roleName = self::ROLE_MAP[$primaryPosition] ?? 'müəllim';
                $roleId   = $this->roleMap[$roleName] ?? $this->roleMap['müəllim'];

                DB::table('model_has_roles')->updateOrInsert(
                    ['model_type' => 'App\\Models\\User', 'model_id' => $userId],
                    ['role_id' => $roleId]
                );

                // ── 3. Teacher profile upsert ─────────────────────────────────
                $phone      = trim($main['contact_phone']        ?? '');
                $specialty  = trim($main['specialty']            ?? '');
                $mainSubj   = trim($main['main_subject']         ?? '');
                $eduLevel   = trim($main['education_level']      ?? '');
                $gradUni    = trim($main['graduation_university'] ?? '');
                $gradYear   = trim($main['graduation_year']      ?? '');
                $notes      = trim($main['notes']                ?? '');
                $patronymic = trim($main['patronymic *']         ?? '');

                // Subject ID: main_subject-in ilk elementi
                $subjectId  = null;
                if ($mainSubj !== '') {
                    $firstSubj = trim(explode(',', $mainSubj)[0]);
                    $subjectId = $this->subjectMap[$firstSubj] ?? null;
                }

                $qualifications = [];
                if ($eduLevel !== '')  $qualifications['education_level']      = $eduLevel;
                if ($gradUni  !== '')  $qualifications['graduation_university'] = $gradUni;
                if ($gradYear !== '')  $qualifications['graduation_year']       = $gradYear;
                if ($patronymic !== '') $qualifications['patronymic']           = $patronymic;

                $profileData = [
                    'phone'          => $phone   ?: null,
                    'specialization' => $specialty ? mb_substr($specialty, 0, 191) : null,
                    'subject'        => $mainSubj  ? mb_substr($mainSubj,  0, 191) : null,
                    'subject_id'     => $subjectId,
                    'institution_id' => $primaryInstitutionId,
                    'status'         => 'approved',
                    'bio'            => $notes     ?: null,
                    'qualifications' => ! empty($qualifications) ? json_encode($qualifications) : null,
                    'updated_at'     => now(),
                ];

                $existingProfile = DB::table('teacher_profiles')->where('user_id', $userId)->first();
                if ($existingProfile) {
                    DB::table('teacher_profiles')->where('user_id', $userId)->update($profileData);
                } else {
                    DB::table('teacher_profiles')->insert(array_merge($profileData, [
                        'user_id'    => $userId,
                        'experience_years' => 0,
                        'created_at' => now(),
                    ]));
                }

                // ── 4. Teacher workplaces upsert ─────────────────────────────
                foreach ($workplaces as $i => $wp) {
                    $priority = self::WP_PRIORITY[$i] ?? 'secondary';

                    $existingWp = DB::table('teacher_workplaces')
                        ->where('user_id', $userId)
                        ->where('institution_id', $wp['institution_id'])
                        ->whereNull('deleted_at')
                        ->first();

                    $wpData = [
                        'position_type'      => $wp['position_type'],
                        'employment_type'    => 'full_time',
                        'workplace_priority' => $priority,
                        'start_date'         => $wp['start_date'],
                        'end_date'           => $wp['end_date'],
                        'status'             => 'active',
                        'subjects'           => $wp['subjects_raw'] !== '' ? json_encode([$wp['subjects_raw']]) : null,
                        'updated_at'         => now(),
                    ];

                    if ($existingWp) {
                        DB::table('teacher_workplaces')->where('id', $existingWp->id)->update($wpData);
                        $this->wpUpdated++;
                    } else {
                        try {
                            DB::table('teacher_workplaces')->insert(array_merge($wpData, [
                                'user_id'        => $userId,
                                'institution_id' => $wp['institution_id'],
                                'salary_currency'=> 'AZN',
                                'created_at'     => now(),
                            ]));
                            $this->wpCreated++;
                        } catch (\Throwable $e) {
                            // unique_teacher_workplace constraint: eyni priority mövcuddursa növbətisinə keç
                            $nextPriority = self::WP_PRIORITY[$i + 1] ?? null;
                            if ($nextPriority) {
                                DB::table('teacher_workplaces')->insert(array_merge($wpData, [
                                    'user_id'            => $userId,
                                    'institution_id'     => $wp['institution_id'],
                                    'workplace_priority' => $nextPriority,
                                    'salary_currency'    => 'AZN',
                                    'created_at'         => now(),
                                ]));
                                $this->wpCreated++;
                            }
                        }
                    }
                }
            });
        } catch (\Throwable $e) {
            $this->recordFail($main, 'DB xətası: ' . $e->getMessage());
        }
    }

    // ── Köməkçi metodlar ─────────────────────────────────────────────────────

    private function mapPosition(string $raw): string
    {
        $lower = mb_strtolower(trim($raw));
        foreach (self::POSITION_MAP as $key => $val) {
            if (str_starts_with($lower, $key)) {
                return $val;
            }
        }
        return 'muəllim';
    }

    private function parseDate(string $value): ?string
    {
        if ($value === '') return null;
        if (preg_match('#^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$#', $value, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }
        if (preg_match('#^\d{4}-\d{2}-\d{2}$#', $value)) {
            return $value;
        }
        return null;
    }

    private function resolveEmail(string $email, string $utis): string
    {
        if ($email !== '' && ! DB::table('users')->where('email', $email)->exists()) {
            return $email;
        }
        return $utis . '@teacher.atis.local';
    }

    private function resolveUsername(string $base): string
    {
        $candidate = $base;
        $i = 1;
        while (DB::table('users')->where('username', $candidate)->exists()) {
            $candidate = $base . '_' . $i++;
        }
        return $candidate;
    }

    private function loadCaches(): void
    {
        $this->schoolMap = DB::table('institutions')
            ->where('level', 4)
            ->whereNotNull('institution_code')
            ->pluck('id', 'institution_code')
            ->toArray();

        $this->roleMap = DB::table('roles')
            ->pluck('id', 'name')
            ->toArray();

        $this->subjectMap = DB::table('subjects')
            ->where('is_active', true)
            ->pluck('id', 'name')
            ->toArray();
    }

    private function recordFail(array $row, string $reason): void
    {
        $this->failed[] = array_merge($row, ['xeta_sebeb' => $reason]);
        $this->skipped++;
    }

    private function writeFailed(string $path, array $headers): void
    {
        $allHeaders = array_merge($headers, ['xeta_sebeb']);
        $fp = fopen($path, 'w');
        fprintf($fp, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv($fp, $allHeaders);
        foreach ($this->failed as $row) {
            $line = [];
            foreach ($allHeaders as $h) {
                $line[] = $row[$h] ?? '';
            }
            fputcsv($fp, $line);
        }
        fclose($fp);
    }
}
