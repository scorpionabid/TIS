# ATİS Authentication Migration Guide

## Ümumi Məlumat

ATİS sistemində authentication mexanizmi artıq **hibrid** sistemə dəstək verir:
- **Bearer Token** (Sanctum - API clients üçün) ✅
- **Session-based** (Web guard - browser clients üçün) ✅

## Cari Vəziyyət

**Backend:**
- Default guard: `sanctum` (Bearer token)
- Route middleware: `auth:sanctum`
- Session driver: `file` (development), `redis` (production)
- CSRF protection: Aktiv (session-based auth üçün)

**Frontend:**
- Default auth: Bearer token (`VITE_ENABLE_BEARER_AUTH=true`)
- CSRF token dəstəyi: ✅ `getAuthHeaders()` metodunda
- Runtime toggle: ✅ `enableBearerAuth()` / `disableBearerAuth()`

## 🔧 Development Environment Quraşdırılması

### 1. Backend Konfiqurasiyası

```bash
cd backend

# .env faylını yoxla
grep "AUTH_GUARD" .env || echo "AUTH_GUARD=sanctum" >> .env
grep "SESSION_DRIVER" .env || echo "SESSION_DRIVER=file" >> .env

# Cache clear
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan cache:clear
```

### 2. Frontend Konfiqurasiyası

```bash
cd frontend

# .env faylını yoxla
grep "VITE_ENABLE_BEARER_AUTH" .env || echo "VITE_ENABLE_BEARER_AUTH=true" >> .env

# Rebuild
npm run build
```

### 3. Docker Container Restart

```bash
./stop.sh
./start.sh

# Verify Redis connection
docker exec atis_backend redis-cli -h redis ping
# Expected: PONG
```

## 🚀 Production Deployment Checklist

### Pre-Deployment

- [ ] Backup production database
- [ ] Backup production `.env` files
- [ ] Verify Redis server running and accessible
- [ ] Test authentication flow in staging environment
- [ ] Review all uncommitted changes
- [ ] Run full test suite (backend + frontend)

### Deployment Steps

#### Backend:

```bash
# 1. Update .env
AUTH_GUARD=sanctum
SESSION_DRIVER=redis
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true

# 2. Deploy code
git pull origin main
composer install --no-dev --optimize-autoloader

# 3. Clear and cache config
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Restart services
systemctl restart php-fpm
systemctl restart nginx
```

#### Frontend:

```bash
# 1. Update .env.production
VITE_ENABLE_BEARER_AUTH=true

# 2. Build optimized production bundle
npm run build

# 3. Deploy to production server
rsync -avz --delete dist/ production:/var/www/html/frontend/
```

### Verify Deployment

```bash
# Test login endpoint
curl -X POST https://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Expected response:
# {
#   "success": true,
#   "token": "1|...",
#   "user": {...}
# }

# Test authenticated endpoint
curl -X GET https://your-domain.com/api/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK with user data
```

### Post-Deployment

- [ ] Monitor error logs for 24 hours (`tail -f storage/logs/laravel.log`)
- [ ] Check authentication success rate in analytics
- [ ] Verify Redis session storage (`redis-cli KEYS "laravel_session:*"`)
- [ ] Test CSRF protection on session-based endpoints
- [ ] Performance monitoring (response times, memory usage)
- [ ] User feedback collection

## 🧪 Testing Guide

### Backend Tests

```bash
# Run all authentication tests
docker exec atis_backend php artisan test tests/Feature/AuthenticationGuardTest.php

# Expected: 6 passed (10 assertions)
```

### Frontend Tests

```bash
# Run CSRF token tests
npm run test -- src/services/__tests__/apiOptimized.test.ts

# Expected: 9 passed
```

### Manual Testing Checklist

- [ ] Login with Bearer token (API client)
- [ ] Login with session cookies (browser)
- [ ] Logout from Bearer token session
- [ ] Logout from session-based session
- [ ] Invalid token rejection (401)
- [ ] Unauthenticated endpoint access (401)
- [ ] CSRF token validation (session-based)
- [ ] Multi-device login scenarios
- [ ] Session timeout handling

## 🔍 Troubleshooting

### Problem: 401 Unauthorized errors

**Səbəb:** Backend və frontend auth method uyğunsuzluğu

**Həll:**

```bash
# Backend check
docker exec atis_backend php artisan tinker
>>> config('auth.defaults.guard')
# Expected: "sanctum"

# Frontend check (browser console)
console.log(apiClient.isBearerAuthEnabled())
# Expected: true
```

