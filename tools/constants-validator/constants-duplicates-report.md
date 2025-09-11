# 常量重复检测报告

📊 **检测摘要**
- 扫描文件数：24
- 常量定义数：566
- 重复组数：95
- 重复实例数：303

📈 **按类型统计**
- 直接重复：53
- 引用重复：42
- 嵌套重复：0

⚠️ **按严重程度统计**
- 高：1
- 中：10
- 低：84

## 详细重复项列表

### 1. 🟡 🔗 重复值: `"NUMERIC_CONSTANTS.N_1000"`

- **类型**: reference
- **重复次数**: 14
- **严重程度**: medium

**出现位置:**
- `CORE_TIMEOUTS.RETRY.INITIAL_DELAY_MS` (core-timeouts.constants.ts:47)
- `CORE_TIMEOUTS.RETRY.MIN_DELAY_MS` (core-timeouts.constants.ts:48)
- `CORE_TIMEOUTS.RETRY.EXPONENTIAL_BASE_MS` (core-timeouts.constants.ts:50)
- `CORE_TIMEOUTS.OPERATION.QUICK_MS` (core-timeouts.constants.ts:58)
- `PROCESSING_BATCH_SETTINGS.MAX_BATCH_SIZE` (processing-base.constants.ts:20)
- `CACHE_SIZE_SEMANTICS.MEMORY.LARGE_ENTRIES` (cache-semantics.constants.ts:80)
- `CACHE_SIZE_SEMANTICS.BATCH_OPERATIONS.MAX_SIZE` (cache-semantics.constants.ts:92)
- `HTTP_BATCH_SEMANTICS.REQUEST_BATCHING.MAX_SIZE` (http-semantics.constants.ts:83)
- `BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE` (batch-semantics.constants.ts:19)
- `BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.MICRO_BATCH_MS` (batch-semantics.constants.ts:119)
- `RETRY_DELAY_SEMANTICS.SCENARIO.NETWORK_FAILURE_MS` (retry-semantics.constants.ts:25)
- `RETRY_DELAY_SEMANTICS.BACKOFF.LINEAR_STEP_MS` (retry-semantics.constants.ts:32)
- `RETRY_DELAY_SEMANTICS.BACKOFF.RANDOM_JITTER_MAX_MS` (retry-semantics.constants.ts:34)
- `STATUS_CODE_SEMANTICS.RANGES.BUSINESS.MIN` (status-codes-semantics.constants.ts:68)

---

### 2. 🟡 🔗 重复值: `"NUMERIC_CONSTANTS.N_6"`

- **类型**: reference
- **重复次数**: 11
- **严重程度**: medium

**出现位置:**
- `PROCESSING_BATCH_SETTINGS.DEFAULT_PAGE_SIZE` (processing-base.constants.ts:25)
- `HTTP_BATCH_SEMANTICS.CONCURRENT_REQUESTS.DEFAULT` (http-semantics.constants.ts:88)
- `HTTP_BATCH_SEMANTICS.PAGINATION.DEFAULT_PAGE_SIZE` (http-semantics.constants.ts:95)
- `BATCH_SIZE_SEMANTICS.PERFORMANCE.MICRO_BATCH` (batch-semantics.constants.ts:40)
- `CONCURRENCY_SEMANTICS.BASIC.DEFAULT_WORKERS` (batch-semantics.constants.ts:55)
- `CONCURRENCY_SEMANTICS.SCENARIO.IO_INTENSIVE.WORKERS` (batch-semantics.constants.ts:62)
- `CONCURRENCY_SEMANTICS.SCENARIO.NETWORK_REQUEST.WORKERS` (batch-semantics.constants.ts:72)
- `CONCURRENCY_SEMANTICS.SCENARIO.DATABASE_CONNECTION.WORKERS` (batch-semantics.constants.ts:77)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.LOW_RESOURCE.BATCH_SIZE` (batch-semantics.constants.ts:84)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.MEDIUM_RESOURCE.WORKERS` (batch-semantics.constants.ts:89)
- `RETRY_COUNT_SEMANTICS.BASIC.MAX` (retry-semantics.constants.ts:47)

---

### 3. 🔴 🎯 重复值: `2`

- **类型**: direct
- **重复次数**: 10
- **严重程度**: high

**出现位置:**
- `CORE_VALUES.QUANTITIES.TWO` (core-values.constants.ts:18)
- `CORE_VALUES.RETRY.BACKOFF_BASE` (core-values.constants.ts:158)
- `PROCESSING_RETRY_SETTINGS.BACKOFF_MULTIPLIER` (processing-base.constants.ts:43)
- `MESSAGE_TEMPLATE_SEMANTICS.PRIORITIES.NORMAL` (message-semantics.constants.ts:119)
- `RETRY_BUSINESS_SCENARIOS.RECEIVER.backoffMultiplier` (retry-semantics.constants.ts:288)
- `RETRY_BUSINESS_SCENARIOS.STORAGE.backoffMultiplier` (retry-semantics.constants.ts:295)
- `RETRY_BUSINESS_SCENARIOS.NOTIFICATION.backoffMultiplier` (retry-semantics.constants.ts:317)
- `RETRY_BUSINESS_SCENARIOS.CRITICAL_OPERATIONS.backoffMultiplier` (retry-semantics.constants.ts:324)
- `RETRY_BUSINESS_SCENARIOS.EXTERNAL_API.backoffMultiplier` (retry-semantics.constants.ts:339)
- `RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.backoffMultiplier` (retry-semantics.constants.ts:365)

