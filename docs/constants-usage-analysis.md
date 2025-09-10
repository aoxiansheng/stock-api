# Constants Usage Analysis Report

Generated: 2025-09-09T16:12:02.560Z

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Constants** | 105 |
| **Total Usages** | 1743 |
| **Internal References** | 856 |
| **External References** | 887 |
| **Multi-use Constants** | 73 |
| **Single-use Constants** | 30 |
| **Unused Constants** | 2 |
| **Average Usage per Constant** | 16.60 |

### File Statistics
- **Constant Files**: 23
- **Source Files Analyzed**: 166
- **Files Using Constants**: 166
- **Files Without Constants**: 0

## 🎯 Key Recommendations

🗑️ **Remove 2 unused constants** to reduce codebase bloat

   - Consider removing: NUMERIC_VALUE_MAP, CIRCUIT_BREAKER_CONSTANTS

⚡ **Review 30 single-use constants** for potential inlining or consolidation

   - Single-use: TimezoneUtil, PROCESSING_BASE_CONSTANTS, FOUNDATION_CONSTANTS, HTTP_BATCH_SEMANTICS, HTTP_SUCCESS_MESSAGES

✅ **31 constants are heavily used (10+ references)** - good centralization

📁 **Constants are spread across 6 subdirectories** - consider reorganization if needed

## 📈 Most Used Constants (Top 10)


### 1. `NUMERIC_CONSTANTS` (337 usages)
- **Source**: `common/constants/core/index.ts`
- **Referenced by**: 23 files
- **Internal references**: 226
- **External references**: 111

### 2. `REFERENCE_DATA` (239 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 38 files
- **Internal references**: 44
- **External references**: 195

### 3. `default` (171 usages)
- **Source**: `common/constants/application/index.ts`
- **Referenced by**: 73 files
- **Internal references**: 12
- **External references**: 159

### 4. `CONSTANTS` (81 usages)
- **Source**: `common/constants/index.ts`
- **Referenced by**: 19 files
- **Internal references**: 21
- **External references**: 60

### 5. `OPERATION_LIMITS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 14 files
- **Internal references**: 28
- **External references**: 33

### 6. `API_OPERATIONS` (61 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 20 files
- **Internal references**: 6
- **External references**: 55

### 7. `BATCH_SIZE_SEMANTICS` (49 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 12 files
- **Internal references**: 23
- **External references**: 26

### 8. `HTTP_TIMEOUTS` (40 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 13 files
- **Internal references**: 20
- **External references**: 20

### 9. `AUTH_ERROR_MESSAGES` (35 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 3 files
- **Internal references**: 4
- **External references**: 31

### 10. `HTTP_STATUS_SEMANTICS` (31 usages)
- **Source**: `common/constants/semantic/status-codes-semantics.constants.ts`
- **Referenced by**: 2 files
- **Internal references**: 31
- **External references**: 0


## 🚨 Unused Constants (2 total)


### File: `common/constants/core/numeric.constants.ts`
- **NUMERIC_VALUE_MAP**
  - Line: 112
  - Type: CallExpression
  - Export: named

### File: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **CIRCUIT_BREAKER_CONSTANTS**
  - Line: 332
  - Type: CallExpression
  - Export: named


## ⚠️ Single-use Constants (30 total)


### `TimezoneUtil`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/foundation/core-timezones.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 9

### `PROCESSING_BASE_CONSTANTS`
- **Defined in**: `common/constants/foundation/processing-base.constants.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 131

### `FOUNDATION_CONSTANTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 31

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

### `DOMAIN_CONSTANTS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 53

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
- **Line**: 19

### `CoreTimeouts`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `alert/constants/core/timeouts.constants.ts`
- **Usage type**: External
- **Line**: 22

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
- **Line**: 44

### `OperationLimitsUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 11

### `CacheDataType`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/operation-limits.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 16

### `ReferenceDataUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 21

### `ApiOperationsUtil`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 25

### `ApiBusinessScenario`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 31

### `ApiCacheStrategy`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/api-operations.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 32

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
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/semantic/status-codes-semantics.constants.ts`
  - `common/constants/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Total internal references**: 226

#### `REFERENCE_DATA`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/reference-data.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 44

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 8 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/application/environment-config.constants.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/api-operations.constants.ts`
  - `common/constants/domain/reference-data.constants.ts`
- **Total internal references**: 12

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/index.ts`
- **Total internal references**: 21

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

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 4 internal file(s)**:
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/application/index.ts`
- **Total internal references**: 23

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 5 internal file(s)**:
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Total internal references**: 20

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

#### `RETRY_DELAY_SEMANTICS`
- **Defined in**: `common/constants/semantic/retry-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
- **Total internal references**: 30

#### `HTTP_METHODS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 28

#### `CORE_TIMEOUTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 7 internal file(s)**:
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/domain/operation-limits.constants.ts`
- **Total internal references**: 25

#### `ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 5

