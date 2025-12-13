#!/bin/bash

# SQLite to PostgreSQL migration script for ATİS
# This script converts SQLite database to PostgreSQL format

set -e

SQLITE_DB="/app/archive/sqlite/snapshots/TIS/backend/database/database.sqlite"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"
POSTGRES_DB="atis_dev"
POSTGRES_USER="atis_dev_user"
POSTGRES_PASS="atis_dev_password"

echo "🔄 Starting SQLite to PostgreSQL migration..."

# Install pgloader if not exists
if ! command -v pgloader &> /dev/null; then
    echo "📦 Installing pgloader..."
    apt-get update -qq
    apt-get install -y -qq pgloader sqlite3
fi

# Create pgloader configuration
cat > /tmp/sqlite_to_postgres.load <<EOF
LOAD DATABASE
    FROM sqlite://${SQLITE_DB}
    INTO postgresql://${POSTGRES_USER}:${POSTGRES_PASS}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

WITH data only,
     truncate,
     create no tables,
     create no indexes,
     reset sequences,
     downcase identifiers

SET work_mem to '256MB',
    maintenance_work_mem to '512MB';

BEFORE LOAD DO
\$\$ DROP SCHEMA IF EXISTS public CASCADE; \$\$,
\$\$ CREATE SCHEMA public; \$\$;
EOF

echo "📝 Configuration created"
echo "🔄 Running pgloader..."

pgloader /tmp/sqlite_to_postgres.load

echo "✅ Migration completed!"
