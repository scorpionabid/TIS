#!/bin/bash

# ATİS Session Start Hook
# Fires at session start and after /compact
# Re-injects critical project context that would otherwise be lost

cat << 'EOF'
── ATİS SESSION CONTEXT ────────────────────────────────────────────────────

PROJECT: ATİS — Azerbaijan Education Management System (LIVE, 22+ institutions)

CRITICAL RULES (must follow every session):
  1. Docker-only: ./start.sh to run. Never php artisan serve / npm run dev directly.
  2. Never modify existing migrations — always create new ones.
  3. Never run migrate:fresh or db:seed (full) in production.
  4. All API endpoints require permission checks.
  5. No TypeScript `any` types — strict mode enforced.

STACK:
  Backend  → Laravel 11 / PHP 8.3 / PostgreSQL 16 / Redis 7
  Frontend → React 19 / TypeScript / Tailwind 3.4 / Shadcn/ui

CONTAINERS: atis_backend | atis_frontend | atis_postgres | atis_redis
API: http://localhost:8000/api   Frontend: http://localhost:3000

ROLE HIERARCHY (10 roles):
  SuperAdmin → RegionAdmin → RegionOperator → SektorAdmin → SchoolAdmin
                                                               ↓
                                              müəllim | muavin | ubr | tesarrufat | psixoloq

QUICK COMMANDS:
  /atis-start   → Sistemin işə salınması
  /atis-db      → Database əməliyyatları
  /atis-test    → Test suite
  /atis-debug   → Debug & troubleshooting

QUALITY GATES (before commit):
  docker exec atis_frontend npm run lint
  docker exec atis_frontend npm run typecheck
  docker exec atis_backend php artisan test

────────────────────────────────────────────────────────────────────────────
EOF
