# Constants Usage Analysis Report

Generated: 2025-09-09T13:12:41.129Z

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Constants** | 156 |
| **Total Usages** | 2485 |
| **Internal References** | 1280 |
| **External References** | 1205 |
| **Multi-use Constants** | 113 |
| **Single-use Constants** | 40 |
| **Unused Constants** | 3 |
| **Average Usage per Constant** | 15.93 |

### File Statistics
- **Constant Files**: 28
- **Source Files Analyzed**: 194
- **Files Using Constants**: 194
- **Files Without Constants**: 0

## 🎯 Key Recommendations

🗑️ **Remove 3 unused constants** to reduce codebase bloat

   - Consider removing: NUMERIC_VALUE_MAP, RATE_LIMIT_LUA_SCRIPT_NAMES, CIRCUIT_BREAKER_CONSTANTS

⚡ **Review 40 single-use constants** for potential inlining or consolidation

   - Single-use: TimezoneUtil, PROCESSING_BASE_CONSTANTS, FOUNDATION_CONSTANTS, HTTP_BATCH_SEMANTICS, HTTP_SUCCESS_MESSAGES

✅ **47 constants are heavily used (10+ references)** - good centralization

📁 **Constants are spread across 6 subdirectories** - consider reorganization if needed

## 📈 Most Used Constants (Top 10)


### 1. `NUMERIC_CONSTANTS` (252 usages)
- **Source**: `common/constants/core/index.ts`
- **Referenced by**: 22 files
- **Internal references**: 231
- **External references**: 21

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

### 5. `CONSTANTS` (109 usages)
- **Source**: `common/constants/index.ts`
- **Referenced by**: 24 files
- **Internal references**: 21
- **External references**: 88

### 6. `CORE_LIMITS` (71 usages)
- **Source**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by**: 14 files
- **Internal references**: 34
- **External references**: 37

### 7. `MarketStatus` (64 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 7 files
- **Internal references**: 35
- **External references**: 29

### 8. `OPERATION_LIMITS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 14 files
- **Internal references**: 28
- **External references**: 33

### 9. `API_OPERATIONS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 20 files
- **Internal references**: 6
- **External references**: 55

### 10. `AlertSeverity` (57 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 10 files
- **Internal references**: 27
- **External references**: 30


## 🚨 Unused Constants (3 total)


### File: `common/constants/core/numeric.constants.ts`
- **NUMERIC_VALUE_MAP**
  - Line: 112
  - Type: CallExpression
  - Export: named

### File: `common/constants/domain/index.ts`
- **RATE_LIMIT_LUA_SCRIPT_NAMES**
  - Line: 91
  - Type: unknown
  - Export: named

### File: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **CIRCUIT_BREAKER_CONSTANTS**
  - Line: 332
  - Type: CallExpression
  - Export: named


## ⚠️ Single-use Constants (40 total)


### `TimezoneUtil`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/foundation/core-timezones.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 10

### `PROCESSING_BASE_CONSTANTS`
- **Defined in**: `common/constants/foundation/processing-base.constants.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 132

### `FOUNDATION_CONSTANTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 33

### `HTTP_BATCH_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 11

### `HTTP_SUCCESS_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 16

### `RATE_LIMIT_TIMEOUTS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 85

### `RATE_LIMIT_RETRY_CONFIG`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 86

### `RATE_LIMIT_ERROR_TEMPLATES`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/rate-limit-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 90

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
- **Line**: 37

### `ReferenceDataUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 47

### `ApiOperationsUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 51

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
- **Line**: 8

### `Sizes`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 20

### `CoreTimeouts`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `alert/constants/core/timeouts.constants.ts`
- **Usage type**: External
- **Line**: 23

### `OPERATION_TYPE_SEMANTICS`
- **Defined in**: `common/constants/semantic/message-semantics.constants.ts`
- **Used in**: `common/constants/semantic/message-semantics.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 301

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
- **Line**: 17

### `CacheSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 27

### `RetrySemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 36

### `BatchSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 45

### `StatusCodeSemanticsUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 51

### `ErrorMessageUtil`
- **Defined in**: `common/constants/semantic/index.ts`
- **Used in**: `common/constants/semantic/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 70

### `EnvironmentConfigUtil`
- **Defined in**: `common/constants/application/index.ts`
- **Used in**: `common/constants/application/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 45

