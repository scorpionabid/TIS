# ATİS Production Guide

## Deployment (Server Pull)

```bash
cd /srv/atis/TIS && ./pull.sh
```

Bu skript avtomatik: DB backup + yoxlama → git pull → docker build → migrate → health check edir.

**Qeydlər:**
- `docker-compose.yml` production dəyərləri ilə lokalda saxlanılır (`git skip-worktree`)
- Postgres: `postgres_v2` container, `postgres_data` volume, port `5434`
- `backend/.env`-də `DB_HOST=atis_postgres` olmalıdır
- n8n postgres port `5433` işlədilir — konflikt riski var
- Backuplar: `database-backups/` (son 5 saxlanılır)
- Pull zamanı `docker-compose.yml` remote-da dəyişibsə, skript avtomatik stash/pop edir

## Production Safety Rules

- Never run `migrate:fresh` in production
- All migrations must be reversible — write `down()` method
- Create rollback plan for schema changes before applying
- Test with production-like data volumes

## Safe Seeders Only

`php artisan db:seed` (full) QADAĞANDIR — fake data yaradır.

Yalnız bu core seeders-i işlət:
```bash
docker exec atis_backend php artisan db:seed --class=RoleSeeder --force
docker exec atis_backend php artisan db:seed --class=PermissionSeeder --force
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force
docker exec atis_backend php artisan db:seed --class=RegionOperatorPermissionSeeder --force
docker exec atis_backend php artisan db:seed --class=RegionAdminPermissionBalanceSeeder --force
```

`pull.sh` yalnız bu core seeders-i avtomatik çalışdırır.

## Code Style Reference

### Backend (Laravel)
- PSR-12 coding standards
- FormRequest classes for all validation
- API Resource classes for all responses
- Eager loading always — avoid N+1 queries
- Service classes for complex business logic
- `$this->authorize()` on every controller action

### Frontend (React)
- TypeScript strict mode — no `any` types
- Shadcn/ui components from `src/components/ui/`
- Tailwind CSS only — no inline styles
- React Query for server state, Context for client state
- Zod + react-hook-form for form validation
- Lucide React v0.462.0 for icons

## AI Code Review Checklist

Before committing AI-generated code:
- [ ] Can you explain every line?
- [ ] Follows existing project patterns?
- [ ] No hardcoded secrets, proper validation?
- [ ] Database queries optimized (no N+1)?
- [ ] TypeScript types complete (no `any`)?
- [ ] Permission checks on new API endpoints?
- [ ] Tests written or updated?
