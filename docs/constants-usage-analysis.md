# Constants Usage Analysis Report

Generated: 2025-09-09T11:09:32.180Z

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Constants** | 238 |
| **Total Usages** | 2690 |
| **Internal References** | 1279 |
| **External References** | 1411 |
| **Multi-use Constants** | 113 |
| **Single-use Constants** | 41 |
| **Unused Constants** | 84 |
| **Average Usage per Constant** | 11.30 |

### File Statistics
- **Constant Files**: 28
- **Source Files Analyzed**: 201
- **Files Using Constants**: 201
- **Files Without Constants**: 0

## 🎯 Key Recommendations

🗑️ **Remove 84 unused constants** to reduce codebase bloat

   - Consider removing: NUMERIC_VALUE_MAP, NumericConstantsType, QUICK_NUMBERS, calculateBaseBatchSize, calculateBaseRetryDelay

⚡ **Review 41 single-use constants** for potential inlining or consolidation

   - Single-use: TimezoneUtil, PROCESSING_BASE_CONSTANTS, FOUNDATION_CONSTANTS, HTTP_BATCH_SEMANTICS, RATE_LIMIT_TIMEOUTS

✅ **48 constants are heavily used (10+ references)** - good centralization

📁 **Constants are spread across 6 subdirectories** - consider reorganization if needed

## 📈 Most Used Constants (Top 10)


### 1. `NUMERIC_CONSTANTS` (330 usages)
- **Source**: `common/constants/core/index.ts`
- **Referenced by**: 26 files
- **Internal references**: 232
- **External references**: 98

### 2. `REFERENCE_DATA` (239 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 38 files
- **Internal references**: 44
- **External references**: 195

### 3. `Market` (184 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 27 files
- **Internal references**: 59
- **External references**: 125

### 4. `default` (166 usages)
- **Source**: `common/constants/application/index.ts`
- **Referenced by**: 75 files
- **Internal references**: 18
- **External references**: 148

### 5. `CORE_LIMITS` (145 usages)
- **Source**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by**: 19 files
- **Internal references**: 34
- **External references**: 111

### 6. `CONSTANTS` (109 usages)
- **Source**: `common/constants/index.ts`
- **Referenced by**: 24 files
- **Internal references**: 21
- **External references**: 88

### 7. `CORE_TIMEOUTS` (70 usages)
- **Source**: `common/constants/foundation/index.ts`
- **Referenced by**: 18 files
- **Internal references**: 25
- **External references**: 45

### 8. `MarketStatus` (64 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 7 files
- **Internal references**: 35
- **External references**: 29

### 9. `OPERATION_LIMITS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 14 files
- **Internal references**: 28
- **External references**: 33

### 10. `API_OPERATIONS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 20 files
- **Internal references**: 6
- **External references**: 55


## 🚨 Unused Constants (84 total)


### File: `common/constants/core/index.ts`
- **NUMERIC_VALUE_MAP**
  - Line: 2
  - Type: unknown
  - Export: named
- **NumericConstantsType**
  - Line: 3
  - Type: unknown
  - Export: named
- **QUICK_NUMBERS**
  - Line: 9
  - Type: CallExpression
  - Export: named

### File: `common/constants/foundation/index.ts`
- **calculateBaseBatchSize**
  - Line: 19
  - Type: unknown
  - Export: named
- **calculateBaseRetryDelay**
  - Line: 20
  - Type: unknown
  - Export: named
- **isBaseRetryableError**
  - Line: 21
  - Type: unknown
  - Export: named
- **isBaseRetryableHttpCode**
  - Line: 22
  - Type: unknown
  - Export: named
- **CoreValues**
  - Line: 27
  - Type: unknown
  - Export: named
- **TimeMS**
  - Line: 28
  - Type: unknown
  - Export: named
- **TimeSeconds**
  - Line: 29
  - Type: unknown
  - Export: named
- **Quantities**
  - Line: 31
  - Type: unknown
  - Export: named
- **CoreTTL**
  - Line: 36
  - Type: unknown
  - Export: named
- **CoreLimits**
  - Line: 40
  - Type: unknown
  - Export: named
- **CoreTimezones**
  - Line: 44
  - Type: unknown
  - Export: named
- **CoreTradingTimes**
  - Line: 45
  - Type: unknown
  - Export: named
- **ProcessingBaseConstants**
  - Line: 49
  - Type: unknown
  - Export: named
- **ProcessingBatchSettings**
  - Line: 50
  - Type: unknown
  - Export: named
