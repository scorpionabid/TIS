<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Upload extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'entity_type',
        'entity_id',
        'original_filename',
        'stored_filename',
        'file_path',
        'file_type',
        'file_size',
        'mime_type',
        'is_public',
        'metadata',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'is_public' => 'boolean',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user who uploaded this file.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the owning entity.
     */
    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Check if file exists on disk.
     */
    public function exists(): bool
    {
        return file_exists($this->file_path);
    }

    /**
     * Get file extension.
     */
    public function getExtensionAttribute(): string
    {
        return pathinfo($this->original_filename, PATHINFO_EXTENSION);
    }

    /**
     * Get file size in human readable format.
     */
    public function getFileSizeHumanAttribute(): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $this->file_size > 0 ? floor(log($this->file_size, 1024)) : 0;
        return number_format($this->file_size / pow(1024, $power), 2) . ' ' . $units[$power];
    }

    /**
     * Check if file is an image.
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Check if file is a document.
     */
    public function isDocument(): bool
    {
        $documentMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];

        return in_array($this->mime_type, $documentMimes);
    }

    /**
     * Check if file is a video.
     */
    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }

    /**
     * Check if file is an audio.
     */
    public function isAudio(): bool
    {
        return str_starts_with($this->mime_type, 'audio/');
    }

    /**
     * Get file icon based on type.
     */
    public function getIconAttribute(): string
    {
        if ($this->isImage()) {
            return 'image';
        }

        if ($this->isDocument()) {
            return 'document';
        }

        if ($this->isVideo()) {
            return 'video';
        }

        if ($this->isAudio()) {
            return 'audio';
        }

        return 'file';
    }

    /**
     * Delete file from disk.
     */
    public function deleteFile(): bool
    {
        if ($this->exists()) {
            return unlink($this->file_path);
        }

        return true;
    }

    /**
     * Scope to get uploads by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get uploads by entity.
     */
    public function scopeByEntity($query, string $entityType, int $entityId)
    {
        return $query->where('entity_type', $entityType)
                    ->where('entity_id', $entityId);
    }

    /**
     * Scope to get public uploads.
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope to get uploads by file type.
     */
    public function scopeByFileType($query, string $fileType)
    {
        return $query->where('file_type', $fileType);
    }

    /**
     * Scope to get images.
     */
    public function scopeImages($query)
    {
        return $query->where('mime_type', 'LIKE', 'image/%');
    }

    /**
     * Scope to get documents.
     */
    public function scopeDocuments($query)
    {
        return $query->whereIn('mime_type', [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ]);
    }

    /**
     * Scope to search by filename.
     */
    public function scopeSearchByFilename($query, string $search)
    {
        return $query->where('original_filename', 'ILIKE', "%{$search}%");
    }
}