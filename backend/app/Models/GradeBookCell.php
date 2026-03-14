<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeBookCell extends Model
{
    use HasFactory;

    protected $fillable = [
        'grade_book_column_id',
        'student_id',
        'teacher_id',
        'group_label',
        'score',
        'percentage',
        'grade_mark',
        'is_present',
        'notes',
        'recorded_by',
        'recorded_at',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'percentage' => 'decimal:2',
        'is_present' => 'boolean',
        'recorded_at' => 'datetime',
    ];

    public function column(): BelongsTo
    {
        return $this->belongsTo(GradeBookColumn::class, 'grade_book_column_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function calculatePercentage(): void
    {
        if ($this->score !== null && $this->column && $this->column->max_score > 0) {
            $this->percentage = ($this->score / $this->column->max_score) * 100;
        }
    }

    public function getGradeMark(): ?int
    {
        if ($this->score === null) {
            return null;
        }

        if ($this->score >= 80) return 5;
        if ($this->score >= 60) return 4;
        if ($this->score >= 30) return 3;
        return 2;
    }
}
