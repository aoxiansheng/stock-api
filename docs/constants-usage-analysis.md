# Constants Usage Analysis Report

Generated: 2025-09-18T06:43:06.455Z

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Constants** | 89 |
| **Total Usages** | 1649 |
| **Internal References** | 678 |
| **External References** | 971 |
| **Multi-use Constants** | 67 |
| **Single-use Constants** | 17 |
| **Unused Constants** | 5 |
| **Average Usage per Constant** | 18.53 |

### File Statistics
- **Constant Files**: 24
- **Source Files Analyzed**: 189
- **Files Using Constants**: 189
- **Files Without Constants**: 0

## 🎯 Key Recommendations

🗑️ **Remove 5 unused constants** to reduce codebase bloat

   - Consider removing: ApiDataType, ApiMarketType, ApiFetchMode, ApiBusinessScenario, ApiCacheStrategy

⚡ **Review 17 single-use constants** for potential inlining or consolidation

   - Single-use: PROCESSING_BASE_CONSTANTS, HTTP_BATCH_SEMANTICS, HTTP_SUCCESS_MESSAGES, CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS, CIRCUIT_BREAKER_MONITORING_THRESHOLDS

✅ **31 constants are heavily used (10+ references)** - good centralization

📁 **Constants are spread across 6 subdirectories** - consider reorganization if needed

## 📈 Most Used Constants (Top 10)


### 1. `default` (267 usages)
- **Source**: `common/constants/application/index.ts`
- **Referenced by**: 100 files
- **Internal references**: 8
- **External references**: 259

### 2. `NUMERIC_CONSTANTS` (248 usages)
- **Source**: `common/constants/core/index.ts`
- **Referenced by**: 21 files
- **Internal references**: 137
- **External references**: 111

### 3. `REFERENCE_DATA` (191 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 36 files
- **Internal references**: 2
- **External references**: 189

### 4. `CONSTANTS` (65 usages)
- **Source**: `common/constants/index.ts`
- **Referenced by**: 21 files
- **Internal references**: 1
- **External references**: 64

### 5. `API_OPERATIONS` (56 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 19 files
- **Internal references**: 1
- **External references**: 55

### 6. `BATCH_SIZE_SEMANTICS` (54 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 12 files
- **Internal references**: 23
- **External references**: 31

### 7. `OPERATION_LIMITS` (46 usages)
- **Source**: `common/constants/domain/index.ts`
- **Referenced by**: 8 files
- **Internal references**: 28
- **External references**: 18

### 8. `HTTP_TIMEOUTS` (45 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 12 files
- **Internal references**: 20
- **External references**: 25

### 9. `AUTH_ERROR_MESSAGES` (35 usages)
- **Source**: `common/constants/semantic/index.ts`
- **Referenced by**: 3 files
- **Internal references**: 4
- **External references**: 31

### 10. `CORE_TRADING_TIMES` (33 usages)
- **Source**: `common/constants/foundation/index.ts`
- **Referenced by**: 2 files
- **Internal references**: 1
- **External references**: 32


## 🚨 Unused Constants (5 total)


### File: `common/constants/domain/index.ts`
- **ApiDataType**
  - Line: 27
  - Type: unknown
  - Export: named
- **ApiMarketType**
  - Line: 28
  - Type: unknown
  - Export: named
- **ApiFetchMode**
  - Line: 29
  - Type: unknown
  - Export: named
- **ApiBusinessScenario**
  - Line: 30
  - Type: unknown
  - Export: named
- **ApiCacheStrategy**
  - Line: 31
  - Type: unknown
  - Export: named


## ⚠️ Single-use Constants (17 total)


### `PROCESSING_BASE_CONSTANTS`
- **Defined in**: `common/constants/foundation/processing-base.constants.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 127

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

### `CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 154

### `CIRCUIT_BREAKER_MONITORING_THRESHOLDS`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 207

### `CORE_TTL`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/foundation/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 8

### `FOUNDATION_CONSTANTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 30

