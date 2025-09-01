# cache 常枚举值审查说明

> 审查范围：`backend/src/cache` 组件（constants/dto/services/module）。
> 目标：识别重复/未使用的枚举值与常量、语义重复字段、可删除/可简化字段，并提出合并与优化建议。

## 1. 常量/枚举（含同值重复与未使用）

- 使用位置统计基于源码（不含测试）静态分析；路径以 `src/` 起始。

### 1.1 `src/cache/constants/cache.constants.ts`
- 导出对象：`CACHE_ERROR_MESSAGES`、`CACHE_WARNING_MESSAGES`、`CACHE_SUCCESS_MESSAGES`、`CACHE_KEYS`、`CACHE_TTL`、`CACHE_OPERATIONS`、`CACHE_STATUS`、`CACHE_METRICS`、`CACHE_CONSTANTS`(转出自 unified)。

- 发现
  - 未使用项（源码内未命中，仅测试命中不计）：
    - `CACHE_SUCCESS_MESSAGES`: `SET_SUCCESS`、`GET_SUCCESS`、`DELETE_SUCCESS`、`BATCH_OPERATION_SUCCESS`、`LOCK_ACQUIRED`、`LOCK_RELEASED`、`HEALTH_CHECK_PASSED`（仅 `WARMUP_STARTED`、`WARMUP_COMPLETED`、`OPTIMIZATION_TASKS_STARTED`、`STATS_CLEANUP_COMPLETED` 在 `src/cache/services/cache.service.ts` 使用）
    - `CACHE_KEYS`: `STOCK_QUOTE`、`STOCK_BASIC_INFO`、`INDEX_QUOTE`、`MARKET_STATUS`、`SYMBOL_MAPPING`、`DATA_MAPPING`（源码内仅 `LOCK_PREFIX` 使用于分布式锁）
    - `CACHE_STATUS`: 全体未在 `src/` 使用（健康检查直接使用字面量 "healthy" | "warning" | "unhealthy"）
    - `CACHE_METRICS`: 全体未在 `src/` 使用（监控与统计在本组件内以自定义结构实现）
  - 部分使用项：
    - `CACHE_TTL`: `DEFAULT`、`LOCK_TTL` 在服务中使用；其余模块特定项（`REALTIME_DATA`、`BASIC_INFO`、`MARKET_STATUS`、`MAPPING_RULES`、`HEALTH_CHECK_TTL`）未在本组件源码内使用。
    - `CACHE_OPERATIONS`: `SET`、`GET`、`MGET`、`MSET`、`HEALTH_CHECK`、`SERIALIZE`、`RELEASE_LOCK`、`UPDATE_METRICS`、`CLEANUP_STATS` 使用；`GET_OR_SET`、`GET_STATS`、`ACQUIRE_LOCK`、`COMPRESS`、`DECOMPRESS`、`DESERIALIZE`、`CHECK_AND_LOG_HEALTH` 未直接使用（对应逻辑存在，但未取常量值）。
    - `CACHE_ERROR_MESSAGES`: 大部分键被使用；`REDIS_CONNECTION_FAILED`、`STATS_RETRIEVAL_FAILED`、`SERIALIZATION_FAILED`、`DESERIALIZATION_FAILED` 在当前源码未直接引用。
  - 同值重复：未发现完全重复键值对；但存在跨模块语义重叠（见 2）。

- 建议
  - 删除或下沉为文档注释：上述未使用的 `CACHE_SUCCESS_MESSAGES` 项、`CACHE_KEYS` 业务前缀项、`CACHE_STATUS`、`CACHE_METRICS`。
  - 将健康状态、操作名等统一来源改为类型/枚举或集中常量，避免字面量与常量并存（例如健康状态）。
  - 对 `CACHE_OPERATIONS` 未使用成员：如无对外约定，移除；如为对外契约，补齐使用或转注释说明为“保留占位”。

## 2. 语义重复字段（模型/DTO/表）

#### 二次审核发现的跨组件数据模型冲突
**🚨 CacheStatsDto 命名冲突是系统性设计问题的典型案例：**
- 跨组件审核揭示了更严重的问题：
  - `cache` 模块的 `CacheStatsDto` vs `core/common-cache` 的 `CacheStatsDto`
  - `monitoring` 模块中也有相似的统计字段结构
  - `alert` 模块中的统计字段与这些存在语义重叠
- **系统影响**：开发人员在导入时容易混淆，IDE 自动补全会显示多个同名类型
- **TypeScript 编译风险**：不同模块中的同名类型可能导致类型推断错误

#### 原发现的语义重复
- `CacheStatsDto`（`src/cache/dto/cache-internal.dto.ts`）字段：`hits`、`misses`、`hitRate`、`memoryUsage`、`keyCount`、`avgTtl`。
- `core/05-caching/common-cache/dto/cache-result.dto.ts` 也定义了名为 `CacheStatsDto` 的类型（不同字段含义：totalOperations/successCount/...）。虽非同文件，但命名上易混淆，语义存在"统计信息"重叠。

#### 二次审核发现的扩展重复问题
- 重复/冲突示例
  - 名称重复：两个 `CacheStatsDto` 语义不同，易造成误用。
  - 监控领域中也有 `hits/misses/hitRate` 字段多处出现（monitoring 模块与 core 缓存层），语义一致但分散定义。
  - **新发现**：`symbol-mapper` 组件中的统计字段也存在类似的 `hits/misses` 模式
  - **新发现**：多个组件都定义了性能相关的统计字段，缺乏统一的统计数据结构

