#!/bin/bash

# ATİS Health Check Script
# Run this script to check system health after deployment
# Can be used with monitoring tools like Nagios, Zabbix etc.

# Configuration
DOMAIN="your-domain.com"
API_URL="https://$DOMAIN/api/health"
TIMEOUT=10

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

echo_info() {
    echo "ℹ $1"
}

FAILED_CHECKS=0

# Function to increment failed checks
fail_check() {
    ((FAILED_CHECKS++))
    echo_error "$1"
}

echo_info "ATİS System Health Check - $(date)"
echo "=================================="

# 1. Web Server Check
echo_info "Checking web server..."
if systemctl is-active --quiet nginx; then
    echo_success "Nginx is running"
else
    fail_check "Nginx is not running"
fi

# 2. PHP-FPM Check
echo_info "Checking PHP-FPM..."
if systemctl is-active --quiet php8.2-fpm; then
    echo_success "PHP-FPM is running"
else
    fail_check "PHP-FPM is not running"
fi

# 3. Database Check
echo_info "Checking database..."
if systemctl is-active --quiet postgresql; then
    echo_success "PostgreSQL is running"
    
    # Test database connection
    cd /var/www/atis/backend 2>/dev/null || cd /Users/home/Desktop/ATİS/backend
    if php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'DB_OK'; } catch(Exception \$e) { echo 'DB_ERROR: ' . \$e->getMessage(); }" 2>/dev/null | grep -q "DB_OK"; then
        echo_success "Database connection OK"
    else
        fail_check "Database connection failed"
    fi
else
    fail_check "PostgreSQL is not running"
fi

# 4. Redis Check (if using Redis)
echo_info "Checking Redis..."
if systemctl is-active --quiet redis; then
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        echo_success "Redis is running and responding"
    else
        echo_warning "Redis service is running but not responding to ping"
    fi
else
    echo_warning "Redis is not running (optional service)"
fi

# 5. Queue Workers Check
echo_info "Checking queue workers..."
if systemctl is-active --quiet supervisor; then
    WORKER_COUNT=$(supervisorctl status atis-worker:* 2>/dev/null | grep RUNNING | wc -l)
    if [ "$WORKER_COUNT" -gt 0 ]; then
        echo_success "$WORKER_COUNT queue workers are running"
    else
        echo_warning "No queue workers are running"
    fi
else
    echo_warning "Supervisor is not running (queue workers may not be active)"
fi

# 6. API Health Check
echo_info "Checking API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" "$API_URL" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo_success "API endpoint is responding (HTTP $HTTP_CODE)"
    
    # Check API response content
    API_RESPONSE=$(curl -s --connect-timeout "$TIMEOUT" "$API_URL" 2>/dev/null)
    if echo "$API_RESPONSE" | grep -q '"status":"ok"'; then
        echo_success "API health check passed"
    else
        fail_check "API health check failed - invalid response"
    fi
else
    fail_check "API endpoint not responding (HTTP $HTTP_CODE)"
fi

# 7. SSL Certificate Check
echo_info "Checking SSL certificate..."
if command -v openssl >/dev/null 2>&1; then
    SSL_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$SSL_EXPIRY" ]; then
        SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null)
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ "$DAYS_UNTIL_EXPIRY" -gt 30 ]; then
            echo_success "SSL certificate valid (expires in $DAYS_UNTIL_EXPIRY days)"
        elif [ "$DAYS_UNTIL_EXPIRY" -gt 7 ]; then
            echo_warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
        else
            fail_check "SSL certificate expires in $DAYS_UNTIL_EXPIRY days - URGENT renewal needed"
        fi
    else
        echo_warning "Could not check SSL certificate expiry"
    fi
else
    echo_warning "OpenSSL not available - cannot check SSL certificate"
fi

# 8. Disk Space Check
echo_info "Checking disk space..."
DISK_USAGE=$(df /var/www 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ]; then
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo_success "Disk usage: ${DISK_USAGE}%"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        echo_warning "Disk usage: ${DISK_USAGE}% - Consider cleanup"
    else
        fail_check "Disk usage: ${DISK_USAGE}% - Critical, immediate cleanup required"
    fi
else
    echo_warning "Could not check disk usage"
fi

# 9. Log File Check
echo_info "Checking for recent errors in logs..."
if [ -f "/var/www/atis/backend/storage/logs/laravel.log" ]; then
    RECENT_ERRORS=$(grep -c "ERROR\|CRITICAL\|EMERGENCY" "/var/www/atis/backend/storage/logs/laravel.log" 2>/dev/null | tail -100)
    if [ "$RECENT_ERRORS" -eq 0 ]; then
        echo_success "No recent errors in application logs"
    else
        echo_warning "$RECENT_ERRORS recent error(s) found in application logs"
    fi
else
    echo_warning "Application log file not found"
fi

# Summary
echo
echo "=================================="
echo_info "Health Check Summary"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo_success "All critical checks passed! System is healthy."
    exit 0
elif [ $FAILED_CHECKS -le 2 ]; then
    echo_warning "$FAILED_CHECKS check(s) failed. System needs attention."
    exit 1
else
    echo_error "$FAILED_CHECKS check(s) failed. System requires immediate attention!"
    exit 2
fi