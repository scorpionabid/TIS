#!/bin/bash

# ATİS Post-Tool-Use Hook
# Runs after Write/Edit/MultiEdit operations
# Provides actionable next-step reminders

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

[[ -z "$FILE_PATH" ]] && exit 0

# ── MIGRATION ────────────────────────────────────────────────────────────────
if [[ "$FILE_PATH" == *"database/migrations"* ]]; then
    echo "🗄️  Migration yaradıldı → docker exec atis_backend php artisan migrate" >&2
fi

# ── SEEDER CHANGED ───────────────────────────────────────────────────────────
if [[ "$FILE_PATH" == *"PermissionSeeder"* ]] || [[ "$FILE_PATH" == *"RoleSeeder"* ]]; then
    SEEDER=$(basename "$FILE_PATH" .php)
    echo "🔐 Seeder dəyişdi → Addımlar:" >&2
    echo "   1. docker exec atis_backend php artisan db:seed --class=${SEEDER}" >&2
    echo "   2. docker exec atis_backend php artisan permission:cache-reset" >&2
fi

# ── TYPESCRIPT FILE → typecheck reminder ────────────────────────────────────
if [[ "$FILE_PATH" == *".tsx" ]] || [[ "$FILE_PATH" == *".ts" ]] && [[ "$FILE_PATH" != *".d.ts" ]]; then
    # Only remind if it's a logic file (not just type def)
    if [[ "$FILE_PATH" != *"/types/"* ]]; then
        echo "🔷 TS fayl dəyişdi → docker exec atis_frontend npm run typecheck" >&2
    fi
fi

# ── PHP FILE → pint reminder ─────────────────────────────────────────────────
if [[ "$FILE_PATH" == *".php" ]]; then
    echo "🐘 PHP fayl dəyişdi → docker exec atis_backend ./vendor/bin/pint $FILE_PATH" >&2
fi

# ── API ROUTE CHANGED → test reminder ────────────────────────────────────────
if [[ "$FILE_PATH" == *"routes/api.php"* ]]; then
    echo "🛣️  API routes dəyişdi → docker exec atis_backend php artisan test" >&2
fi

# ── BULK CHANGE WARNING ───────────────────────────────────────────────────────
if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    CHANGED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CHANGED" -gt 15 ]; then
        echo "📊 $CHANGED fayl dəyişib — commit etməyin vaxtıdır." >&2
    fi
fi

exit 0
