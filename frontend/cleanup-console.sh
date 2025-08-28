#!/bin/bash

# Console.log cleanup script for ATİS frontend
# Replaces console statements with production-safe logger

echo "🧹 Starting console cleanup for ATİS frontend..."

# Add logger import to files that need it
echo "📥 Adding logger imports..."

# Function to add logger import if not present
add_logger_import() {
    local file=$1
    if grep -q "console\." "$file" && ! grep -q "from '@/utils/logger'" "$file"; then
        # Add import after existing imports
        sed -i '1i import { logger } from '"'"'@/utils/logger'"'"';\n' "$file"
    fi
}

# Replace common console patterns
echo "🔄 Replacing console statements..."

# Find all TypeScript/TSX files and process them
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    if grep -q "console\." "$file"; then
        echo "Processing: $file"
        
        # Add logger import
        add_logger_import "$file"
        
        # Replace console.log patterns
        sed -i 's/console\.log(\([^)]*\))/logger.debug(\1)/g' "$file"
        sed -i 's/console\.error(\([^)]*\))/logger.error(\1)/g' "$file"
        sed -i 's/console\.warn(\([^)]*\))/logger.warn(\1)/g' "$file"
        sed -i 's/console\.debug(\([^)]*\))/logger.debug(\1)/g' "$file"
        sed -i 's/console\.info(\([^)]*\))/logger.info(\1)/g' "$file"
    fi
done

# Special handling for critical files
echo "🎯 Processing critical service files..."

# For API service, keep some essential logging as info level
if [ -f "src/services/api.ts" ]; then
    # Convert critical auth/error logs to appropriate levels
    sed -i 's/logger\.debug.*401 Unauthorized/logger.warn("401 Unauthorized detected")/g' src/services/api.ts
    sed -i 's/logger\.debug.*API Error/logger.error("API Error")/g' src/services/api.ts
    sed -i 's/logger\.debug.*Response status/logger.error("Response status")/g' src/services/api.ts
fi

# Clean up development-only UI elements
echo "🧽 Cleaning development-only elements..."

# Remove feature flag debug components if they exist
find src -name "*.tsx" -exec sed -i '/Feature Flag Debug Info/,+20d' {} \;
find src -name "*.tsx" -exec sed -i '/console.*toggle.*featureFlags/d' {} \;

# Count remaining console statements
remaining=$(find src -name "*.ts" -o -name "*.tsx" -exec grep -l "console\." {} \; | wc -l)
total_statements=$(find src -name "*.ts" -o -name "*.tsx" -exec grep -c "console\." {} \; | awk '{sum += $1} END {print sum}')

echo "✅ Cleanup completed!"
echo "📊 Files with remaining console statements: $remaining"
echo "📊 Total remaining console statements: $total_statements"

# Show files that still have console statements for manual review
if [ $remaining -gt 0 ]; then
    echo "📋 Files needing manual review:"
    find src -name "*.ts" -o -name "*.tsx" -exec grep -l "console\." {} \;
fi

echo "🎉 Console cleanup script finished!"