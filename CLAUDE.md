# CLAUDE.md

This file provides guidance to Claude Code when working with the ATİS Education Management System.

## Project Overview

ATİS (Alignment, Training & Inspection System) - Educational Institution Management System for Azerbaijan's Ministry of Education.

- **Backend**: Laravel 11, PHP 8.3, PostgreSQL 16, Redis 7, Laravel Sanctum
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 3.4, Shadcn/ui, Radix UI, @tanstack/react-query
- **Infrastructure**: Docker (4 containers: atis_backend, atis_frontend, atis_postgres, atis_redis)
- **Permissions**: spatie/laravel-permission with hierarchical RBAC

## Natural Language → Technical Translation Rule

When user gives instructions in simple Azerbaijani:

1. First, translate to clear technical English
2. Then restate as formal development task
3. Then implement

Always follow this format:

### User Intent (AZ)
### Technical Interpretation (EN)
### Implementation Plan
### Code Changes
### Tests (if any)
### Quality Gates (if any)

## ⚠️ Critical Rules

1. **Docker-only development** — NEVER use `php artisan serve` or local `npm run dev`
2. **NEVER modify existing migrations** — always create new migration files
3. **NEVER connect to production database** from development
4. **All responses/explanations in Azerbaijani** — but use English technical terms
5. **Search before creating** — always check for existing similar components/services before creating new ones
6. **No `any` types** in TypeScript — strict mode enforced
7. **Permission checks required** on all new API endpoints
8. **Test before commit** — run quality gates below

## Development Commands

```bash
# System start/stop (ONLY way)
./start.sh
./stop.sh

# Backend (inside container)
docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan test
docker exec atis_backend php artisan tinker
docker exec atis_backend composer install

# Frontend (inside container)
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_frontend npm run build
docker exec atis_frontend npm install

# Database
docker exec atis_postgres psql -U atis_dev_user -d atis_dev
docker exec atis_backend php artisan migrate:fresh --seed  # Dev only!
```

## Pre-commit Quality Gates (MANDATORY)

```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_backend php artisan test
docker exec atis_backend composer test
docker exec atis_frontend npm audit --audit-level=moderate
docker exec atis_backend composer audit
```

## Architecture

### Role Hierarchy (12 roles)
```
SuperAdmin → RegionAdmin → RegionOperator → SektorAdmin → SchoolAdmin → Teachers
```

### Institution Hierarchy (4 levels)
```
Ministry → Regional Office → Sector → School/Preschool
```

### Key Patterns
- **Data isolation**: Users only see data within their hierarchy level
- **Service layer**: API calls via BaseService pattern in `frontend/src/services/`
- **Permission guards**: Frontend uses `useAuth()`, `usePermissions()` hooks
- **API Resources**: Backend uses Laravel API Resources for response transformation
- **Eager loading**: Always use eager loading to avoid N+1 queries

## Key References

For detailed information, Claude should read these files when relevant:
- **Permission rules per page**: `.claude/references/atis-permissions-guide.md`
- **Change impact analysis**: `.claude/references/atis-impact-analyzer.md`
- **Backend-specific rules**: `backend/CLAUDE.md`
- **Frontend-specific rules**: `frontend/CLAUDE.md`

## Code Style

### Backend (Laravel)
- PSR-12 coding standards
- FormRequest classes for validation
- API Resource classes for responses
- Eloquent relationships with proper eager loading
- Service classes for complex business logic

### Frontend (React)
- TypeScript strict mode, no `any`
- Shadcn/ui components from `src/components/ui/`
- Tailwind CSS for styling (not inline styles)
- React Query for server state
- Zod for form validation with react-hook-form

## AI Code Review Requirements

Before committing AI-generated code:
- [ ] Can you explain every line?
- [ ] Follows existing project patterns?
- [ ] No hardcoded secrets, proper validation?
- [ ] Database queries optimized (no N+1)?
- [ ] TypeScript types complete?
- [ ] Tests written or updated?

## Production Safety

ATİS is LIVE with 22+ real educational institutions. Every change matters.
- Never run `migrate:fresh` in production
- All migrations must be reversible
- Create rollback plans for schema changes
- Test with production-like data volumes

## Test Credentials (DEVELOPMENT ONLY)

- **SuperAdmin**: superadmin / admin123
- **RegionAdmin**: regionadmin1 / admin123


## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
