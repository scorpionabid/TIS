#!/usr/bin/env bash
set -euo pipefail

# Dump selected configuration arrays to JSON files for drift comparison.
# Usage:
#   ./scripts/check-config-drift.sh <environment> [config.key ...]
# Example:
#   ./scripts/check-config-drift.sh staging permission sanctum queue.connections.redis
#
# The script stores output under storage/config-drift and prints the location.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <environment> [config.key ...]"
  exit 1
fi

ENVIRONMENT="$1"
shift

CONFIG_KEYS=("$@")
if [[ ${#CONFIG_KEYS[@]} -eq 0 ]]; then
  CONFIG_KEYS=("permission" "sanctum" "auth" "queue")
fi

OUTPUT_DIR="storage/config-drift/${ENVIRONMENT}"
mkdir -p "${OUTPUT_DIR}"

dump_config() {
  local key="$1"
  php -r "
    require __DIR__ . '/../vendor/autoload.php';
    \$app = require __DIR__ . '/../bootstrap/app.php';
    \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
    \$kernel->bootstrap();
    \$value = config('${key}');
    if (\$value === null) {
      fwrite(STDERR, \"Config key '${key}' not found\\n\");
      exit(2);
    }
    echo json_encode(\$value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  "
}

EXIT_CODE=0

for key in "${CONFIG_KEYS[@]}"; do
  SAFE_KEY="${key//./_}"
  OUTPUT_FILE="${OUTPUT_DIR}/${SAFE_KEY}.json"
  echo "🔍 Dumping config[${key}] -> ${OUTPUT_FILE}"
  if dump_config "${key}" > "${OUTPUT_FILE}"; then
    echo "✅ Wrote ${OUTPUT_FILE}"
  else
    echo "⚠️ Failed to dump ${key}" >&2
    EXIT_CODE=1
  fi
done

if [[ ${EXIT_CODE} -ne 0 ]]; then
  echo "Config dump completed with errors."
else
  echo "Config dump completed successfully. Compare files across environments to detect drift."
fi

exit "${EXIT_CODE}"
