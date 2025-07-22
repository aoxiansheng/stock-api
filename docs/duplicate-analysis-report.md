# 重复标识符分析报告

生成时间: 7/22/2025, 11:28:37 AM

## 📊 统计摘要

- 扫描的常量: 262 (重复: 0)
- 扫描的枚举: 48 (重复: 4)
- 扫描的DTO: 163 (重复: 0)
- 扫描的Type: 45 (重复: 0)

## 🔄 重复的枚举

### API_KEY

发现 2 处重复:

- **文件**: `src/common/enums/auth.enum.ts`
  - **行号**: 7
  - **值**: `"api_key"`

- **文件**: `src/common/enums/auth.enum.ts`
  - **行号**: 15
  - **值**: `"api_key"`

### CACHE

发现 2 处重复:

- **文件**: `src/core/query/enums/data-source-type.enum.ts`
  - **行号**: 10
  - **值**: `"cache"`

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 5
  - **值**: `"cache"`

### PERSISTENT

发现 2 处重复:

- **文件**: `src/core/query/enums/data-source-type.enum.ts`
  - **行号**: 15
  - **值**: `"persistent"`

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 6
  - **值**: `"persistent"`

### SUCCESS

发现 2 处重复:

- **文件**: `src/metrics/enums/auth-type.enum.ts`
  - **行号**: 9
  - **值**: `"success"`

- **文件**: `src/metrics/enums/auth-type.enum.ts`
  - **行号**: 18
  - **值**: `"success"`

## ⚠️ Type与Enum混用检测

发现以下Type定义与Enum值存在混用，建议统一使用方式:

### OperationStatus

发现在Type和Enum中都有定义:

**Type定义:**

- **文件**: `src/common/constants/unified/system.constants.ts`
  - **行号**: 48
  - **定义**: ``

**Enum定义:**

- **文件**: `src/metrics/enums/auth-type.enum.ts`
  - **行号**: 17
  - **值**: `enum`

### BLOCKED

发现在Type和Enum中都有定义:

**Type定义:**

- **文件**: `src/security/interfaces/security-audit.interface.ts`
  - **行号**: 97
  - **定义**: `"blocked"`

**Enum定义:**

- **文件**: `src/metrics/enums/auth-type.enum.ts`
  - **行号**: 21
  - **值**: `"blocked"`

## 🎯 相似命名模式

发现以下相似的命名模式，建议考虑统一或重构:

### *_OPERATIONS

Constants ending with _OPERATIONS (14 个常量)

#### ALERT_HISTORY_OPERATIONS

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

#### ALERTING_OPERATIONS

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_OPERATIONS

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

#### APIKEY_OPERATIONS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 8
  - **值**: `Object.freeze({...})`

#### AUTH_OPERATIONS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### PERMISSION_OPERATIONS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

#### CACHE_OPERATIONS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 122
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_OPERATIONS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 37
  - **值**: `Object.freeze({...})`

#### QUERY_OPERATIONS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 115
  - **值**: `Object.freeze({...})`

#### RECEIVER_OPERATIONS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 232
  - **值**: `Object.freeze({...})`

#### STORAGE_OPERATIONS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 91
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_OPERATIONS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 138
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_OPERATIONS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 19
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_OPERATIONS

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 17
  - **值**: `Object.freeze({...})`

### *_MESSAGES

Constants ending with _MESSAGES (33 个常量)

#### ALERT_HISTORY_MESSAGES

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 26
  - **值**: `Object.freeze({...})`

#### ALERTING_MESSAGES

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 28
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_MESSAGES

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 21
  - **值**: `Object.freeze({...})`

#### APIKEY_MESSAGES

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 24
  - **值**: `Object.freeze({...})`

#### AUTH_MESSAGES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 28
  - **值**: `Object.freeze({...})`

#### PERMISSION_MESSAGES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 23
  - **值**: `Object.freeze({...})`

#### CACHE_ERROR_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### CACHE_WARNING_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 33
  - **值**: `Object.freeze({...})`

