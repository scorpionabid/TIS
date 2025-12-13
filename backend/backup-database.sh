#!/usr/bin/env bash
set -euo pipefail

# ATİS Database Backup Script
# Usage examples:
#   ./backup-database.sh                   # default PostgreSQL snapshot
#   ./backup-database.sh nightly           # PostgreSQL snapshot with suffix
#   ./backup-database.sh --connection=sqlite legacy_backup

echo "💾 ATİS Database Backup Script"
echo "=============================="

CONNECTION="pgsql"
NAME_SUFFIX=""
TABLES=""

print_usage() {
  cat <<'USAGE'
Usage:
  ./backup-database.sh [name]
  ./backup-database.sh --connection=<conn> [--name=<suffix>] [--tables=table1,table2]

Connections supported:
  - pgsql   (default, uses config('database.connections.pgsql'))
  - sqlite  (legacy fallback)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --connection=*|-c=*)
      CONNECTION="${1#*=}"
      shift
      ;;
    --connection|-c)
      CONNECTION="$2"
      shift 2
      ;;
    --name=*|-n=*)
      NAME_SUFFIX="${1#*=}"
      shift
      ;;
    --name|-n)
      NAME_SUFFIX="$2"
      shift 2
      ;;
    --tables=*|-t=*)
      TABLES="${1#*=}"
      shift
      ;;
    --tables|-t)
      TABLES="$2"
      shift 2
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      print_usage
      exit 1
      ;;
    *)
      if [[ -z "${NAME_SUFFIX}" ]]; then
        NAME_SUFFIX="$1"
      else
        echo "Unexpected positional argument: $1"
        print_usage
        exit 1
      fi
      shift
      ;;
  esac
done

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_BASENAME="database_backup_${TIMESTAMP}"
if [[ -n "${NAME_SUFFIX}" ]]; then
  BACKUP_BASENAME="${BACKUP_BASENAME}_${NAME_SUFFIX}"
fi

BACKUP_DIR="database"
mkdir -p "${BACKUP_DIR}"

get_config() {
  local key="$1"
  php -r "
    require __DIR__ . '/vendor/autoload.php';
    \$app = require __DIR__ . '/bootstrap/app.php';
    \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
    \$kernel->bootstrap();
    \$value = config('database.connections.${CONNECTION}.${key}');
    if (\$value === null) {
      exit(1);
    }
    echo \$value;
  " || true
}

backup_sqlite() {
  local source="database/database.sqlite"
  if [[ ! -f "${source}" ]]; then
    echo "❌ Database file not found: ${source}"
    exit 1
  fi

  local target="${BACKUP_DIR}/${BACKUP_BASENAME}.sqlite"
  echo "🔄 Creating SQLite backup..."
  echo "📁 Source: ${source}"
  echo "📁 Backup: ${target}"

  cp "${source}" "${target}"
  echo "✅ Backup created successfully!"
  echo "📊 Backup size: $(du -h "${target}" | cut -f1)"
}

backup_pgsql() {
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "❌ pg_dump not found. Install PostgreSQL client tools."
    exit 1
  }

  local host port database username password
  host="$(get_config host)"
  port="$(get_config port)"
  database="$(get_config database)"
  username="$(get_config username)"
  password="$(get_config password)"

  : "${host:=127.0.0.1}"
  : "${port:=5432}"

  if [[ -z "${database}" || -z "${username}" ]]; then
    echo "❌ Unable to read pgsql connection details from config."
    exit 1
  fi

  local target="${BACKUP_DIR}/${BACKUP_BASENAME}.dump"
  echo "🔄 Creating PostgreSQL backup..."
  echo "🗄️  Database: ${database} (${host}:${port})"
  echo "📁 Backup: ${target}"

  IFS=',' read -ra TABLE_ARRAY <<< "${TABLES}"
  TABLE_ARGS=()
  for table in "${TABLE_ARRAY[@]}"; do
    table_trimmed="$(echo "${table}" | xargs)"
    if [[ -n "${table_trimmed}" ]]; then
      TABLE_ARGS+=("-t" "${table_trimmed}")
    fi
  done

  PGPASSWORD="${password}" pg_dump \
    -h "${host}" \
    -p "${port}" \
    -U "${username}" \
    -d "${database}" \
    -F c \
    "${TABLE_ARGS[@]}" \
    --file="${target}"

  echo "✅ Backup created successfully!"
  echo "📊 Backup size: $(du -h "${target}" | cut -f1)"
}

case "${CONNECTION}" in
  sqlite)
    backup_sqlite
    ;;
  pgsql)
    backup_pgsql
    ;;
  *)
    echo "❌ Unsupported connection: ${CONNECTION}"
    print_usage
    exit 1
    ;;
esac

echo ""
echo "📂 Recent backups:"
ls -lh ${BACKUP_DIR}/database_backup_* 2>/dev/null | tail -5 || echo "   (none yet)"
