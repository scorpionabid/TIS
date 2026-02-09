<?php

namespace App\Models\Traits;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasInstitution
{
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