---

### 4. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_100"`

- **类型**: reference
- **重复次数**: 8
- **严重程度**: low

**出现位置:**
- `PROCESSING_BATCH_SETTINGS.DEFAULT_BATCH_SIZE` (processing-base.constants.ts:18)
- `CACHE_PERFORMANCE_SEMANTICS.RESPONSE_TIME_THRESHOLDS.FAST_MS` (cache-semantics.constants.ts:108)
- `CACHE_MONITORING_SEMANTICS.MONITORING.SLOW_OPERATION_MS` (cache-semantics.constants.ts:212)
- `CACHE_MONITORING_SEMANTICS.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_TARGET_MS` (cache-semantics.constants.ts:218)
- `BATCH_SIZE_SEMANTICS.SCENARIO.API_REQUEST_PROCESSING` (batch-semantics.constants.ts:28)
- `BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH` (batch-semantics.constants.ts:43)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.HIGH_RESOURCE.BATCH_SIZE` (batch-semantics.constants.ts:92)
- `STATUS_CODE_SEMANTICS.RANGES.INFORMATIONAL.MIN` (status-codes-semantics.constants.ts:63)

---

### 5. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_50"`

- **类型**: reference
- **重复次数**: 8
- **严重程度**: low

**出现位置:**
- `CACHE_ADVANCED_STRATEGY_SEMANTICS.WARMUP.BATCH_SIZE` (cache-semantics.constants.ts:275)
- `HTTP_BATCH_SEMANTICS.CONCURRENT_REQUESTS.MAX` (http-semantics.constants.ts:89)
- `BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE` (batch-semantics.constants.ts:18)
- `BATCH_SIZE_SEMANTICS.SCENARIO.DATABASE_INSERT` (batch-semantics.constants.ts:25)
- `BATCH_SIZE_SEMANTICS.SCENARIO.NOTIFICATION_BATCH` (batch-semantics.constants.ts:35)
- `BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH` (batch-semantics.constants.ts:42)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.MEDIUM_RESOURCE.BATCH_SIZE` (batch-semantics.constants.ts:88)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.HIGH_RESOURCE.WORKERS` (batch-semantics.constants.ts:93)

---

### 6. 🟢 🔗 重复值: `"RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS"`

- **类型**: reference
- **重复次数**: 8
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.NETWORK_OPERATION.initialDelayMs` (retry-semantics.constants.ts:176)
- `RETRY_CONFIG_TEMPLATES.CACHE_OPERATION.initialDelayMs` (retry-semantics.constants.ts:194)
- `RETRY_CONFIG_TEMPLATES.EXTERNAL_API.initialDelayMs` (retry-semantics.constants.ts:203)
- `RETRY_BUSINESS_SCENARIOS.RECEIVER.initialDelayMs` (retry-semantics.constants.ts:287)
- `RETRY_BUSINESS_SCENARIOS.STORAGE.initialDelayMs` (retry-semantics.constants.ts:294)
- `RETRY_BUSINESS_SCENARIOS.EXTERNAL_API.initialDelayMs` (retry-semantics.constants.ts:338)
- `RETRY_BUSINESS_SCENARIOS.WEBSOCKET_RECONNECT.initialDelayMs` (retry-semantics.constants.ts:347)
- `RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.initialDelayMs` (retry-semantics.constants.ts:364)

---

### 7. 🟡 🎯 重复值: `1000`

- **类型**: direct
- **重复次数**: 7
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.THOUSAND` (core-values.constants.ts:28)
- `CORE_VALUES.TIME_MS.ONE_SECOND` (core-values.constants.ts:39)
- `CORE_VALUES.SIZES.HUGE` (core-values.constants.ts:77)
- `CORE_VALUES.PERFORMANCE_MS.SLOW` (core-values.constants.ts:132)
- `CORE_VALUES.PERFORMANCE_MS.SLOW_REQUEST` (core-values.constants.ts:135)
- `CORE_VALUES.PERFORMANCE_MS.SLOW_STORAGE` (core-values.constants.ts:136)
- `CORE_VALUES.BATCH_LIMITS.MAX_BATCH_SIZE` (core-values.constants.ts:168)

---

### 8. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_60000"`

- **类型**: reference
- **重复次数**: 7
- **严重程度**: low

**出现位置:**
- `CORE_TIMEOUTS.CONNECTION.KEEP_ALIVE_MS` (core-timeouts.constants.ts:20)
- `CORE_TIMEOUTS.REQUEST.SLOW_MS` (core-timeouts.constants.ts:30)
- `CORE_TIMEOUTS.OPERATION.LONG_RUNNING_MS` (core-timeouts.constants.ts:60)
- `BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.HUGE_BATCH_MS` (batch-semantics.constants.ts:123)
- `RETRY_BUSINESS_SCENARIOS.WEBSOCKET_RECONNECT.maxDelayMs` (retry-semantics.constants.ts:349)
- `DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeout` (circuit-breaker-domain.constants.ts:222)
- `baseTimeout` (circuit-breaker-domain.constants.ts:314)

---

### 9. 🟡 🎯 重复值: `5`