- **ProcessingRetrySettings**
  - Line: 51
  - Type: unknown
  - Export: named
- **ProcessingStrategies**
  - Line: 52
  - Type: unknown
  - Export: named
- **ProcessingErrorHandling**
  - Line: 53
  - Type: unknown
  - Export: named
- **ProcessingPerformanceSettings**
  - Line: 54
  - Type: unknown
  - Export: named
- **BatchStrategyType**
  - Line: 55
  - Type: unknown
  - Export: named
- **RetryStrategyType**
  - Line: 56
  - Type: unknown
  - Export: named
- **FailureStrategyType**
  - Line: 57
  - Type: unknown
  - Export: named

### File: `common/constants/semantic/message-semantics.constants.ts`
- **PERMISSION_MESSAGE_ALIASES**
  - Line: 441
  - Type: CallExpression
  - Export: named

### File: `common/constants/semantic/http-semantics.constants.ts`
- **HTTP_SUCCESS_MESSAGES**
  - Line: 304
  - Type: CallExpression
  - Export: named

### File: `common/constants/semantic/index.ts`
- **HttpStatusCodes**
  - Line: 74
  - Type: unknown
  - Export: named
- **HttpTimeouts**
  - Line: 75
  - Type: unknown
  - Export: named
- **HttpBatchSemantics**
  - Line: 76
  - Type: unknown
  - Export: named
- **CacheTTLSemantics**
  - Line: 80
  - Type: unknown
  - Export: named
- **CacheKeySemantics**
  - Line: 81
  - Type: unknown
  - Export: named
- **CacheStrategySemantics**
  - Line: 82
  - Type: unknown
  - Export: named
- **RetryDelaySemantics**
  - Line: 86
  - Type: unknown
  - Export: named
- **RetryCountSemantics**
  - Line: 87
  - Type: unknown
  - Export: named
- **RetryStrategySemantics**
  - Line: 88
  - Type: unknown
  - Export: named
- **BatchSizeSemantics**
  - Line: 92
  - Type: unknown
  - Export: named
- **ConcurrencySemantics**
  - Line: 93
  - Type: unknown
  - Export: named
- **BatchTimeoutSemantics**
  - Line: 94
  - Type: unknown
  - Export: named

### File: `common/constants/application/index.ts`
- **EnvironmentFeatures**
  - Line: 50
  - Type: unknown
  - Export: named
- **EnvironmentResourceLimits**
  - Line: 51
  - Type: unknown
  - Export: named

### File: `common/constants/domain/index.ts`
- **ErrorRateLevel**
  - Line: 32
  - Type: unknown
  - Export: named
- **ChangeLevel**
  - Line: 33
  - Type: unknown
  - Export: named
- **PerformanceLevel**
  - Line: 34
  - Type: unknown
  - Export: named
- **MonitoringBusinessConstants**
  - Line: 36
  - Type: unknown
  - Export: named
- **ErrorThresholds**
  - Line: 37
  - Type: unknown
  - Export: named
- **ChangeDetection**
  - Line: 38
  - Type: unknown
  - Export: named
- **SamplingConfig**
  - Line: 39
  - Type: unknown
  - Export: named
- **PerformanceBenchmarks**
  - Line: 40
  - Type: unknown
  - Export: named
- **OperationLimitsConstants**
  - Line: 51
  - Type: unknown
  - Export: named
- **TimeoutsMS**
  - Line: 52
  - Type: unknown
  - Export: named
- **BatchSizes**
  - Line: 53
  - Type: unknown
  - Export: named
- **CacheTTL**
  - Line: 54
  - Type: unknown
  - Export: named
- **ConcurrencyLimits**
  - Line: 55
  - Type: unknown
  - Export: named
- **RetryLimits**
  - Line: 56
  - Type: unknown
  - Export: named
- **MemoryLimits**
  - Line: 57
  - Type: unknown
  - Export: named
- **ReferenceMarket**
  - Line: 65
  - Type: unknown
  - Export: named
- **Quarter**
  - Line: 66
  - Type: unknown
  - Export: named
- **TestUser**
  - Line: 67
  - Type: unknown
  - Export: named
- **ReferenceDataConstants**
  - Line: 68
  - Type: unknown
  - Export: named
- **TestTimestamps**
  - Line: 69
  - Type: unknown
  - Export: named
- **SampleSymbols**
  - Line: 70
  - Type: unknown
  - Export: named