- 合并建议
  - 统一命名：将缓存服务内部统计 DTO 重命名为 `CacheRuntimeStatsDto` 或 `RedisCacheStatsDto`，避免与 `common-cache` 的 `CacheStatsDto` 冲突。
  - 提取共享接口：在 `src/common/types` 定义 `HitMissStats` 接口 `{ hits: number; misses: number; hitRate: number; }`，由需要的 DTO 组合使用，减少重复字段散落定义。
  - 对 `memoryUsage/keyCount/avgTtl`，与 monitoring 的 Redis 指标语义重叠，可考虑抽取 `RedisStatsSnapshot` 公共类型，供 monitoring 与 cache 共用。

## 3. 字段复杂度评估与精简建议

- 未使用/低使用且可删除
  - DTO `CacheOperationResultDto`、`CacheCompressionInfoDto`、`CacheSerializationInfoDto`、`DistributedLockInfoDto`、`CacheKeyPatternAnalysisDto`、`CachePerformanceMonitoringDto`：在 `src/` 中未被引用（仅单元测试中使用）。如无近期落地计划，建议移至 experimental 或删除，减少维护面。
  - `CACHE_KEYS` 业务键前缀（除锁前缀）：不在本组件源码使用，建议迁移到使用方模块的常量文件，或直接删除。
  - `CACHE_STATUS`、`CACHE_METRICS`：在本组件未使用，建议删除或移动到 monitoring 组件集中管理。

- 可简化/内聚化
  - 将健康状态字面量统一为 `type CacheHealthStatus = "healthy" | "warning" | "unhealthy";` 并导出，替代分散字符串。
  - `serialize/deserialize` 分支目前 `json|msgpack` 同实现（TODO 占位），可先移除 `msgpack` 选项或在配置中明确关闭，待实现后再开启，降低误用风险。
  - `CACHE_OPERATIONS` 与装饰器 `@CachePerformance("...")` 之间建立类型关联（如 string literal union），避免错拼。未使用的常量成员可移除或以注释保留。

- 设计取舍（KISS & 性能）
  - `CacheWarmupConfigDto` 并未在 `src/` 中直接引用（服务使用 `warmup(warmupData, options)`，未直接依赖该 DTO），如对外未暴露，建议内联为服务方法参数类型或删除该 DTO。
  - `maxMemory/compressionThreshold/serializer`：均有调用路径；但 `serializer: 'msgpack'` 尚未支持，实现前建议文档标注或校验禁止。

## 4. 重复/未使用清单（含路径与键/值）

- 未使用常量（源码）
  - `src/cache/constants/cache.constants.ts`:
    - `CACHE_SUCCESS_MESSAGES`: SET_SUCCESS, GET_SUCCESS, DELETE_SUCCESS, BATCH_OPERATION_SUCCESS, LOCK_ACQUIRED, LOCK_RELEASED, HEALTH_CHECK_PASSED
    - `CACHE_KEYS`: STOCK_QUOTE, STOCK_BASIC_INFO, INDEX_QUOTE, MARKET_STATUS, SYMBOL_MAPPING, DATA_MAPPING
    - `CACHE_STATUS`: HEALTHY, WARNING, UNHEALTHY, CONNECTED, DISCONNECTED, DEGRADED
    - `CACHE_METRICS`: HITS, MISSES, HIT_RATE, MISS_RATE, MEMORY_USAGE, KEY_COUNT, AVERAGE_TTL, OPERATION_DURATION, COMPRESSION_RATIO, LOCK_WAIT_TIME, BATCH_SIZE, ERROR_COUNT, SLOW_OPERATIONS
    - `CACHE_OPERATIONS`（未使用成员）: GET_OR_SET, GET_STATS, ACQUIRE_LOCK, COMPRESS, DECOMPRESS, DESERIALIZE, CHECK_AND_LOG_HEALTH
    - `CACHE_ERROR_MESSAGES`（未使用成员）: REDIS_CONNECTION_FAILED, STATS_RETRIEVAL_FAILED, SERIALIZATION_FAILED, DESERIALIZATION_FAILED

- 未使用 DTO（源码）
  - `src/cache/dto/cache-internal.dto.ts`: CacheOperationResultDto, CacheCompressionInfoDto, CacheSerializationInfoDto, DistributedLockInfoDto, CacheKeyPatternAnalysisDto, CachePerformanceMonitoringDto

- 同名但语义冲突/重复
  - `src/cache/dto/cache-internal.dto.ts` vs `src/core/05-caching/common-cache/dto/cache-result.dto.ts`: `CacheStatsDto` 名称重复，字段含义不同。

## 5. 具体改进建议摘要

- 删除/迁移未使用常量与 DTO，精简 API 面；
- 统一健康状态/操作名的类型定义，替代分散字面量；
- 抽取 `HitMissStats`、`RedisStatsSnapshot` 等通用类型，减少跨模块字段重复；
- 明确 `msgpack` 支持状态：未支持前在校验与文档上禁用；
- 若需保留占位常量（对外契约），在注释中标明原因，避免误删。

---

生成时间：自动分析 