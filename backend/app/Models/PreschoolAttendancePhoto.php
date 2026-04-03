<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreschoolAttendancePhoto extends Model
{
    protected $table = 'preschool_attendance_photos';

    protected $fillable = [
        'preschool_attendance_id',
        'institution_id',
        'uploaded_by',
        'photo_date',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size_bytes',
    ];

    protected $casts = [
        'photo_date' => 'date',
        'file_size_bytes' => 'integer',
    ];

    // --- Relationships ---
    public function attendance(): BelongsTo
    {
        return $this->belongsTo(PreschoolAttendance::class, 'preschool_attendance_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // --- Scopes ---
    public function scopeOlderThan($query, int $days)
    {
        return $query->where('photo_date', '<', now()->subDays($days)->toDateString());
    }
}