- **TestAccounts**
  - Line: 71
  - Type: unknown
  - Export: named
- **ProviderIds**
  - Line: 72
  - Type: unknown
  - Export: named
- **TestDatasets**
  - Line: 73
  - Type: unknown
  - Export: named
- **ErrorScenarios**
  - Line: 74
  - Type: unknown
  - Export: named
- **ApiPriority**
  - Line: 86
  - Type: unknown
  - Export: named
- **ApiOperationsConstants**
  - Line: 88
  - Type: unknown
  - Export: named
- **StockDataOperations**
  - Line: 89
  - Type: unknown
  - Export: named
- **IndexDataOperations**
  - Line: 90
  - Type: unknown
  - Export: named
- **DataTypes**
  - Line: 91
  - Type: unknown
  - Export: named
- **MarketTypes**
  - Line: 92
  - Type: unknown
  - Export: named
- **FetchModes**
  - Line: 93
  - Type: unknown
  - Export: named
- **BusinessScenarios**
  - Line: 94
  - Type: unknown
  - Export: named
- **Priorities**
  - Line: 95
  - Type: unknown
  - Export: named
- **CacheStrategies**
  - Line: 96
  - Type: unknown
  - Export: named
- **MarketDomainConfig**
  - Line: 141
  - Type: unknown
  - Export: named
- **MarketCacheConfig**
  - Line: 142
  - Type: unknown
  - Export: named
- **MarketApiTimeouts**
  - Line: 143
  - Type: unknown
  - Export: named
- **AlertRateLimitConfig**
  - Line: 147
  - Type: unknown
  - Export: named
- **AlertCacheConfig**
  - Line: 148
  - Type: unknown
  - Export: named
- **AlertApiTimeouts**
  - Line: 149
  - Type: unknown
  - Export: named
- **TieredRateLimits**
  - Line: 153
  - Type: unknown
  - Export: named
- **EndpointRateLimits**
  - Line: 154
  - Type: unknown
  - Export: named
- **RateLimitCacheConfig**
  - Line: 155
  - Type: unknown
  - Export: named


## ⚠️ Single-use Constants (41 total)


### `TimezoneUtil`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/foundation/core-timezones.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 11

### `PROCESSING_BASE_CONSTANTS`
- **Defined in**: `common/constants/foundation/processing-base.constants.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 132

### `FOUNDATION_CONSTANTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 69

### `HTTP_BATCH_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 11

### `RATE_LIMIT_TIMEOUTS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 123

### `RATE_LIMIT_RETRY_CONFIG`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 124

### `RATE_LIMIT_ERROR_TEMPLATES`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/rate-limit-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 128

### `RATE_LIMIT_LUA_SCRIPT_NAMES`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `auth/services/rate-limit.service.ts`
- **Usage type**: External
- **Line**: 129

### `MARKET_DOMAIN_CONFIG`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 11

### `MARKET_API_TIMEOUTS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 13

### `MarketDomainUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 19

### `MonitoringBusinessUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 29

### `OperationLimitsUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 45

### `ReferenceDataUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 62

### `ApiOperationsUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 79

### `CIRCUIT_BREAKER_PERFORMANCE_LEVELS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 118

### `CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 154

### `CIRCUIT_BREAKER_MONITORING_THRESHOLDS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 205

### `CORE_TTL`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 9

### `Sizes`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 30

### `CoreTimeouts`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `alert/constants/index.ts`
- **Usage type**: External
- **Line**: 35

### `OPERATION_TYPE_SEMANTICS`
- **Defined in**: `common/constants/semantic/message-semantics.constants.ts`
- **Used in**: `common/constants/semantic/message-semantics.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 315

### `HTTP_HEADERS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 12

### `HTTP_CONTENT_TYPES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 15

### `HttpSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 16

### `CacheSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 26

### `RetrySemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 35

### `BatchSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 44

### `StatusCodeSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 50

### `ErrorMessageUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 69

### `EnvironmentConfigUtil`
- **Defined in**: `common/constants/application/index.ts`
- **Used in**: `common/constants/application/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 45

### `RATE_LIMIT_STRATEGY_DESCRIPTIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 118

### `RATE_LIMIT_STRATEGY_USE_CASES`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 119

### `RATE_LIMIT_STATISTICS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 126

### `MARKET_DATA_QUALITY`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 16

### `CacheDataType`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/operation-limits.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 50

### `ApiBusinessScenario`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 85

### `ApiCacheStrategy`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 87