#### CACHE_SUCCESS_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 49
  - **值**: `Object.freeze({...})`

#### AUTH_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### BUSINESS_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 65
  - **值**: `Object.freeze({...})`

#### SYSTEM_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 109
  - **值**: `Object.freeze({...})`

#### HTTP_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 135
  - **值**: `Object.freeze({...})`

#### ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 155
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_MESSAGES

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 53
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_ERROR_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_WARNING_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 27
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 40
  - **值**: `Object.freeze({...})`

#### QUERY_ERROR_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### QUERY_WARNING_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 36
  - **值**: `Object.freeze({...})`

#### QUERY_SUCCESS_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 53
  - **值**: `Object.freeze({...})`

#### RECEIVER_ERROR_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### RECEIVER_WARNING_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 35
  - **值**: `Object.freeze({...})`

#### RECEIVER_SUCCESS_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 49
  - **值**: `Object.freeze({...})`

#### STORAGE_ERROR_MESSAGES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### STORAGE_WARNING_MESSAGES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 30
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_ERROR_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_WARNING_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 42
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 56
  - **值**: `Object.freeze({...})`

#### TRANSFORM_ERROR_MESSAGES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 24
  - **值**: `Object.freeze({...})`

#### TRANSFORM_WARNING_MESSAGES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 40
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_MESSAGES

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 40
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_MESSAGES

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 31
  - **值**: `Object.freeze({...})`

### *_CONFIG

Constants ending with _CONFIG (45 个常量)

#### ALERT_HISTORY_CONFIG

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 76
  - **值**: `Object.freeze({...})`

#### ALERT_HISTORY_TIME_CONFIG

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 139
  - **值**: `Object.freeze({...})`

#### ALERTING_CONFIG

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 94
  - **值**: `Object.freeze({...})`

#### ALERTING_TIME_CONFIG

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 163
  - **值**: `Object.freeze({...})`

#### ALERTING_RETRY_CONFIG

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 182
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 102
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_TIME_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 147
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_RETRY_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 166
  - **值**: `Object.freeze({...})`

#### APIKEY_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 70
  - **值**: `Object.freeze({...})`

#### APIKEY_TIME_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 129
  - **值**: `Object.freeze({...})`

#### APIKEY_RETRY_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 148
  - **值**: `Object.freeze({...})`

#### AUTH_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 78
  - **值**: `Object.freeze({...})`

#### AUTH_RETRY_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### PERMISSION_CONFIG

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 74
  - **值**: `Object.freeze({...})`

#### CACHE_CONFIG

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 93
  - **值**: `Object.freeze({...})`

#### CACHE_PERFORMANCE_CONFIG

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 109
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_CONFIG

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_RETRY_CONFIG

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 329
  - **值**: `Object.freeze({...})`

#### FIELD_SUGGESTION_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 53
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 66
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_CACHE_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 195
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_STATS_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 206
  - **值**: `Object.freeze({...})`

#### PATH_RESOLUTION_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 228
  - **值**: `Object.freeze({...})`

#### QUERY_PERFORMANCE_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 70
  - **值**: `Object.freeze({...})`

#### QUERY_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 86
  - **值**: `Object.freeze({...})`

#### QUERY_CACHE_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 233
  - **值**: `Object.freeze({...})`

#### QUERY_HEALTH_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 245
  - **值**: `Object.freeze({...})`

#### RECEIVER_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 132
  - **值**: `Object.freeze({...})`

#### RECEIVER_CACHE_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 247
  - **值**: `Object.freeze({...})`

#### RECEIVER_HEALTH_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 258
  - **值**: `Object.freeze({...})`

#### STORAGE_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 46
  - **值**: `Object.freeze({...})`

#### STORAGE_BATCH_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 191
  - **值**: `Object.freeze({...})`

#### STORAGE_HEALTH_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 202
  - **值**: `Object.freeze({...})`

#### STORAGE_CLEANUP_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 213
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_PERFORMANCE_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 82
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 95
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CACHE_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 203
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_HEALTH_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 230
  - **值**: `Object.freeze({...})`

