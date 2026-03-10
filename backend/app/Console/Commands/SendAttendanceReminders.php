<?php

namespace App\Console\Commands;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Davamiyyət qeyd edilməmiş məktəblərin schooladmin-lərinə günlük xatırlatma göndərir.
 *
 * Məntiqi:
 *  1. Bugün aktiv tədris günüdür (iş həftəsi yoxlanılır)
 *  2. Saat konfiqurasiya (default: 10:00) keçibsə işlər
 *  3. Bu gün üçün ClassBulkAttendance.morning_recorded_at = null olan siniflər tapılır
 *  4. Həmin sinifin məktəbinin schooladmin-lərinə notification göndərilir
 *  5. Bu gün artıq göndərilib-göndərilmədiyini yoxlayır (duplicate prevention)
 */
class SendAttendanceReminders extends Command
{
    protected $signature = 'attendance:send-reminders
                            {--dry-run : Yalnız nə göndəriləcəyini göstər, faktiki göndərmə}
                            {--date= : Tarix (Y-m-d, default: bugün)}
                            {--school= : Yalnız bu institution_id üçün işlər}';

    protected $description = 'Davamiyyət qeyd edilməmiş məktəblərin schooladmin-lərinə xatırlatma göndər';

    public function __construct(
        private readonly NotificationService $notificationService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $dateStr  = $this->option('date');
        $date     = $dateStr ? Carbon::parse($dateStr) : Carbon::today();
        $onlySchool = $this->option('school') ? (int) $this->option('school') : null;

        // İş günü yoxla (1=Bazar ertəsi ... 5=Cümə)
        if (! $isDryRun && ! in_array($date->dayOfWeek, [1, 2, 3, 4, 5], true)) {
            $this->info("Bugün iş günü deyil ({$date->format('l')}), xatırlatma göndərilmir.");
            return Command::SUCCESS;
        }

        $this->info("Davamiyyət xatırlatması: {$date->toDateString()}" . ($isDryRun ? ' [DRY-RUN]' : ''));

        // Aktiv məktəbləri tap (type = 'school' yaxud altında siniflər olanlar)
        $schoolQuery = Institution::query()
            ->whereIn('type', ['school', 'məktəb', 'secondary_school'])
            ->where('is_active', true);

        if ($onlySchool) {
            $schoolQuery->where('id', $onlySchool);
        }

        $schools = $schoolQuery->get();
        $this->info("Cəmi {$schools->count()} aktiv məktəb tapıldı.");

        $sentCount  = 0;
        $skipCount  = 0;

        foreach ($schools as $school) {
            // Bu məktəbdə bu gün üçün qeyd edilməmiş sinif varmı?
            $unrecordedCount = $this->getUnrecordedClassCount($school->id, $date);

            if ($unrecordedCount === 0) {
                $skipCount++;
                continue;
            }

            // Bu gün bu məktəb üçün artıq notification göndərilibmi?
            if (! $isDryRun && $this->alreadySentToday($school->id, $date)) {
                $this->line("  Skip (artıq göndərilib): {$school->name}");
                $skipCount++;
                continue;
            }

            // SchoolAdmin-ləri tap
            $adminIds = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['schooladmin', 'məktəbadmin']))
                ->where('institution_id', $school->id)
                ->pluck('id')
                ->toArray();

            if (empty($adminIds)) {
                $this->line("  Skip (schooladmin yoxdur): {$school->name}");
                $skipCount++;
                continue;
            }

            $this->line("  Göndərilir: {$school->name} ({$unrecordedCount} sinif, " . count($adminIds) . " admin)");

            if (! $isDryRun) {
                foreach ($adminIds as $userId) {
                    try {
                        $this->notificationService->send([
                            'user_id'  => $userId,
                            'title'    => 'Davamiyyət qeyd edilməyib',
                            'message'  => sprintf(
                                "%s tarixinə aid %d sinifin davamiyyəti hələ qeyd edilməyib. Zəhmət olmasa qeyd edin.",
                                $date->format('d.m.Y'),
                                $unrecordedCount
                            ),
                            'type'     => 'attendance_reminder',
                            'channel'  => 'in_app',
                            'priority' => 'high',
                            'metadata' => [
                                'institution_id'    => $school->id,
                                'institution_name'  => $school->name,
                                'date'              => $date->toDateString(),
                                'unrecorded_count'  => $unrecordedCount,
                                'action_url'        => '/attendance',
                            ],
                        ]);

                        $sentCount++;
                    } catch (\Throwable $e) {
                        Log::warning('SendAttendanceReminders: notification göndərilmədi', [
                            'school_id' => $school->id,
                            'user_id'   => $userId,
                            'error'     => $e->getMessage(),
                        ]);
                    }
                }
            } else {
                // Dry-run: say
                $sentCount += count($adminIds);
            }
        }

        $this->info("Nəticə: {$sentCount} notification göndərildi, {$skipCount} məktəb skip edildi.");

        return Command::SUCCESS;
    }

    /**
     * Bu məktəbdə bu gün üçün davamiyyəti qeyd edilməmiş sinif sayını qaytarır.
     */
    private function getUnrecordedClassCount(int $institutionId, Carbon $date): int
    {
        // ClassBulkAttendance üzərindən yoxla
        // morning_recorded_at null-dursa, həmin gün davamiyyət qeyd edilməyib
        $recorded = ClassBulkAttendance::where('institution_id', $institutionId)
            ->whereDate('attendance_date', $date->toDateString())
            ->whereNotNull('morning_recorded_at')
            ->count();

        // Məktəbdəki aktiv sinif sayı
        $totalClasses = Grade::where('institution_id', $institutionId)
            ->where('is_active', true)
            ->count();

        return max(0, $totalClasses - $recorded);
    }

    /**
     * Bu gün bu məktəb üçün artıq attendance_reminder göndərilibmi?
     */
    private function alreadySentToday(int $institutionId, Carbon $date): bool
    {
        return Notification::where('type', 'attendance_reminder')
            ->whereDate('created_at', $date->toDateString())
            ->whereJsonContains('metadata->institution_id', $institutionId)
            ->exists();
    }
}