- **类型**: direct
- **重复次数**: 6
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.FIVE` (core-values.constants.ts:20)
- `CORE_VALUES.TIME_SECONDS.FIVE_SECONDS` (core-values.constants.ts:57)
- `CORE_VALUES.RETRY.CRITICAL_MAX_ATTEMPTS` (core-values.constants.ts:160)
- `CORE_VALUES.CONNECTION_POOL.MIN_SIZE` (core-values.constants.ts:192)
- `CORE_TTL.CACHE.REALTIME_SEC` (core-timeouts.constants.ts:75)
- `MESSAGE_TEMPLATE_SEMANTICS.PRIORITIES.EMERGENCY` (message-semantics.constants.ts:122)

---

### 10. 🟡 🎯 重复值: `50`

- **类型**: direct
- **重复次数**: 6
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.FIFTY` (core-values.constants.ts:23)
- `CORE_VALUES.SIZES.SMALL` (core-values.constants.ts:74)
- `CORE_VALUES.PERCENTAGES.HALF` (core-values.constants.ts:91)
- `CORE_VALUES.PERFORMANCE_MS.VERY_FAST` (core-values.constants.ts:129)
- `CORE_VALUES.MEMORY_MB.LOW_USAGE` (core-values.constants.ts:179)
- `CORE_VALUES.MEMORY_MB.MAX_REQUEST_SIZE` (core-values.constants.ts:184)

---

### 11. 🟡 🎯 重复值: `100`

- **类型**: direct
- **重复次数**: 6
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.HUNDRED` (core-values.constants.ts:24)
- `CORE_VALUES.SIZES.MEDIUM` (core-values.constants.ts:75)
- `CORE_VALUES.PERCENTAGES.MAX` (core-values.constants.ts:89)
- `CORE_VALUES.PERFORMANCE_MS.FAST` (core-values.constants.ts:130)
- `CORE_VALUES.BATCH_LIMITS.MAX_PAGE_SIZE` (core-values.constants.ts:170)
- `CORE_VALUES.MEMORY_MB.NORMAL_USAGE` (core-values.constants.ts:180)

---

### 12. 🟡 🎯 重复值: `5000`

- **类型**: direct
- **重复次数**: 6
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.FIVE_THOUSAND` (core-values.constants.ts:30)
- `CORE_VALUES.TIME_MS.FIVE_SECONDS` (core-values.constants.ts:40)
- `CORE_VALUES.PERFORMANCE_MS.VERY_SLOW` (core-values.constants.ts:133)
- `CORE_VALUES.PERFORMANCE_MS.SLOW_TRANSFORMATION` (core-values.constants.ts:137)
- `CORE_VALUES.TIMEOUT_MS.QUICK` (core-values.constants.ts:146)
- `CORE_VALUES.TIMEOUT_MS.CONNECTION` (core-values.constants.ts:149)

---

### 13. 🟢 🔗 重复值: `"RETRY_COUNT_SEMANTICS.BASIC.DEFAULT"`

- **类型**: reference
- **重复次数**: 6
- **严重程度**: low

**出现位置:**
- `RETRY_BUSINESS_SCENARIOS.RECEIVER.maxAttempts` (retry-semantics.constants.ts:286)
- `RETRY_BUSINESS_SCENARIOS.STORAGE.maxAttempts` (retry-semantics.constants.ts:293)
- `RETRY_BUSINESS_SCENARIOS.SYMBOL_MAPPER.maxAttempts` (retry-semantics.constants.ts:301)
- `RETRY_BUSINESS_SCENARIOS.DATA_MAPPER.maxAttempts` (retry-semantics.constants.ts:308)
- `RETRY_BUSINESS_SCENARIOS.NOTIFICATION.maxAttempts` (retry-semantics.constants.ts:315)
- `RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts` (retry-semantics.constants.ts:363)

---

### 14. 🟡 🎯 重复值: `10`

- **类型**: direct
- **重复次数**: 5
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.TEN` (core-values.constants.ts:21)
- `CORE_VALUES.BATCH_LIMITS.DEFAULT_PAGE_SIZE` (core-values.constants.ts:169)
- `CORE_VALUES.BATCH_LIMITS.MAX_CONCURRENT` (core-values.constants.ts:171)
- `CORE_VALUES.MEMORY_MB.MAX_OBJECT_SIZE` (core-values.constants.ts:183)
- `RETRY_BUSINESS_SCENARIOS.WEBSOCKET_RECONNECT.maxAttempts` (retry-semantics.constants.ts:346)

---

### 15. 🟡 🎯 重复值: `500`

- **类型**: direct
- **重复次数**: 5
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.FIVE_HUNDRED` (core-values.constants.ts:27)
- `CORE_VALUES.SIZES.LARGE` (core-values.constants.ts:76)
- `CORE_VALUES.PERFORMANCE_MS.NORMAL` (core-values.constants.ts:131)
- `CORE_VALUES.MEMORY_MB.CRITICAL_USAGE` (core-values.constants.ts:182)
- `HTTP_STATUS_CODES.SERVER_ERROR.INTERNAL_SERVER_ERROR` (http-semantics.constants.ts:45)

---

### 16. 🟡 🎯 重复值: `10000`

- **类型**: direct
- **重复次数**: 5
- **严重程度**: medium

**出现位置:**
- `CORE_VALUES.QUANTITIES.TEN_THOUSAND` (core-values.constants.ts:31)
- `CORE_VALUES.TIME_MS.TEN_SECONDS` (core-values.constants.ts:41)
- `CORE_VALUES.SIZES.MASSIVE` (core-values.constants.ts:78)
- `CORE_VALUES.PERFORMANCE_MS.CRITICAL` (core-values.constants.ts:134)
- `CORE_VALUES.RETRY.MAX_DELAY_MS` (core-values.constants.ts:159)