#### TRANSFORM_CONFIG

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 52
  - **值**: `Object.freeze({...})`

#### TRANSFORM_CACHE_CONFIG

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 154
  - **值**: `Object.freeze({...})`

#### HEALTH_SCORE_CONFIG

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 120
  - **值**: `{`

#### SECURITY_AUDIT_CONFIG

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_REPORT_CONFIG

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 160
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_IP_ANALYSIS_CONFIG

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 168
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_CONFIG

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 7
  - **值**: `Object.freeze({...})`

### *_CONSTANTS

Constants ending with _CONSTANTS (6 个常量)

#### CACHE_CONSTANTS

- **文件**: `src/common/constants/unified/cache.constants.ts`
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### HTTP_CONSTANTS

- **文件**: `src/common/constants/unified/http.constants.ts`
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### OPERATION_CONSTANTS

- **文件**: `src/common/constants/unified/operations.constants.ts`
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### PERFORMANCE_CONSTANTS

- **文件**: `src/common/constants/unified/performance.constants.ts`
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### SYSTEM_CONSTANTS

- **文件**: `src/common/constants/unified/system.constants.ts`
  - **行号**: 14
  - **值**: `Object.freeze({...})`

#### API_KEY_CONSTANTS

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 231
  - **值**: `Object.freeze({...})`

### *_DEFAULTS

Constants ending with _DEFAULTS (11 个常量)

#### APIKEY_DEFAULTS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 56
  - **值**: `Object.freeze({...})`

#### AUTH_DEFAULTS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 68
  - **值**: `Object.freeze({...})`

#### CACHE_DEFAULTS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 178
  - **值**: `Object.freeze({...})`

#### TRANSFORMATION_DEFAULTS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 93
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_DEFAULTS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 157
  - **值**: `Object.freeze({...})`

#### QUERY_DEFAULTS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 196
  - **值**: `Object.freeze({...})`

#### RECEIVER_DEFAULTS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 191
  - **值**: `Object.freeze({...})`

#### STORAGE_DEFAULTS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 145
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_DEFAULTS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 170
  - **值**: `Object.freeze({...})`

#### TRANSFORM_DEFAULTS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 189
  - **值**: `Object.freeze({...})`

#### PERFORMANCE_DEFAULTS

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 208
  - **值**: `Object.freeze({...})`

### *_METRICS

Constants ending with _METRICS (17 个常量)

#### ALERT_HISTORY_METRICS

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 114
  - **值**: `Object.freeze({...})`

#### ALERTING_METRICS

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 127
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_METRICS

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 123
  - **值**: `Object.freeze({...})`

#### APIKEY_METRICS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 106
  - **值**: `Object.freeze({...})`

#### AUTH_METRICS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 139
  - **值**: `Object.freeze({...})`

#### PERMISSION_METRICS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 106
  - **值**: `Object.freeze({...})`

#### CACHE_METRICS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 147
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_METRICS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 308
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_METRICS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 116
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_QUALITY_METRICS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 216
  - **值**: `Object.freeze({...})`

#### QUERY_METRICS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 150
  - **值**: `Object.freeze({...})`

#### RECEIVER_METRICS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 145
  - **值**: `Object.freeze({...})`

#### STORAGE_METRICS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 73
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_METRICS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 109
  - **值**: `Object.freeze({...})`

#### TRANSFORM_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 77
  - **值**: `Object.freeze({...})`

#### TRANSFORM_QUALITY_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 225
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_METRICS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 177
  - **值**: `Object.freeze({...})`

### *_VALIDATION_RULES

Constants ending with _VALIDATION_RULES (12 个常量)

#### ALERT_HISTORY_VALIDATION_RULES

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 128
  - **值**: `Object.freeze({...})`

#### ALERTING_VALIDATION_RULES

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 152
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_VALIDATION_RULES

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 136
  - **值**: `Object.freeze({...})`

#### APIKEY_VALIDATION_RULES

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 120
  - **值**: `Object.freeze({...})`

