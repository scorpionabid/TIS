#!/bin/bash

# ATİS Pre-Tool-Use Hook
# Runs before Write/Edit/MultiEdit operations
# Receives JSON via stdin with tool_name, tool_input fields

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

# Production file protection
if [[ "$FILE_PATH" == *".env"* ]] || [[ "$FILE_PATH" == *"production"* ]] || [[ "$FILE_PATH" == *"docker-compose.yml"* ]]; then
    echo "⚠️ WARNING: Modifying production/config file: $FILE_PATH" >&2
fi

# Docker-only enforcement
if [[ "$TOOL" == "Bash" ]]; then
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
    if [[ "$COMMAND" == *"php artisan serve"* ]]; then
        echo "❌ BLOCKED: Local php artisan serve is prohibited. Use Docker: ./start.sh" >&2
        echo '{"decision": "block", "reason": "Local server prohibited. Use Docker."}' 
        exit 0
    fi
fi

# Code duplication check
if [[ "$FILE_PATH" == *"components"* ]] || [[ "$FILE_PATH" == *"pages"* ]]; then
    filename=$(basename "$FILE_PATH" .tsx)
    filename=$(basename "$filename" .ts)
    filename=$(basename "$filename" .php)
    similar_count=$(find . -name "*$filename*" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$similar_count" -gt 0 ]; then
        echo "⚠️ Similar files found for '$filename' ($similar_count matches). Check for duplication." >&2
    fi
fi

# Permission change reminder
if [[ "$FILE_PATH" == *"Permission"* ]] || [[ "$FILE_PATH" == *"permission"* ]] || [[ "$FILE_PATH" == *"Role"* ]]; then
    echo "🔐 REMINDER: Permission/Role change detected. Run: php artisan permission:cache-reset" >&2
fi

# Migration safety
if [[ "$FILE_PATH" == *"migrations"* ]]; then
    echo "🗄️ MIGRATION: Test with migrate:fresh in development. Create rollback plan for production." >&2
fi