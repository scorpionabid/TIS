#!/usr/bin/env bash
set -euo pipefail

# Scan migration files for potentially dangerous operations that may lock large tables.
# Fails the build unless ALLOW_DANGEROUS_MIGRATIONS=1 is set.

if [[ "${ALLOW_DANGEROUS_MIGRATIONS:-0}" == "1" ]]; then
  echo "⚠️ Dangerous migration patterns ignored (ALLOW_DANGEROUS_MIGRATIONS=1)."
  exit 0
fi

PATTERN_RESULTS=$(grep -R -nE '->\s*(dropColumn|change)\s*\(' database/migrations || true)

if [[ -n "${PATTERN_RESULTS}" ]]; then
  echo "❌ Detected potentially dangerous migration operations:"
  echo "${PATTERN_RESULTS}"
  echo ""
  echo "Set ALLOW_DANGEROUS_MIGRATIONS=1 to bypass after manual review."
  exit 1
fi

echo "✅ No dangerous migration patterns detected."