#### AUTH_VALIDATION_RULES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 153
  - **值**: `Object.freeze({...})`

#### PERMISSION_VALIDATION_RULES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 130
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_VALIDATION_RULES

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 320
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_FIELD_VALIDATION_RULES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 183
  - **值**: `Object.freeze({...})`

#### QUERY_VALIDATION_RULES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 101
  - **值**: `Object.freeze({...})`

#### RECEIVER_VALIDATION_RULES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 93
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_VALIDATION_RULES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 216
  - **值**: `Object.freeze({...})`

#### FIELD_VALIDATION_RULES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 103
  - **值**: `Object.freeze({...})`

### *_ERROR_MESSAGES

Constants ending with _ERROR_MESSAGES (11 个常量)

#### CACHE_ERROR_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### AUTH_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### BUSINESS_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 65
  - **值**: `Object.freeze({...})`

#### SYSTEM_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 109
  - **值**: `Object.freeze({...})`

#### HTTP_ERROR_MESSAGES

- **文件**: `src/common/constants/error-messages.constants.ts`
  - **行号**: 135
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_ERROR_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### QUERY_ERROR_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### RECEIVER_ERROR_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### STORAGE_ERROR_MESSAGES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_ERROR_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### TRANSFORM_ERROR_MESSAGES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 24
  - **值**: `Object.freeze({...})`

### *_WARNING_MESSAGES

Constants ending with _WARNING_MESSAGES (7 个常量)

#### CACHE_WARNING_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 33
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_WARNING_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 27
  - **值**: `Object.freeze({...})`

#### QUERY_WARNING_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 36
  - **值**: `Object.freeze({...})`

#### RECEIVER_WARNING_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 35
  - **值**: `Object.freeze({...})`

#### STORAGE_WARNING_MESSAGES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 30
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_WARNING_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 42
  - **值**: `Object.freeze({...})`

#### TRANSFORM_WARNING_MESSAGES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 40
  - **值**: `Object.freeze({...})`

### *_SUCCESS_MESSAGES

Constants ending with _SUCCESS_MESSAGES (5 个常量)

#### CACHE_SUCCESS_MESSAGES

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 49
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 40
  - **值**: `Object.freeze({...})`

#### QUERY_SUCCESS_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 53
  - **值**: `Object.freeze({...})`

#### RECEIVER_SUCCESS_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 49
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 56
  - **值**: `Object.freeze({...})`

## 🗑️ 未使用的项目

以下项目可能未被使用，建议考虑清理:

### 未使用的常量

#### ALERT_STATUS_MAPPING

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 107
  - **值**: `Object.freeze({...})`

#### ALERT_HISTORY_METRICS

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 114
  - **值**: `Object.freeze({...})`

#### ALERT_HISTORY_TIME_CONFIG

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 139
  - **值**: `Object.freeze({...})`

#### ALERT_HISTORY_THRESHOLDS

- **文件**: `src/alert/constants/alert-history.constants.ts`
  - **行号**: 149
  - **值**: `Object.freeze({...})`

#### ALERTING_THRESHOLDS

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 173
  - **值**: `Object.freeze({...})`

#### ALERTING_RETRY_CONFIG

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 182
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 102
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_TYPE_PRIORITY

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 114
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_METRICS

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 123
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_TIME_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 147
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_ALERT_THRESHOLDS

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 157
  - **值**: `Object.freeze({...})`

#### APIKEY_STATUS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 86
  - **值**: `Object.freeze({...})`

#### APIKEY_TYPES

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 96
  - **值**: `Object.freeze({...})`

#### APIKEY_METRICS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 106
  - **值**: `Object.freeze({...})`

#### APIKEY_ALERT_THRESHOLDS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 139
  - **值**: `Object.freeze({...})`

#### APIKEY_RETRY_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 148
  - **值**: `Object.freeze({...})`

#### APIKEY_ERROR_CODES

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 157
  - **值**: `Object.freeze({...})`

#### APIKEY_CACHE_KEYS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 171
  - **值**: `Object.freeze({...})`

