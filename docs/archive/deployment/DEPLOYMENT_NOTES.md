# ATİS Production Deployment Notes

## Critical Production Configuration

### Environment Variables
**IMPORTANT**: Frontend kodu `VITE_API_BASE_URL` environment variable istifadə edir.

Production environment faylı (`frontend/.env.production`) mütləq bu formatda olmalıdır:
```
VITE_API_BASE_URL=https://atis.sim.edu.az/api
VITE_APP_URL=https://atis.sim.edu.az
```

**SƏHV**: `VITE_API_URL` istifadə etməyin
**DOĞRU**: `VITE_API_BASE_URL` istifadə edin

### Docker Build Process
Production Docker build prosesi düzgün işləməsi üçün:
1. `docker/frontend/Dockerfile.production` faylında `.env.production` faylı `.env` kimi kopya olunur
2. Bu əsas `.env` faylını override edir və production URL-ləri istifadə edir

### Deployment Commands
GitHub pull-dan sonra production yenidən deploy etmək üçün:
```bash
cd /srv/atis/TIS
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up --build -d
```

### Verification
Deploy-dan sonra frontend-də production URL-lər istifadə olunduğunu yoxlamaq üçün:
```bash
docker exec atis_frontend_prod cat /usr/share/nginx/html/assets/index-*.js | grep -o "localhost\|https://atis.sim.edu.az" | head -5
```

Nəticədə `https://atis.sim.edu.az` görünməli, `localhost` minimal olmalıdır.

## Common Issues After GitHub Pull

1. **Login işləmir**: Yəqin ki environment variable problemidir
2. **Boş səhifə**: Frontend localhost istifadə edə bilər
3. **API errors**: Backend/frontend arasında URL uyğunsuzluğu

**Həlli**: Yuxarıdakı deployment komandlarını yenidən işlət.

---
Generated on: $(date)
Last GitHub pull resolved: Changed VITE_API_URL → VITE_API_BASE_URL