#!/usr/bin/env bash
set -euo pipefail

# Capture the output of `php artisan migrate:status` into a timestamped file.
# Usage:
#   ./scripts/capture-migration-status.sh [environment] [connection]
# Example:
#   ./scripts/capture-migration-status.sh staging pgsql
#
# The script must be executed from the Laravel application root (backend).

ENVIRONMENT="${1:-local}"
CONNECTION_OPTION=""

if [[ -n "${2:-}" ]]; then
  CONNECTION_OPTION="--database=${2}"
fi

OUTPUT_DIR="storage/migration-status"
mkdir -p "${OUTPUT_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${OUTPUT_DIR}/${ENVIRONMENT}_${TIMESTAMP}.txt"

echo "📋 Capturing migration status (${ENVIRONMENT}) to ${OUTPUT_FILE}"
php artisan migrate:status ${CONNECTION_OPTION} | tee "${OUTPUT_FILE}"

echo "✅ Migration status written to ${OUTPUT_FILE}"
