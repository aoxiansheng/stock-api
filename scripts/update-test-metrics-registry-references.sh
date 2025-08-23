#!/bin/bash

# Script to update all test files that reference PresenterRegistryService

echo "Updating test file references to MetricsRegistryService..."

# Find all test files that reference PresenterRegistryService
grep -r "PresenterRegistryService" test/ --include="*.ts" -l | while read file; do
  echo "Updating test file: $file..."
  
  # Update import paths - try different patterns based on file location
  sed -i '' "s|from.*monitoring/metrics/services/metrics-registry.service.*|from '../../../../../../../src/common/infrastructure/monitoring/metrics-registry.service';|g" "$file"
  sed -i '' "s|from.*system-status/presenter/helper/services/metrics-registry.service.*|from '../../../../../../src/common/infrastructure/monitoring/metrics-registry.service';|g" "$file"
  
  # Update class name references
  sed -i '' 's/PresenterRegistryService/MetricsRegistryService/g' "$file"
  
  echo "✅ Updated $file"
done

echo "✅ All test files updated!"