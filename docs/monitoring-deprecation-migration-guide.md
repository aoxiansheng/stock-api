# Monitoring Module Deprecation Migration Guide

## Overview
This guide provides detailed instructions for migrating from deprecated monitoring module components to their modern, unified replacements. Follow this guide to ensure smooth transition during the compatibility layer removal process.

## Quick Migration Checklist

- [ ] Update environment variables to unified system
- [ ] Replace deprecated service method calls
- [ ] Update constant imports to new unified structure
- [ ] Test all changes in development environment
- [ ] Update documentation and configuration files

## Environment Variables Migration

### TTL Configuration Migration

#### Before (Deprecated)
```bash
# These variables are deprecated and will be removed in v1.2.0
MONITORING_TTL_HEALTH=300
MONITORING_TTL_TREND=600
MONITORING_TTL_PERFORMANCE=900
MONITORING_TTL_ALERT=1200
MONITORING_TTL_CACHE_STATS=180
```

#### After (Unified System)
```bash
# New unified configuration system
MONITORING_DEFAULT_TTL=600                    # Default for all monitoring data
MONITORING_HEALTH_TTL_OVERRIDE=300           # Override for health data
MONITORING_PERFORMANCE_TTL_OVERRIDE=900      # Override for performance data
MONITORING_ALERT_TTL_OVERRIDE=1200           # Override for alerts
MONITORING_CACHE_STATS_TTL_OVERRIDE=180      # Override for cache stats
```

### Batch Size Configuration Migration

#### Before (Deprecated)
```bash
# These variables are deprecated and will be removed in v1.2.0
MONITORING_ALERT_BATCH_SMALL=10
MONITORING_ALERT_BATCH_MEDIUM=50
MONITORING_ALERT_BATCH_LARGE=100
MONITORING_DATA_BATCH_STANDARD=25
MONITORING_CLEANUP_BATCH_STANDARD=50
```

#### After (Unified System)
```bash
# New unified batch configuration
MONITORING_DEFAULT_BATCH_SIZE=25              # Default batch size
MONITORING_ALERT_BATCH_SIZE=50               # Alert-specific batch size
MONITORING_CLEANUP_BATCH_SIZE=50             # Cleanup batch size
MONITORING_DATA_PROCESSING_BATCH_SIZE=25     # Data processing batch size
```

## Service Methods Migration

### PresenterService.getEndpointMetricsLegacy()

#### Before (Deprecated)
```typescript
import { PresenterService } from './presenter/presenter.service';

class MyController {
  constructor(private readonly presenterService: PresenterService) {}

  async getMetrics() {
    // This method is deprecated and will be removed in v2.0.0
    const metrics = await this.presenterService.getEndpointMetricsLegacy("10");
    return metrics; // Returns array without pagination info
  }
}
```

#### After (Modern Approach)
```typescript
import { PresenterService } from './presenter/presenter.service';
import { EndpointMetricsQueryDto } from './dto/endpoint-metrics-query.dto';

class MyController {
  constructor(private readonly presenterService: PresenterService) {}

  async getMetrics() {
    // New paginated approach with proper typing
    const query: EndpointMetricsQueryDto = {
      page: 1,
      limit: 10,
      sortBy: 'responseTime',
      order: 'desc'
    };
    
    const paginatedResult = await this.presenterService.getEndpointMetrics(query);
    
    return {
      data: paginatedResult.data,      // Array of metrics
      meta: paginatedResult.meta,      // Pagination metadata
      links: paginatedResult.links     // Navigation links
    };
  }

  // For backward compatibility during transition
  async getMetricsLegacyFormat() {
    const query: EndpointMetricsQueryDto = { page: 1, limit: 10 };
    const result = await this.presenterService.getEndpointMetrics(query);
    return result.data; // Extract just the data array
  }
}
```

### Query Parameter Migration

#### Before (String-based)
```typescript
// Old approach with string parameters
async getEndpointData(limit?: string, sortBy?: string) {
  const metrics = await this.presenterService.getEndpointMetricsLegacy(limit);
  // Manual parsing and validation required
}
```

#### After (Typed DTOs)
```typescript
import { EndpointMetricsQueryDto } from './dto/endpoint-metrics-query.dto';

async getEndpointData(query: EndpointMetricsQueryDto) {
  // Type-safe with automatic validation
  const result = await this.presenterService.getEndpointMetrics(query);
  return result;
}
```

## Constants Migration

### Cache TTL Constants

#### Before (Deprecated)
```typescript
// These imports will fail after v1.2.0
import { CACHE_TTL_HEALTH, CACHE_TTL_TREND } from './constants/cache-ttl.constants';
import { ALERT_BATCH_SIZES } from './constants/alert-control.constants';

// Usage
const healthTTL = CACHE_TTL_HEALTH;
const batchSize = ALERT_BATCH_SIZES.SMALL;
```

#### After (Unified System)
```typescript
// New unified import structure
import { 
  MONITORING_DEFAULTS,
  MONITORING_BATCH_CONFIGS,
  MONITORING_TTL_CONFIGS 
} from './constants/config/monitoring-system.constants';

// Usage with better semantics
const healthTTL = MONITORING_TTL_CONFIGS.health || MONITORING_DEFAULTS.cache.defaultTTL;
const batchSize = MONITORING_BATCH_CONFIGS.alert.small;
```

### Business Logic Constants

