#!/usr/bin/env bash
set -euo pipefail

# Generate a Laravel schema dump with pruning and store it under database/schema.
# Usage:
#   ./scripts/schema-dump.sh [connection] [schema-name]
# Example:
#   ./scripts/schema-dump.sh pgsql atis_pgsql
# If no schema-name is provided, the connection name is used.

CONNECTION="${1:-}"
SCHEMA_NAME="${2:-}"

if [[ -z "${CONNECTION}" ]]; then
  echo "Usage: $0 <connection> [schema-name]"
  exit 1
fi

if [[ -z "${SCHEMA_NAME}" ]]; then
  SCHEMA_NAME="${CONNECTION}"
fi

SCHEMA_DIR="database/schema"
mkdir -p "${SCHEMA_DIR}"

SCHEMA_PATH="${SCHEMA_DIR}/${SCHEMA_NAME}.sql"

echo "🧱 Creating schema dump for connection \"${CONNECTION}\" at ${SCHEMA_PATH}"
php artisan schema:dump --prune --database="${CONNECTION}" --path="${SCHEMA_PATH}"

echo "✅ Schema dump completed: ${SCHEMA_PATH}"
