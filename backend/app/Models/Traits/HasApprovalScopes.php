<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasApprovalScopes
{
    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }
}
