#!/bin/bash

# Monitor User Validation Errors Script
# Purpose: Check Laravel logs for user validation failures
# Usage: ./monitor_validation_errors.sh

echo "=== USER VALIDATION ERROR MONITORING ==="
echo "Date: $(date)"
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    LOG_PATH="/var/www/html/storage/logs"
else
    LOG_PATH="./storage/logs"
fi

TODAY_LOG="$LOG_PATH/laravel-$(date +%Y-%m-%d).log"
YESTERDAY_LOG="$LOG_PATH/laravel-$(date -d yesterday +%Y-%m-%d).log"

echo "Checking logs in: $LOG_PATH"
echo ""

# Function to check a log file
check_log() {
    local logfile=$1
    local label=$2

    if [ ! -f "$logfile" ]; then
        echo "[$label] Log file not found: $logfile"
        return
    fi

    echo "[$label] Analyzing: $logfile"
    echo "----------------------------------------"

    # Check for RegionOperator validation errors
    regionop_errors=$(grep -c "RegionOperator roluna malik istifadəçi" "$logfile" 2>/dev/null || echo "0")
    echo "  RegionOperator permission errors: $regionop_errors"

    # Check for Department-Institution validation errors
    dept_errors=$(grep -c "Seçilmiş departament bu təşkilata aid deyil" "$logfile" 2>/dev/null || echo "0")
    echo "  Department-Institution mismatch errors: $dept_errors"

    # Check for general validation failures
    validation_errors=$(grep -c "Illuminate\\\\Validation\\\\ValidationException" "$logfile" 2>/dev/null || echo "0")
    echo "  Total validation exceptions: $validation_errors"

    echo ""

    # Show recent errors if any
    if [ "$regionop_errors" -gt 0 ] || [ "$dept_errors" -gt 0 ]; then
        echo "  Recent validation errors:"
        grep -A 3 -B 1 "RegionOperator roluna\|Seçilmiş departament" "$logfile" 2>/dev/null | tail -20
        echo ""
    fi
}

# Check today's log
check_log "$TODAY_LOG" "TODAY"

# Check yesterday's log
check_log "$YESTERDAY_LOG" "YESTERDAY"

echo "=== MONITORING COMPLETE ==="
echo ""
echo "Recommendation:"
echo "  - 0 errors: ✅ System working perfectly"
echo "  - 1-5 errors/day: ⚠️  Normal (edge cases)"
echo "  - >5 errors/day: 🔴 Investigate further"
echo ""
echo "To run this check:"
echo "  docker exec atis_backend bash /var/www/html/monitor_validation_errors.sh"
