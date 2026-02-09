<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasTypeScope
{
    /**
     * Scope by type.
     *
     * Override $typeColumn in model for custom column name.
     * Default: where('type', $type)
     * Example override: protected string $typeColumn = 'department_type';
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        $column = property_exists($this, 'typeColumn') ? $this->typeColumn : 'type';

        return $query->where($column, $type);
    }
}
