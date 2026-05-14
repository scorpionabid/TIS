<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeBookAuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'grade_book_session_id',
        'student_id',
        'grade_book_column_id',
        'user_id',
        'action_type',
        'old_score',
        'new_score',
        'old_is_present',
        'new_is_present',
        'ip_address',
        'user_agent',
        'notes',
    ];

    protected $casts = [
        'old_score' => 'float',
        'new_score' => 'float',
        'old_is_present' => 'boolean',
        'new_is_present' => 'boolean',
    ];

    public function gradeBookSession(): BelongsTo
    {
        return $this->belongsTo(GradeBookSession::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function column(): BelongsTo
    {
        return $this->belongsTo(GradeBookColumn::class, 'grade_book_column_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for filtering by grade book session.
     */
    public function scopeForSession($query, int $sessionId)
    {
        return $query->where('grade_book_session_id', $sessionId);
    }

    /**
     * Scope for filtering by student.
     */
    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * Scope for filtering by action type.
     */
    public function scopeWithAction($query, string $action)
    {
        return $query->where('action_type', $action);
    }

    /**
     * Get audit log for a specific cell.
     */
    public static function getCellHistory(int $cellId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('grade_book_cell_id', $cellId)
            ->with(['user', 'student'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Log a cell update action.
     */
    public static function logCellUpdate(
        GradeBookCell $cell,
        int $userId,
        ?float $oldScore,
        float $newScore,
        ?bool $oldIsPresent = null,
        ?bool $newIsPresent = null,
        ?string $notes = null
    ): self {
        return self::create([
            'grade_book_session_id' => $cell->column->grade_book_session_id,
            'grade_book_column_id' => $cell->grade_book_column_id,
            'student_id' => $cell->student_id,
            'grade_book_cell_id' => $cell->id,
            'user_id' => $userId,
            'action_type' => 'update',
            'old_score' => $oldScore,
            'new_score' => $newScore,
            'old_is_present' => $oldIsPresent,
            'new_is_present' => $newIsPresent,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'notes' => $notes,
        ]);
    }

    /**
     * Log a cell create action.
     */
    public static function logCellCreate(
        GradeBookCell $cell,
        int $userId,
        ?string $notes = null
    ): self {
        return self::create([
            'grade_book_session_id' => $cell->column->grade_book_session_id,
            'grade_book_column_id' => $cell->grade_book_column_id,
            'student_id' => $cell->student_id,
            'grade_book_cell_id' => $cell->id,
            'user_id' => $userId,
            'action_type' => 'create',
            'new_score' => $cell->score,
            'new_is_present' => $cell->is_present,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'notes' => $notes,
        ]);
    }

    /**
     * Get change description.
     */
    public function getChangeDescription(): string
    {
        if ($this->action_type === 'create') {
            return sprintf('Bal daxil edildi: %s', $this->new_score ?? '-');
        }

        $old = $this->old_score ?? '-';
        $new = $this->new_score ?? '-';

        return sprintf('Bal dəyişdirildi: %s → %s', $old, $new);
    }
}