### `OPERATION_TYPE_SEMANTICS`
- **Defined in**: `common/constants/semantic/message-semantics.constants.ts`
- **Used in**: `common/constants/semantic/message-semantics.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 318

### `CACHE_MONITORING_SEMANTICS`
- **Defined in**: `common/constants/semantic/cache-semantics.constants.ts`
- **Used in**: `common/constants/semantic/cache-semantics.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 194

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

### `CacheDataType`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/domain/operation-limits.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 13

### `REDIS_CONNECTION_CONSTRAINTS`
- **Defined in**: `common/constants/domain/redis-specific.constants.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 82

### `REDIS_COMMAND_CATEGORIES`
- **Defined in**: `common/constants/domain/redis-specific.constants.ts`
- **Used in**: `common/constants/domain/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 116

### `DOMAIN_CONSTANTS`
- **Defined in**: `common/constants/domain/index.ts`
- **Used in**: `common/constants/index.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 48

### `CIRCUIT_BREAKER_KEY_CONFIG`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 192

### `DEFAULT_CIRCUIT_BREAKER_CONFIG`
- **Defined in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Used in**: `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Usage type**: Internal (within constants system)
- **Line**: 220


## 🔗 Internal Dependencies Analysis

### Constants Referenced Within Constants System

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 6 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/application/environment-config.constants.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
- **Total internal references**: 8

#### `NUMERIC_CONSTANTS`
- **Defined in**: `common/constants/core/index.ts`
- **Referenced by 12 internal file(s)**:
  - `common/constants/foundation/core-timeouts.constants.ts`
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/semantic/status-codes-semantics.constants.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Total internal references**: 137

#### `REFERENCE_DATA`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/domain/index.ts`
- **Total internal references**: 2

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/index.ts`
- **Total internal references**: 1

#### `API_OPERATIONS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/domain/index.ts`
- **Total internal references**: 1

#### `BATCH_SIZE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 4 internal file(s)**:
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/application/index.ts`
- **Total internal references**: 23

#### `OPERATION_LIMITS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/index.ts`
- **Total internal references**: 28

#### `HTTP_TIMEOUTS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 4 internal file(s)**:
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/index.ts`
  - `common/constants/application/index.ts`
  - `common/constants/domain/circuit-breaker-domain.constants.ts`
- **Total internal references**: 20

#### `AUTH_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 4

#### `CORE_TRADING_TIMES`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 internal file(s)**:
  - `common/constants/foundation/index.ts`
- **Total internal references**: 1

#### `HTTP_STATUS_SEMANTICS`
- **Defined in**: `common/constants/semantic/status-codes-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/index.ts`
  - `common/constants/semantic/status-codes-semantics.constants.ts`
- **Total internal references**: 31

#### `CONFIG`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 5 internal file(s)**:
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/cache-semantics.constants.ts`
  - `common/constants/index.ts`
  - `common/constants/domain/operation-limits.constants.ts`
  - `common/constants/domain/redis-specific.constants.ts`
- **Total internal references**: 11

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

#### `BUSINESS_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 6

#### `CORE_TIMEOUTS`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 6 internal file(s)**:
  - `common/constants/foundation/index.ts`
  - `common/constants/foundation/processing-base.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
  - `common/constants/semantic/batch-semantics.constants.ts`
  - `common/constants/semantic/retry-semantics.constants.ts`
  - `common/constants/domain/operation-limits.constants.ts`
- **Total internal references**: 23

#### `ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 5

#### `HTTP_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/index.ts`
- **Total internal references**: 5

