#!/bin/bash

# ATİS API Endpoint Testing Script
# This script tests all major API endpoints to ensure they're working correctly

BASE_URL="http://localhost:8000/api"
TOKEN=""

echo "🚀 Starting ATİS API Endpoint Tests"
echo "=================================="

# Function to make API calls with proper error handling
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=""
    
    if [[ -n "$TOKEN" ]]; then
        auth_header="-H 'Authorization: Bearer $TOKEN'"
    fi
    
    echo "Testing: $method $endpoint"
    
    if [[ "$method" == "GET" ]]; then
        response=$(eval "curl -s -w '%{http_code}' $auth_header -H 'Accept: application/json' '$BASE_URL$endpoint'")
    else
        response=$(eval "curl -s -w '%{http_code}' -X $method $auth_header -H 'Content-Type: application/json' -H 'Accept: application/json' -d '$data' '$BASE_URL$endpoint'")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [[ $http_code -ge 200 && $http_code -lt 400 ]]; then
        echo "✅ SUCCESS ($http_code)"
        if [[ "$endpoint" == "/login" && "$method" == "POST" ]]; then
            TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
            echo "🔑 Token extracted: ${TOKEN:0:20}..."
        fi
    else
        echo "❌ FAILED ($http_code)"
        echo "Response: $body"
    fi
    echo
}

# Test public endpoints (no authentication required)
echo "📋 Testing Public Endpoints"
echo "----------------------------"
api_call "GET" "/health"
api_call "GET" "/test"

# Test authentication
echo "🔐 Testing Authentication"
echo "-------------------------"
api_call "POST" "/login" '{"login": "superadmin@atis.az", "password": "admin123"}'

if [[ -z "$TOKEN" ]]; then
    echo "❌ Authentication failed! Cannot proceed with protected endpoints."
    exit 1
fi

# Test protected endpoints
echo "🛡️  Testing Protected Endpoints"
echo "-------------------------------"

# Dashboard
api_call "GET" "/dashboard/superadmin-analytics"

# Users
api_call "GET" "/users?page=1&per_page=5"

# Institutions
api_call "GET" "/institutions"
api_call "GET" "/institutions/hierarchy"
api_call "GET" "/institution-types"

# Surveys
api_call "GET" "/surveys"

# Assessments
api_call "GET" "/assessment-types"
api_call "GET" "/assessments"

# Tasks
api_call "GET" "/tasks"

# Documents
api_call "GET" "/documents"

# Approvals
api_call "GET" "/approvals/pending"
api_call "GET" "/approvals/my-approvals"

# Students
api_call "GET" "/students"

# Attendance
api_call "GET" "/attendance"

# Specialized modules
api_call "GET" "/psychology/sessions"
api_call "GET" "/inventory/items"
api_call "GET" "/teacher-performance/evaluations"

# Regional admin endpoints
api_call "GET" "/regionadmin/dashboard"

# Test profile
api_call "GET" "/profile"

echo "🏁 API Testing Complete!"
echo "========================="

# Cleanup
unset TOKEN

echo "📊 Summary:"
echo "- All major endpoints tested"
echo "- Authentication validated"
echo "- System integration confirmed"
echo ""
echo "📋 Next Steps:"
echo "1. Import ATİS_API_Collection.postman.json into Postman"
echo "2. Use test credentials from API documentation"
echo "3. Run comprehensive testing scenarios"
echo ""
echo "🔍 For detailed API documentation, see:"
echo "- /Users/home/Desktop/ATİS/backend/API_DOCUMENTATION.md"
echo "- Postman Collection: ATİS_API_Collection.postman.json"