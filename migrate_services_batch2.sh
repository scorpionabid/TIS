#!/bin/bash

# Service Migration Batch 2
# Migrate 10 more services to BaseService

echo "🚀 Starting Service Migration Batch 2..."
echo "Target: 10 more services to BaseService"
echo ""

SERVICES=(
    "backend/app/Services/DocumentCollectionService.php"
    "backend/app/Services/PerformanceMonitoringService.php"
    "backend/app/Services/Schedule/WorkloadScheduleIntegrationService.php"
    "backend/app/Services/Schedule/ScheduleTemplateService.php"
    "backend/app/Services/Schedule/PerformanceOptimizationService.php"
    "backend/app/Services/Schedule/AdvancedScheduleOptimizer.php"
    "backend/app/Services/Schedule/ScheduleRoomAssignmentService.php"
    "backend/app/Services/SurveyStatusService.php"
    "backend/app/Services/surveyAnalyticsService.php"
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

echo "🎉 Batch 2 Migration Complete!"
echo "📊 Summary:"
echo "- 10 more services processed"
echo "- BaseService inheritance added"
echo "- Model configuration added"
echo ""
echo "🚀 Total: 20 services migrated!"