---

### 17. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_10000"`

- **类型**: reference
- **重复次数**: 5
- **严重程度**: low

**出现位置:**
- `CORE_TIMEOUTS.CONNECTION.ESTABLISH_MS` (core-timeouts.constants.ts:19)
- `CORE_TIMEOUTS.DATABASE.QUERY_MS` (core-timeouts.constants.ts:38)
- `CORE_TIMEOUTS.RETRY.MAX_DELAY_MS` (core-timeouts.constants.ts:49)
- `CORE_TIMEOUTS.OPERATION.STANDARD_MS` (core-timeouts.constants.ts:59)
- `RETRY_DELAY_SEMANTICS.SCENARIO.RATE_LIMIT_MS` (retry-semantics.constants.ts:26)

---

### 18. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_1"`

- **类型**: reference
- **重复次数**: 5
- **严重程度**: low

**出现位置:**
- `PROCESSING_BATCH_SETTINGS.MIN_BATCH_SIZE` (processing-base.constants.ts:19)
- `HTTP_BATCH_SEMANTICS.CONCURRENT_REQUESTS.MIN` (http-semantics.constants.ts:90)
- `BATCH_SIZE_SEMANTICS.BASIC.MIN_SIZE` (batch-semantics.constants.ts:17)
- `CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.LOW_RESOURCE.WORKERS` (batch-semantics.constants.ts:85)
- `RETRY_COUNT_SEMANTICS.SEVERITY.CRITICAL` (retry-semantics.constants.ts:60)

---

### 19. 🟢 🎯 重复值: `3`

- **类型**: direct
- **重复次数**: 4
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.THREE` (core-values.constants.ts:19)
- `CORE_VALUES.NETWORK.DEFAULT_RETRIES` (core-values.constants.ts:121)
- `CORE_VALUES.RETRY.MAX_ATTEMPTS` (core-values.constants.ts:157)
- `MESSAGE_TEMPLATE_SEMANTICS.PRIORITIES.HIGH` (message-semantics.constants.ts:120)

---

### 20. 🟢 🎯 重复值: `1.5`

- **类型**: direct
- **重复次数**: 4
- **严重程度**: low

**出现位置:**
- `RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.backoffMultiplier` (retry-semantics.constants.ts:280)
- `RETRY_BUSINESS_SCENARIOS.SYMBOL_MAPPER.backoffMultiplier` (retry-semantics.constants.ts:303)
- `RETRY_BUSINESS_SCENARIOS.DATA_MAPPER.backoffMultiplier` (retry-semantics.constants.ts:310)
- `RETRY_BUSINESS_SCENARIOS.WEBSOCKET_RECONNECT.backoffMultiplier` (retry-semantics.constants.ts:348)

---

### 21. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_30000"`

- **类型**: reference
- **重复次数**: 4
- **严重程度**: low

**出现位置:**
- `CORE_TIMEOUTS.REQUEST.NORMAL_MS` (core-timeouts.constants.ts:29)
- `CORE_TIMEOUTS.DATABASE.TRANSACTION_MS` (core-timeouts.constants.ts:39)
- `BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.LARGE_BATCH_MS` (batch-semantics.constants.ts:122)
- `RETRY_DELAY_SEMANTICS.BACKOFF.EXPONENTIAL_MAX_MS` (retry-semantics.constants.ts:33)

---

### 22. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_500"`

- **类型**: reference
- **重复次数**: 4
- **严重程度**: low

**出现位置:**
- `MESSAGE_FORMAT_SEMANTICS.LENGTH_LIMITS.MEDIUM_MESSAGE` (message-semantics.constants.ts:143)
- `BATCH_SIZE_SEMANTICS.PERFORMANCE.HUGE_BATCH` (batch-semantics.constants.ts:44)
- `HTTP_STATUS_SEMANTICS.SERVER_ERROR.INTERNAL_SERVER_ERROR` (status-codes-semantics.constants.ts:44)
- `STATUS_CODE_SEMANTICS.RANGES.SERVER_ERROR.MIN` (status-codes-semantics.constants.ts:67)

---

### 23. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_3"`

- **类型**: reference
- **重复次数**: 4
- **严重程度**: low

**出现位置:**
- `CACHE_CONNECTION_SEMANTICS.REDIS.MAX_RETRIES` (cache-semantics.constants.ts:193)
- `RETRY_COUNT_SEMANTICS.BASIC.DEFAULT` (retry-semantics.constants.ts:45)
- `RETRY_COUNT_SEMANTICS.SCENARIO.NETWORK_OPERATION` (retry-semantics.constants.ts:52)
- `RETRY_COUNT_SEMANTICS.SEVERITY.MEDIUM` (retry-semantics.constants.ts:62)

---

### 24. 🟢 🎯 重复值: `1`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.ONE` (core-values.constants.ts:17)
- `CORE_VALUES.TIME_SECONDS.ONE_SECOND` (core-values.constants.ts:56)
- `MESSAGE_TEMPLATE_SEMANTICS.PRIORITIES.LOW` (message-semantics.constants.ts:118)

---

### 25. 🟢 🎯 重复值: `200`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.TWO_HUNDRED` (core-values.constants.ts:25)
- `CORE_VALUES.MEMORY_MB.HIGH_USAGE` (core-values.constants.ts:181)
- `HTTP_STATUS_CODES.SUCCESS.OK` (http-semantics.constants.ts:18)