### `RATE_LIMIT_STRATEGY_DESCRIPTIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 80

### `RATE_LIMIT_STRATEGY_USE_CASES`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 81

### `RATE_LIMIT_STATISTICS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 88

### `MARKET_DATA_QUALITY`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 16

### `CacheDataType`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/operation-limits.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 42

### `ApiBusinessScenario`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 57

### `ApiCacheStrategy`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 58

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
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/semantic/status-codes-semantics.constants.ts`
  - `common/constants/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Total internal references**: 231

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
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/rate-limit-domain.constants.ts`
  - `common/constants/domain/api-operations.constants.ts`
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/reference-data.constants.ts`
  - `common/constants/domain/monitoring-business.constants.ts`
  - `common/constants/domain/index.ts`
  - `common/constants/domain/alert-domain.constants.ts`
- **Total internal references**: 18

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/index.ts`
- **Total internal references**: 21

#### `CORE_LIMITS`
- **Defined in**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by 7 internal file(s)**:
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/domain/operation-limits.constants.ts`
- **Total internal references**: 34

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
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/alert-domain.constants.ts`
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
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/alert-domain.constants.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
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

#### `CACHE_TTL_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 6 internal file(s)**:
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/rate-limit-domain.constants.ts`
  - `common/constants/domain/market-domain.constants.ts`
  - `common/constants/domain/alert-domain.constants.ts`
- **Total internal references**: 26


### External Components Referencing Constants System

#### `NUMERIC_CONSTANTS`
- **Defined in**: `common/constants/core/index.ts`
- **Referenced by 8 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `common/dto/base-query.dto.ts`
- **Total external references**: 21

#### `REFERENCE_DATA`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 36 external component(s)**:
  - `core/03-fetching/data-fetcher/dto/data-fetch-request.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-response.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto.ts`
  - `core/03-fetching/stream-data-fetcher/interfaces/stream-data-fetcher.interface.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-subscribe.dto.ts`
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `core/01-entry/receiver/dto/data-request.dto.ts`
  - `core/01-entry/receiver/controller/receiver.controller.ts`
  - `core/01-entry/query/dto/query-request.dto.ts`
  - `core/01-entry/query/controller/query.controller.ts`
  - `core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto.ts`
  - `core/00-prepare/data-mapper/dto/data-source-analysis.dto.ts`
  - `core/00-prepare/data-mapper/schemas/data-source-template.schema.ts`
  - `core/00-prepare/data-mapper/services/persisted-template.service.ts`
  - `core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto.ts`
  - `core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto.ts`
  - `core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts`
  - `core/02-processing/transformer/dto/data-transform-request.dto.ts`
  - `core/02-processing/transformer/controller/data-transformer.controller.ts`
  - `core/04-storage/storage/controller/storage.controller.ts`
  - `app/config/auto-init.config.ts`
  - `auth/controller/auth.controller.ts`
  - `alert/controller/alert.controller.ts`
  - `providers/decorators/provider.decorator.ts`
  - `providers/constants/symbol-formats.constants.ts`
  - `providers/longport/capabilities/stream-stock-quote.ts`
  - `providers/longport/longport.provider.ts`
  - `providers/longport/services/longport-stream-context.service.ts`
  - `providers/longport/services/longport-context.service.ts`
  - `providers/controller/providers-controller.ts`
  - `providers/longport-sg/capabilities/stream-stock-quote.ts`
  - `providers/longport-sg/services/longport-stream-context.service.ts`
  - `providers/longport-sg/services/longport-context.service.ts`
  - `common/core/decorators/swagger-responses.decorator.ts`
  - `common/utils/symbol-validation.util.ts`
- **Total external references**: 195

#### `Market`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 23 external component(s)**:
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `core/01-entry/receiver/utils/market.util.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/controller/query.controller.ts`
  - `core/01-entry/query/factories/executors/market-query.executor.ts`
  - `core/01-entry/query/services/query-execution-engine.service.ts`
  - `core/05-caching/smart-cache/utils/smart-cache-request.utils.ts`
  - `core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts`
  - `core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface.ts`
  - `core/shared/services/market-status.service.ts`
  - `core/shared/services/data-change-detector.service.ts`
  - `core/04-storage/storage/dto/storage-metadata.dto.ts`
  - `core/04-storage/storage/dto/storage-request.dto.ts`
  - `providers/longport/capabilities/get-stock-quote.ts`
  - `providers/longport/capabilities/get-index-quote.ts`
  - `providers/longport/capabilities/get-stock-basic-info.ts`
  - `providers/longport/capabilities/stream-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-index-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-basic-info.ts`
  - `providers/longport-sg/capabilities/stream-stock-quote.ts`
  - `common/utils/symbol-validation.util.ts`
  - `monitoring/infrastructure/metrics/metrics-registry.service.ts`
- **Total external references**: 125

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 62 external component(s)**:
  - `core/03-fetching/stream-data-fetcher/config/stream-recovery.config.ts`
  - `core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-subscribe.dto.ts`
  - `core/01-entry/receiver/dto/receiver-internal.dto.ts`
  - `core/01-entry/receiver/dto/data-request.dto.ts`
  - `core/01-entry/receiver/dto/common/base-request-options.dto.ts`
  - `core/01-entry/query/dto/query-request.dto.ts`
  - `core/01-entry/query/factories/query-executor.factory.ts`
  - `core/05-caching/common-cache/dto/cache-request.dto.ts`
  - `core/05-caching/common-cache/dto/cache-compute-options.dto.ts`
  - `core/05-caching/smart-cache/config/smart-cache-config.factory.ts`
  - `core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts`
  - `core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto.ts`
  - `core/00-prepare/data-mapper/dto/data-source-analysis.dto.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/data-mapper/schemas/data-source-template.schema.ts`
  - `core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema.ts`
  - `core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`
  - `core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto.ts`
  - `core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema.ts`
  - `core/shared/types/storage-classification.enum.ts`
  - `core/02-processing/transformer/dto/data-transform-preview.dto.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `core/04-storage/storage/dto/storage-request.dto.ts`
  - `core/04-storage/storage/schemas/storage.schema.ts`
  - `app/config/logger.config.ts`
  - `app/config/feature-flags.config.ts`
  - `app/config/validation/environment-validator.service.ts`
  - `app/config/validation/config-validator.service.ts`
  - `app/config/validation/dependencies-validator.service.ts`
  - `cache/dto/config/cache-config.dto.ts`
  - `auth/middleware/security.middleware.ts`
  - `auth/schemas/user.schema.ts`
  - `auth/schemas/apikey.schema.ts`
  - `alert/dto/notification-channel.dto.ts`
  - `alert/dto/alert-rule.dto.ts`
  - `alert/dto/alert.dto.ts`
  - `alert/dto/notification-channels/webhook-notification.dto.ts`
  - `alert/dto/notification-channels/dingtalk-notification.dto.ts`
  - `alert/constants/composite/templates.constants.ts`
  - `alert/schemas/alert-history.schema.ts`
  - `alert/schemas/notification-log.schema.ts`
  - `alert/schemas/alert-rule.schema.ts`
  - `alert/services/notification-senders/log.sender.ts`
  - `alert/services/rule-engine.service.ts`
  - `providers/utils/convention-scanner.ts`
  - `providers/utils/smart-error-handler.ts`
  - `providers/controller/providers-controller.ts`
  - `providers/services/capability-registry.service.ts`
  - `common/dto/base-query.dto.ts`
  - `common/core/filters/global-exception.filter.ts`
  - `common/core/interceptors/response.interceptor.ts`
  - `common/modules/permission/services/permission-validation.service.ts`
  - `monitoring/cache/monitoring-cache.service.ts`
  - `monitoring/config/monitoring.config.ts`
  - `monitoring/constants/config/monitoring-health.constants.ts`
  - `monitoring/presenter/presenter.controller.ts`
  - `monitoring/presenter/presenter-error.service.ts`
  - `monitoring/collector/collector.service.ts`
  - `monitoring/infrastructure/bridge/monitoring-event-bridge.service.ts`
  - `monitoring/analyzer/analyzer.service.ts`