### `CIRCUIT_BREAKER_KEY_CONFIG`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 190

### `DEFAULT_CIRCUIT_BREAKER_CONFIG`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 218

### `CIRCUIT_BREAKER_CONSTANTS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `core/01-entry/stream-receiver/enums/circuit-breaker-state.enum.ts`
- **Usage type**: External
- **Line**: 332


## 🔗 Internal Dependencies Analysis

### Constants Referenced Within Constants System

#### `NUMERIC_CONSTANTS`
- **Defined in**: `common/constants/core/index.ts`
- **Referenced by 14 internal file(s)**:
  - `common/constants/core/numeric.constants.ts`
  - `common/constants/foundation/core-timeouts.constants.ts`
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/core-limits.constants.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - ... and 9 more files
- **Total internal references**: 232

#### `REFERENCE_DATA`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/reference-data.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 44

#### `Market`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 4 internal file(s)**:
  - `common/constants/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 59

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 13 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/application/environment-config.constants.ts`
  - `common/constants/application/index.ts`
  - ... and 8 more files
- **Total internal references**: 18

#### `CORE_LIMITS`
- **Defined in**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by 7 internal file(s)**:
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - ... and 2 more files
- **Total internal references**: 34

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/index.ts`
- **Total internal references**: 21

#### `CORE_TIMEOUTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 7 internal file(s)**:
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - ... and 2 more files
- **Total internal references**: 25

#### `MarketStatus`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 35

#### `OPERATION_LIMITS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 28

#### `API_OPERATIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/api-operations.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 6

#### `AlertSeverity`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/index.ts`
  - `common/constants/domain/alert-domain.constants.ts`
- **Total internal references**: 27

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 internal file(s)**:
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/rate-limit-domain.constants.ts`
  - ... and 2 more files
- **Total internal references**: 33

#### `ALERT_MESSAGES`
- **Defined in**: `common/constants/domain/alert-domain.constants.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/domain/index.ts`
- **Total internal references**: 3

#### `AlertStatus`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/domain/index.ts`
- **Total internal references**: 3

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 8 internal file(s)**:
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/rate-limit-domain.constants.ts`
  - ... and 3 more files
- **Total internal references**: 23

#### `AUTH_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 4

#### `HTTP_STATUS_SEMANTICS`
- **Defined in**: `common/constants/semantic/status-codes-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/status-codes-semantics.constants.ts`
- **Total internal references**: 31

#### `MONITORING_BUSINESS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/monitoring-business.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 18

#### `RETRY_DELAY_SEMANTICS`
- **Defined in**: `common/constants/semantic/retry-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
- **Total internal references**: 30

#### `RateLimitStrategy`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/rate-limit-domain.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 12


### External Components Referencing Constants System

#### `NUMERIC_CONSTANTS`
- **Defined in**: `common/constants/core/index.ts`
- **Referenced by 12 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - ... and 7 more files
- **Total external references**: 98

#### `REFERENCE_DATA`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 36 external component(s)**:
  - `core/03-fetching/data-fetcher/dto/data-fetch-request.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-response.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto.ts`
  - `core/03-fetching/stream-data-fetcher/interfaces/stream-data-fetcher.interface.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - ... and 31 more files
- **Total external references**: 195

#### `Market`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 23 external component(s)**:
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `core/01-entry/receiver/utils/market.util.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/controller/query.controller.ts`
  - `core/01-entry/query/factories/executors/market-query.executor.ts`
  - ... and 18 more files
- **Total external references**: 125

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 62 external component(s)**:
  - `core/03-fetching/stream-data-fetcher/config/stream-recovery.config.ts`
  - `core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-subscribe.dto.ts`
  - `core/01-entry/receiver/dto/receiver-internal.dto.ts`
  - ... and 57 more files
- **Total external references**: 148

#### `CORE_LIMITS`
- **Defined in**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by 12 external component(s)**:
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `alert/constants/core/timeouts.constants.ts`
  - `alert/constants/core/limits.constants.ts`
  - `alert/constants/core/index.ts`
  - ... and 7 more files
- **Total external references**: 111

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 23 external component(s)**:
  - `core/01-entry/stream-receiver/guards/ws-auth.guard.ts`
  - `core/01-entry/receiver/utils/market.util.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/constants/query.constants.ts`
  - `core/01-entry/query/services/query-execution-engine.service.ts`
  - ... and 18 more files
- **Total external references**: 88

