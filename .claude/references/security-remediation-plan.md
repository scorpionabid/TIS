# ATİS Təhlükəsizlik Düzəliş Planı (Security Remediation Plan)

**Audit tarixi:** 2026-03-12
**Plan tarixi:** 2026-03-13
**Sistem:** ATİS — 22+ aktiv təhsil müəssisəsi, live production
**Ümumi risk:** ORTA-YÜKSƏK

---

## Prioritet xəritəsi

```
PHASE 1 — Dərhal (Bu gün)         → Critical issues, production risk
PHASE 2 — Bu həftə (3-5 gün)     → High issues, exploit mümkün
PHASE 3 — Bu sprint (2 həftə)    → Medium issues, hardening
PHASE 4 — Roadmap (1 ay+)        → Long-term architecture
```

---

## PHASE 1 — KRİTİK (Bu gün həll et)

### TASK 1.1 — SetupWizard public endpoint-ini bağla

**Risk:** Unauthenticated POST /api/setup/initialize → yeni SuperAdmin yaradılır
**Fayllar:** `backend/routes/api/public.php:33-38`, `backend/app/Http/Controllers/SetupWizardController.php`

**Step 1 — `public.php`-dən setup route-larını sil:**
```php
// SİL:
Route::prefix('setup')->group(function () {
    Route::get('status', ...);
    Route::post('initialize', ...);
    Route::post('sample-structure', ...);
    Route::get('validate', ...);
});
```

**Step 2 — `admin.php` və ya ayrıca `setup.php` faylına köçür, superadmin-only et:**
```php
// backend/routes/api/admin.php içinə əlavə et:
Route::prefix('setup')->middleware('permission:system.setup')->group(function () {
    Route::get('status', [SetupWizardController::class, 'checkSetupStatus']);
    Route::get('validate', [SetupWizardController::class, 'validateSystemData']);
    // initialize və sample-structure TAMAMILƏ SİL — production-da lazım deyil
});
```

**Step 3 — `SetupWizardController::initializeSystem()` başlanğıcına guard əlavə et:**
```php
public function initializeSystem(Request $request): JsonResponse
{
    // Sistem artıq qurulubsa icazə vermə
    $superAdminExists = User::whereHas('roles', fn($q) => $q->where('name', 'superadmin'))->exists();
    if ($superAdminExists) {
        return response()->json(['message' => 'System already initialized'], 403);
    }
    // ...
}
```

**Test:**
```bash
curl -X POST http://localhost:8000/api/setup/initialize \
  -d '{"superadmin_username":"test",...}' -v
# Gözlənilən: 404 Not Found
```

---

### TASK 1.2 — Deaktiv hesab bypass-ını bağla

**Risk:** `is_active=false`, `account_locked_until` yoxlamaları `auth:sanctum` ilə keçilir
**Fayl:** `backend/routes/api.php:22`, `backend/bootstrap/app.php`

**Step 1 — `api.php`-də `auth:sanctum`-a `auth.custom` əlavə et:**
```php
// backend/routes/api.php:22 — dəyişdir:
Route::middleware(['auth:sanctum', 'auth.custom'])->group(function () {
    // bütün protected routes...
});
```

**Step 2 — Eyni şəkildə `my-resources` group-unu yenilə (`links.php:40`):**
```php
Route::prefix('my-resources')
    ->middleware(['auth:sanctum', 'auth.custom'])
    ->group(function () {
    // ...
});
```

**Step 3 — Test:**
```bash
# 1. İstifadəçini DB-də deaktivləşdir:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET is_active=false WHERE username='testuser';"

# 2. Onun token-i ilə API çağır:
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer DEACTIVATED_USER_TOKEN"
# Gözlənilən: 403 "Account is deactivated"

# 3. Geri qaytar:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET is_active=true WHERE username='testuser';"
```

---

### TASK 1.3 — `markAsViewed` endpoint-inə authorization əlavə et

**Risk:** İstənilən auth user istənilən resource ID-ni view kimi işarələyə bilər
**Fayl:** `backend/app/Http/Controllers/LinkShareControllerRefactored.php:758-787`

