<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAnalysisLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_role',
        'user_institution_id',
        'original_prompt',
        'clarifications',
        'enhanced_prompt',
        'generated_sql',
        'row_count',
        'execution_ms',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'from_cache',
        'status',
        'error_message',
        'ip_address',
    ];

    protected $casts = [
        'clarifications' => 'array',
        'from_cache' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