#### APIKEY_LOG_LEVELS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 181
  - **值**: `Object.freeze({...})`

#### AUTH_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 78
  - **值**: `Object.freeze({...})`

#### AUTH_USER_STATUS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 93
  - **值**: `Object.freeze({...})`

#### AUTH_EVENT_TYPES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 106
  - **值**: `Object.freeze({...})`

#### AUTH_TAGS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 125
  - **值**: `Object.freeze({...})`

#### AUTH_VALIDATION_RULES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 153
  - **值**: `Object.freeze({...})`

#### AUTH_CACHE_KEYS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 164
  - **值**: `Object.freeze({...})`

#### AUTH_INTERVALS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 178
  - **值**: `Object.freeze({...})`

#### AUTH_RETRY_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### AUTH_RESPONSE_STATUS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 197
  - **值**: `Object.freeze({...})`

#### AUTH_ERROR_CODES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 211
  - **值**: `Object.freeze({...})`

#### PERMISSION_CHECK_STATUS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 86
  - **值**: `Object.freeze({...})`

#### PERMISSION_SUBJECT_TYPES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 96
  - **值**: `Object.freeze({...})`

#### PERMISSION_METRICS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 106
  - **值**: `Object.freeze({...})`

#### PERMISSION_CACHE_KEYS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 120
  - **值**: `Object.freeze({...})`

#### PERMISSION_VALIDATION_RULES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 130
  - **值**: `Object.freeze({...})`

#### PERMISSION_CHECK_OPTIONS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 143
  - **值**: `Object.freeze({...})`

#### PERMISSION_GROUPS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 165
  - **值**: `Object.freeze({...})`

#### PERMISSION_INHERITANCE

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 177
  - **值**: `Object.freeze({...})`

#### PERMISSION_TIMING

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 185
  - **值**: `Object.freeze({...})`

#### PERMISSION_ERROR_CODES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 194
  - **值**: `Object.freeze({...})`

#### PERMISSION_LOG_LEVELS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 208
  - **值**: `Object.freeze({...})`

#### PERMISSION_STATS_TYPES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 218
  - **值**: `Object.freeze({...})`

#### CACHE_STATUS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 166
  - **值**: `Object.freeze({...})`

#### CACHE_DEFAULTS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 178
  - **值**: `Object.freeze({...})`

#### MARKET_STATUS_CAPABILITY_MAP

- **文件**: `src/common/constants/market-trading-hours.constants.ts`
  - **行号**: 193
  - **值**: `{`

#### COMMON_HOLIDAYS

- **文件**: `src/common/constants/market-trading-hours.constants.ts`
  - **行号**: 203
  - **值**: `{`

#### MARKET_NAMES

- **文件**: `src/common/constants/market.constants.ts`
  - **行号**: 31
  - **值**: `{`

#### MARKET_TIMEZONES

- **文件**: `src/common/constants/market.constants.ts`
  - **行号**: 43
  - **值**: `{`

#### RATE_LIMIT_STRATEGY_INFO

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 284
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_REDIS_PATTERNS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 300
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_ALERT_THRESHOLDS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 338
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_LOG_LEVELS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 347
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 66
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_METRICS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 116
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_EVENTS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 142
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_DEFAULTS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 157
  - **值**: `Object.freeze({...})`

#### DATA_TYPE_HANDLERS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 172
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_FIELD_VALIDATION_RULES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 183
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_CACHE_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 195
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_STATS_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 206
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_QUALITY_METRICS

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 216
  - **值**: `Object.freeze({...})`

#### PATH_RESOLUTION_CONFIG

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 228
  - **值**: `Object.freeze({...})`

#### QUERY_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 86
  - **值**: `Object.freeze({...})`

#### QUERY_METRICS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 150
  - **值**: `Object.freeze({...})`

#### QUERY_STATUS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 171
  - **值**: `Object.freeze({...})`

#### QUERY_DATA_SOURCE_TYPES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 186
  - **值**: `Object.freeze({...})`

