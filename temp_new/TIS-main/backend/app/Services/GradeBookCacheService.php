<?php

namespace App\Services;

use App\Models\GradeBookSession;
use Illuminate\Support\Facades\Cache;

class GradeBookCacheService
{
    protected const CACHE_TTL = 300; // 5 minutes

    protected const CACHE_PREFIX = 'gradebook:';

    /**
     * Get cached grade book data
     */
    public function getGradeBook(int $sessionId): ?array
    {
        return Cache::get($this->getKey('session', $sessionId));
    }

    /**
     * Cache grade book data
     */
    public function cacheGradeBook(int $sessionId, array $data): void
    {
        Cache::put($this->getKey('session', $sessionId), $data, self::CACHE_TTL);
    }

    /**
     * Clear grade book cache
     */
    public function clearGradeBookCache(int $sessionId): void
    {
        Cache::forget($this->getKey('session', $sessionId));
        Cache::forget($this->getKey('students', $sessionId));
        Cache::forget($this->getKey('calculated', $sessionId));
    }

    /**
     * Get cached students with scores
     */
    public function getStudentsWithScores(int $sessionId): ?array
    {
        return Cache::get($this->getKey('students', $sessionId));
    }

    /**
     * Cache students with scores
     */
    public function cacheStudentsWithScores(int $sessionId, array $data): void
    {
        Cache::put($this->getKey('students', $sessionId), $data, self::CACHE_TTL);
    }

    /**
     * Get cached calculated scores
     */
    public function getCalculatedScores(int $studentId, int $sessionId): ?array
    {
        return Cache::get($this->getKey('calculated', "{$sessionId}:{$studentId}"));
    }

    /**
     * Cache calculated scores
     */
    public function cacheCalculatedScores(int $studentId, int $sessionId, array $scores): void
    {
        Cache::put(
            $this->getKey('calculated', "{$sessionId}:{$studentId}"),
            $scores,
            self::CACHE_TTL
        );
    }

    /**
     * Clear calculated scores cache for a student
     */
    public function clearCalculatedScores(int $studentId, int $sessionId): void
    {
        Cache::forget($this->getKey('calculated', "{$sessionId}:{$studentId}"));
    }

    /**
     * Get cached column data
     */
    public function getColumns(int $sessionId, ?string $semester = null): ?array
    {
        $key = $semester ? "columns:{$sessionId}:{$semester}" : "columns:{$sessionId}";

        return Cache::get($this->getKey('columns', $key));
    }

    /**
     * Cache column data
     */
    public function cacheColumns(int $sessionId, array $columns, ?string $semester = null): void
    {
        $key = $semester ? "columns:{$sessionId}:{$semester}" : "columns:{$sessionId}";
        Cache::put($this->getKey('columns', $key), $columns, self::CACHE_TTL);
    }

    /**
     * Clear all grade book related cache
     */
    public function clearAllGradeBookCache(int $sessionId): void
    {
        $this->clearGradeBookCache($sessionId);

        // Clear column caches
        Cache::forget($this->getKey('columns', "columns:{$sessionId}"));
        Cache::forget($this->getKey('columns', "columns:{$sessionId}:I"));
        Cache::forget($this->getKey('columns', "columns:{$sessionId}:II"));
    }

    /**
     * Remember callback result with caching
     */
    public function remember(string $key, callable $callback, ?int $ttl = null)
    {
        return Cache::remember($this->getKey('remember', $key), $ttl ?? self::CACHE_TTL, $callback);
    }

    /**
     * Generate cache key
     */
    protected function getKey(string $type, string $identifier): string
    {
        return self::CACHE_PREFIX . "{$type}:{$identifier}";
    }

    /**
     * Warm up cache for a grade book session
     */
    public function warmUpCache(int $sessionId): void
    {
        $gradeBook = GradeBookSession::with(['grade', 'subject', 'academicYear', 'columns', 'teachers.teacher'])
            ->find($sessionId);

        if (! $gradeBook) {
            return;
        }

        // Cache grade book data
        $this->cacheGradeBook($sessionId, $gradeBook->toArray());

        // Cache columns by semester
        $columnsBySemester = $gradeBook->columns->groupBy('semester');
        foreach (['I', 'II'] as $semester) {
            if ($columnsBySemester->has($semester)) {
                $this->cacheColumns($sessionId, $columnsBySemester[$semester]->toArray(), $semester);
            }
        }

        // Pre-cache calculated scores for all students
        $students = $gradeBook->grade->enrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id');

        foreach ($students as $studentId) {
            $scores = $this->calculateStudentScores($studentId, $sessionId);
            $this->cacheCalculatedScores($studentId, $sessionId, $scores);
        }
    }

    /**
     * Calculate student scores (helper for cache warmup)
     */
    protected function calculateStudentScores(int $studentId, int $sessionId): array
    {
        $service = app(GradeCalculationService::class);

        return [
            'i_semester' => $service->calculateSemesterScore($studentId, 'I', $sessionId),
            'ii_semester' => $service->calculateSemesterScore($studentId, 'II', $sessionId),
            'annual' => $service->calculateAnnualScore($studentId, $sessionId),
        ];
    }

    /**
     * Get cache statistics
     */
    public function getCacheStats(): array
    {
        // Note: This is a simplified version. In production, you might want to use Redis or other tools
        return [
            'prefix' => self::CACHE_PREFIX,
            'ttl' => self::CACHE_TTL,
            'driver' => config('cache.default'),
        ];
    }

    /**
     * Flush all grade book cache
     */
    public function flushAll(): void
    {
        if (config('cache.default') === 'redis') {
            // For Redis, we can use pattern matching
            // This is driver-specific optimization
        }

        // Generic approach: clear known keys
        // In production, consider using tags if supported by cache driver
    }
}