---

### 26. 🟢 🎯 重复值: `300`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.THREE_HUNDRED` (core-values.constants.ts:26)
- `CORE_VALUES.TIME_SECONDS.FIVE_MINUTES` (core-values.constants.ts:60)
- `CORE_TTL.CACHE.NORMAL_SEC` (core-timeouts.constants.ts:77)

---

### 27. 🟢 🎯 重复值: `30000`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.TIME_MS.THIRTY_SECONDS` (core-values.constants.ts:43)
- `CORE_VALUES.TIMEOUT_MS.DEFAULT` (core-values.constants.ts:147)
- `CORE_VALUES.MONITORING.HEALTH_CHECK_INTERVAL_MS` (core-values.constants.ts:201)

---

### 28. 🟢 🎯 重复值: `400`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.BAD_REQUEST` (http-semantics.constants.ts:32)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.BAD_REQUEST` (status-codes-semantics.constants.ts:31)
- `STATUS_CODE_SEMANTICS.RANGES.CLIENT_ERROR.MIN` (status-codes-semantics.constants.ts:66)

---

### 29. 🟢 🎯 重复值: `"GET"`

- **类型**: direct
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `HTTP_METHODS.SAFE.GET` (http-semantics.constants.ts:133)
- `HTTP_METHODS.IDEMPOTENT.GET` (http-semantics.constants.ts:140)
- `HTTP_METHODS.ALL.GET` (http-semantics.constants.ts:151)

---

### 30. 🟢 🔗 重复值: `"BASE_STRING_LENGTHS.NAME_MAX"`

- **类型**: reference
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.NAME_MAX_LENGTH` (validation.constants.ts:73)
- `NOTIFICATION_VALIDATION_LIMITS.CHANNEL_NAME_MAX_LENGTH` (validation.constants.ts:114)
- `NOTIFICATION_VALIDATION_LIMITS.EMAIL_SUBJECT_MAX_LENGTH` (validation.constants.ts:116)

---

### 31. 🟢 🔗 重复值: `"CORE_TIMEOUTS.RETRY.INITIAL_DELAY_MS"`

- **类型**: reference
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `PROCESSING_RETRY_SETTINGS.RETRY_DELAY_MS` (processing-base.constants.ts:38)
- `CACHE_CONNECTION_SEMANTICS.REDIS.RETRY_DELAY_MS` (cache-semantics.constants.ts:194)
- `RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS` (retry-semantics.constants.ts:17)

---

### 32. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_2"`

- **类型**: reference
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `RETRY_COUNT_SEMANTICS.SCENARIO.DATABASE_OPERATION` (retry-semantics.constants.ts:53)
- `RETRY_COUNT_SEMANTICS.SCENARIO.CACHE_OPERATION` (retry-semantics.constants.ts:55)
- `RETRY_COUNT_SEMANTICS.SEVERITY.HIGH` (retry-semantics.constants.ts:61)

---

### 33. 🟢 🔗 重复值: `"RETRY_DELAY_SEMANTICS.SCENARIO.DATABASE_ERROR_MS"`

- **类型**: reference
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION.initialDelayMs` (retry-semantics.constants.ts:185)
- `RETRY_BUSINESS_SCENARIOS.NOTIFICATION.initialDelayMs` (retry-semantics.constants.ts:316)
- `RETRY_BUSINESS_SCENARIOS.CRITICAL_OPERATIONS.initialDelayMs` (retry-semantics.constants.ts:323)

---

### 34. 🟢 🔗 重复值: `"RETRY_COUNT_SEMANTICS.SCENARIO.EXTERNAL_API"`

- **类型**: reference
- **重复次数**: 3
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.EXTERNAL_API.maxAttempts` (retry-semantics.constants.ts:202)
- `RETRY_BUSINESS_SCENARIOS.CRITICAL_OPERATIONS.maxAttempts` (retry-semantics.constants.ts:322)
- `RETRY_BUSINESS_SCENARIOS.EXTERNAL_API.maxAttempts` (retry-semantics.constants.ts:337)

---

### 35. 🟢 🎯 重复值: `0`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.ZERO` (core-values.constants.ts:16)
- `CORE_VALUES.PERCENTAGES.MIN` (core-values.constants.ts:88)

---

### 36. 🟢 🎯 重复值: `20`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.TWENTY` (core-values.constants.ts:22)
- `CORE_VALUES.CONNECTION_POOL.MAX_SIZE` (core-values.constants.ts:193)

---

### 37. 🟢 🎯 重复值: `2000`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.QUANTITIES.TWO_THOUSAND` (core-values.constants.ts:29)
- `CORE_VALUES.PERFORMANCE_MS.DATA_FETCHER_SLOW` (core-values.constants.ts:138)

---

### 38. 🟢 🎯 重复值: `60000`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.TIME_MS.ONE_MINUTE` (core-values.constants.ts:44)
- `CORE_VALUES.TIMEOUT_MS.LONG` (core-values.constants.ts:148)

---

### 39. 🟢 🎯 重复值: `60`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.TIME_SECONDS.ONE_MINUTE` (core-values.constants.ts:59)
- `CORE_TTL.CACHE.FREQUENT_SEC` (core-timeouts.constants.ts:76)

---

### 40. 🟢 🎯 重复值: `86400`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_VALUES.TIME_SECONDS.ONE_DAY` (core-values.constants.ts:64)
- `CORE_TTL.CACHE.STATIC_SEC` (core-timeouts.constants.ts:78)

