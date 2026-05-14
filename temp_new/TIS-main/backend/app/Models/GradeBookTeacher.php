<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeBookTeacher extends Model
{
    use HasFactory;

    protected $table = 'grade_book_teachers';

    protected $fillable = [
        'grade_book_session_id',
        'teacher_id',
        'group_label',
        'is_primary',
        'assigned_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(GradeBookSession::class, 'grade_book_session_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function scopeForGroup($query, ?string $groupLabel)
    {
        return $query->where('group_label', $groupLabel);
    }

    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }
}
