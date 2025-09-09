---
name: atis-test
description: ATİS layihəsinin tam test suite-ini işə sal və nəticələri göstər
---

ATİS layihəsi üçün hərtərəfli test proseduru:

## Backend Testləri
1. **Unit testlər**: `docker exec atis_backend php artisan test --testsuite=Unit`
2. **Feature testlər**: `docker exec atis_backend php artisan test --testsuite=Feature` 
3. **Bütün testlər**: `docker exec atis_backend php artisan test --stop-on-failure`
4. **Test coverage**: `docker exec atis_backend php artisan test --coverage --min=80`

## Frontend Testləri  
1. **Jest unit testlər**: `docker exec atis_frontend npm test -- --watchAll=false`
2. **TypeScript yoxlaması**: `docker exec atis_frontend npx tsc --noEmit`
3. **Linting**: `docker exec atis_frontend npm run lint`
4. **Build test**: `docker exec atis_frontend npm run build`

## Database Testləri
1. **Migration testlər**: `docker exec atis_backend php artisan migrate:fresh --seed --env=testing`
2. **Seeder testlər**: `docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --env=testing`

## API Endpoint Testləri
1. **Auth endpoints**: `docker exec atis_backend php artisan test --filter=AuthTest`
2. **Institution endpoints**: `docker exec atis_backend php artisan test --filter=InstitutionTest`
3. **Survey endpoints**: `docker exec atis_backend php artisan test --filter=SurveyTest`

## Performance Testləri
1. **Load test simulation**: Docker konteinər performance monitor
2. **Memory usage check**: `docker stats atis_backend atis_frontend --no-stream`

**Test nəticələri analizi:**
- ✅ Keçən testlər: Yaşıl
- ❌ Uğursuz testlər: Qırmızı  
- ⚠️ Skip edilən testlər: Sarı

**Test bazasını təmizləmək:**
`docker exec atis_backend php artisan migrate:fresh --env=testing`