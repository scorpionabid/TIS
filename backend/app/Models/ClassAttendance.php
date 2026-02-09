<?php

namespace App\Models;

use App\Models\Traits\HasTeacher;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassAttendance extends Model
{
    use HasFactory, HasTeacher;

    protected $table = 'class_attendance';

    protected $fillable = [
        'class_id',
        'subject_id',
        'teacher_id',
        'attendance_date',
        'period_number',
        'start_time',
        'end_time',
        'total_students_registered',
        'students_present',
        'students_absent_excused',
        'students_absent_unexcused',
        'students_late',
        'lesson_status',
        'notes',
        'attendance_metadata',
        'approval_status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'attendance_metadata' => 'array',
        'approved_at' => 'datetime',
    ];

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
