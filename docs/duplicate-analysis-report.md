# 重复标识符分析报告

生成时间: 7/22/2025, 1:24:01 AM

## 📊 统计摘要

- 扫描的常量: 262 (重复: 0)
- 扫描的枚举: 59 (重复: 4)
- 扫描的DTO: 163 (重复: 0)

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
  - **行号**: 31
  - **值**: `Object.freeze({...})`

#### QUERY_OPERATIONS

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 113
  - **值**: `Object.freeze({...})`

#### RECEIVER_OPERATIONS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 228
  - **值**: `Object.freeze({...})`

#### STORAGE_OPERATIONS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 91
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_OPERATIONS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 137
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
  - **行号**: 47
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
  - **行号**: 35
  - **值**: `Object.freeze({...})`

#### QUERY_SUCCESS_MESSAGES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 51
  - **值**: `Object.freeze({...})`

#### RECEIVER_ERROR_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 9
  - **值**: `Object.freeze({...})`

#### RECEIVER_WARNING_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 31
  - **值**: `Object.freeze({...})`

#### RECEIVER_SUCCESS_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 45
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
  - **行号**: 41
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 55
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
  - **行号**: 162
  - **值**: `Object.freeze({...})`

#### ALERTING_RETRY_CONFIG

- **文件**: `src/alert/constants/alerting.constants.ts`
  - **行号**: 181
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 101
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_TIME_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 146
  - **值**: `Object.freeze({...})`

#### NOTIFICATION_RETRY_CONFIG

- **文件**: `src/alert/constants/notification.constants.ts`
  - **行号**: 165
  - **值**: `Object.freeze({...})`

#### APIKEY_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 70
  - **值**: `Object.freeze({...})`

#### APIKEY_TIME_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 127
  - **值**: `Object.freeze({...})`

#### APIKEY_RETRY_CONFIG

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 146
  - **值**: `Object.freeze({...})`

#### AUTH_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 78
  - **值**: `Object.freeze({...})`

#### AUTH_RETRY_CONFIG

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 186
  - **值**: `Object.freeze({...})`

#### PERMISSION_CONFIG

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 73
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
  - **行号**: 179
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_RETRY_CONFIG

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 319
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
  - **行号**: 68
  - **值**: `Object.freeze({...})`

#### QUERY_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 84
  - **值**: `Object.freeze({...})`

#### QUERY_CACHE_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 231
  - **值**: `Object.freeze({...})`

#### QUERY_HEALTH_CONFIG

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 243
  - **值**: `Object.freeze({...})`

#### RECEIVER_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 128
  - **值**: `Object.freeze({...})`

#### RECEIVER_CACHE_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 243
  - **值**: `Object.freeze({...})`

#### RECEIVER_HEALTH_CONFIG

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 254
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
  - **行号**: 81
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 94
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_CACHE_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 202
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_HEALTH_CONFIG

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 229
  - **值**: `Object.freeze({...})`

#### TRANSFORM_CONFIG

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 52
  - **值**: `Object.freeze({...})`

#### TRANSFORM_CACHE_CONFIG

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 152
  - **值**: `Object.freeze({...})`

#### HEALTH_SCORE_CONFIG

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 116
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
  - **行号**: 12
  - **值**: `Object.freeze({...})`

#### API_KEY_CONSTANTS

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 180
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
  - **行号**: 194
  - **值**: `Object.freeze({...})`

#### RECEIVER_DEFAULTS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### STORAGE_DEFAULTS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 145
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_DEFAULTS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 169
  - **值**: `Object.freeze({...})`

#### TRANSFORM_DEFAULTS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 187
  - **值**: `Object.freeze({...})`

#### PERFORMANCE_DEFAULTS

- **文件**: `src/metrics/constants/performance.constants.ts`
  - **行号**: 157
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
  - **行号**: 122
  - **值**: `Object.freeze({...})`

#### APIKEY_METRICS

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 105
  - **值**: `Object.freeze({...})`

#### AUTH_METRICS

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 139
  - **值**: `Object.freeze({...})`

#### PERMISSION_METRICS

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 105
  - **值**: `Object.freeze({...})`

#### CACHE_METRICS

- **文件**: `src/cache/constants/cache.constants.ts`
  - **行号**: 147
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_METRICS

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 298
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
  - **行号**: 148
  - **值**: `Object.freeze({...})`

#### RECEIVER_METRICS

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 141
  - **值**: `Object.freeze({...})`

#### STORAGE_METRICS

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 73
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_METRICS

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 108
  - **值**: `Object.freeze({...})`

#### TRANSFORM_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 75
  - **值**: `Object.freeze({...})`

#### TRANSFORM_QUALITY_METRICS

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 223
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
  - **行号**: 135
  - **值**: `Object.freeze({...})`

#### APIKEY_VALIDATION_RULES

- **文件**: `src/auth/constants/apikey.constants.ts`
  - **行号**: 119
  - **值**: `Object.freeze({...})`

#### AUTH_VALIDATION_RULES

- **文件**: `src/auth/constants/auth.constants.ts`
  - **行号**: 153
  - **值**: `Object.freeze({...})`

#### PERMISSION_VALIDATION_RULES

- **文件**: `src/auth/constants/permission.constants.ts`
  - **行号**: 129
  - **值**: `Object.freeze({...})`

#### RATE_LIMIT_VALIDATION_RULES

- **文件**: `src/common/constants/rate-limit.constants.ts`
  - **行号**: 310
  - **值**: `Object.freeze({...})`

#### DATA_MAPPER_FIELD_VALIDATION_RULES

- **文件**: `src/core/data-mapper/constants/data-mapper.constants.ts`
  - **行号**: 183
  - **值**: `Object.freeze({...})`

#### QUERY_VALIDATION_RULES

- **文件**: `src/core/query/constants/query.constants.ts`
  - **行号**: 99
  - **值**: `Object.freeze({...})`

#### RECEIVER_VALIDATION_RULES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 89
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_VALIDATION_RULES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 215
  - **值**: `Object.freeze({...})`

#### FIELD_VALIDATION_RULES

- **文件**: `src/core/transformer/constants/transformer.constants.ts`
  - **行号**: 101
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
  - **行号**: 35
  - **值**: `Object.freeze({...})`

#### RECEIVER_WARNING_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 31
  - **值**: `Object.freeze({...})`

#### STORAGE_WARNING_MESSAGES

- **文件**: `src/core/storage/constants/storage.constants.ts`
  - **行号**: 30
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_WARNING_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 41
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
  - **行号**: 51
  - **值**: `Object.freeze({...})`

#### RECEIVER_SUCCESS_MESSAGES

- **文件**: `src/core/receiver/constants/receiver.constants.ts`
  - **行号**: 45
  - **值**: `Object.freeze({...})`

#### SYMBOL_MAPPER_SUCCESS_MESSAGES

- **文件**: `src/core/symbol-mapper/constants/symbol-mapper.constants.ts`
  - **行号**: 55
  - **值**: `Object.freeze({...})`

