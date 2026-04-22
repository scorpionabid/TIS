# CLAUDE.md

ATİS — Azerbaijan Education Management System (Ministry of Education). **LIVE with 22+ institutions.**

## Stack

- **Backend**: Laravel 11, PHP 8.3, PostgreSQL 16, Redis 7, Laravel Sanctum
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 3.4, Shadcn/ui, @tanstack/react-query
- **Infrastructure**: Docker — atis_backend | atis_frontend | atis_postgres | atis_redis
- **Permissions**: spatie/laravel-permission, hierarchical RBAC

## Vibe Coding Rejimi

**Rejim A — Sürətli** (UI fix, label, kiçik əlavə):
- Mövcud kodu oxu → dərhal implement et → nəticəni bir cümlə ilə yaz

**Rejim B — Planlı** (yeni modul, migration, API, refactor 50+ sətir):
- **User Intent (AZ)** → **Technical Interpretation (EN)** → **Impact** → **Plan** → **Quality Gates**

| Tapşırıq | Rejim |
|---|---|
| UI dəyişikliyi, fix, label | A |
| Yeni API endpoint, migration, modul | B |
| Refactor 50+ sətir | B |

**Qaydalar:** Əvvəlcə oxu, sonra yaz. Natamam tələb varsa ən məntiqli şərhi et, implement et, sonunda "X olaraq başa düşdüm, düzgündürmü?" de.

## ⚠️ Critical Rules

1. **Docker-only** — NEVER `php artisan serve` or `npm run dev` directly
2. **NEVER modify existing migrations** — always create new migration files
3. **NEVER connect to production database** from development
4. **Azerbaijani responses** — but English technical terms
5. **Search before creating** — check for existing components/services first
6. **No `any` types** in TypeScript — strict mode enforced
7. **Permission checks required** on all new API endpoints
8. **Quality gates before commit** (see below)

## Commands

```bash
./start.sh && ./stop.sh          # System start/stop (ONLY way)

docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan test
docker exec atis_backend php artisan tinker
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_postgres psql -U atis_dev_user -d atis_dev
```

## Quality Gates (MANDATORY)

```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_backend php artisan test
docker exec atis_backend composer audit
docker exec atis_frontend npm audit --audit-level=moderate
```

## Architecture

```
Roles (10):  SuperAdmin → RegionAdmin → RegionOperator → SektorAdmin → SchoolAdmin
                                                                            ↓
                                                         müəllim | muavin | ubr | tesarrufat | psixoloq

Institutions: Ministry → Regional Office → Sector → School/Preschool
```

**Patterns:** Data isolation by hierarchy level · BaseService in `frontend/src/services/` · `useAuth()` + `usePermissions()` hooks · API Resources for all responses · Eager loading always

## References

Ətraflı məlumat üçün bu faylları oxu:
- Permission rules: @.claude/references/atis-permissions-guide.md
- Change impact analysis: @.claude/references/atis-impact-analyzer.md
- Production deployment + safety + code style: @.claude/references/production-guide.md
- Backend rules: @backend/CLAUDE.md
- Frontend rules: @frontend/CLAUDE.md

## Production Safety (Quick)

- **NEVER** `migrate:fresh` or full `db:seed` in production
- Safe seeders only: `RoleSeeder`, `PermissionSeeder`, `SuperAdminSeeder`
- All migrations must be reversible

## Session & Context Management

| Vəziyyət | Nə et |
|----------|-------|
| Böyük feature tamamlandı | `/compact` — summary saxla, context təmizlə |
| Tamamilə fərqli tapşırıq | `/clear` — fresh context |
| Codebase araşdırması lazımdır | Subagent işlət — main context-i qoruyur |
| Context 80%+ dolub | Dərhal `/compact`, sonra davam et |
| Rejim B planlaşdırması | `plan-architect` agent çağır |
| Kod təhlükəsizlik yoxlaması | `/security-review` skill |

**Subagent nə vaxt:** Fayl axtarışı, impact analizi, araşdırma — exploration işi subagent-ə ver, nəticəni summary kimi al.

## Dev Credentials & URLs

- Frontend: http://localhost:3000 · API: http://localhost:8000/api
- SuperAdmin: `superadmin / admin123` · RegionAdmin: `regionadmin1 / admin123`

Add a new ## Git & Commits section near the top of CLAUDE.md\n\n## Git & Commits
- Always check both root and backend/subdirectory .gitignore files before committing new config files (e.g., .env.testing)
- Before creating pre-commit hooks, test regex patterns against common commit message content like 'php artisan serve' to avoid false positives
- After completing a task, commit AND push to remote unless told otherwise
Add as a new ## Access Control & Permissions section\n\n## Access Control & Permissions
- When modifying role-based features, always check: (1) backend route role guards, (2) frontend hasAccess/permission checks, (3) role-specific hooks (e.g., isRegionAdmin), (4) navigation visibility
- Run through all four permission layers before declaring a role-based task complete
Add as a new ## Execution Style section\n\n## Execution Style
- When user presents suggestions/improvements in a plan, treat them as items to execute NOW unless explicitly marked as 'future' or 'optional'
- Before refactoring or removing existing UI elements, use git log/blame to confirm they weren't intentionally added in a recent commit
Add as a ## Tech Stack section near the top\n\n## Tech Stack
- Primary language: TypeScript (with Python/PHP backend). Always run `tsc` and lint before committing.
- Project uses Laravel backend with PHPUnit tests and React/Next.js frontend