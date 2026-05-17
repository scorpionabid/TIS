#!/bin/bash

# ATİS QA Helper Script
# Usage: ./qa-helper.sh [target] [action]

TARGET=$1
ACTION=$2

case "$TARGET" in
    "backend")
        if [ "$ACTION" == "test" ]; then
            docker exec atis_backend php artisan test
        elif [ "$ACTION" == "lint" ]; then
            docker exec atis_backend ./vendor/bin/pint --test
        elif [ "$ACTION" == "fix" ]; then
            docker exec atis_backend ./vendor/bin/pint
        else
            echo "Usage: $0 backend {test|lint|fix}"
        fi
        ;;
    "frontend")
        if [ "$ACTION" == "lint" ]; then
            docker exec atis_frontend npm run lint
        elif [ "$ACTION" == "typecheck" ]; then
            docker exec atis_frontend npm run typecheck
        elif [ "$ACTION" == "audit" ]; then
            docker exec atis_frontend npm audit --audit-level=moderate
        else
            echo "Usage: $0 frontend {lint|typecheck|audit}"
        fi
        ;;
    "all")
        echo "--- Running All QA Checks ---"
        echo "1. Backend Tests..."
        docker exec atis_backend php artisan test --stop-on-failure
        echo "2. Frontend Lint..."
        docker exec atis_frontend npm run lint
        echo "3. Frontend Typecheck..."
        docker exec atis_frontend npm run typecheck
        ;;
    *)
        echo "Usage: $0 {backend|frontend|all} {action}"
        exit 1
        ;;
esac
