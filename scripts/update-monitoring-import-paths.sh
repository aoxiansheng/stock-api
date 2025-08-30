#!/bin/bash

# Update monitoring import paths after refactoring
# This script updates import statements throughout the codebase

echo "🔄 Updating import paths for monitoring refactoring..."

# Function to update imports in a file
update_imports() {
    local file="$1"
    echo "Updating $file..."
    
    # Update common/core/monitoring imports to new monitoring/infrastructure
    sed -i '' 's|from.*common/core/monitoring/infrastructure/metrics-registry.service|from "../../monitoring/infrastructure/metrics/infrastructure-metrics-registry.service"|g' "$file"
    sed -i '' 's|from.*common/core/monitoring/infrastructure/performance.interceptor|from "../../monitoring/infrastructure/interceptors/infrastructure-performance.interceptor"|g' "$file"
    sed -i '' 's|from.*common/core/monitoring/decorators|from "../../monitoring/infrastructure/decorators"|g' "$file"
    sed -i '' 's|from.*common/core/decorators/performance-monitoring.decorator|from "../../monitoring/infrastructure/decorators/infrastructure-monitoring-config.decorator"|g' "$file"
    
    # Update system-status imports to new monitoring
    sed -i '' 's|from.*system-status/collector|from "../../monitoring/collector"|g' "$file"
    sed -i '' 's|from.*system-status/analyzer|from "../../monitoring/analyzer"|g' "$file"
    sed -i '' 's|from.*system-status/presenter|from "../../monitoring/presenter"|g' "$file"
    
    # Update class names
    sed -i '' 's/MetricsRegistryService/MetricsRegistryService/g' "$file"
    sed -i '' 's/PerformanceInterceptor/InfrastructurePerformanceInterceptor/g' "$file"
}

# Find all TypeScript files and update their imports
find src -name "*.ts" -not -path "*/monitoring/*" -not -path "*/system-status/*" -not -path "*/common/core/monitoring/*" | while read -r file; do
    # Skip if file contains any of the old import patterns
    if grep -q "from.*common/core/monitoring\|from.*system-status.*monitoring" "$file" 2>/dev/null; then
        update_imports "$file"
    fi
done

# Update test files as well
find test -name "*.ts" | while read -r file; do
    if grep -q "from.*common/core/monitoring\|from.*system-status.*monitoring" "$file" 2>/dev/null; then
        update_imports "$file"
    fi
done

echo "✅ Import paths updated successfully!"
echo "🔍 You may need to manually verify and adjust some complex import paths."