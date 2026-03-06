#!/bin/bash

# ATİS Post-Tool-Use Hook
# Runs after Write/Edit/MultiEdit operations
# Receives JSON via stdin with tool_name, tool_input fields

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

# Skip if no file path
[[ -z "$FILE_PATH" ]] && exit 0

# Migration file reminder
if [[ "$FILE_PATH" == *"database/migrations"* ]]; then
    echo "🗄️ New migration detected. Run: docker exec atis_backend php artisan migrate" >&2
fi

# Permission/Role seeder changed
if [[ "$FILE_PATH" == *"PermissionSeeder"* ]] || [[ "$FILE_PATH" == *"RoleSeeder"* ]]; then
    echo "🔐 Seeder changed. Next steps:" >&2
    echo "   1. docker exec atis_backend php artisan db:seed --class=$(basename "$FILE_PATH" .php)" >&2
    echo "   2. docker exec atis_backend php artisan permission:cache-reset" >&2
fi

# Git status summary after edits
if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    CHANGED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CHANGED" -gt 10 ]; then
        echo "📊 $CHANGED files changed — consider committing soon." >&2
    fi
fi