---

### 41. 🟢 🎯 重复值: `"超时"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `MESSAGE_SEMANTICS.TIME.TIMEOUT` (message-semantics.constants.ts:69)
- `MESSAGE_TEMPLATE_SEMANTICS.QUICK.TIMEOUT` (message-semantics.constants.ts:105)

---

### 42. 🟢 🎯 重复值: `"success"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `MESSAGE_TEMPLATE_SEMANTICS.TYPES.SUCCESS` (message-semantics.constants.ts:127)
- `RETRY_STRATEGY_SEMANTICS.STOP_CONDITIONS.SUCCESS` (retry-semantics.constants.ts:90)

---

### 43. 🟢 🎯 重复值: `"query"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_KEY_SEMANTICS.PREFIXES.QUERY` (cache-semantics.constants.ts:21)
- `CACHE_KEY_PREFIX_SEMANTICS.CORE_MODULES.QUERY` (cache-semantics.constants.ts:230)

---

### 44. 🟢 🎯 重复值: `"temp"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_KEY_SEMANTICS.PREFIXES.TEMP` (cache-semantics.constants.ts:22)
- `CACHE_KEY_PREFIX_SEMANTICS.UTILITY_MODULES.TEMP` (cache-semantics.constants.ts:263)

---

### 45. 🟢 🎯 重复值: `"lock"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_KEY_SEMANTICS.PREFIXES.LOCK` (cache-semantics.constants.ts:23)
- `CACHE_KEY_PREFIX_SEMANTICS.UTILITY_MODULES.LOCK` (cache-semantics.constants.ts:264)

---

### 46. 🟢 🎯 重复值: `"config"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_KEY_SEMANTICS.PREFIXES.CONFIG` (cache-semantics.constants.ts:24)
- `CACHE_KEY_PREFIX_SEMANTICS.CONFIG_MODULES.CONFIG` (cache-semantics.constants.ts:256)

---

### 47. 🟢 🎯 重复值: `"ttl"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_STRATEGY_SEMANTICS.EVICTION.TTL` (cache-semantics.constants.ts:65)
- `CACHE_OPERATIONS.BASIC.TTL` (cache-semantics.constants.ts:128)

---

### 48. 🟢 🎯 重复值: `true`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_MONITORING_SEMANTICS.MONITORING.ENABLE_METRICS` (cache-semantics.constants.ts:210)
- `CACHE_ADVANCED_STRATEGY_SEMANTICS.COMPRESSION.ENABLE_COMPRESSION` (cache-semantics.constants.ts:280)

---

### 49. 🟢 🎯 重复值: `201`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SUCCESS.CREATED` (http-semantics.constants.ts:19)
- `HTTP_STATUS_SEMANTICS.SUCCESS.CREATED` (status-codes-semantics.constants.ts:18)

---

### 50. 🟢 🎯 重复值: `204`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SUCCESS.NO_CONTENT` (http-semantics.constants.ts:20)
- `HTTP_STATUS_SEMANTICS.SUCCESS.NO_CONTENT` (status-codes-semantics.constants.ts:19)

---

### 51. 🟢 🎯 重复值: `301`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.REDIRECT.MOVED_PERMANENTLY` (http-semantics.constants.ts:25)
- `HTTP_STATUS_SEMANTICS.REDIRECT.MOVED_PERMANENTLY` (status-codes-semantics.constants.ts:24)

---

### 52. 🟢 🎯 重复值: `302`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.REDIRECT.FOUND` (http-semantics.constants.ts:26)
- `HTTP_STATUS_SEMANTICS.REDIRECT.FOUND` (status-codes-semantics.constants.ts:25)

---

### 53. 🟢 🎯 重复值: `304`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.REDIRECT.NOT_MODIFIED` (http-semantics.constants.ts:27)
- `HTTP_STATUS_SEMANTICS.REDIRECT.NOT_MODIFIED` (status-codes-semantics.constants.ts:26)

---

### 54. 🟢 🎯 重复值: `401`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.UNAUTHORIZED` (http-semantics.constants.ts:33)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNAUTHORIZED` (status-codes-semantics.constants.ts:32)

---

### 55. 🟢 🎯 重复值: `403`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.FORBIDDEN` (http-semantics.constants.ts:34)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.FORBIDDEN` (status-codes-semantics.constants.ts:33)

---

### 56. 🟢 🎯 重复值: `404`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.NOT_FOUND` (http-semantics.constants.ts:35)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.NOT_FOUND` (status-codes-semantics.constants.ts:34)

---

### 57. 🟢 🎯 重复值: `405`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.METHOD_NOT_ALLOWED` (http-semantics.constants.ts:36)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.METHOD_NOT_ALLOWED` (status-codes-semantics.constants.ts:35)

---

### 58. 🟢 🎯 重复值: `409`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.CONFLICT` (http-semantics.constants.ts:37)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.CONFLICT` (status-codes-semantics.constants.ts:36)

---

### 59. 🟢 🎯 重复值: `413`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.PAYLOAD_TOO_LARGE` (http-semantics.constants.ts:38)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.PAYLOAD_TOO_LARGE` (status-codes-semantics.constants.ts:37)

---

### 60. 🟢 🎯 重复值: `422`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.UNPROCESSABLE_ENTITY` (http-semantics.constants.ts:39)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNPROCESSABLE_ENTITY` (status-codes-semantics.constants.ts:38)

