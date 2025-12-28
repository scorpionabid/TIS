<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * CertificateType Model - Certificate Types Reference Table
 */
class CertificateType extends Model
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

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'certificate_type_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
