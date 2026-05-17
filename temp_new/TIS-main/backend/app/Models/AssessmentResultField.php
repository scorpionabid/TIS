<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentResultField extends Model
{
    use HasFactory;

    protected $fillable = [
        'assessment_type_id',
        'field_key',
        'label',
        'input_type',
        'scope',
        'aggregation',
        'is_required',
        'options',
        'display_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'options' => 'array',
    ];

    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }
}