#### Before (Deprecated)
```typescript
// File: constants/business.ts (will be removed)
import { API_RESPONSE_THRESHOLDS, CACHE_PERFORMANCE } from './constants/business';

const isGoodResponse = responseTime < API_RESPONSE_THRESHOLDS.GOOD;
const cacheHitGood = hitRate > CACHE_PERFORMANCE.HIT_THRESHOLD;
```

#### After (Unified System)
```typescript
// New location and structure
import { 
  MONITORING_THRESHOLDS,
  MONITORING_PERFORMANCE_INDICATORS 
} from './constants/config/monitoring-system.constants';

const isGoodResponse = responseTime < MONITORING_THRESHOLDS.apiResponse.good;
const cacheHitGood = hitRate > MONITORING_PERFORMANCE_INDICATORS.cache.hitThreshold;
```

## Configuration File Updates

### Environment File Migration

#### Step 1: Backup Current Configuration
```bash
# Create backup of current environment files
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp .env.development .env.development.backup.$(date +%Y%m%d_%H%M%S)
```

#### Step 2: Update Environment Variables
```bash
# Use the provided migration script (when available)
npm run migrate:monitoring-env

# Or manually update using the mapping table above
```

### TypeScript Configuration Updates

#### tsconfig.json Path Mapping (if applicable)
```json
{
  "compilerOptions": {
    "paths": {
      // Remove old paths
      // "@monitoring/cache-ttl": ["src/monitoring/constants/cache-ttl.constants"],
      // "@monitoring/business": ["src/monitoring/constants/business"],
      
      // Add new unified paths
      "@monitoring/config": ["src/monitoring/constants/config/*"],
      "@monitoring/system": ["src/monitoring/constants/config/monitoring-system.constants"]
    }
  }
}
```

## Testing Your Migration

### 1. Environment Variable Validation
```bash
# Check for deprecated environment variables
npm run config:validate

# Test with new configuration
npm run test:config
```

### 2. Service Method Testing
```typescript
// Unit test example
describe('Monitoring Service Migration', () => {
  it('should return paginated results with new method', async () => {
    const query = { page: 1, limit: 10 };
    const result = await presenterService.getEndpointMetrics(query);
    
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.totalItems).toBeGreaterThanOrEqual(0);
  });

  it('should handle backward compatibility correctly', async () => {
    const query = { page: 1, limit: 10 };
    const newResult = await presenterService.getEndpointMetrics(query);
    
    // Verify format matches legacy expectations
    expect(Array.isArray(newResult.data)).toBeTruthy();
  });
});
```

### 3. Integration Testing
```bash
# Run full integration tests
npm run test:integration

# Test specific monitoring endpoints
npm run test:monitoring
```

## Common Migration Issues

### Issue 1: Type Errors After Constant Migration

**Problem:**
```typescript
// Error: Cannot find module './constants/cache-ttl.constants'
import { CACHE_TTL_HEALTH } from './constants/cache-ttl.constants';
```

**Solution:**
```typescript
// Update import to unified system
import { MONITORING_TTL_CONFIGS } from './constants/config/monitoring-system.constants';
const healthTTL = MONITORING_TTL_CONFIGS.health;
```

### Issue 2: Runtime Errors with Service Methods

**Problem:**
```typescript
// Error: presenterService.getEndpointMetricsLegacy is not a function
const metrics = await presenterService.getEndpointMetricsLegacy("10");
```

**Solution:**
```typescript
// Use new method with proper query object
const metrics = await presenterService.getEndpointMetrics({
  page: 1,
  limit: 10
});
```

### Issue 3: Environment Variable Not Found

**Problem:**
```bash
# Warning: MONITORING_TTL_HEALTH is deprecated
# Error: Required configuration missing
```

**Solution:**
```bash
# Replace deprecated variables with unified system
MONITORING_DEFAULT_TTL=600
MONITORING_HEALTH_TTL_OVERRIDE=300
```

## Automated Migration Tools

### Environment Variable Migration Script
```bash
# Run the automated migration tool
npm run migrate:env-vars

# This script will:
# 1. Backup your current .env files
# 2. Convert deprecated variables to new format
# 3. Validate the new configuration
# 4. Generate a migration report
```

### Code Migration Assistant
```bash
# Use the code migration tool
npm run migrate:code-patterns

# This tool will:
# 1. Scan for deprecated import patterns
# 2. Update import statements automatically
# 3. Flag manual review requirements
# 4. Generate a migration summary
```

## Rollback Procedures

### If Migration Issues Occur

#### 1. Restore Environment Configuration
```bash
# Restore from backup
cp .env.backup.[timestamp] .env
cp .env.development.backup.[timestamp] .env.development
```

#### 2. Revert Code Changes
```bash
# If using git
git checkout -- src/monitoring/

# Restore from specific commit if needed
git revert [migration-commit-hash]
```

#### 3. Validate Rollback
```bash
# Test that services work with old configuration
npm run test:monitoring
npm run test:integration
```

## Support and Resources

### Documentation
- [Monitoring Architecture Guide](./monitoring-architecture.md)
- [Environment Configuration Standards](./environment-variables-standards.md)
- [Code Review Checklist](./monitoring-code-review-checklist.md)

### Getting Help
- **Internal Team:** Slack #monitoring-migration
- **Technical Issues:** Create issue in project repository
- **Emergency Support:** Contact backend engineering team lead

### Migration Timeline
- **v1.1.0 (November 2024):** Deprecation warnings active
- **v1.2.0 (January 2025):** Breaking changes, legacy code removed
- **v2.0.0 (March 2025):** Complete compatibility layer removal

---

**Last Updated:** September 18, 2024  
**Migration Guide Version:** 1.0  
**Next Review:** October 15, 2024