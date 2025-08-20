<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class DocumentDownload extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'user_id',
        'document_share_id',
        'ip_address',
        'user_agent',
        'download_type',
        'file_size_downloaded',
        'download_completed',
        'download_method',
        'metadata',
    ];

    protected $casts = [
        'download_completed' => 'boolean',
        'metadata' => 'array',
    ];

    const DOWNLOAD_TYPES = [
        'direct' => 'Direct download by authenticated user',
        'shared_link' => 'Download via shared link',
        'preview' => 'Preview/view online',
        'api' => 'API download',
    ];

    /**
     * Document relationship
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * User relationship (nullable for anonymous downloads)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Document share relationship (for shared link downloads)
     */
    public function documentShare(): BelongsTo
    {
        return $this->belongsTo(DocumentShare::class);
    }

    /**
     * Scope: By download type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('download_type', $type);
    }

    /**
     * Scope: Completed downloads only
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('download_completed', true);
    }

    /**
     * Scope: By date range
     */
    public function scopeInDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Today's downloads
     */
    public function scopeToday(Builder $query): Builder
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope: This week's downloads
     */
    public function scopeThisWeek(Builder $query): Builder
    {
        return $query->whereBetween('created_at', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * Scope: This month's downloads
     */
    public function scopeThisMonth(Builder $query): Builder
    {
        return $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
    }

    /**
     * Get download type label
     */
    public function getDownloadTypeLabelAttribute(): string
    {
        return self::DOWNLOAD_TYPES[$this->download_type] ?? $this->download_type;
    }

    /**
     * Get formatted file size
     */
    public function getFormattedFileSizeAttribute(): string
    {
        if (!$this->file_size_downloaded) {
            return 'N/A';
        }

        $bytes = $this->file_size_downloaded;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    /**
     * Get user display name
     */
    public function getUserDisplayNameAttribute(): string
    {
        if ($this->user) {
            return $this->user->first_name . ' ' . $this->user->last_name;
        }

        if ($this->documentShare) {
            return 'Anonymous via shared link';
        }

        return 'Anonymous';
    }

    /**
     * Check if download is from mobile device
     */
    public function isMobileDownload(): bool
    {
        if (!$this->user_agent) {
            return false;
        }

        $mobileKeywords = ['Mobile', 'Android', 'iPhone', 'iPad', 'Windows Phone'];
        
        foreach ($mobileKeywords as $keyword) {
            if (strpos($this->user_agent, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get browser name from user agent
     */
    public function getBrowserName(): string
    {
        if (!$this->user_agent) {
            return 'Unknown';
        }

        $browsers = [
            'Chrome' => 'Chrome',
            'Firefox' => 'Firefox',
            'Safari' => 'Safari',
            'Edge' => 'Edge',
            'Opera' => 'Opera',
            'Internet Explorer' => 'MSIE|Trident',
        ];

        foreach ($browsers as $name => $pattern) {
            if (preg_match("/{$pattern}/i", $this->user_agent)) {
                return $name;
            }
        }

        return 'Unknown';
    }

    /**
     * Record download event
     */
    public static function recordDownload(
        Document $document,
        ?User $user = null,
        ?DocumentShare $documentShare = null,
        string $downloadType = 'direct',
        array $metadata = []
    ): self {
        $ipAddress = request()->ip() ?? '127.0.0.1';
        $userAgent = request()->header('User-Agent');

        return self::create([
            'document_id' => $document->id,
            'user_id' => $user?->id,
            'document_share_id' => $documentShare?->id,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'download_type' => $downloadType,
            'file_size_downloaded' => $document->file_size,
            'download_completed' => true,
            'download_method' => $metadata['method'] ?? 'browser',
            'metadata' => array_merge([
                'document_title' => $document->title,
                'document_version' => $document->version,
                'timestamp' => now()->toISOString(),
            ], $metadata),
        ]);
    }

    /**
     * Get download statistics for a document
     */
    public static function getDocumentStats(Document $document): array
    {
        $downloads = self::where('document_id', $document->id);

        return [
            'total_downloads' => $downloads->count(),
            'unique_users' => $downloads->whereNotNull('user_id')->distinct('user_id')->count(),
            'unique_ips' => $downloads->distinct('ip_address')->count(),
            'downloads_today' => $downloads->today()->count(),
            'downloads_this_week' => $downloads->thisWeek()->count(),
            'downloads_this_month' => $downloads->thisMonth()->count(),
            'by_type' => $downloads->selectRaw('download_type, COUNT(*) as count')
                                   ->groupBy('download_type')
                                   ->pluck('count', 'download_type')
                                   ->toArray(),
            'total_data_transferred' => $downloads->sum('file_size_downloaded'),
            'last_download' => $downloads->latest()->first()?->created_at,
            'most_active_user' => $downloads->whereNotNull('user_id')
                                           ->selectRaw('user_id, COUNT(*) as count')
                                           ->groupBy('user_id')
                                           ->orderByDesc('count')
                                           ->first(),
        ];
    }

    /**
     * Get user download statistics
     */
    public static function getUserStats(User $user): array
    {
        $downloads = self::where('user_id', $user->id);

        return [
            'total_downloads' => $downloads->count(),
            'unique_documents' => $downloads->distinct('document_id')->count(),
            'downloads_today' => $downloads->today()->count(),
            'downloads_this_week' => $downloads->thisWeek()->count(),
            'downloads_this_month' => $downloads->thisMonth()->count(),
            'total_data_downloaded' => $downloads->sum('file_size_downloaded'),
            'favorite_file_types' => $downloads->join('documents', 'documents.id', '=', 'document_downloads.document_id')
                                             ->selectRaw('documents.file_type, COUNT(*) as count')
                                             ->groupBy('documents.file_type')
                                             ->orderByDesc('count')
                                             ->pluck('count', 'file_type')
                                             ->toArray(),
            'last_download' => $downloads->latest()->first()?->created_at,
        ];
    }

    /**
     * Get system-wide download analytics
     */
    public static function getSystemAnalytics(): array
    {
        $downloads = self::query();

        return [
            'total_downloads' => $downloads->count(),
            'downloads_today' => $downloads->today()->count(),
            'downloads_this_week' => $downloads->thisWeek()->count(),
            'downloads_this_month' => $downloads->thisMonth()->count(),
            'total_data_transferred' => $downloads->sum('file_size_downloaded'),
            'unique_downloaders' => $downloads->whereNotNull('user_id')->distinct('user_id')->count(),
            'unique_documents' => $downloads->distinct('document_id')->count(),
            'top_documents' => $downloads->selectRaw('document_id, COUNT(*) as count')
                                        ->groupBy('document_id')
                                        ->orderByDesc('count')
                                        ->limit(10)
                                        ->with('document')
                                        ->get(),
            'downloads_by_type' => $downloads->selectRaw('download_type, COUNT(*) as count')
                                            ->groupBy('download_type')
                                            ->pluck('count', 'download_type')
                                            ->toArray(),
            'downloads_by_hour' => $downloads->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
                                            ->groupBy('hour')
                                            ->pluck('count', 'hour')
                                            ->toArray(),
        ];
    }
}