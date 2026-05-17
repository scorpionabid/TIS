<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiLlmSetting extends Model
{
    protected $table = 'ai_llm_settings';

    protected $fillable = [
        'provider',
        'api_key',
        'model',
        'is_active',
        'updated_by',
    ];

    /**
     * API key list endpointlərindən gizlədilir.
     * Birbaşa model əldə etmə zamanı decrypted qaytarılır (getter vasitəsilə).
     */
    protected $hidden = ['api_key'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * API key-i Laravel encrypt() ilə şifrəli saxla.
     */
    public function setApiKeyAttribute(string $value): void
    {
        $this->attributes['api_key'] = encrypt($value);
    }

    /**
     * API key-i decrypt edib qaytarır.
     * Əgər artıq decrypted (köhnə format) olarsa, olduğu kimi qaytarır.
     */
    public function getApiKeyAttribute(string $value): string
    {
        try {
            return decrypt($value);
        } catch (\Exception $e) {
            return $value;
        }
    }

    /**
     * Provider üçün effektiv model adını qaytarır.
     * Model override göstərilməyibsə, default model istifadə edilir.
     */
    public function getEffectiveModel(): string
    {
        if (! empty($this->model)) {
            return $this->model;
        }

        return match ($this->provider) {
            'openai' => 'gpt-4o-mini',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'gemini' => 'gemini-2.0-flash',
            default => 'gpt-4o-mini',
        };
    }

    /**
     * SQL generasiya üçün daha güclü (bahalı) model.
     * SQL yazma dəqiqlik tələb etdiyindən güclü model seçilir.
     */
    public function getSqlModel(): string
    {
        return match ($this->provider) {
            'openai' => 'gpt-4o',
            'anthropic' => 'claude-3-5-sonnet-20241022',
            'gemini' => 'gemini-1.5-pro',
            default => $this->getEffectiveModel(),
        };
    }
}
