<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNote extends Model
{
    protected $fillable = ['user_id', 'text', 'color'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
