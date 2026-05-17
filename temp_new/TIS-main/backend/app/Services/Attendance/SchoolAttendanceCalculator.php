<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use Illuminate\Support\Collection;

/**
 * Pure-calculation helpers for school-level attendance data.
 *
 * Centralises the repeated "effective present" business rule and all
 * derived rate calculations so they live in exactly one place.
 *
 * Business rule (effective present):
 *   present = 0  AND  excused = 0  AND  unexcused = 0  AND  recorded_at IS NOT NULL
 *   → teacher made no changes → everyone was present → effective = total_students
 */
class SchoolAttendanceCalculator
{
    /**
     * Resolve the effective morning/evening counts and session flags for one record.
     *
     * @return array{effMorning: int, effEvening: int, hasMorning: bool, hasEvening: bool}
     */
    public function effectiveCounts(ClassBulkAttendance $record): array
    {
        $total = (int) $record->total_students;
        $morning = (int) $record->morning_present;
        $evening = (int) $record->evening_present;

        $hasMorning = $record->morning_recorded_at !== null;
        $hasEvening = $record->evening_recorded_at !== null;

        $noMorningChanges = $morning === 0
            && (int) $record->morning_excused === 0
            && (int) $record->morning_unexcused === 0
            && $hasMorning;

        $noEveningChanges = $evening === 0
            && (int) $record->evening_excused === 0
            && (int) $record->evening_unexcused === 0
            && $hasEvening;

        return [
            'effMorning' => ($noMorningChanges && $total > 0) ? $total : $morning,
            'effEvening' => ($noEveningChanges && $total > 0) ? $total : $evening,
            'hasMorning' => $hasMorning,
            'hasEvening' => $hasEvening,
        ];
    }

    /**
     * Calculate the effective attendance rate for a single ClassBulkAttendance record.
     *
     * Uses the "no-changes = everyone present" business rule.
     * Always recalculates from raw values (stored daily_attendance_rate may be stale).
     */
    public function effectiveRate(ClassBulkAttendance $record): float
    {
        $total = (int) $record->total_students;
        if ($total <= 0) {
            return 0.0;
        }

        ['effMorning' => $em, 'effEvening' => $ee, 'hasMorning' => $hm, 'hasEvening' => $he]
            = $this->effectiveCounts($record);

        if ($hm && $he) {
            return round((($em + $ee) / 2 / $total) * 100, 2);
        }

        if ($hm) {
            return round(($em / $total) * 100, 2);
        }

        if ($he) {
            return round(($ee / $total) * 100, 2);
        }

        return 0.0;
    }

    /**
     * Sum the effective present count (morning + evening) for a single record.
     */
    public function effectivePresentTotal(ClassBulkAttendance $record): int
    {
        $total = (int) $record->total_students;
        if ($total <= 0) {
            return 0;
        }

        ['effMorning' => $em, 'effEvening' => $ee, 'hasMorning' => $hm, 'hasEvening' => $he]
            = $this->effectiveCounts($record);

        return ($hm ? $em : 0) + ($he ? $ee : 0);
    }

    /**
     * Calculate the weighted average attendance rate across a collection.
     *
     * Weight = total_students per record (larger classes count more).
     */
    public function weightedRate(Collection $records): float
    {
        $weightedSum = $records->sum(
            fn (ClassBulkAttendance $r) => $this->effectiveRate($r) * max((int) $r->total_students, 1)
        );
        $denominator = max((int) $records->sum('total_students'), 1);

        return round($weightedSum / $denominator, 2);
    }

    /**
     * Calculate uniform-violation and compliance rates.
     *
     * @return array{violations: int, violation_rate: float, compliance_rate: float}
     */
    public function uniformStats(int $presentTotal, int $violations): array
    {
        if ($presentTotal <= 0) {
            return ['violations' => $violations, 'violation_rate' => 0.0, 'compliance_rate' => 0.0];
        }

        $violations = min($violations, $presentTotal);
        $rate = round(($violations / $presentTotal) * 100, 2);

        return [
            'violations' => $violations,
            'violation_rate' => $rate,
            'compliance_rate' => round(100 - $rate, 2),
        ];
    }

    /**
     * Simple attendance rate from end/start counts (for legacy SchoolAttendance model).
     */
    public function simpleRate(int $end, int $start): float
    {
        return $start > 0 ? round(($end / $start) * 100, 2) : 0.0;
    }

    /**
     * Build combined notes text for morning/evening sessions.
     */
    public function formatBulkNotes(?string $morningNotes, ?string $eveningNotes): ?string
    {
        $notes = collect([
            $morningNotes ? 'İlk dərs: ' . $morningNotes : null,
            $eveningNotes ? 'Son dərs: ' . $eveningNotes : null,
        ])->filter();

        return $notes->isEmpty() ? null : $notes->implode(' | ');
    }
}
