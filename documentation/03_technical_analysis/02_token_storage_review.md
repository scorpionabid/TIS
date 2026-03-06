## Token Storage Strategy Review

### Mövcud vəziyyətin xülasəsi
- `frontend/src/services/apiOptimized.ts` bearer token-i `localStorage` (`atis_auth_token`) vasitəsilə saxlayır və hər request üçün `Authorization: Bearer` başlığı əlavə edir.
- `frontend/src/contexts/AuthContextOptimized.tsx` `localStorage`-dan istifadə edərək token və istifadəçi keşini bərpa edir, həmçinin React Query keşini təmizləyir.
- Laravel backend-i Sanctum istifadə edir, lakin hazırkı SPA axını `SPA Authentication` (HTTP-only cookie + CSRF) modelini deyil, klassik token-based pattern-i tətbiq edir. `authService.login()` CSRF kukisini götürsə də, token qayıdır və `localStorage`-da saxlanılır.

### HTTP-only cookie modelinə keçid üçün tələblər
1. **Backend konfiqurasiyası**
   - `config/sanctum.php` `stateful` domenlərə prod/staging hostlarını əlavə etmək, `SANCTUM_STATEFUL_DOMAINS` env dəyişənlərini yeniləmək.
   - API marşrutlarının `EnsureFrontendRequestsAreStateful` middleware-i ilə qorunduğundan əmin olmaq (`App\Http\Kernel` → `api` middleware qrupunda).
   - `auth.php` guard-larını və login/logout axınını kuki əsaslı identifikasiya üçün uyğunlaşdırmaq (`AuthController::login` çıxışında token döndürməyə ehtiyac olmayacaq, əvəzində `cookie()` response-u).

2. **Frontend dəyişiklikləri**
   - `apiClient` request-lərində `credentials: 'include'` istifadə etmək (mövcud login/refresh sorğuları üçün artıq `fetch` çağırışında var, Axios/Fetch wrapper-də də global təyin edilməlidir).
   - `setToken/getToken/clearToken` funksiyalarını təqaüdə çıxarmaq; əvəzində autentifikasiya statusunu `/me` endpoint-i ilə yoxlamaq.
   - `AuthContextOptimized` daxilində token saxlanması, `localStorage` relyansı və `Authorization` başlıqları çıxarılmalıdır.
   - Logout prosesi `POST /logout` çağırışından sonra yalnız kukiləri təmizləmək üçün rely on backend (Sanctum `cookie` müddəti bitəndə avtomatik çıxış).

3. **Sessiya idarəetməsi**
   - `SessionController` marşrutları mövcud token-based modeli nəzərdə tutur; kuki-based axında da paralel işləməsi üçün `logout` və `session revoke` metodları 401 cavabını kuki ilə sinxronlaşdırmalıdır. Gərəkdiyi halda `sessionService` kuki identifikatorlarını (token id) xəritələndirən əlavə sahə saxlaya bilər.

4. **Deployment və uyğunluq**
   - NGINX/Reverse proxy-də `SameSite=None; Secure` kukiləri üçün HTTPS məcburidir.
   - Mobil/desktop hibrid müştərilər varsa, onların da kuki-based autentifikasiyanı dəstəklədiyindən əmin olmaq lazımdır.

### Əgər localStorage qalacaqsa – təhlükəsizlik tədbirləri
1. **CSP sərtləşdirilməsi**
   - `default-src 'self'; script-src 'self' 'nonce-<random>'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.
   - Üçüncü tərəf skriptlər üçün mümkün qədər subresource integrity (SRI) istifadə etmək.

2. **XSS risklərinin azaldılması**
   - `frontend`də bütün user-input-lar sanitizə olunmalı və `dangerouslySetInnerHTML` istifadəsi audit edilməlidir.
   - `npm audit`, `npx eslint-plugin-security` kimi alətlərlə müntəzəm paket auditi.

3. **Token idarəetməsi**
   - `localStorage`-da saxlanan token üçün qısa müddətli (`SANCTUM_EXPIRATION`) yaşadövrü (mövcud 24 saat) saxlanmalı, ehtiyac varsa 8-12 saata endirilməlidir.
   - `refresh-token` axını token yenilənməsini serverdə audit loglarına yazaraq sui-istifadəyə qarşı monitorinq təmin etməlidir.

4. **Əlavə qoruma**
   - `window.addEventListener('storage', ...)` ilə fərqli tablarda çıxışın sinxronlaşdırılması (mövcud `AuthContext` qismən edir).
   - `localStorage`-dan token sızmasının qarşısı üçün serverdə IP / user-agent bağlanması, `SecurityEvent` auditləri və şübhəli aktivlik üçün siqnallar.

### Tövsiyə olunan istiqamət
1. Rəhbərlik səviyyəsində (security review) cookie-based modellə davam etmək üçün qərar verilsə, backend və frontend dəyişiklikləri üçün ayrıca sprint planlanmalıdır (təxminən 3-5 iş günü, QA ilə birlikdə).
2. Qısa müddətdə localStorage saxlanacaqsa:
   - CSP başlıqlarını tətbiq etmək və `CLAUDE.md`-də qeyd olunan “Production Security Protocol” daxilində XSS tədbirlərini icra etmək.
   - Token müddətini 24 saatdan aşağı salmağı nəzərdən keçirmək.
   - Postman/manual test check-listinə `Set-Cookie` və `Authorization` başlığının izlənməsi, şübhəli redirect/xss testləri əlavə etmək.

Bu nəticələr `CLAUDE.md` standartları ilə uyğunlaşır: ya daha təhlükəsiz cookie əsasında modelə keçid, ya da localStorage qalarsa müvafiq XSS/CSP sərtləşdirmələri həyata keçirilməlidir.