#### QUERY_DEFAULTS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 196
  - **值**: `Object.freeze({...})`

#### QUERY_EVENTS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 216
  - **值**: `Object.freeze({...})`

#### QUERY_CACHE_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 233
  - **值**: `Object.freeze({...})`

#### QUERY_HEALTH_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 245
  - **值**: `Object.freeze({...})`

#### RECEIVER_SUCCESS_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 49
  - **值**: `Object.freeze({...})`

#### RECEIVER_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 132
  - **值**: `Object.freeze({...})`

#### RECEIVER_METRICS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 145
  - **值**: `Object.freeze({...})`

#### RECEIVER_STATUS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 161
  - **值**: `Object.freeze({...})`

#### RECEIVER_EVENTS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 176
  - **值**: `Object.freeze({...})`

#### RECEIVER_DEFAULTS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 191
  - **值**: `Object.freeze({...})`

#### REQUEST_OPTIONS_VALIDATION

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 205
  - **值**: `Object.freeze({...})`

#### RECEIVER_CACHE_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 247
  - **值**: `Object.freeze({...})`

#### RECEIVER_HEALTH_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 258
  - **值**: `Object.freeze({...})`

#### STORAGE_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 46
  - **值**: `Object.freeze({...})`

#### STORAGE_METRICS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 73
  - **值**: `Object.freeze({...})`

#### STORAGE_SOURCES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 107
  - **值**: `Object.freeze({...})`

#### STORAGE_STATUS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 117
  - **值**: `Object.freeze({...})`

#### STORAGE_EVENTS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 130
  - **值**: `Object.freeze({...})`

#### STORAGE_COMPRESSION

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 173
  - **值**: `Object.freeze({...})`

#### STORAGE_BATCH_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 191
  - **值**: `Object.freeze({...})`

#### STORAGE_HEALTH_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 202
  - **值**: `Object.freeze({...})`

#### STORAGE_CLEANUP_CONFIG

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 213
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 95
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_METRICS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 109
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_STATUS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 125
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_DEFAULTS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 170
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_EVENTS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CACHE_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 203
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_VALIDATION_RULES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 216
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_HEALTH_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 230
  - **值**: `Object.freeze({...})`

#### TRANSFORM_TYPES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### TRANSFORM_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 77
  - **值**: `Object.freeze({...})`

#### TRANSFORM_STATUS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 90
  - **值**: `Object.freeze({...})`

#### DATA_TYPE_CONVERSIONS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 119
  - **值**: `Object.freeze({...})`

#### TRANSFORM_PRIORITIES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 133
  - **值**: `Object.freeze({...})`

#### BATCH_TRANSFORM_OPTIONS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 143
  - **值**: `Object.freeze({...})`

#### TRANSFORM_CACHE_CONFIG

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 154
  - **值**: `Object.freeze({...})`

#### TRANSFORM_EVENTS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 175
  - **值**: `Object.freeze({...})`

#### TRANSFORM_DEFAULTS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 189
  - **值**: `Object.freeze({...})`

#### TRANSFORM_RULE_TYPES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 203
  - **值**: `Object.freeze({...})`

#### TRANSFORM_RESULT_FORMATS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 214
  - **值**: `Object.freeze({...})`

#### TRANSFORM_QUALITY_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 225
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_EVENT_TYPES

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 116
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_EVENT_OUTCOMES

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 125
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_EVENT_TAGS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 150
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_REPORT_CONFIG

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 160
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_IP_ANALYSIS_CONFIG

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 168
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_METRICS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 177
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_CACHE_KEYS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 191
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_INTERVALS

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 201
  - **值**: `Object.freeze({...})`

#### SECURITY_AUDIT_EVENT_PROCESSING

- **文件**: `src/security/constants/security-audit.constants.ts`
  - **行号**: 219
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_SCORING

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 217
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_CHECK_TYPES

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 234
  - **值**: `Object.freeze({...})`

#### SECURITY_SCANNER_STATUS

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 242
  - **值**: `Object.freeze({...})`

