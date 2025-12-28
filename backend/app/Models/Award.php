<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Award Model - Teacher Awards
 */
class Award extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'award_type_id',
        'year_received',
        'issuer',
        'description',
        'document_path',
    ];

    protected $casts = [
        'year_received' => 'integer',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class, 'teacher_id');
    }

    public function awardType(): BelongsTo
    {
        return $this->belongsTo(AwardType::class);
    }

    public function scopeByYear($query, int $year)
    {
        return $query->where('year_received', $year);
    }
}
