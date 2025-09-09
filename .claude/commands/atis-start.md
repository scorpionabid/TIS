---
name: atis-start
description: ATİS layihəsini Docker ilə başlat və statusunu yoxla
---

ATİS layihəsini başlatmaq üçün aşağıdakı addımları həyata keçir:

1. **Mövcud prosesləri dayandır**: `./stop.sh` əmrini işə sal
2. **Yeni konteinərləri başlat**: `./start.sh` əmrini işə sal  
3. **Docker konteinər statusunu yoxla**: `docker-compose -f docker-compose.simple.yml ps`
4. **Backend loglarını yoxla**: `docker-compose -f docker-compose.simple.yml logs backend --tail=20`
5. **Frontend loglarını yoxla**: `docker-compose -f docker-compose.simple.yml logs frontend --tail=20`
6. **URL-ləri test et**: 
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
7. **Database bağlantısını yoxla**: `docker exec atis_backend php artisan tinker --execute="DB::connection()->getPdo(); echo 'DB OK'"`

**Əgər problem olarsa:**
- Portların boş olduğunu yoxla: `lsof -ti:8000,8001,8002,3000`  
- Zəruri hallarda portları kill et: `lsof -ti:8000,8001,8002,3000 | xargs kill -9 2>/dev/null || true`
- Docker volume problemləri üçün: `docker system prune -f`

**Test kredensialları:**
- SuperAdmin: superadmin@atis.az / admin123
- RegionAdmin: admin@atis.az / admin123