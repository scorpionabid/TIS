<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FolderShareLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'document_collection_id',
        'token',
        'expires_at',
        'can_upload',
        'can_view',
        'max_uploads',
        'current_uploads',
        'created_by',
        'is_active'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'can_upload' => 'boolean',
        'can_view' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = (string) Str::uuid();
            if (empty($model->token)) {
                $model->token = Str::random(32);
            }
        });
    }

    public function folder()
    {
        return $this->belongsTo(DocumentCollection::class, 'document_collection_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isValid(): bool
    {
        return $this->is_active && $this->expires_at->isFuture();
    }
}