**Step 1 — Controller metodunu yenilə:**
```php
public function markAsViewed(Request $request, string $type, int $id): JsonResponse
{
    return $this->executeWithErrorHandling(function () use ($request, $type, $id) {
        $user = Auth::user();

        // Resource-u tap və access yoxla
        if ($type === 'link') {
            $resource = LinkShare::find($id);
            if (! $resource) {
                return $this->errorResponse('Resurs tapılmadı', 404);
            }
            // Mövcud canBeAccessedBy() metodundan istifadə et
            if (! $resource->canBeAccessedBy($user)) {
                return $this->errorResponse('Bu resursa giriş icazəniz yoxdur', 403);
            }
        } elseif ($type === 'document') {
            // Document modeli üçün oxşar yoxlama
            $resource = \App\Models\Document::find($id);
            if (! $resource) {
                return $this->errorResponse('Sənəd tapılmadı', 404);
            }
            // Document access yoxlaması
            if ($resource->institution_id !== $user->institution_id
                && ! $user->hasRole('superadmin')) {
                return $this->errorResponse('Bu sənədə giriş icazəniz yoxdur', 403);
            }
        }

        // Yalnız yoxlamadan sonra view-u qeyd et
        $view = \App\Models\ResourceView::where([
            'user_id' => $user->id,
            'resource_id' => $id,
            'resource_type' => $type,
        ])->first();

        if ($view) {
            $view->update([
                'last_viewed_at' => now(),
                'view_count' => $view->view_count + 1,
            ]);
        } else {
            \App\Models\ResourceView::create([
                'user_id' => $user->id,
                'resource_id' => $id,
                'resource_type' => $type,
                'first_viewed_at' => now(),
                'last_viewed_at' => now(),
                'view_count' => 1,
            ]);
        }

        return $this->successResponse(null, 'Resurs baxılmış kimi işarələndi');
    }, 'linkshare.markAsViewed');
}
```

**Test:**
```bash
# Teacher token ilə başqa institution-un linkini view kimi işarələməyə çalış
curl -X POST "http://localhost:8000/api/my-resources/link/999/view" \
  -H "Authorization: Bearer TEACHER_TOKEN"
# Gözlənilən: 403 və ya 404

# Mövcud olmayan ID:
curl -X POST "http://localhost:8000/api/my-resources/link/99999/view" \
  -H "Authorization: Bearer ANY_TOKEN"
# Gözlənilən: 404 (ID disclosure yox)
```

---

### TASK 1.4 — Həssas public endpoint-ləri qoru

**Risk:** `/api/version`, `/api/config/constants`, `/api/test/websocket/info` — auth olmadan sistem məlumatı sızdırır
**Fayl:** `backend/routes/api/public.php:42-71`

**Step 1 — `version` endpoint-ini məhdudlaşdır (`HealthController.php:47-59`):**
```php
// Public-də yalnız minimal info ver:
public function version(): JsonResponse
{
    return $this->successResponse([
        'version' => config('app.version', '1.0.0'),
        'name' => config('app.name'),
    ], 'API version information');
    // SİL: environment, debug, php_version, laravel_version
}
```

**Step 2 — `config/constants` endpoint-ini auth arxasına köçür (`public.php`-dən sil, `auth.php`-ə əlavə et):**
```php
// backend/routes/api/public.php — SİL:
Route::get('config/constants', [ConfigController::class, 'getConstants']);

// backend/routes/api/auth.php — ƏLAVƏ ET:
Route::get('config/constants', [ConfigController::class, 'getConstants']);
```

**Step 3 — WebSocket info endpoint-ini auth arxasına köçür:**
```php
// public.php-dən sil, auth qrupuna köçür:
Route::get('test/websocket/info', function () {
    // ...
})->middleware('auth:sanctum');
```

**Step 4 — `config/app` endpoint-ini nəzərdən keçir (`debug` field-ini sil):**
```php
// ConfigController.php:26-27 — dəyişdir:
'app' => [
    'name' => config('app.name'),
    'version' => config('app.version', '1.0.0'),
    'locale' => config('app.locale'),
    // SİL: 'debug' => config('app.debug'),
],
```