#### `CORE_TIMEOUTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 11 external component(s)**:
  - `alert/config/alert.config.ts`
  - `alert/constants/core/timeouts.constants.ts`
  - `alert/constants/core/index.ts`
  - `alert/constants/composite/defaults.constants.ts`
  - `alert/constants/index.ts`
  - ... and 6 more files
- **Total external references**: 45

#### `MarketStatus`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/factories/executors/market-query.executor.ts`
  - `core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts`
  - `core/shared/services/market-status.service.ts`
  - `core/shared/services/data-change-detector.service.ts`
- **Total external references**: 29

#### `OPERATION_LIMITS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 12 external component(s)**:
  - `core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts`
  - `core/03-fetching/stream-data-fetcher/guards/stream-rate-limit.guard.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `app/config/validation/dependencies-validator.service.ts`
  - `app/startup/graceful-shutdown.service.ts`
  - ... and 7 more files
- **Total external references**: 33

#### `API_OPERATIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 18 external component(s)**:
  - `core/03-fetching/data-fetcher/dto/data-fetch-request.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-subscribe.dto.ts`
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - ... and 13 more files
- **Total external references**: 55

#### `AlertSeverity`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 8 external component(s)**:
  - `alert/dto/alert-rule.dto.ts`
  - `alert/dto/alert.dto.ts`
  - `alert/types/alert.types.ts`
  - `alert/constants/composite/defaults.constants.ts`
  - `alert/schemas/alert-history.schema.ts`
  - ... and 3 more files
- **Total external references**: 30

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - ... and 2 more files
- **Total external references**: 21

#### `ALERT_MESSAGES`
- **Defined in**: `common/constants/domain/alert-domain.constants.ts`
- **Referenced by 3 external component(s)**:
  - `alert/constants/composite/index.ts`
  - `alert/services/alerting.service.ts`
  - `alert/services/rule-engine.service.ts`
- **Total external references**: 49

#### `AlertStatus`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 8 external component(s)**:
  - `alert/dto/alert-history-internal.dto.ts`
  - `alert/dto/alert.dto.ts`
  - `alert/types/alert.types.ts`
  - `alert/repositories/alert-history.repository.ts`
  - `alert/schemas/alert-history.schema.ts`
  - ... and 3 more files
- **Total external references**: 40

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - ... and 2 more files
- **Total external references**: 18

#### `AUTH_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 31

#### `MONITORING_BUSINESS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts`
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `monitoring/analyzer/analyzer-score.service.ts`
  - `monitoring/analyzer/analyzer-trend.service.ts`
  - `monitoring/analyzer/analyzer.service.ts`
- **Total external references**: 13

#### `RateLimitStrategy`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 4 external component(s)**:
  - `core/01-entry/stream-receiver/guards/ws-auth.guard.ts`
  - `auth/services/rate-limit.service.ts`
  - `auth/guards/rate-limit.guard.ts`
  - `auth/interfaces/rate-limit.interface.ts`
- **Total external references**: 18

#### `CACHE_TTL_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `cache/constants/cache.constants.ts`
- **Total external references**: 2

#### `CONFIG`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 6 external component(s)**:
  - `core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts`
  - `core/02-processing/symbol-transformer/services/symbol-transformer.service.ts`
  - `cache/constants/config/cache-keys.constants.ts`
  - ... and 1 more files
- **Total external references**: 18


## 📊 Detailed Usage Statistics

### Usage Distribution
- **Heavily Used** (10+ usages): 48 constants
- **Moderately Used** (3-9 usages): 63 constants
- **Lightly Used** (1-2 usages): 43 constants
- **Unused**: 84 constants

### File Distribution
- **Single File Usage**: 67 constants
- **Multiple Files Usage**: 87 constants
- **Widely Used** (5+ files): 26 constants

## 📋 Action Items

### Immediate Actions
1. **Remove unused constants** - 84 constants can be safely removed
2. **Review single-use constants** - Consider inlining 41 constants
3. **Document heavily used constants** - Ensure proper documentation

### Medium-term Improvements
1. **Consolidate duplicate values** - Review constants with similar purposes
2. **Organize by domain** - Group related constants together
3. **Add JSDoc comments** - Document purpose and usage

### Long-term Strategy
1. **Establish naming conventions** - Standardize constant naming patterns
2. **Implement linting rules** - Prevent constant duplication
3. **Regular audits** - Schedule periodic reviews

---

*Analysis completed on 2025-09-09T11:09:32.180Z*
*Tool: Constants Usage Analyzer v1.0*