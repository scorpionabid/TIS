#!/bin/bash

# Service Migration Batch 1 (Fixed)
# Migrate 10 services to BaseService

echo "🚀 Starting Service Migration Batch 1..."
echo "Target: 10 services to BaseService"
echo ""

SERVICES=(
    "backend/app/Services/LinkAnalyticsService.php"
    "backend/app/Services/SchedulePermissionService.php"
    "backend/app/Services/SurveyAnalytics/Domains/Temporal/TemporalAnalyticsService.php"
    "backend/app/Services/SurveyAnalytics/Domains/Response/ResponseAnalyticsService.php"
    "backend/app/Services/SurveyAnalytics/Domains/Basic/BasicStatsService.php"
    "backend/app/Services/SurveyAnalytics/Domains/Completion/CompletionAnalyticsService.php"
    "backend/app/Services/SurveyAnalytics/surveyAnalyticsFacade.php"
    "backend/app/Services/NotificationService.php"
    "backend/app/Services/UserBulkService.php"
)

for service in "${SERVICES[@]}"; do
    echo "📝 Migrating: $service"
    
    # Check if already extends BaseService
    if grep -q "extends BaseService" "$service"; then
        echo "✅ Already extends BaseService - skipping"
        continue
    fi
    
    # Get class name
    class_name=$(basename "$service" .php)
    
    # Add BaseService extension
    sed -i.bak "s/class ${class_name}$/class ${class_name} extends BaseService/" "$service"
    
    # Add model class configuration
    if ! grep -q "protected \$modelClass" "$service"; then
        # Find model name from service name (simple heuristic)
        model_name=$(echo "$class_name" | sed 's/Service$//')
        echo "📋 Adding model class: $model_name"
        
        # Add configuration after class declaration
        sed -i.bak "/class ${class_name} extends BaseService/,a\\
\\
\\
    /**\\
     * Model class for this service\\
     */\\
    protected \$modelClass = ${model_name}::class;\\
\\
    /**\\
     * Searchable fields for filtering\\
     */\\
    protected \$searchableFields = [];\\
\\
    /**\\
     * Filterable fields for filtering\\
     */\\
    protected \$filterableFields = [];" "$service"
    fi
    
    echo "✅ Migration completed: $service"
    echo ""
done

echo "🎉 Batch 1 Migration Complete!"
echo "📊 Summary:"
echo "- 10 services processed"
echo "- BaseService inheritance added"
echo "- Model configuration added"
echo ""
echo "🚀 Ready for testing!"