#### SECURITY_VULNERABILITY_SEVERITY

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 260
  - **值**: `Object.freeze({...})`

#### SECURITY_VULNERABILITY_TYPES

- **文件**: `src/security/constants/security-scanner.constants.ts`
  - **行号**: 269
  - **值**: `Object.freeze({...})`

#### SECURITY_SCORE_VULNERABILITY_WEIGHTS

- **文件**: `src/security/constants/security.constants.ts`
  - **行号**: 85
  - **值**: `{`

### 未使用的枚举

#### STOCK_CANDLE

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 17
  - **值**: `"stock_candle"`

#### STOCK_TICK

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 18
  - **值**: `"stock_tick"`

#### FINANCIAL_STATEMENT

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 19
  - **值**: `"financial_statement"`

#### COMPANY_PROFILE

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 20
  - **值**: `"company_profile"`

#### MARKET_NEWS

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 21
  - **值**: `"market_news"`

#### TRADING_ORDER

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 22
  - **值**: `"trading_order"`

#### USER_PORTFOLIO

- **文件**: `src/core/storage/enums/storage-type.enum.ts`
  - **行号**: 23
  - **值**: `"user_portfolio"`

### 未使用的DTO

#### CreateAlertDataDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 18
  - **类型**: class

#### AlertQueryParamsDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 100
  - **类型**: class

#### AlertCleanupParamsDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 214
  - **类型**: class

#### AlertIdGenerationDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 262
  - **类型**: class

#### AlertHistoryLogContextDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 283
  - **类型**: class

#### ActiveAlertsQueryOptionsDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 332
  - **类型**: class

#### AlertOperationHistoryDto

- **文件**: `src/alert/dto/alert-history-internal.dto.ts`
  - **行号**: 368
  - **类型**: class

#### EmailConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 17
  - **类型**: class

#### WebhookConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 37
  - **类型**: class

#### SlackConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 61
  - **类型**: class

#### DingTalkConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 81
  - **类型**: class

#### SmsConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 100
  - **类型**: class

#### LogConfigDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 118
  - **类型**: class

#### CreateNotificationChannelDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 188
  - **类型**: class

#### UpdateNotificationChannelDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 199
  - **类型**: class

#### NotificationChannelResponseDto

- **文件**: `src/alert/dto/notification-channel.dto.ts`
  - **行号**: 262
  - **类型**: class

#### RateLimitDto

- **文件**: `src/auth/dto/apikey.dto.ts`
  - **行号**: 21
  - **类型**: class

#### UpdateApiKeyDto

- **文件**: `src/auth/dto/apikey.dto.ts`
  - **行号**: 143
  - **类型**: class

#### RefreshTokenDto

- **文件**: `src/auth/dto/auth.dto.ts`
  - **行号**: 108
  - **类型**: class

#### CacheOperationResultDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 109
  - **类型**: class

#### BatchCacheOperationDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 134
  - **类型**: class

#### CacheMetricsUpdateDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 157
  - **类型**: class

#### CacheWarmupConfigDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 183
  - **类型**: class

#### CacheCompressionInfoDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 211
  - **类型**: class

#### CacheSerializationInfoDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 239
  - **类型**: class

#### DistributedLockInfoDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 265
  - **类型**: class

#### CacheKeyPatternAnalysisDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 295
  - **类型**: class

#### CachePerformanceMonitoringDto

- **文件**: `src/cache/dto/cache-internal.dto.ts`
  - **行号**: 324
  - **类型**: class

#### BasePerformanceMetrics

- **文件**: `src/common/dto/performance-metrics-base.dto.ts`
  - **行号**: 7
  - **类型**: interface

#### TransformFunctionDto

- **文件**: `src/core/data-mapper/dto/create-data-mapping.dto.ts`
  - **行号**: 13
  - **类型**: class

#### FieldMappingDto

- **文件**: `src/core/data-mapper/dto/create-data-mapping.dto.ts`
  - **行号**: 33
  - **类型**: class

