<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'min:3', 'max:191', 'regex:/^[\p{L}0-9._@+\-]+$/u'],
            'password' => 'required|string|min:8',
            'remember' => 'boolean',
            'device_name' => 'sometimes|string|max:255',
            'device_id' => 'sometimes|string|max:255',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('login')) {
            $this->merge([
                'login' => $this->normalizeLogin($this->input('login')),
            ]);
        }

        if (! $this->has('remember')) {
            $this->merge(['remember' => false]);
        }
    }

    /**
     * Check if the request is rate limited.
     */
    public function ensureIsNotRateLimited(): void
    {
        $ipRateLimitKey = 'login_ip:' . $this->ip();
        $userRateLimitKey = 'login_user:' . $this->input('login');

        // Check IP-based rate limiting (10 attempts per 15 minutes)
        if (RateLimiter::tooManyAttempts($ipRateLimitKey, 10)) {
            $seconds = RateLimiter::availableIn($ipRateLimitKey);
            $this->throwRateLimitException($seconds, 'ip');
        }

        // Check user-based rate limiting (5 attempts per 15 minutes)
        if (RateLimiter::tooManyAttempts($userRateLimitKey, 5)) {
            $seconds = RateLimiter::availableIn($userRateLimitKey);
            $this->throwRateLimitException($seconds, 'user');
        }
    }

    /**
     * Throw a rate limit exception with the appropriate message.
     */
    protected function throwRateLimitException(int $seconds, string $type): void
    {
        $message = $type === 'ip'
            ? "Bu IP ünvanından çox sayda cəhd edilib. {$seconds} saniyə sonra yenidən cəhd edin."
            : "Bu hesab üçün çox sayda cəhd edilib. {$seconds} saniyə sonra yenidən cəhd edin.";

        $exception = ValidationException::withMessages([
            'login' => [$message],
            'code' => ['RATE_LIMITED'],
            'retry_after' => [$seconds],
            'type' => [$type . '_blocked'],
        ]);

        $exception->status = 429;

        throw $exception;
    }

    protected function normalizeLogin(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $value)));
    }
}