#### `MESSAGE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 3 internal file(s)**:
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/error-messages.constants.ts`
  - `common/constants/semantic/http-semantics.constants.ts`
- **Total internal references**: 18

#### `MESSAGE_TEMPLATE_FUNCTIONS`
- **Defined in**: `common/constants/semantic/message-semantics.constants.ts`
- **Referenced by 2 internal file(s)**:
  - `common/constants/semantic/message-semantics.constants.ts`
  - `common/constants/semantic/error-messages.constants.ts`
- **Total internal references**: 18


### External Components Referencing Constants System

#### `default`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 94 external component(s)**:
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
  - `cache/dto/config/cache-config.dto.ts`
  - `cache/constants/config/cache-keys.constants.ts`
  - `cache/services/cache.service.ts`
  - `auth/schemas/user.schema.ts`
  - `auth/schemas/apikey.schema.ts`
  - `auth/permission/services/permission-validation.service.ts`
  - `notification/dto/notification-request.dto.ts`
  - `notification/dto/notification-channel.dto.ts`
  - `notification/dto/notification-history.dto.ts`
  - `notification/dto/channels/webhook-notification.dto.ts`
  - `notification/dto/channels/dingtalk-notification.dto.ts`
  - `notification/schemas/notification-template.schema.ts`
  - `notification/schemas/notification-log.schema.ts`
  - `notification/schemas/notification-channel.schema.ts`
  - `notification/schemas/notification.schema.ts`
  - `notification/adapters/alert-to-notification.adapter.ts`
  - `notification/services/notification-template-initializer.service.ts`
  - `notification/services/notification.service.ts`
  - `notification/services/senders/log.sender.ts`
  - `notification/services/senders/dingtalk.sender.ts`
  - `notification/services/senders/webhook.sender.ts`
  - `notification/services/senders/email.sender.ts`
  - `notification/services/senders/slack.sender.ts`
  - `notification/services/notification-config.service.ts`
  - `notification/services/notification-template.service.ts`
  - `alert/dto/alert-rule.dto.ts`
  - `alert/dto/alert.dto.ts`
  - `alert/utils/alert-cache-keys.util.ts`
  - `alert/repositories/alert-history.repository.ts`
  - `alert/schemas/alert-history.schema.ts`
  - `alert/schemas/alert-rule.schema.ts`
  - `alert/controller/alert.controller.ts`
  - `alert/evaluators/rule.evaluator.ts`
  - `alert/services/alert-event-publisher.service.ts`
  - `providers/utils/convention-scanner.ts`
  - `providers/utils/smart-error-handler.ts`
  - `providers/controller/providers-controller.ts`
  - `appcore/config/unified-ttl.config.ts`
  - `appcore/config/app.config.ts`
  - `appcore/config/feature-flags.config.ts`
  - `appcore/config/environment.config.ts`
  - `common/dto/base-query.dto.ts`
  - `common/core/filters/global-exception.filter.ts`
  - `common/core/interceptors/response.interceptor.ts`
  - `common/config/common-constants.config.ts`
  - `common/utils/http-headers.util.ts`
  - `common/modules/logging/utils.ts`
  - `common/modules/logging/log-level-controller.ts`
  - `monitoring/config/unified/monitoring-core-env.config.ts`
  - `monitoring/config/unified/monitoring-performance-thresholds.config.ts`
  - `monitoring/config/unified/monitoring-unified-limits.config.ts`
  - `monitoring/config/unified/index.ts`
  - `monitoring/config/unified/monitoring-events.config.ts`
  - `monitoring/config/unified/monitoring-unified-ttl.config.ts`
  - `monitoring/config/unified/monitoring-enhanced.config.ts`
  - `monitoring/config/monitoring.config.ts`
  - `monitoring/contracts/dto/queries/get-endpoint-metrics.dto.ts`
  - `monitoring/contracts/dto/queries/get-trends.dto.ts`
  - `monitoring/constants/config/monitoring-health.constants.ts`
  - `monitoring/constants/business.ts`
  - `monitoring/presenter/presenter.controller.ts`
  - `monitoring/collector/collector.service.ts`
  - `monitoring/utils/monitoring-cache-keys.ts`
  - `monitoring/infrastructure/metrics/metrics.constants.ts`
  - `monitoring/infrastructure/bridge/monitoring-event-bridge.service.ts`
  - `monitoring/analyzer/analyzer.service.ts`
- **Total external references**: 259

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
- **Referenced by 35 external component(s)**:
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
- **Total external references**: 189

#### `CONSTANTS`
- **Defined in**: `common/constants/index.ts`
- **Referenced by 20 external component(s)**:
  - `core/01-entry/stream-receiver/guards/ws-auth.guard.ts`
  - `core/01-entry/receiver/services/receiver.service.ts`
  - `core/01-entry/query/constants/query.constants.ts`
  - `core/01-entry/query/services/query-execution-engine.service.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `auth/middleware/security.middleware.ts`
  - `auth/decorators/validation.decorator.ts`
  - `auth/services/infrastructure/permission.service.ts`
  - `auth/guards/unified-permissions.guard.ts`
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
- **Total external references**: 64

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
- **Total external references**: 31