- **Total external references**: 148

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 23 external component(s)**:
  - `core/01-entry/stream-receiver/guards/ws-auth.guard.ts`
  - `core/01-entry/receiver/utils/market.util.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/constants/query.constants.ts`
  - `core/01-entry/query/services/query-execution-engine.service.ts`
  - `core/05-caching/smart-cache/utils/smart-cache-request.utils.ts`
  - `core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts`
  - `core/05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `auth/middleware/security.middleware.ts`
  - `auth/constants/permission.constants.ts`
  - `auth/guards/rate-limit.guard.ts`
  - `alert/controller/alert.controller.ts`
  - `providers/longport/capabilities/get-stock-quote.ts`
  - `providers/longport/capabilities/get-index-quote.ts`
  - `providers/longport/capabilities/get-stock-basic-info.ts`
  - `providers/longport/capabilities/stream-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-index-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-basic-info.ts`
  - `providers/longport-sg/capabilities/stream-stock-quote.ts`
  - `common/core/filters/global-exception.filter.ts`
  - `common/utils/symbol-validation.util.ts`
- **Total external references**: 88

#### `CORE_LIMITS`
- **Defined in**: `common/constants/foundation/core-limits.constants.ts`
- **Referenced by 7 external component(s)**:
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `alert/constants/core/limits.constants.ts`
  - `alert/constants/core/index.ts`
  - `alert/constants/composite/templates.constants.ts`
  - `alert/constants/composite/defaults.constants.ts`
  - `alert/constants/index.ts`
- **Total external references**: 37

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
  - `app/startup/health-checker.service.ts`
  - `alert/module/alert.module.ts`
  - `alert/controller/alert.controller.ts`
  - `alert/services/notification-senders/webhook.sender.ts`
  - `providers/decorators/provider.decorator.ts`
  - `providers/controller/providers-controller.ts`
  - `monitoring/health/extended-health.service.ts`
- **Total external references**: 33

#### `API_OPERATIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 18 external component(s)**:
  - `core/03-fetching/data-fetcher/dto/data-fetch-request.dto.ts`
  - `core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-unsubscribe.dto.ts`
  - `core/01-entry/stream-receiver/dto/stream-subscribe.dto.ts`
  - `core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - `core/01-entry/receiver/dto/data-request.dto.ts`
  - `core/01-entry/receiver/constants/operations.constants.ts`
  - `core/01-entry/receiver/controller/receiver.controller.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/constants/query.constants.ts`
  - `core/01-entry/query/controller/query.controller.ts`
  - `core/shared/types/field-naming.types.ts`
  - `providers/decorators/stream-capability.decorator.ts`
  - `providers/decorators/capability.decorator.ts`
  - `providers/constants/capability-names.constants.ts`
  - `providers/cli/provider-generator.cli.ts`
  - `providers/controller/providers-controller.ts`
  - `providers/interfaces/stream-capability.interface.ts`
- **Total external references**: 55

#### `AlertSeverity`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 8 external component(s)**:
  - `alert/dto/alert-rule.dto.ts`
  - `alert/dto/alert.dto.ts`
  - `alert/types/alert.types.ts`
  - `alert/constants/composite/defaults.constants.ts`
  - `alert/schemas/alert-history.schema.ts`
  - `alert/schemas/alert-rule.schema.ts`
  - `alert/services/notification-senders/slack.sender.ts`
  - `alert/interfaces/alert.interface.ts`
- **Total external references**: 30

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `common/dto/base-query.dto.ts`
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
  - `alert/services/alerting.service.ts`
  - `alert/services/alert-history.service.ts`
  - `alert/interfaces/alert.interface.ts`
- **Total external references**: 40

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
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

#### `CORE_TIMEOUTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 external component(s)**:
  - `alert/constants/core/timeouts.constants.ts`
- **Total external references**: 2

#### `ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/05-caching/data-mapper-cache/constants/data-mapper-cache.constants.ts`
  - `core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`
  - `auth/services/auth.service.ts`
  - `auth/services/apikey.service.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 22


## 📊 Detailed Usage Statistics

### Usage Distribution
- **Heavily Used** (10+ usages): 47 constants
- **Moderately Used** (3-9 usages): 64 constants
- **Lightly Used** (1-2 usages): 42 constants
- **Unused**: 3 constants

### File Distribution
- **Single File Usage**: 66 constants
- **Multiple Files Usage**: 87 constants
- **Widely Used** (5+ files): 26 constants

## 📋 Action Items

### Immediate Actions
1. **Remove unused constants** - 3 constants can be safely removed
2. **Review single-use constants** - Consider inlining 40 constants
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

*Analysis completed on 2025-09-09T13:12:41.129Z*
*Tool: Constants Usage Analyzer v1.0*