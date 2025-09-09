---
name: atis-debug
description: ATİS layihəsində debug və troubleshooting
---

ATİS layihəsində debugging və problem həlli:

## Container Status Debug
1. **Konteinər statusu**: `docker-compose -f docker-compose.simple.yml ps`
2. **Running proseslər**: `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`
3. **Container resource istifadəsi**: `docker stats atis_backend atis_frontend --no-stream`

## Log Təhlili
1. **Backend loglar (son 50 sətir)**: `docker-compose -f docker-compose.simple.yml logs backend --tail=50 -f`
2. **Frontend loglar**: `docker-compose -f docker-compose.simple.yml logs frontend --tail=50 -f`
3. **Laravel loglar**: `docker exec atis_backend tail -f /var/www/storage/logs/laravel.log`
4. **Error logları**: `docker exec atis_backend grep -i error /var/www/storage/logs/laravel.log | tail -10`

## Performance Debug
1. **PHP memory istifadəsi**: `docker exec atis_backend php -m | grep -i memory`
2. **Disk space yoxlaması**: `docker exec atis_backend df -h`
3. **Network bağlantıları**: `docker exec atis_backend netstat -tlnp | grep :8000`

## Database Debug
1. **DB bağlantı problemi**: `docker exec atis_backend php artisan migrate:status`
2. **Slow queries**: `docker exec atis_backend php artisan telescope:clear && php artisan tinker --execute="DB::enableQueryLog(); User::first(); dd(DB::getQueryLog());"`
3. **Lock-lar**: `docker exec atis_backend php artisan queue:restart`

## Frontend Debug
1. **Build errors**: `docker exec atis_frontend npm run build 2>&1 | grep -i error`
2. **TypeScript errors**: `docker exec atis_frontend npx tsc --noEmit --skipLibCheck`
3. **Package dependencies**: `docker exec atis_frontend npm audit --audit-level=high`

## Network Debug
1. **Port konflikti yoxlaması**: `lsof -ti:8000,8001,8002,3000`
2. **API bağlantı test**: `curl -I http://localhost:8000/api/health || echo 'Backend API əlçatan deyil'`
3. **Frontend bağlantı test**: `curl -I http://localhost:3000 || echo 'Frontend əlçatan deyil'`

## Emergency Commands
1. **Bütün ATİS konteinerlərini dayandır**: `docker kill atis_backend atis_frontend 2>/dev/null || true`
2. **Port təmizlənməsi**: `lsof -ti:8000,8001,8002,3000 | xargs kill -9 2>/dev/null || true`
3. **Docker cache təmizlənməsi**: `docker system prune -f --volumes`