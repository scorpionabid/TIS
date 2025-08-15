<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class ReportSchedule extends Model
{
    protected $fillable = [
        'name',
        'description',
        'report_type',
        'frequency',
        'format',
        'recipients',
        'filters',
        'time',
        'day_of_week',
        'day_of_month',
        'next_run',
        'last_run',
        'status',
        'created_by'
    ];

    protected $casts = [
        'recipients' => 'array',
        'filters' => 'array',
        'next_run' => 'datetime',
        'last_run' => 'datetime',
        'day_of_week' => 'integer',
        'day_of_month' => 'integer'
    ];

    /**
     * Get the user who created this schedule
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if the report is due to run
     */
    public function isDue(): bool
    {
        return $this->status === 'active' && 
               $this->next_run && 
               $this->next_run <= now();
    }

    /**
     * Mark as completed and calculate next run
     */
    public function markCompleted(): void
    {
        $this->update([
            'last_run' => now(),
            'next_run' => $this->calculateNextRun()
        ]);
    }

    /**
     * Calculate the next run time based on frequency
     */
    private function calculateNextRun(): Carbon
    {
        $now = now();
        [$hour, $minute] = explode(':', $this->time);

        switch ($this->frequency) {
            case 'daily':
                $next = $now->copy()->addDay()->setTime($hour, $minute);
                break;
            case 'weekly':
                $next = $now->copy()->next($this->day_of_week ?? 0)->setTime($hour, $minute);
                break;
            case 'monthly':
                $next = $now->copy()->addMonth()->startOfMonth()
                    ->addDays(($this->day_of_month ?? 1) - 1)
                    ->setTime($hour, $minute);
                break;
            case 'quarterly':
                $next = $now->copy()->addQuarter()->firstOfQuarter()
                    ->addDays(($this->day_of_month ?? 1) - 1)
                    ->setTime($hour, $minute);
                break;
            default:
                $next = $now->copy()->addDay();
        }

        return $next;
    }

    /**
     * Get active schedules that are due
     */
    public static function getDueSchedules()
    {
        return self::where('status', 'active')
            ->where('next_run', '<=', now())
            ->get();
    }

    /**
     * Pause the schedule
     */
    public function pause(): void
    {
        $this->update(['status' => 'paused']);
    }

    /**
     * Resume the schedule
     */
    public function resume(): void
    {
        $this->update([
            'status' => 'active',
            'next_run' => $this->calculateNextRun()
        ]);
    }

    /**
     * Get frequency display name
     */
    public function getFrequencyDisplayAttribute(): string
    {
        $frequencies = [
            'daily' => 'Günlük',
            'weekly' => 'Həftəlik',
            'monthly' => 'Aylıq',
            'quarterly' => 'Rüblük'
        ];

        return $frequencies[$this->frequency] ?? $this->frequency;
    }

    /**
     * Get status display name
     */
    public function getStatusDisplayAttribute(): string
    {
        $statuses = [
            'active' => 'Aktiv',
            'paused' => 'Dayandırılmış',
            'disabled' => 'Deaktiv'
        ];

        return $statuses[$this->status] ?? $this->status;
    }
}