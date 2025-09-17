# Deprecated Code Removal Plan - Phase 4

## Overview
This document outlines the systematic removal of deprecated code in the monitoring module, focusing on legacy environment variable handling and deprecated service methods.

## Phase 4 Scope

### 4.1 Legacy Environment Variable Handling (Lines 352-442)
**File:** `src/monitoring/config/monitoring-config.validator.ts`

#### Current State Analysis
```typescript
// Lines 352-406: Deprecated variable detection with warnings
const deprecatedVars = [
  { old: "MONITORING_TTL_HEALTH", new: "MONITORING_DEFAULT_TTL + MONITORING_HEALTH_TTL_OVERRIDE" },
  // ... more variables
];

for (const deprecatedVar of deprecatedVars) {
  if (process.env[deprecatedVar.old]) {
    deprecated.push(deprecatedVar.old);
    console.warn(/* deprecation warning */);
  }
}
```

#### Removal Strategy
1. **v1.1.0 (Current):** Keep with warnings
2. **v1.2.0 (Target):** Remove processing, throw errors instead
3. **v2.0.0 (Future):** Complete removal of validation logic

### 4.2 Deprecated Service Methods
**File:** `src/monitoring/presenter/presenter.service.ts`

#### Current State
```typescript
// Line 126+: getEndpointMetricsLegacy with deprecation warning
async getEndpointMetricsLegacy(limit?: string) {
  console.warn('DEPRECATION WARNING: ...');
  // ... legacy implementation
}
```

#### Removal Strategy
1. **v1.1.0 (Current):** Keep with warnings
2. **v1.2.0 (Future):** Mark as private, add runtime errors
3. **v2.0.0 (Target):** Complete removal

### 4.3 Deprecated Constants
**Files:** Various constant files

#### Removal Strategy
1. **v1.1.0 (Current):** Keep with import warnings
2. **v1.2.0 (Target):** Remove exports, keep files for error messages
3. **v2.0.0 (Future):** Delete files completely

## Detailed Removal Plan

### Step 1: Prepare Legacy Environment Variable Removal (v1.2.0)

#### Create Replacement Validation Logic
```typescript
// New validation that only accepts unified variables
static validateUnifiedEnvironmentVariables(): ValidationResult {
  const required = [
    'MONITORING_DEFAULT_TTL',
    'MONITORING_DEFAULT_BATCH_SIZE',
    'MONITORING_API_RESPONSE_GOOD',
    'MONITORING_CACHE_HIT_THRESHOLD'
  ];

  const optional = [
    'MONITORING_HEALTH_TTL_OVERRIDE',
    'MONITORING_PERFORMANCE_TTL_OVERRIDE',
    'MONITORING_ALERT_TTL_OVERRIDE',
    'MONITORING_CACHE_STATS_TTL_OVERRIDE'
  ];

  // Validation logic for new variables only
}
```

#### Add Error Throwing for Deprecated Variables
```typescript
// Error throwing logic for v1.2.0
static checkForDeprecatedVariables(): void {
  const deprecatedVars = [
    "MONITORING_TTL_HEALTH",
    "MONITORING_TTL_TREND",
    // ... etc
  ];

  const foundDeprecated = deprecatedVars.filter(
    varName => process.env[varName] !== undefined
  );

  if (foundDeprecated.length > 0) {
    throw new Error(
      `Deprecated environment variables detected: ${foundDeprecated.join(', ')}\n` +
      `These variables were removed in v1.2.0. Please migrate to unified configuration.\n` +
      `See docs/monitoring-deprecation-migration-guide.md for migration instructions.`
    );
  }
}
```

### Step 2: Service Method Migration Strategy

#### Phase 1: Make Legacy Method Private (v1.2.0)
```typescript
/**
 * @deprecated Since v1.1.0. Will be removed in v2.0.0.
 * @private Internal use only during transition period
 */
private async getEndpointMetricsLegacy(limit?: string) {
  throw new Error(
    'getEndpointMetricsLegacy() was deprecated in v1.1.0 and is no longer available as of v1.2.0.\n' +
    'Please use getEndpointMetrics(query: EndpointMetricsQueryDto) instead.\n' +
    'See docs/monitoring-deprecation-migration-guide.md for migration instructions.'
  );
}
```

