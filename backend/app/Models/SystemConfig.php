<?php

namespace App\Models;

use App\Models\Traits\HasCreator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemConfig extends Model
{
    use HasCreator;
    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
        'updated_by',
    ];

    protected $casts = [
        'value' => 'json',
    ];

    /**
     * Get configuration value by key
     */
    public static function getValue(string $key, $default = null)
    {
        $config = self::where('key', $key)->first();

        return $config ? $config->value : $default;
    }

    /**
     * Set configuration value
     */
    public static function setValue(string $key, $value, ?int $updatedBy = null): self
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'updated_by' => $updatedBy,
            ]
        );
    }

    /**
     * Get all configurations by category
     */
    public static function getByCategory(string $category): array
    {
        return self::where('key', 'like', $category . '.%')
            ->get()
            ->mapWithKeys(function ($item) use ($category) {
                $key = str_replace($category . '.', '', $item->key);

                return [$key => $item->value];
            })
            ->toArray();
    }
}