#### `CONFIG`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 4 internal file(s)**:
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
- **Total internal references**: 9

#### `HTTP_STATUS_CODES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 3 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/application/index.ts`
- **Total internal references**: 8

#### `CORE_TRADING_TIMES`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/foundation/index.ts`
- **Total internal references**: 1

#### `VALIDATION_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 3

#### `HTTP_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 5

#### `RETRY_COUNT_SEMANTICS`
- **Defined in**: `common/constants/semantic/retry-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
- **Total internal references**: 18


### External Components Referencing Constants System

#### `NUMERIC_CONSTANTS`
- **Defined in**: `common/constants/core/index.ts`
- **Referenced by 9 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/shared/constants/limits.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `common/dto/base-query.dto.ts`
- **Total external references**: 111

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

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 65 external component(s)**:
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
  - `core/shared/constants/market.constants.ts`
  - `core/shared/constants/limits.ts`
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
  - `monitoring/constants/business.ts`
  - `monitoring/presenter/presenter.controller.ts`
  - `monitoring/presenter/presenter-error.service.ts`
  - `monitoring/collector/collector.service.ts`
  - `monitoring/infrastructure/bridge/monitoring-event-bridge.service.ts`
  - `monitoring/analyzer/analyzer.service.ts`
- **Total external references**: 159

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 18 external component(s)**:
  - `core/01-entry/stream-receiver/guards/ws-auth.guard.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/constants/query.constants.ts`
  - `core/01-entry/query/services/query-execution-engine.service.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `auth/middleware/security.middleware.ts`
  - `auth/constants/permission.constants.ts`
  - `auth/guards/rate-limit.guard.ts`
  - `alert/controller/alert.controller.ts`
  - `providers/longport/capabilities/get-stock-quote.ts`
  - `providers/longport/capabilities/get-stock-basic-info.ts`
  - `providers/longport/capabilities/stream-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-quote.ts`
  - `providers/longport-sg/capabilities/get-index-quote.ts`
  - `providers/longport-sg/capabilities/get-stock-basic-info.ts`
  - `providers/longport-sg/capabilities/stream-stock-quote.ts`
  - `common/core/filters/global-exception.filter.ts`
  - `common/utils/symbol-validation.util.ts`
- **Total external references**: 60

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

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 8 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/shared/constants/market.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `common/dto/base-query.dto.ts`
- **Total external references**: 26

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 8 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/validation.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/shared/constants/market.constants.ts`
  - `core/02-processing/transformer/constants/data-transformer.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
- **Total external references**: 20

#### `AUTH_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 31

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

#### `CONFIG`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `core/02-processing/symbol-transformer/services/symbol-transformer.service.ts`
  - `cache/constants/config/cache-keys.constants.ts`
  - `cache/constants/cache.constants.ts`
- **Total external references**: 17

#### `HTTP_STATUS_CODES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 external component(s)**:
  - `auth/middleware/security.middleware.ts`
  - `auth/controller/auth.controller.ts`
- **Total external references**: 14

#### `CORE_TRADING_TIMES`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 external component(s)**:
  - `core/shared/constants/market.constants.ts`
- **Total external references**: 17

#### `VALIDATION_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 4 external component(s)**:
  - `alert/constants/index.ts`
  - `alert/constants/domain/validation.constants.ts`
  - `alert/constants/domain/index.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 15

#### `HTTP_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 13

#### `CORE_TIMEZONES`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 external component(s)**:
  - `core/shared/constants/market.constants.ts`
- **Total external references**: 14

#### `RETRY_BUSINESS_SCENARIOS`
- **Defined in**: `common/constants/semantic/retry-semantics.constants.ts`
- **Referenced by 4 external component(s)**:
  - `core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
  - `core/01-entry/receiver/constants/config.constants.ts`
  - `core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
- **Total external references**: 10

#### `SYSTEM_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 6

#### `CACHE_OPERATIONS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 3 external component(s)**:
  - `core/05-caching/common-cache/index.ts`
  - `core/05-caching/smart-cache/constants/smart-cache.component.constants.ts`
  - `cache/services/cache.service.ts`
- **Total external references**: 10


## 📊 Detailed Usage Statistics

### Usage Distribution
- **Heavily Used** (10+ usages): 31 constants
- **Moderately Used** (3-9 usages): 40 constants
- **Lightly Used** (1-2 usages): 32 constants
- **Unused**: 2 constants

### File Distribution
- **Single File Usage**: 42 constants
- **Multiple Files Usage**: 61 constants
- **Widely Used** (5+ files): 14 constants

## 📋 Action Items

### Immediate Actions
1. **Remove unused constants** - 2 constants can be safely removed
2. **Review single-use constants** - Consider inlining 30 constants
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

*Analysis completed on 2025-09-09T16:12:02.560Z*
*Tool: Constants Usage Analyzer v1.0*