### Problem: CSRF token mismatch

**Səbəb:** CSRF cookie oxunmur və ya yanlış format

**Həll:**

```bash
# 1. Backend CSRF cookie endpoint check
docker exec atis_backend php artisan route:list | grep sanctum/csrf-cookie
# Expected: GET /sanctum/csrf-cookie

# 2. Frontend cookie check (browser console)
document.cookie
# Should contain: XSRF-TOKEN=...

# 3. Test CSRF cookie retrieval
curl -c cookies.txt https://your-domain.com/sanctum/csrf-cookie
cat cookies.txt | grep XSRF-TOKEN
```

### Problem: Session not persisting

**Səbəb:** Redis connection failure və ya session driver misconfiguration

**Həll:**

```bash
# 1. Check Redis connectivity
docker exec atis_backend redis-cli -h redis ping
# Expected: PONG

# 2. Check session driver
docker exec atis_backend php artisan tinker
>>> config('session.driver')
# Expected: "redis" (production) or "file" (development)

# 3. Test session storage
docker exec atis_backend redis-cli -h redis KEYS "laravel_session:*"
```

### Problem: CORS errors

**Səbəb:** Frontend domain CORS whitelist-də deyil

**Həll:**

```bash
# Check backend config/cors.php
docker exec atis_backend cat config/cors.php | grep allowed_origins

# Update .env if needed
SANCTUM_STATEFUL_DOMAINS=localhost:3000,your-domain.com
```

## 🔄 Rollback Procedure

Əgər deployment zamanı kritik problem yaranarsa:

```bash
# 1. Backend .env revert
AUTH_GUARD=sanctum  # Keep original value
SESSION_DRIVER=redis  # Keep original value

# 2. Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# 3. Restart services
systemctl restart php-fpm
systemctl restart nginx
systemctl restart redis

# 4. Verify system health
curl https://your-domain.com/api/health
# Expected: 200 OK

# 5. Monitor logs
tail -f storage/logs/laravel.log
```

## 📊 Performance Considerations

### Redis Session Storage

- **Advantage:** Fast, scalable, supports multi-server deployments
- **Memory usage:** ~2KB per active session
- **TTL:** 120 minutes (configurable via `SESSION_LIFETIME`)

### Bearer Token Authentication

- **Advantage:** Stateless, no server-side session storage
- **Database impact:** 1 query per request (token lookup in `personal_access_tokens`)
- **Token lifetime:** Configurable in `config/sanctum.php`

### Optimization Tips

```bash
# 1. Enable Redis persistent connection
REDIS_CLIENT=phpredis  # Faster than Predis

# 2. Configure token expiration
SANCTUM_EXPIRATION=1440  # 24 hours (in minutes)

# 3. Enable session garbage collection
SESSION_ENCRYPT=true
SESSION_LOTTERY=[2, 100]  # 2% chance per request
```

## 🔐 Security Best Practices

### Production Environment

```bash
# .env.production
APP_DEBUG=false
SESSION_SECURE_COOKIE=true  # HTTPS only
SESSION_HTTP_ONLY=true      # No JavaScript access
SESSION_SAME_SITE=lax       # CSRF protection
SESSION_ENCRYPT=true        # Encrypt session data
```

### Token Management

- **Token rotation:** Implement periodic token refresh
- **Token revocation:** Provide user logout from all devices
- **Token scoping:** Use abilities for granular permissions

```php
// Example: Create token with specific abilities
$token = $user->createToken('mobile-app', ['read-posts', 'create-posts']);
```

## 📚 Additional Resources

- [Laravel Sanctum Documentation](https://laravel.com/docs/11.x/sanctum)
- [CSRF Protection Guide](https://laravel.com/docs/11.x/csrf)
- [Session Configuration](https://laravel.com/docs/11.x/session)
- [ATİS Architecture Overview](./ARCHITECTURE.md)
- [Sanctum Guard Migration](./sanctum-guard-migration.md)

## 🆘 Support

Əgər problemlə qarşılaşsanız:

1. **Check logs:** `storage/logs/laravel.log`
2. **Review documentation:** `/documentation/ops/`
3. **Test locally:** Docker environment ilə reproduce edin
4. **Contact DevOps:** Kritik production issues üçün

---

**Versiya:** 1.0
**Son yeniləmə:** 2025-10-29
**Müəllif:** ATİS DevOps Team
