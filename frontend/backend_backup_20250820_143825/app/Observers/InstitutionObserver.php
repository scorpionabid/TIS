<?php

namespace App\Observers;

use App\Models\Institution;
use App\Models\InstitutionAuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class InstitutionObserver
{
    /**
     * Handle the Institution "created" event.
     */
    public function created(Institution $institution): void
    {
        $this->logAuditEvent($institution, 'created', null, $institution->toArray());
    }

    /**
     * Handle the Institution "updated" event.
     */
    public function updated(Institution $institution): void
    {
        $oldValues = $institution->getOriginal();
        $newValues = $institution->toArray();
        
        // Get only changed fields
        $changes = [];
        foreach ($newValues as $key => $value) {
            if (isset($oldValues[$key]) && $oldValues[$key] != $value) {
                $changes[$key] = [
                    'old' => $oldValues[$key],
                    'new' => $value,
                ];
            }
        }
        
        if (!empty($changes)) {
            $this->logAuditEvent($institution, 'updated', $oldValues, $newValues, $changes);
        }
    }

    /**
     * Handle the Institution "deleted" event.
     */
    public function deleted(Institution $institution): void
    {
        $this->logAuditEvent($institution, 'deleted', $institution->toArray(), null);
    }

    /**
     * Handle the Institution "restored" event.
     */
    public function restored(Institution $institution): void
    {
        $this->logAuditEvent($institution, 'restored', null, $institution->toArray());
    }

    /**
     * Handle the Institution "force deleted" event.
     */
    public function forceDeleted(Institution $institution): void
    {
        $this->logAuditEvent($institution, 'force_deleted', $institution->toArray(), null);
    }

    /**
     * Log audit event
     */
    private function logAuditEvent(Institution $institution, string $action, ?array $oldValues = null, ?array $newValues = null, ?array $changes = null): void
    {
        // Only log if user is authenticated
        if (!Auth::check()) {
            return;
        }

        // Get request data
        $request = request();
        $ipAddress = $request->ip();
        $userAgent = $request->userAgent();

        // Create description based on action
        $description = match ($action) {
            'created' => "Yeni təşkilat yaradıldı: {$institution->name}",
            'updated' => "Təşkilat yeniləndi: {$institution->name}",
            'deleted' => "Təşkilat silindi: {$institution->name}",
            'restored' => "Təşkilat bərpa edildi: {$institution->name}",
            'force_deleted' => "Təşkilat tamamilə silindi: {$institution->name}",
            default => "Təşkilat dəyişdirildi: {$institution->name}",
        };

        InstitutionAuditLog::create([
            'institution_id' => $institution->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'changes' => $changes,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'description' => $description,
        ]);

        // Clear institution cache when any institution is changed
        $this->clearInstitutionCache();
    }

    /**
     * Clear institution related cache
     */
    private function clearInstitutionCache(): void
    {
        // Clear all institution cache keys
        Cache::forget('institutions_statistics');
        Cache::forget('institution_types');
        
        // Clear pattern-based cache (requires cache tags or manual implementation)
        // For now, we'll flush all cache starting with 'institutions_'
        $cacheKeys = Cache::get('institution_cache_keys', []);
        foreach ($cacheKeys as $key) {
            Cache::forget($key);
        }
        Cache::forget('institution_cache_keys');
    }
}