#### Phase 2: Complete Removal (v2.0.0)
- Delete method entirely
- Remove all references
- Update tests to use new method only

### Step 3: Constants File Removal Strategy

#### Phase 1: Remove Exports (v1.2.0)
```typescript
// cache-ttl.constants.ts
throw new Error(
  'cache-ttl.constants.ts was deprecated in v1.1.0 and removed in v1.2.0.\n' +
  'Please migrate to MonitoringUnifiedTtlConfig.\n' +
  'See docs/monitoring-deprecation-migration-guide.md for migration instructions.'
);

// No exports - file exists only to provide error message
```

#### Phase 2: File Deletion (v2.0.0)
- Delete deprecated constant files
- Update all imports
- Clean up file references

## Implementation Checklist

### Pre-Removal (v1.1.0 - Current)
- [x] Add deprecation warnings to all legacy components
- [x] Create comprehensive migration documentation
- [x] Set up monitoring for deprecated usage
- [x] Notify development teams of upcoming changes

### Removal Phase 1 (v1.2.0 - January 2025)
- [ ] Replace deprecated environment variable processing with error throwing
- [ ] Make legacy service methods private with error throwing
- [ ] Remove constant exports, keep files with error messages
- [ ] Update validation logic to only accept unified variables
- [ ] Add feature flag for emergency fallback (`MONITORING_ENABLE_LEGACY_ENV_VARS`)

### Removal Phase 2 (v2.0.0 - March 2025)
- [ ] Delete deprecated service methods completely
- [ ] Delete deprecated constant files
- [ ] Remove all compatibility shims
- [ ] Clean up validation logic
- [ ] Remove emergency fallback feature flags

## Risk Mitigation

### Emergency Fallback Mechanism (v1.2.0 only)
```typescript
// Environment variable for emergency use
if (process.env.MONITORING_ENABLE_LEGACY_ENV_VARS === 'true') {
  console.error(
    '🚨 EMERGENCY MODE: Legacy environment variables temporarily re-enabled.\n' +
    'This is for emergency use only and will be removed in v2.0.0.\n' +
    'Please migrate immediately.'
  );
  // Temporarily re-enable legacy processing
}
```

### Rollback Strategy
1. **v1.2.0 Rollback:** Use emergency fallback flag
2. **v2.0.0 Rollback:** Requires full version downgrade

### Testing Strategy
1. **Unit Tests:** Verify error throwing for deprecated usage
2. **Integration Tests:** Ensure new configuration system works
3. **Migration Tests:** Validate migration scripts work correctly
4. **Regression Tests:** Ensure no functionality lost

## Communication Timeline

### 4 Weeks Before v1.2.0
- [ ] Final migration deadline announced
- [ ] Automated migration tools released
- [ ] Support documentation updated

### 2 Weeks Before v1.2.0
- [ ] Development teams notified of breaking changes
- [ ] Staging environment updated for testing
- [ ] Emergency contact procedures established

### Release Day v1.2.0
- [ ] Monitor for applications using deprecated variables
- [ ] Have emergency fallback ready if needed
- [ ] Support team on standby for migration issues

## Success Metrics

### v1.2.0 Success Criteria
- [ ] Zero usage of deprecated environment variables in production
- [ ] All applications successfully migrated to unified configuration
- [ ] No performance degradation from new validation logic
- [ ] Emergency fallback mechanism tested and working

### v2.0.0 Success Criteria
- [ ] Complete removal of all deprecated code
- [ ] Clean, maintainable codebase
- [ ] No legacy compatibility layers remaining
- [ ] Full test coverage of new architecture

## Code Review Requirements

### v1.2.0 Changes
- [ ] Senior developer review of error handling logic
- [ ] Security review of emergency fallback mechanism
- [ ] Performance review of new validation logic
- [ ] Documentation review of error messages

### v2.0.0 Changes
- [ ] Architect review of final architecture
- [ ] Complete test coverage verification
- [ ] Performance benchmarking vs v1.0.0
- [ ] Security audit of final implementation

---

**Document Version:** 1.0  
**Created:** September 18, 2024  
**Target Completion:** March 2025  
**Owner:** Monitoring Module Team