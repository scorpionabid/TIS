#!/bin/bash

# ATİS DB Helper Script
# Usage: ./db-helper.sh [action] [table] [limit]

ACTION=$1
TABLE=$2
LIMIT=${3:-10}

case $ACTION in
    "list")
        docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "\dt"
        ;;
    "count")
        docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "SELECT count(*) FROM $TABLE;"
        ;;
    "peek")
        docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "SELECT * FROM $TABLE LIMIT $LIMIT;"
        ;;
    "schema")
        docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "\d $TABLE"
        ;;
    *)
        echo "Usage: $0 {list|count table|peek table [limit]|schema table}"
        exit 1
        ;;
esac