---

### 61. 🟢 🎯 重复值: `429`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.CLIENT_ERROR.TOO_MANY_REQUESTS` (http-semantics.constants.ts:40)
- `HTTP_STATUS_SEMANTICS.CLIENT_ERROR.TOO_MANY_REQUESTS` (status-codes-semantics.constants.ts:39)

---

### 62. 🟢 🎯 重复值: `501`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SERVER_ERROR.NOT_IMPLEMENTED` (http-semantics.constants.ts:46)
- `HTTP_STATUS_SEMANTICS.SERVER_ERROR.NOT_IMPLEMENTED` (status-codes-semantics.constants.ts:45)

---

### 63. 🟢 🎯 重复值: `502`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SERVER_ERROR.BAD_GATEWAY` (http-semantics.constants.ts:47)
- `HTTP_STATUS_SEMANTICS.SERVER_ERROR.BAD_GATEWAY` (status-codes-semantics.constants.ts:46)

---

### 64. 🟢 🎯 重复值: `503`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SERVER_ERROR.SERVICE_UNAVAILABLE` (http-semantics.constants.ts:48)
- `HTTP_STATUS_SEMANTICS.SERVER_ERROR.SERVICE_UNAVAILABLE` (status-codes-semantics.constants.ts:47)

---

### 65. 🟢 🎯 重复值: `504`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_CODES.SERVER_ERROR.GATEWAY_TIMEOUT` (http-semantics.constants.ts:49)
- `HTTP_STATUS_SEMANTICS.SERVER_ERROR.GATEWAY_TIMEOUT` (status-codes-semantics.constants.ts:48)

---

### 66. 🟢 🎯 重复值: `"OPTIONS"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_METHODS.SAFE.OPTIONS` (http-semantics.constants.ts:135)
- `HTTP_METHODS.ALL.OPTIONS` (http-semantics.constants.ts:156)

---

### 67. 🟢 🎯 重复值: `"DELETE"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_METHODS.IDEMPOTENT.DELETE` (http-semantics.constants.ts:141)
- `HTTP_METHODS.ALL.DELETE` (http-semantics.constants.ts:155)

---

### 68. 🟢 🎯 重复值: `"POST"`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_METHODS.NON_IDEMPOTENT.POST` (http-semantics.constants.ts:146)
- `HTTP_METHODS.ALL.POST` (http-semantics.constants.ts:152)

---

### 69. 🟢 🎯 重复值: `0.1`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.jitterFactor` (retry-semantics.constants.ts:367)
- `CIRCUIT_BREAKER_MONITORING_THRESHOLDS.CIRCUIT_OPEN_RATE_ALERT` (circuit-breaker-domain.constants.ts:207)

---

### 70. 🟢 🎯 重复值: `""`

- **类型**: direct
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `yaml` (index.ts:258)
- `envVars` (index.ts:275)

---

### 71. 🟢 🔗 重复值: `"BASE_STRING_LENGTHS.URL_MAX"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.URL_MAX_LENGTH` (validation.constants.ts:77)
- `NOTIFICATION_VALIDATION_LIMITS.WEBHOOK_URL_MAX_LENGTH` (validation.constants.ts:115)

---

### 72. 🟢 🔗 重复值: `"BASE_QUANTITIES.SMALL_BATCH"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.CONDITIONS_PER_RULE` (validation.constants.ts:81)
- `VALIDATION_LIMITS.CHANNELS_PER_RULE` (validation.constants.ts:84)

---

### 73. 🟢 🔗 重复值: `"BASE_TIMEOUT_MS.NORMAL_OPERATION"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.HTTP_TIMEOUT_MIN` (validation.constants.ts:95)
- `NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN` (validation.constants.ts:123)

---

### 74. 🟢 🔗 重复值: `"BASE_TIMEOUT_MS.EXTERNAL_API"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.HTTP_TIMEOUT_MAX` (validation.constants.ts:96)
- `NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX` (validation.constants.ts:124)

---

### 75. 🟢 🔗 重复值: `"BASE_RETRY_LIMITS.MINIMAL"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.RETRIES_MIN` (validation.constants.ts:99)
- `NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN` (validation.constants.ts:128)

---

### 76. 🟢 🔗 重复值: `"BASE_RETRY_LIMITS.NORMAL"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `VALIDATION_LIMITS.RETRIES_DEFAULT` (validation.constants.ts:101)
- `NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_DEFAULT` (validation.constants.ts:130)

---

### 77. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_5000"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CORE_TIMEOUTS.REQUEST.FAST_MS` (core-timeouts.constants.ts:28)
- `BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.SMALL_BATCH_MS` (batch-semantics.constants.ts:120)

---

### 78. 🟢 🔗 重复值: `"CORE_TIMEOUTS.RETRY.MAX_DELAY_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `PROCESSING_RETRY_SETTINGS.MAX_RETRY_DELAY_MS` (processing-base.constants.ts:40)
- `RETRY_DELAY_SEMANTICS.BASIC.MAX_MS` (retry-semantics.constants.ts:19)

---

### 79. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_HALF"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_PERFORMANCE_SEMANTICS.MEMORY_USAGE_THRESHOLDS.MEDIUM` (cache-semantics.constants.ts:114)
- `CACHE_MONITORING_SEMANTICS.PERFORMANCE_THRESHOLDS.MEMORY_USAGE_WARNING` (cache-semantics.constants.ts:219)

---