**Test:**
```bash
curl http://localhost:8000/api/version
# Gözlənilən: yalnız name + version (env, debug, php yox)

curl http://localhost:8000/api/config/constants
# Gözlənilən: 401 Unauthenticated

curl http://localhost:8000/api/test/websocket/info
# Gözlənilən: 401 Unauthenticated
```

---

## PHASE 2 — YÜKSƏK (Bu həftə)

### TASK 2.1 — ForceCors header reflection-ını düzəlt

**Risk:** Attacker-ın göndərdiyi `Access-Control-Request-Headers` geri qaytarılır
**Fayl:** `backend/app/Http/Middleware/ForceCors.php:38-44`

**Step 1 — `ForceCors.php`-i yenilə:**
```php
public function handle(Request $request, Closure $next): Response
{
    if ($request->isMethod('OPTIONS')) {
        $response = response('', 200);
    } else {
        $response = $next($request);
    }

    $origin = $request->headers->get('Origin');
    $allowedOrigins = array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))
    ));

    // Private IP-lər üçün dev-only yoxlama
    $isAllowedOrigin = $origin && in_array($origin, $allowedOrigins, true);
    if (! $isAllowedOrigin && $origin && app()->environment('local', 'development')) {
        $isAllowedOrigin = (bool) preg_match(
            '#^http://(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}:\d+$#',
            $origin
        );
    }

    if ($isAllowedOrigin && $origin) {
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Vary', 'Origin');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
    }

    // Sabit, explicit metodlar — reflection yox
    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

    // Sabit, explicit headerlar — reflection yox
    $response->headers->set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN'
    );

    return $response;
}
```

**Step 2 — `.env.example`-ə əlavə et:**
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://atis.sim.edu.az
```

---

### TASK 2.2 — AuthController login response-undakı hardcoded CORS-u sil

**Risk:** `Allow-Headers: *` + `credentials: true` CORS spec pozuntusudur; origin hardcoded
**Fayl:** `backend/app/Http/Controllers/Auth/AuthController.php:53-56`

**Step 1 — Manual header-ları sil, ForceCors-a həvalə et:**
```php
// DƏYİŞDİR — manual header chain-i sil:
return response()->json([
    'message' => 'Uğurlu giriş',
    'code' => 'LOGIN_SUCCESS',
    'data' => $result,
]);
// ForceCors middleware avtomatik düzgün header-ları əlavə edəcək
```

---

### TASK 2.3 — `cors.php` wildcard metodlarını məhdudlaşdır

**Risk:** Production-a bu config deploy edilərsə bütün metodlar bütün origin-lərdən qəbul edilir
**Fayl:** `backend/config/cors.php`

**Step 1 — Explicit metodlar və headerlar:**
```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,https://atis.sim.edu.az'
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => true,
];
```

**Step 2 — `.env` və `.env.example`-a əlavə et:**
```env
# Production:
CORS_ALLOWED_ORIGINS=https://atis.sim.edu.az
# Development:
# CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

### TASK 2.4 — `getAssignedResources` middleware inconsistency-ni düzəlt

**Risk:** `müəllim` rolu route middleware-indən keçə bilmir, amma controller onu qəbul edir
**Fayl:** `backend/routes/api/links.php:43`

**Step 1 — Route middleware-i controller ilə uyğunlaşdır:**
```php
Route::get('/assigned', [LinkShareController::class, 'getAssignedResources'])
    ->middleware('role:superadmin|regionadmin|sektoradmin|schooladmin|regionoperator|müəllim|teacher');
//                                                                                     ^^^^^^^^ əlavə et
```

**Step 2 — Alternativ (tövsiyə): role yoxlamasını controller-dən middleware-ə köçür, controller-dən sil:**
```php
// Controller line 734-737 — SİL:
if (! $user->hasAnyRole([...])) {
    return $this->errorResponse('...', 403);
}
// Middleware bu işi edir, controller-də dublikat olmasın
```

---

### TASK 2.5 — `PermissionMiddleware` exception audit trail-ini düzəlt

**Risk:** DB/cache xətası zamanı permission check fail-i log-lanmır, request blok olmur
**Fayl:** `backend/app/Http/Middleware/PermissionMiddleware.php:44-54`

