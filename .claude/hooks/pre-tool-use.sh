#!/bin/bash

# ATİS Pre-Tool-Use Hook
# Receives JSON via stdin with tool_name, tool_input fields
# Exit 0  → allow (with optional JSON decision)
# Exit 2  → BLOCK (stderr message shown to Claude)

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# ── HARD BLOCKS ─────────────────────────────────────────────────────────────

# Block local php artisan serve (Docker-only rule)
# Match only when command actually executes it — not when it appears in a string/message
if [[ "$TOOL" == "Bash" ]] && echo "$COMMAND" | grep -qE '^\s*(php artisan serve|php\s+artisan\s+serve)' 2>/dev/null; then
    echo "❌ BLOCKED: 'php artisan serve' qadağandır. Docker istifadə et: ./start.sh" >&2
    exit 2
fi

# Block direct npm run dev outside Docker
if [[ "$TOOL" == "Bash" ]] && echo "$COMMAND" | grep -qE '^\s*npm run dev' 2>/dev/null && [[ "$COMMAND" != *"docker"* ]]; then
    echo "❌ BLOCKED: 'npm run dev' birbaşa qadağandır. Docker istifadə et: ./start.sh" >&2
    exit 2
fi

# Block writing to production .env directly
if [[ "$TOOL" == "Write" ]] && [[ "$FILE_PATH" == *".env"* ]] && [[ "$FILE_PATH" != *".env.example"* ]]; then
    echo "❌ BLOCKED: .env faylı birbaşa yazıla bilməz. Manuel olaraq dəyişdir." >&2
    exit 2
fi

# Block modifying existing migrations (ATİS critical rule)
if [[ "$TOOL" == "Edit" || "$TOOL" == "MultiEdit" ]] && [[ "$FILE_PATH" == *"database/migrations"* ]]; then
    echo "❌ BLOCKED: Mövcud migration-ı dəyişmək qadağandır. Yeni migration yarat." >&2
    exit 2
fi

# ── WARNINGS (exit 0, stderr only) ──────────────────────────────────────────

# Production config file warning
if [[ "$FILE_PATH" == *"docker-compose.yml"* ]] || [[ "$FILE_PATH" == *"docker-compose.prod"* ]]; then
    echo "⚠️  XƏBƏRDARLIQ: Production konfiqurasiya faylı dəyişdirilir: $FILE_PATH" >&2
fi

# Permission/Role change reminder
if [[ "$FILE_PATH" == *"Permission"* ]] || [[ "$FILE_PATH" == *"RoleSeeder"* ]]; then
    echo "🔐 Xatırlatma: Permission/Role dəyişikliyi. Sonra çalışdır: php artisan permission:cache-reset" >&2
fi

# New migration file warning (write is OK, just remind)
if [[ "$TOOL" == "Write" ]] && [[ "$FILE_PATH" == *"database/migrations"* ]]; then
    echo "🗄️  Yeni migration. Sonra: docker exec atis_backend php artisan migrate" >&2
fi

# Component duplication check (lightweight — only basename match)
if [[ "$TOOL" == "Write" ]] && ([[ "$FILE_PATH" == *"/components/"* ]] || [[ "$FILE_PATH" == *"/pages/"* ]]); then
    base=$(basename "$FILE_PATH" .tsx)
    base=$(basename "$base" .ts)
    base=$(basename "$base" .php)
    count=$(find ./frontend/src ./backend/app -name "*${base}*" 2>/dev/null | grep -v node_modules | grep -v vendor | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Oxşar fayl mövcuddur: '$base' ($count ədəd). Dublikat olmasın?" >&2
    fi
fi

exit 0