#### `OPERATION_LIMITS`
- **Defined in**: `common/constants/domain/index.ts`
- **Referenced by 6 external component(s)**:
  - `core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts`
  - `core/03-fetching/stream-data-fetcher/guards/stream-rate-limit.guard.ts`
  - `core/04-storage/storage/constants/storage.constants.ts`
  - `alert/module/alert-enhanced.module.ts`
  - `providers/decorators/provider.decorator.ts`
  - `providers/controller/providers-controller.ts`
- **Total external references**: 18

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
- **Total external references**: 25

#### `AUTH_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 31

#### `CORE_TRADING_TIMES`
- **Defined in**: `common/constants/foundation/index.ts`
- **Referenced by 1 external component(s)**:
  - `core/shared/constants/market.constants.ts`
- **Total external references**: 32

#### `CONFIG`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts`
  - `core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`
  - `core/02-processing/symbol-transformer/services/symbol-transformer.service.ts`
  - `cache/constants/config/cache-keys.constants.ts`
  - `cache/constants/cache-core.constants.ts`
- **Total external references**: 20

#### `BUSINESS_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 7 external component(s)**:
  - `alert/repositories/alert-rule.repository.ts`
  - `alert/controller/alert.controller.ts`
  - `alert/validators/alert-rule.validator.ts`
  - `alert/services/alert-rule.service.ts`
  - `alert/services/alert-lifecycle.service.ts`
  - `alert/services/alert-orchestrator.service.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 20

#### `ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 5 external component(s)**:
  - `core/05-caching/data-mapper-cache/constants/data-mapper-cache.constants.ts`
  - `core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`
  - `auth/services/domain/user-authentication.service.ts`
  - `auth/services/domain/apikey-management.service.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 18

#### `HTTP_ERROR_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 3 external component(s)**:
  - `auth/middleware/security.middleware.ts`
  - `alert/controller/alert.controller.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 17

#### `MESSAGE_SEMANTICS`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 1 external component(s)**:
  - `auth/guards/unified-permissions.guard.ts`
- **Total external references**: 2

#### `VALIDATION_MESSAGES`
- **Defined in**: `common/constants/semantic/index.ts`
- **Referenced by 2 external component(s)**:
  - `alert/services/alert-rule.service.ts`
  - `common/core/filters/global-exception.filter.ts`
- **Total external references**: 14

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

#### `EnvironmentConfigManager`
- **Defined in**: `common/constants/application/index.ts`
- **Referenced by 1 external component(s)**:
  - `appcore/services/environment-config.service.ts`
- **Total external references**: 2


## 📊 Detailed Usage Statistics

### Usage Distribution
- **Heavily Used** (10+ usages): 31 constants
- **Moderately Used** (3-9 usages): 34 constants
- **Lightly Used** (1-2 usages): 19 constants
- **Unused**: 5 constants

### File Distribution
- **Single File Usage**: 24 constants
- **Multiple Files Usage**: 60 constants
- **Widely Used** (5+ files): 14 constants

## 📋 Action Items

### Immediate Actions
1. **Remove unused constants** - 5 constants can be safely removed
2. **Review single-use constants** - Consider inlining 17 constants
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

*Analysis completed on 2025-09-18T06:43:06.455Z*
*Tool: Constants Usage Analyzer v1.0*