**Step 1 — Exception halında açıq şəkildə 403 qaytar:**
```php
try {
    $hasPermission = $user->hasPermissionTo($permission);
} catch (\Throwable $e) {
    \Log::critical('Permission check FAILED — blocking request for safety', [
        'user_id' => $user->id,
        'permission' => $permission,
        'exception' => $e->getMessage(),
        'path' => $request->path(),
    ]);
    // Fail-closed: xəta varsa, icazə vermə
    return response()->json([
        'message' => 'Permission check temporarily unavailable',
    ], 503);
}
```

---

## PHASE 3 — ORTA (Bu sprint, 2 həftə)

### TASK 3.1 — `per_page` limitini azalt

**Risk:** `max:500` items + complex eager loading = DoS
**Fayl:** `backend/app/Http/Controllers/LinkShareControllerRefactored.php:62`

```php
// DƏYİŞDİR:
'per_page' => 'nullable|integer|min:1|max:100',  // 500 → 100
```

---

### TASK 3.2 — `document_type` filter-ə whitelist əlavə et

**Risk:** İstənilən string dəyəri qəbul edilir
**Fayl:** `backend/app/Http/Controllers/LinkShareControllerRefactored.php:48`

```php
// DƏYİŞDİR:
'document_type' => 'nullable|string|in:link,pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,other',
```

---

### TASK 3.3 — Debug endpoint-i environment guard ilə əlavə et

**Risk:** `app()->environment('local','development','testing')` production-da `APP_ENV` misconfiguration ilə açıla bilər
**Fayl:** `backend/routes/api.php:24`

```php
// DƏYİŞDİR — yalnız local mühit:
if (app()->environment('local')) {
    Route::get('/debug/my-permissions', function (Request $request) {
        // ...
    });
}
// 'development' və 'testing' siyahısından sil
```

---

### TASK 3.4 — PermissionMiddleware-dəki debug log-ları production-da kapat

**Risk:** Hər permission check-də user ID, rollar, icazələr debug log-a yazılır
**Fayl:** `backend/app/Http/Middleware/PermissionMiddleware.php:34-40`, `56-60`

```php
// DƏYİŞDİR — yalnız debug mühitdə log:
if (config('app.debug')) {
    \Log::debug('Permission middleware evaluation', [
        'user_id' => $user->id,
        'permissions_required' => $permissions,
        // ...
    ]);
}
```

---

### TASK 3.5 — `register` public endpoint-ini yoxla

**Risk:** `POST /api/register` public — kimin qeydiyyat edə biləcəyi məlum deyil
**Fayl:** `backend/routes/api/public.php:26`

**Step 1 — PasswordController-da `register` metodunu tap:**
```bash
docker exec atis_backend grep -n "function register" app/Http/Controllers/Auth/PasswordController.php
```

**Step 2 — Əgər metod mövcuddursa:**
- Hansı rollarda qeydiyyat mümkündür yoxla
- Lazım deyilsə, endpoint-i sil
- Lazımdırsa, invitation token tələb et

---

### TASK 3.6 — SecurityEvent + ActivityLog təsdiqini yoxla

**Məqsəd:** Kritik əməliyyatlar üçün audit trail tam olsun
**Fayl:** `backend/app/Models/SecurityEvent.php`, `backend/app/Models/ActivityLog.php`

**Yoxlanmalı hadisələr:**
```php
// Bunların hər biri SecurityEvent::logEvent() çağırmalıdır:
[ ] Login uğursuz cəhdi
[ ] Permission denied (403)
[ ] markAsViewed authorization fail
[ ] SetupWizard çağırışı
[ ] Bulk delete əməliyyatı
[ ] Password reset
```

---

## PHASE 4 — UZUNMÜDDƏTLI (1 ay+)

### TASK 4.1 — API rate limiting əhatə dairəsini genişləndir

**Hazırda:** Yalnız login endpoint-i rate limit-ə malikdir
**Hədəf:** Bütün mutating endpoint-lərə throttle əlavə et

