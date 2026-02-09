<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasActiveScope
{
    /**
     * Scope for active records.
     *
     * Override $activeColumn and $activeValue in model for custom behavior.
     * Default: where('is_active', true)
     * Example override: protected string $activeColumn = 'status'; protected $activeValue = 'active';
     */
    public function scopeActive(Builder $query): Builder
    {
        $column = property_exists($this, 'activeColumn') ? $this->activeColumn : 'is_active';
        $value = property_exists($this, 'activeValue') ? $this->activeValue : true;

        return $query->where($column, $value);
    }

    public function scopeInactive(Builder $query): Builder
    {
        $column = property_exists($this, 'activeColumn') ? $this->activeColumn : 'is_active';
        $value = property_exists($this, 'activeValue') ? $this->activeValue : true;

        if ($value === true) {
            return $query->where($column, false);
        }

        return $query->where($column, '!=', $value);
    }
}
