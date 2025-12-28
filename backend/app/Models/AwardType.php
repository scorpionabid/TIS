<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * AwardType Model - Award Types Reference Table
 */
class AwardType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'score_weight',
        'description',
        'is_active',
    ];

    protected $casts = [
        'score_weight' => 'float',
        'is_active' => 'boolean',
    ];

    public function awards(): HasMany
    {
        return $this->hasMany(Award::class, 'award_type_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