```php
// backend/routes/api.php — auth qrupuna əlavə et:
Route::middleware(['auth:sanctum', 'auth.custom', 'throttle:api'])->group(function () {
    // ...
});

// config/cache.php və ya RouteServiceProvider-da:
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

---

### TASK 4.2 — Token expiration strategiyasını gözdən keçir

**Hazırda:** `SANCTUM_EXPIRATION=1440` (24 saat)
**Fayl:** `backend/config/sanctum.php:50`

**Tövsiyə:**
- Normal session: 480 dəq (8 saat)
- "Remember me": 10080 dəq (7 gün)
- Idle timeout mexanizmi əlavə et (son aktivlikdən 2 saat sonra)

---

### TASK 4.3 — Bütün 80+ controller-i IDOR üçün audit et

**Məqsəd:** Hər resource endpoint-inin institution scoping-ini yoxla

**Yoxlama sualı:** "Bu endpoint üçün user başqa institution-un ID-sini göndərə bilər?"

**Prioritet controller-lər:**
1. `UserController` — user ID-lər arası keçid mümkündürmü?
2. `InstitutionController` — institution hierarchy bypass
3. `SurveyController` — başqa region-un sorğusuna cavab vermək
4. `DocumentController` — başqa məktəbin sənədini yükləmək
5. `TaskController` — başqa institution-un tapşırığını görmək

---

### TASK 4.4 — Security headers əlavə et

**Fayl:** `backend/app/Http/Middleware/ForceCors.php` və ya yeni `SecurityHeaders` middleware

```php
// Əlavə ediləcək header-lar:
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('X-XSS-Protection', '1; mode=block');
$response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
$response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
// HTTPS üçün:
$response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

---

## Test Checklist — Hər phase sonunda

### Phase 1 test-ləri
```bash
# T1.1: Setup endpoint bağlıdır
curl -X POST http://localhost:8000/api/setup/initialize -d '{...}' | grep -E "404|403"

# T1.2: Deaktiv hesab blok edilir
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET is_active=false WHERE id=2;"
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer TOKEN_OF_USER_2"
# → 403

# T1.3: markAsViewed başqa resursa 403 qaytarır
curl -X POST http://localhost:8000/api/my-resources/link/1/view \
  -H "Authorization: Bearer TEACHER_TOKEN"
# → 403 (əgər teacher həmin linkə access yoxdursa)

# T1.4: Sensitive public endpoints qapalıdır
curl http://localhost:8000/api/config/constants | grep -E "401|403"
curl http://localhost:8000/api/test/websocket/info | grep -E "401|403"
curl http://localhost:8000/api/version | grep -v "php_version" | grep -v "laravel_version"
```

### Phase 2 test-ləri
```bash
# T2.1: CORS reflection yoxdur
curl -X OPTIONS http://localhost:8000/api/links \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Headers: X-Evil-Header" -v 2>&1 | grep "X-Evil"
# → boş — echo edilmir

# T2.2: Login CORS wildcard yoxdur
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}' -v 2>&1 | grep "Allow-Headers"
# → "Content-Type, Authorization, ..." (wildcard * yox)

# T2.3: Evil origin blok edilir
curl http://localhost:8000/api/auth/me \
  -H "Origin: http://evil.com" \
  -H "Authorization: Bearer VALID_TOKEN" -v 2>&1 | grep "Access-Control-Allow-Origin"
# → boş (evil.com üçün CORS header set edilmir)
```

### Phase 3 test-ləri
```bash
# T3.1: per_page 500 qəbul edilmir
curl "http://localhost:8000/api/links?per_page=500" \
  -H "Authorization: Bearer TOKEN" | grep -E "422|error"

# T3.2: Invalid document_type rədd edilir
curl "http://localhost:8000/api/links?document_type=../../etc/passwd" \
  -H "Authorization: Bearer TOKEN" | grep -E "422|error"
```

---

## Cavabdehlik Matrisi