### 80. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_THREE_QUARTERS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_PERFORMANCE_SEMANTICS.MEMORY_USAGE_THRESHOLDS.HIGH` (cache-semantics.constants.ts:115)
- `CACHE_MONITORING_SEMANTICS.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_TARGET` (cache-semantics.constants.ts:217)

---

### 81. 🟢 🔗 重复值: `"CACHE_KEY_SEMANTICS.SEPARATORS.NAMESPACE"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `separator` (cache-semantics.constants.ts:154)
- `separator` (cache-semantics.constants.ts:309)

---

### 82. 🟢 🔗 重复值: `"CORE_TIMEOUTS.CONNECTION.ESTABLISH_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `CACHE_CONNECTION_SEMANTICS.REDIS.CONNECTION_TIMEOUT_MS` (cache-semantics.constants.ts:195)
- `HTTP_TIMEOUTS.CONNECTION.ESTABLISH_MS` (http-semantics.constants.ts:60)

---

### 83. 🟢 🔗 重复值: `"CORE_TIMEOUTS.OPERATION.STANDARD_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `BATCH_TIMEOUT_SEMANTICS.BASIC.STANDARD_BATCH_MS` (batch-semantics.constants.ts:106)
- `BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.MEDIUM_BATCH_MS` (batch-semantics.constants.ts:121)

---

### 84. 🟢 🔗 重复值: `"CORE_TIMEOUTS.OPERATION.LONG_RUNNING_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `BATCH_TIMEOUT_SEMANTICS.BASIC.LONG_BATCH_MS` (batch-semantics.constants.ts:107)
- `BATCH_TIMEOUT_SEMANTICS.SCENARIO.API_BATCH_MS` (batch-semantics.constants.ts:114)

---

### 85. 🟢 🔗 重复值: `"BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.PARALLEL"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `BATCH_CONFIG_TEMPLATES.HIGH_PERFORMANCE.strategy` (batch-semantics.constants.ts:166)
- `BATCH_CONFIG_TEMPLATES.API_BATCH.strategy` (batch-semantics.constants.ts:202)

---

### 86. 🟢 🔗 重复值: `"BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.BEST_EFFORT"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `BATCH_CONFIG_TEMPLATES.HIGH_PERFORMANCE.errorHandling` (batch-semantics.constants.ts:167)
- `BATCH_CONFIG_TEMPLATES.API_BATCH.errorHandling` (batch-semantics.constants.ts:203)

---

### 87. 🟢 🔗 重复值: `"BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.SEQUENTIAL"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `BATCH_CONFIG_TEMPLATES.HIGH_RELIABILITY.strategy` (batch-semantics.constants.ts:175)
- `BATCH_CONFIG_TEMPLATES.DATABASE_BATCH.strategy` (batch-semantics.constants.ts:193)

---

### 88. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_5"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_COUNT_SEMANTICS.SCENARIO.EXTERNAL_API` (retry-semantics.constants.ts:54)
- `RETRY_COUNT_SEMANTICS.SEVERITY.LOW` (retry-semantics.constants.ts:63)

---

### 89. 🟢 🔗 重复值: `"RETRY_DELAY_SEMANTICS.BASIC.MAX_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.NETWORK_OPERATION.maxDelayMs` (retry-semantics.constants.ts:177)
- `RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxDelayMs` (retry-semantics.constants.ts:366)

---

### 90. 🟢 🔗 重复值: `"RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.LINEAR"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION.backoffStrategy` (retry-semantics.constants.ts:187)
- `RETRY_CONFIG_TEMPLATES.CACHE_OPERATION.backoffStrategy` (retry-semantics.constants.ts:196)

---

### 91. 🟢 🔗 重复值: `"RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_FAILURE"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION.retryOn` (retry-semantics.constants.ts:188)
- `RETRY_CONFIG_TEMPLATES.CACHE_OPERATION.retryOn` (retry-semantics.constants.ts:197)

---

### 92. 🟢 🔗 重复值: `"RETRY_DELAY_SEMANTICS.BACKOFF.EXPONENTIAL_MAX_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.EXTERNAL_API.maxDelayMs` (retry-semantics.constants.ts:204)
- `RETRY_BUSINESS_SCENARIOS.CRITICAL_OPERATIONS.maxDelayMs` (retry-semantics.constants.ts:325)

---

### 93. 🟢 🔗 重复值: `"RETRY_COUNT_SEMANTICS.SEVERITY.CRITICAL"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION.maxAttempts` (retry-semantics.constants.ts:211)
- `RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts` (retry-semantics.constants.ts:278)

---

### 94. 🟢 🔗 重复值: `"RETRY_DELAY_SEMANTICS.BASIC.MIN_MS"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION.initialDelayMs` (retry-semantics.constants.ts:212)
- `RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION.maxDelayMs` (retry-semantics.constants.ts:213)

---

### 95. 🟢 🔗 重复值: `"NUMERIC_CONSTANTS.N_200"`

- **类型**: reference
- **重复次数**: 2
- **严重程度**: low

**出现位置:**
- `HTTP_STATUS_SEMANTICS.SUCCESS.OK` (status-codes-semantics.constants.ts:17)
- `STATUS_CODE_SEMANTICS.RANGES.SUCCESS.MIN` (status-codes-semantics.constants.ts:64)

---

## 扫描信息

- **扫描时间**: 2025-09-10T11:26:14.328Z
- **扫描目录**: src/common/constants
