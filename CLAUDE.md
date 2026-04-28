# CLAUDE.md

ATİS — Azerbaijan Education Management System (Ministry of Education). **LIVE with 22+ institutions.**

## Stack

- **Backend**: Laravel 11, PHP 8.3, PostgreSQL 16, Redis 7, Laravel Sanctum
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 3.4, Shadcn/ui, @tanstack/react-query
- **Infrastructure**: Docker — atis_backend | atis_frontend | atis_postgres | atis_redis
- **Permissions**: spatie/laravel-permission, hierarchical RBAC
- **Primary language**: TypeScript (frontend) / PHP (backend) — always run `tsc` and lint before committing

## ⚠️ Critical Rules

1. **Docker-only** — NEVER `php artisan serve` or `npm run dev` directly
2. **NEVER modify existing migrations** — always create new migration files
3. **NEVER connect to production database** from development
4. **Azerbaijani responses** — but English technical terms
5. **Search before creating** — check for existing components/services first
6. **No `any` types** in TypeScript — strict mode enforced
7. **Permission checks required** on all new API endpoints
8. **Quality gates before commit** (see below)

## Coding Mode

**Mode A — Fast** (UI fix, label, small addition):
- Read existing code → implement immediately → summarize in one sentence

**Mode B — Planned** (new module, migration, API, refactor 50+ lines):
- User Intent → Technical Interpretation → Impact → Plan → Quality Gates

| Task | Mode |
|---|---|
| UI change, fix, label | A |
| New API endpoint, migration, module | B |
| Refactor 50+ lines | B |

**Rule:** Read first, write second. For ambiguous requests, apply the most logical interpretation, implement, then ask "I understood this as X — is that correct?"

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

## Quality Gates (MANDATORY before commit)

```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_backend php artisan test
docker exec atis_backend composer audit
docker exec atis_frontend npm audit --audit-level=moderate
docker restart atis_frontend
```

## Architecture

```
Roles (10):  SuperAdmin → RegionAdmin → RegionOperator → SektorAdmin → SchoolAdmin
                                                                            ↓
                                                         müəllim | muavin | ubr | tesarrufat | psixoloq

Institutions: Ministry → Regional Office → Sector → School/Preschool
```

**Patterns:** Data isolation by hierarchy level · BaseService in `frontend/src/services/` · `useAuth()` + `usePermissions()` hooks · API Resources for all responses · Eager loading always

## Git & Commits

- After completing a task, commit AND push to remote unless told otherwise
- Check both root and `backend/` `.gitignore` files before committing new config files (e.g., `.env.testing`)
- Before creating pre-commit hooks, test regex patterns against real commit message content to avoid false positives

## Access Control & Permissions

When modifying role-based features, always check all four layers:
1. Backend route role guards (middleware)
2. Frontend `hasAccess` / `hasPermission` checks
3. Role-specific hooks (e.g., `isRegionAdmin`)
4. Navigation visibility

Do not declare a role-based task complete until all four layers are verified.

## Execution Style

- When the user presents suggestions/improvements in a plan, treat them as items to execute **NOW** unless explicitly marked as "future" or "optional"
- Before refactoring or removing existing UI elements, use `git log`/`git blame` to confirm they weren't intentionally added in a recent commit

## Production Safety

- **NEVER** `migrate:fresh` or full `db:seed` in production
- Safe seeders only: `RoleSeeder`, `PermissionSeeder`, `SuperAdminSeeder`
- All migrations must be reversible (write `down()` method)

## Session & Context Management

| Situation | Action |
|----------|-------|
| Large feature completed | `/compact` — save summary, clear context |
| Completely different task | `/clear` — fresh context |
| Codebase exploration needed | Spawn subagent — protects main context |
| Context 80%+ full | `/compact` immediately, then continue |
| Mode B planning | Call `plan-architect` agent |
| Security review needed | `/security-review` skill |

**When to use subagents:** File search, impact analysis, exploration — delegate to subagent, receive result as summary.

## References

- Permission rules: @.claude/references/atis-permissions-guide.md
- Change impact analysis: @.claude/references/atis-impact-analyzer.md
- Production deployment + safety + code style: @.claude/references/production-guide.md
- Backend rules: @backend/CLAUDE.md
- Frontend rules: @frontend/CLAUDE.md

## Dev Credentials & URLs

- Frontend: http://localhost:3000 · API: http://localhost:8000/api
- SuperAdmin: `superadmin / admin123` · RegionAdmin: `regionadmin1 / admin123`
