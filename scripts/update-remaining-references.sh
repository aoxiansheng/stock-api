#!/bin/bash

echo "Updating remaining PresenterRegistryService references in comments..."

# Update module comments
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module.ts
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module.ts
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/05-caching/symbol-mapper-cache/README.md
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/05-caching/smart-cache/module/smart-cache.module.ts
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/00-prepare/data-mapper/module/data-mapper.module.ts
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' src/core/00-prepare/symbol-mapper/module/symbol-mapper.module.ts

# Update performance test file that was skipped
sed -i '' 's/PresenterRegistryService/InfrastructureMetricsRegistryService/g' test/jest/performance/core/public/symbol-mapper-cache/symbol-mapper-cache-performance.test.ts.skip
sed -i '' "s|from.*monitoring/metrics/services/metrics-registry.service.*|from '../../../../../src/common/infrastructure/monitoring/metrics-registry.service';|g" test/jest/performance/core/public/symbol-mapper-cache/symbol-mapper-cache-performance.test.ts.skip

echo "✅ Remaining references updated!"