| Phase | Task | Məsul | Son tarix | Status |
|-------|------|-------|-----------|--------|
| 1 | T1.1 SetupWizard bağla | Backend Dev | 2026-03-13 | ✅ Tamamlandı |
| 1 | T1.2 Deaktiv hesab fix | Backend Dev | 2026-03-13 | ✅ Tamamlandı |
| 1 | T1.3 markAsViewed auth | Backend Dev | 2026-03-13 | ✅ Tamamlandı |
| 1 | T1.4 Public endpoints | Backend Dev | 2026-03-13 | ✅ Tamamlandı |
| 2 | T2.1 ForceCors fix | Backend Dev | 2026-03-17 | ✅ Tamamlandı |
| 2 | T2.2 Login CORS fix | Backend Dev | 2026-03-17 | ✅ Tamamlandı |
| 2 | T2.3 cors.php restrict | Backend Dev | 2026-03-17 | ✅ Tamamlandı |
| 2 | T2.4 Middleware uyğun | Backend Dev | 2026-03-17 | ✅ Tamamlandı |
| 2 | T2.5 Exception fail-closed | Backend Dev | 2026-03-17 | ✅ Tamamlandı |
| 3 | T3.1 per_page limit | Backend Dev | 2026-03-27 | ✅ Tamamlandı |
| 3 | T3.2 document_type whitelist | Backend Dev | 2026-03-27 | ✅ Tamamlandı |
| 3 | T3.3 Debug env guard | Backend Dev | 2026-03-27 | ✅ Tamamlandı |
| 3 | T3.4 Log gating | Backend Dev | 2026-03-27 | ✅ Tamamlandı |
| 3 | T3.5-T3.6 Remaining hardening | Backend Dev | 2026-03-27 | ⬜ Gözləyir |
| 4 | T4.1-T4.4 Architecture | Tech Lead | 2026-04-13 | ⬜ Planlanır |
| DEP | Dependency updates (see below) | Backend Dev | 2026-03-20 | ⚠️ Aktual |

---

## Dependency Vulnerabilities (composer audit — 2026-03-13)

`composer audit` 7 paketdə 8 zəiflik aşkar etdi:

| Şiddət | Paket | CVE | Qeyd |
|--------|-------|-----|------|
| 🔴 Critical | `laravel/reverb` | CVE-2026-23524 | WebSocket server — composer update et |
| 🟠 High | `symfony/http-foundation` | CVE-2025-64500 | PATH_INFO auth bypass — **dərhal update et** |
| 🟠 High | `phpunit/phpunit` | CVE-2026-24765 | Dev-only, production riski yoxdur |
| 🟡 Medium | `league/commonmark` | CVE-2026-30838 | Markdown parser |
| 🟡 Medium | `paragonie/sodium_compat` | CVE-2025-69277 | Crypto compat layer |
| 🟡 Medium | `psy/psysh` | CVE-2026-25129 | Dev-only (tinker) |
| 🟡 Medium | `symfony/process` | CVE-2026-24739 | Windows MSYS2-specific, prod riski aşağı |

**Dərhal atılacaq addım:**
```bash
docker exec atis_backend composer update symfony/http-foundation laravel/reverb --with-all-dependencies
docker exec atis_backend php artisan test
# Testlər keçdikdən sonra deploy
```

---

## Pre-commit checklist (hər düzəlişdən sonra)

```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_backend php artisan test
docker exec atis_backend composer audit
docker exec atis_frontend npm audit --audit-level=moderate
```

---

*Bu plan ATİS təhlükəsizlik audit hesabatına (2026-03-12) əsaslanır.*
*Hər task tamamlandıqda "Status" sütununu ✅ ilə yenilə.*

---

## Manual Yoxlama Siyahısı (Production-a deploy etməzdən əvvəl)

Aşağıdakıları developer kimi browser/curl ilə yoxla. Hər birinin yanına ✅/❌ qoy.

### BLOK 1 — Kritik endpoint-lər

**1.1 — SetupWizard bağlıdır**
```bash
curl -X POST http://localhost:8000/api/setup/initialize \
  -H "Content-Type: application/json" \
  -d '{"name":"hacker","email":"h@h.com","password":"hack123"}'
```
Gözlənilən: `404 Not Found`

**1.2 — Deaktiv hesab blok edilir**
```bash
# 1. Bir istifadəçini deaktiv et:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET is_active=false WHERE username='regionadmin1';"

# 2. O hesabla login ol, token al, sonra yoxla:
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer <TOKEN>"
```
Gözlənilən: `403 Account is deactivated`

