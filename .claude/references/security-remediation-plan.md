# ATİS Təhlükəsizlik — Qalan Tapşırıqlar

**Audit tarixi:** 2026-03-12 | **Son yenilənmə:** 2026-03-23
**Tamamlananlar:** Phase 1 ✅, Phase 2 ✅, Phase 3.1-3.4 ✅
**Tam plan:** `.claude/archive/2026-03-completed-plans/security-remediation-plan-FULL.md`

---

## Phase 3 — Qalan (3.5–3.6)

### TASK 3.5 — `register` public endpoint-ini yoxla

**Risk:** `POST /api/register` public — kimin qeydiyyat edə biləcəyi məlum deyil
**Fayl:** `backend/routes/api/public.php:26`

```bash
# 1. Metodun mövcudluğunu yoxla:
docker exec atis_backend grep -n "function register" app/Http/Controllers/Auth/PasswordController.php

# 2. Əgər mövcuddursa — ya sil, ya invitation token tələb et
```

---

### TASK 3.6 — SecurityEvent + ActivityLog audit trail-ini yoxla

**Fayl:** `backend/app/Models/SecurityEvent.php`, `backend/app/Models/ActivityLog.php`

Aşağıdakıların hər biri `SecurityEvent::logEvent()` çağırmalıdır:
- [ ] Login uğursuz cəhdi
- [ ] Permission denied (403)
- [ ] markAsViewed authorization fail
- [ ] SetupWizard çağırışı
- [ ] Bulk delete əməliyyatı
- [ ] Password reset

---

## Phase 4 — Uzunmüddətli (1 ay+)

### TASK 4.1 — API rate limiting genişləndir

**Problem:** Yalnız login endpoint-i rate limit-ə malikdir.

```php
// backend/routes/api.php — auth qrupuna:
Route::middleware(['auth:sanctum', 'auth.custom', 'throttle:api'])->group(...);

// RouteServiceProvider-da:
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

---

### TASK 4.2 — Token expiration strategiyasını gözdən keçir

**Fayl:** `backend/config/sanctum.php:50`
**Hazırda:** `SANCTUM_EXPIRATION=1440` (24 saat)

Tövsiyə:
- Normal session: 480 dəq (8 saat)
- "Remember me": 10080 dəq (7 gün)
- Idle timeout: son aktivlikdən 2 saat sonra

---

### TASK 4.3 — 80+ controller IDOR audit

Hər resource endpoint üçün: "User başqa institution-un ID-sini göndərə bilər?"

Prioritet:
1. `UserController` — user ID arası keçid
2. `InstitutionController` — hierarchy bypass
3. `SurveyController` — başqa region sorğusu
4. `DocumentController` — başqa məktəb sənədi
5. `TaskController` — başqa institution tapşırığı

---

### TASK 4.4 — Security headers əlavə et

**Fayl:** `backend/app/Http/Middleware/ForceCors.php` (və ya yeni middleware)

```php
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('X-XSS-Protection', '1; mode=block');
$response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
$response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
// HTTPS üçün:
$response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```