#### MappingRuleApplicationDto

- **文件**: `src/core/data-mapper/dto/data-mapping-internal.dto.ts`
  - **行号**: 96
  - **类型**: class

#### FieldSuggestionItemDto

- **文件**: `src/core/data-mapper/dto/data-mapping-internal.dto.ts`
  - **行号**: 127
  - **类型**: class

#### PathResolutionResultDto

- **文件**: `src/core/data-mapper/dto/data-mapping-internal.dto.ts`
  - **行号**: 151
  - **类型**: class

#### FieldMappingResponseDto

- **文件**: `src/core/data-mapper/dto/data-mapping-response.dto.ts`
  - **行号**: 25
  - **类型**: class

#### FieldSelectionDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 174
  - **类型**: class

#### SortConfigDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 191
  - **类型**: class

#### PostProcessingConfigDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 204
  - **类型**: class

#### QueryPerformanceMetricsDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 229
  - **类型**: class

#### StorageKeyParamsDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 258
  - **类型**: class

#### BulkQueryExecutionConfigDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 282
  - **类型**: class

#### QueryLogContextDto

- **文件**: `src/core/query/dto/query-internal.dto.ts`
  - **行号**: 305
  - **类型**: class

#### MarketInferenceResultDto

- **文件**: `src/core/receiver/dto/receiver-internal.dto.ts`
  - **行号**: 87
  - **类型**: class

#### ReceiverPerformanceDto

- **文件**: `src/core/receiver/dto/receiver-internal.dto.ts`
  - **行号**: 105
  - **类型**: class

#### ProviderValidationResultDto

- **文件**: `src/core/receiver/dto/receiver-internal.dto.ts`
  - **行号**: 131
  - **类型**: class

#### CapabilityExecutionResultDto

- **文件**: `src/core/receiver/dto/receiver-internal.dto.ts`
  - **行号**: 160
  - **类型**: class

#### SymbolMarketMappingDto

- **文件**: `src/core/receiver/dto/receiver-internal.dto.ts`
  - **行号**: 186
  - **类型**: class

#### CacheResultDto

- **文件**: `src/core/storage/dto/storage-internal.dto.ts`
  - **行号**: 10
  - **类型**: class

#### PersistentResultDto

- **文件**: `src/core/storage/dto/storage-internal.dto.ts`
  - **行号**: 27
  - **类型**: class

#### CompressionResultDto

- **文件**: `src/core/storage/dto/storage-internal.dto.ts`
  - **行号**: 44
  - **类型**: class

#### StorageOptionsDto

- **文件**: `src/core/storage/dto/storage-request.dto.ts`
  - **行号**: 13
  - **类型**: class

#### InternalSymbolMappingDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 39
  - **类型**: class

#### SymbolMapperPerformanceDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 69
  - **类型**: class

#### MappingApplicationResultDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 91
  - **类型**: class

#### SymbolTransformationLogDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 118
  - **类型**: class

#### DataSourceMappingLogDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 148
  - **类型**: class

#### BatchTransformationLogDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapper-internal.dto.ts`
  - **行号**: 177
  - **类型**: class

#### MappingRuleResponseDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapping-response.dto.ts`
  - **行号**: 5
  - **类型**: class

#### PaginatedResultDto

- **文件**: `src/core/symbol-mapper/dto/symbol-mapping-response.dto.ts`
  - **行号**: 84
  - **类型**: class

#### FieldTransformDto

- **文件**: `src/core/transformer/dto/transform-interfaces.dto.ts`
  - **行号**: 10
  - **类型**: class

#### PerformanceSummaryDataDto

- **文件**: `src/metrics/dto/performance-summary.dto.ts`
  - **行号**: 11
  - **类型**: class

#### DateRangeValidator

- **文件**: `src/monitoring/dto/monitoring-query.dto.ts`
  - **行号**: 12
  - **类型**: class

#### IsValidDateRangeConstraint

- **文件**: `src/security/dto/security-query.dto.ts`
  - **行号**: 38
  - **类型**: class

