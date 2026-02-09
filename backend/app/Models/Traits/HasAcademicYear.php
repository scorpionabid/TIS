<?php

namespace App\Models\Traits;

use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasAcademicYear
{
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}