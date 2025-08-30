#!/bin/bash

# Script to update all PresenterRegistryService references to MetricsRegistryService
# and update import paths

echo "Updating PresenterRegistryService references to MetricsRegistryService..."

# List of files to update
files=(
  "src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts"
  "src/core/01-entry/stream-receiver/services/stream-receiver.service.ts"
  "src/core/01-entry/receiver/services/receiver.service.ts"
  "src/core/01-entry/query/services/query-statistics.service.ts"
  "src/core/01-entry/query/services/query.service.ts"
  "src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts"
  "src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts"
  "src/core/00-prepare/data-mapper/services/persisted-template.service.ts"
  "src/core/shared/module/shared-services.module.ts"
  "src/core/shared/services/base-fetcher.service.ts"
  "src/core/02-processing/transformer/services/data-transformer.service.ts"
  "src/core/02-processing/symbol-transformer/services/symbol-transformer.service.ts"
  "src/core/04-storage/storage/services/storage.service.ts"
)

# Update imports and class references
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Update import path
    sed -i '' "s|from.*system-status/presenter/services/presenter-registry.service.*|from '../../../common/infrastructure/monitoring/metrics-registry.service';|g" "$file"
    sed -i '' "s|from.*../../../../system-status/presenter/services/presenter-registry.service.*|from '../../../../common/infrastructure/monitoring/metrics-registry.service';|g" "$file"
    sed -i '' "s|from.*../../../system-status/presenter/services/presenter-registry.service.*|from '../../../common/infrastructure/monitoring/metrics-registry.service';|g" "$file"
    
    # Update class name references
    sed -i '' 's/PresenterRegistryService/MetricsRegistryService/g' "$file"
    
    echo "✅ Updated $file"
  else
    echo "❌ File not found: $file"
  fi
done

echo "✅ All files updated!"