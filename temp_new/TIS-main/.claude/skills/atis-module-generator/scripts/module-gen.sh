#!/bin/bash

# ATİS Module Generator Helper Script
# Usage: ./module-gen.sh [module_name]

MODULE_NAME=$1
SERVICE_NAME="${MODULE_NAME}Service"
LOWER_MODULE_NAME=$(echo "$MODULE_NAME" | tr '[:upper:]' '[:lower:]')

if [ -z "$MODULE_NAME" ]; then
    echo "Usage: ./module-gen.sh [ModuleName]"
    exit 1
fi

echo "🚀 Modul yaradılır: $MODULE_NAME..."

# 1. Backend Service
echo "📝 Backend Service yaradılır..."
TEMPLATE_CONTENT=$(cat .claude/templates/laravel-service.php)
NEW_CONTENT=${TEMPLATE_CONTENT//\{\{ModelName\}\}/$MODULE_NAME}
NEW_CONTENT=${NEW_CONTENT//\{\{modelName\}\}/$LOWER_MODULE_NAME}
echo "$NEW_CONTENT" > "backend/app/Services/${SERVICE_NAME}.php"

# 2. Backend Controller (Sadələşdirilmiş şablon)
echo "📝 Backend Controller yaradılır..."
CONTROLLER_TEMPLATE=$(cat .claude/templates/laravel-controller.php 2>/dev/null || echo "<?php namespace App\Http\Controllers\Api; class ${MODULE_NAME}Controller extends Controller {}")
NEW_CONTROLLER_CONTENT=${CONTROLLER_TEMPLATE//\{\{ModelName\}\}/$MODULE_NAME}
NEW_CONTROLLER_CONTENT=${NEW_CONTROLLER_CONTENT//\{\{ServiceName\}\}/$SERVICE_NAME}
echo "$NEW_CONTROLLER_CONTENT" > "backend/app/Http/Controllers/Api/${MODULE_NAME}Controller.php"

# 3. Frontend Service
echo "📝 Frontend Service yaradılır..."
FE_SERVICE_TEMPLATE=$(cat .claude/templates/react-service.ts 2>/dev/null || echo "export const ${LOWER_MODULE_NAME}Service = {};")
NEW_FE_SERVICE_CONTENT=${FE_SERVICE_TEMPLATE//\{\{ServiceName\}\}/$LOWER_MODULE_NAME}
echo "$NEW_FE_SERVICE_CONTENT" > "frontend/src/services/${LOWER_MODULE_NAME}.ts"

# 4. Frontend Component/Page
echo "📝 Frontend Page yaradılır..."
FE_PAGE_TEMPLATE=$(cat .claude/templates/react-component.tsx)
NEW_FE_PAGE_CONTENT=${FE_PAGE_TEMPLATE//\{\{ModelName\}\}/$MODULE_NAME}
NEW_FE_PAGE_CONTENT=${NEW_FE_PAGE_CONTENT//\{\{ServiceName\}\}/$LOWER_MODULE_NAME}
NEW_FE_PAGE_CONTENT=${NEW_FE_PAGE_CONTENT//\{\{queryKey\}\}/$LOWER_MODULE_NAME}
NEW_FE_PAGE_CONTENT=${NEW_FE_PAGE_CONTENT//\{\{ComponentName\}\}/${MODULE_NAME}Page}
NEW_FE_PAGE_CONTENT=${NEW_FE_PAGE_CONTENT//\{\{serviceName\}\}/$LOWER_MODULE_NAME}

echo "$NEW_FE_PAGE_CONTENT" > "frontend/src/pages/${MODULE_NAME}.tsx"

echo "✅ $MODULE_NAME modulu uğurla yaradıldı!"
echo "⚠️ Növbəti addım: Route-ları 'api.php' və 'App.tsx' fayllarına əlavə etməyi unutma."
