#!/bin/bash
set -euo pipefail

# ATİS Database Restore Script
# Usage: ./restore-database.sh [--connection=pgsql|sqlite] [backup_file]

CONNECTION="pgsql"
BACKUP_FILE=""

print_usage() {
    cat <<'USAGE'
Usage:
  ./restore-database.sh [--connection=pgsql|sqlite] [backup_file]

Options:
  --connection, -c   Database driver to target (default: pgsql)
  --help, -h         Show this help message

If no backup file is provided, the script will offer the latest snapshot
for the selected connection type.
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
            if [[ -z "${BACKUP_FILE}" ]]; then
                BACKUP_FILE="$1"
            else
                echo "Unexpected positional argument: $1"
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

echo "🔄 ATİS Database Restore Script"
echo "================================"

BACKUP_PATTERN="database/database_backup_*"
if [[ "${CONNECTION}" == "sqlite" ]]; then
    BACKUP_PATTERN+=".sqlite"
else
    BACKUP_PATTERN+=".dump"
fi

echo "📂 Available backups (${CONNECTION}):"
shopt -s nullglob
BACKUP_FILES=( ${BACKUP_PATTERN} )
shopt -u nullglob
if [[ ${#BACKUP_FILES[@]} -eq 0 ]]; then
    echo "   (none found)"
else
    for file in "${BACKUP_FILES[@]}"; do
        ls -lh "${file}" | awk '{print $NF, $5, $6, $7, $8}'
    done
fi
echo ""

if [[ -z "${BACKUP_FILE}" ]]; then
    if [[ ${#BACKUP_FILES[@]} -eq 0 ]]; then
        echo "❌ No backup files found for ${CONNECTION}!"
        exit 1
    fi
    LATEST_BACKUP=$(printf '%s\n' "${BACKUP_FILES[@]}" | sort -r | head -n1)

    echo "📋 Latest backup: ${LATEST_BACKUP}"
    read -rp "Use this backup? (y/N): " confirm
    if [[ "${confirm}" =~ ^[Yy]$ ]]; then
        BACKUP_FILE="${LATEST_BACKUP}"
    else
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will overwrite the current ${CONNECTION} database!"
echo "📁 Backup file: ${BACKUP_FILE}"
read -rp "Are you sure? (y/N): " final_confirm
if [[ ! "${final_confirm}" =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

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

restore_sqlite() {
    local target="database/database.sqlite"
    echo "🔒 Mövcud SQLite faylının yedəyi çıxarılır..."
    cp "${target}" "database/database_pre_restore_$(date +%Y%m%d_%H%M%S).sqlite"

    echo "🔄 Backup faylı kopyalanır..."
    cp "${BACKUP_FILE}" "${target}"

    echo "✅ SQLite bərpası tamamlandı"
    echo "📊 Fayl ölçüsü: $(du -h "${target}" | cut -f1)"
}

restore_pgsql() {
    if ! command -v pg_restore >/dev/null 2>&1; then
        echo "❌ pg_restore tapılmadı. PostgreSQL client util-larını qurun."
        exit 1
    fi
    local host port database username password
    host="$(get_config host)"
    port="$(get_config port)"
    database="$(get_config database)"
    username="$(get_config username)"
    password="$(get_config password)"

    : "${host:=127.0.0.1}"
    : "${port:=5432}"

    echo "🔒 Mövcud Postgres bazasının yedəyi çıxarılır..."
    ./backup-database.sh --connection=pgsql pre_restore >/dev/null 2>&1 || echo "⚠️  Mövcud backup scripti işə salmaq alınmadı, davam edilir..."

    echo "🔄 pg_restore ilə bərpa edilir..."
    PGPASSWORD="${password}" pg_restore \
        --clean \
        --if-exists \
        --no-owner \
        --single-transaction \
        -h "${host}" \
        -p "${port}" \
        -U "${username}" \
        -d "${database}" \
        "${BACKUP_FILE}"

    echo "✅ PostgreSQL bərpası tamamlandı"
    echo "📊 Backup ölçüsü: $(du -h "${BACKUP_FILE}" | cut -f1)"
}

case "${CONNECTION}" in
    sqlite)
        restore_sqlite
        ;;
    pgsql)
        restore_pgsql
        ;;
    *)
        echo "❌ Unsupported connection: ${CONNECTION}"
        exit 1
        ;;
esac