```bash
# 3. Geri al:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET is_active=true WHERE username='regionadmin1';"
```

**1.3 — Hesab kilidlənməsi işləyir**
```bash
# 1. Bir istifadəçini locked_until ilə kilid et:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET locked_until=NOW() + INTERVAL '1 hour' WHERE username='regionadmin1';"

# 2. Həmin istifadəçinin token-i ilə sorğu göndər:
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer <TOKEN>"
```
Gözlənilən: `423 Account is temporarily locked`

```bash
# 3. Geri al:
docker exec atis_postgres psql -U atis_dev_user -d atis_dev \
  -c "UPDATE users SET locked_until=NULL WHERE username='regionadmin1';"
```

**1.4 — Config/constants auth tələb edir**
```bash
curl http://localhost:8000/api/config/constants
```
Gözlənilən: `401 Unauthenticated`

**1.5 — WebSocket info auth tələb edir**
```bash
curl http://localhost:8000/api/test/websocket/info
```
Gözlənilən: `401 Unauthenticated`

**1.6 — Version endpoint həssas məlumat vermir**
```bash
curl http://localhost:8000/api/version | python3 -m json.tool
```
Gözlənilən: `version` və `name` var, `php_version`, `laravel_version`, `environment`, `debug` **yoxdur**

---

### BLOK 2 — CORS

**2.1 — Evil origin blok edilir**
```bash
curl -X OPTIONS http://localhost:8000/api/links \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: GET" -v 2>&1 | grep -i "access-control-allow-origin"
```
Gözlənilən: boş — `http://evil.com` üçün heç bir CORS header set edilmir

**2.2 — Wildcard header reflection yoxdur**
```bash
curl -X OPTIONS http://localhost:8000/api/links \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Headers: X-Evil-Custom-Header" -v 2>&1 | grep -i "allow-headers"
```
Gözlənilən: `Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN` — `X-Evil-Custom-Header` **yoxdur**

**2.3 — Login CORS wildcard yoxdur**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"login":"superadmin","password":"admin123"}' -v 2>&1 | grep -i "allow-headers"
```
Gözlənilən: explicit list (`Content-Type, Authorization...`), wildcard `*` **yoxdur**

---

### BLOK 3 — Input Validation

**3.1 — per_page 100-dən böyük rədd edilir**
```bash
curl "http://localhost:8000/api/links?per_page=500" \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"
```
Gözlənilən: `422 Unprocessable Entity` (validation error)

**3.2 — Yanlış document_type rədd edilir**
```bash
curl "http://localhost:8000/api/links?document_type=../../etc/passwd" \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"
```
Gözlənilən: `422 Unprocessable Entity`

**3.3 — Debug endpoint production-da yoxdur**
```bash
# APP_ENV=production olan mühitdə:
curl http://localhost:8000/api/debug/my-permissions \
  -H "Authorization: Bearer <TOKEN>"
```
Gözlənilən: `404 Not Found` (yalnız local mühitdə mövcuddur)

---

### BLOK 4 — RBAC

**4.1 — Teacher admin endpoint-ə giriş edə bilmir**
```bash
# Teacher token ilə:
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```
Gözlənilən: `403 Forbidden`

**4.2 — Teacher başqa institution-un linkini view kimi qeyd edə bilmir**
```bash
# Başqa institution-un link ID-si ilə:
curl -X POST http://localhost:8000/api/my-resources/link/999/view \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```
Gözlənilən: `403 Forbidden` və ya `404 Not Found`

---

### BLOK 5 — Dependency Update (deploy etməzdən əvvəl)

```bash
# High/Critical paketləri update et:
docker exec atis_backend composer update symfony/http-foundation laravel/reverb --with-all-dependencies

# Testləri yenidən çalışdır:
docker exec atis_backend php artisan test

# Audit-i yenidən yoxla:
docker exec atis_backend composer audit
```

Gözlənilən: `symfony/http-foundation` və `laravel/reverb` üçün yeni versiya, testlər keçir
