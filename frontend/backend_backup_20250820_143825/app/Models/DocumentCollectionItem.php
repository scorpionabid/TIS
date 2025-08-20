<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentCollectionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'collection_id',
        'document_id',
        'added_by',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    /**
     * Collection relationship
     */
    public function collection(): BelongsTo
    {
        return $this->belongsTo(DocumentCollection::class);
    }

    /**
     * Document relationship
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * User who added this item
     */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}