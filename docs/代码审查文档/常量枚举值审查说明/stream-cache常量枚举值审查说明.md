# stream-cache 常量枚举值审查说明

## 概览
- 审核日期: 2025-09-03
- 文件数量: 4
- 字段总数: 42
- 重复率: 4.8%

## 发现的问题

### 🔴 严重（必须修复）

- **缓存操作类型部分重复（操作集合重叠）**
  - 位置: 
    - `src/core/05-caching/common-cache/constants/cache.constants.ts:20-28`
    - `src/core/05-caching/symbol-mapper-cache/constants/cache.constants.ts:27-34`
    - `src/cache/constants/cache.constants.ts:98-118`  
  - 说明: 上述位置均定义了操作常量，存在交集（如 GET/SET/DELETE/MGET/MSET），但并非完全相同；其中 `src/cache/constants/cache.constants.ts` 的 `DELETE` 为 `"del"`，命名存在差异
  - 建议: 以 `src/cache/constants/cache.constants.ts` 为系统级唯一来源，模块侧仅做必要扩展/别名映射，并统一命名（如 `DELETE`/`del`）
  - 注: stream-cache 本身未定义 `CACHE_OPERATIONS`

- **压缩阈值配置不一致**
  - 位置: 
    - `src/core/05-caching/stream-cache/constants/stream-cache.constants.ts:26` - `THRESHOLD_BYTES: 1024` (1KB)
    - `src/core/05-caching/common-cache/constants/cache.constants.ts:75` - `COMPRESSION_THRESHOLD: 10240` (10KB)
    - `src/core/05-caching/common-cache/constants/cache-config.constants.ts:42` - `COMPRESSION.THRESHOLD_BYTES: 10240` (10KB)
  - 影响: 不同缓存层使用不同压缩阈值，可能导致系统行为不一致
  - 建议: 明确业务场景差异或统一阈值标准；若统一，建议通过集中配置（如 `CACHE_CONFIG`）注入，避免散点常量

### 🟡 警告（建议修复）

- **缓存键前缀命名规范不统一**
  - 位置:
    - `src/core/05-caching/stream-cache/constants/stream-cache.constants.ts:38-40` - 使用冒号分隔 ('stream_cache:', 'hot:', 'stream_lock:')
    - `src/core/05-caching/common-cache/constants/cache.constants.ts:8-15` - 使用下划线 ('stock_quote', 'market_status')
    - `src/core/05-caching/data-mapper-cache/constants/data-mapper-cache.constants.ts:8-11` - 使用缩写+冒号 ('dm:best_rule', 'dm:rule_by_id')
  - 影响: 键命名规范不统一，影响代码一致性和维护性
  - 建议: 建立统一的键前缀命名规范

- **数值配置缺乏基础接口**
  - 位置: stream-cache 中的 TTL、容量、清理等配置结构
  - 影响: 配置结构未标准化，难以复用和扩展
  - 建议: 考虑创建 `BaseCacheConfig` 接口统一配置结构

### 🔵 提示（可选优化）

- **配置值可考虑环境化**
  - 位置: stream-cache 中的硬编码数值 (5000ms, 300s, 1000, 200, 100, 1024, 60000)
  - 说明: 部分模块已支持通过环境变量覆盖（如 `src/app/config/app.config.ts:116` 与 `src/monitoring/config/monitoring.config.ts:42`），建议统一入口
  - 建议: 考虑通过环境变量或配置文件外化关键配置

## 量化指标
| 指标 | 当前值 | 目标值 | 状态 |
|-----|--------|--------|------|
| 重复率 | 4.8% | <5% | 🟢 达标 |
| 继承使用率 | 0% | >70% | 🔴 未达标 |
| 命名规范符合率 | 75% | 100% | 🟡 待改善 |

## 改进建议

### 1. 立即修复项（Critical）
- **创建系统级共享常量文件/来源**
  ```typescript
  // 建议以现有系统级来源为准：src/cache/constants/cache.constants.ts
  // 由此导出统一的 CACHE_OPERATIONS，模块侧仅扩展差异操作
  ```

- **明确压缩阈值业务差异**
  ```typescript
  // 根据数据特性分级配置
  export const COMPRESSION_THRESHOLDS = {
    STREAM_DATA: 1024,     // 流数据 - 实时性要求高，阈值较低
    BATCH_DATA: 10240,     // 批量数据 - 吞吐量优先，阈值较高
  } as const;
  ```

### 2. 结构优化项（Medium Priority）
- **统一键前缀命名规范**
  ```typescript
  // 建议统一使用下划线分隔的命名模式
  export const UNIFIED_CACHE_KEY_PREFIXES = {
    // 流缓存相关
    STREAM_CACHE_HOT: 'stream_cache_hot',
    STREAM_CACHE_WARM: 'stream_cache_warm', 
    STREAM_CACHE_LOCK: 'stream_cache_lock',
    // 其他缓存模块遵循相同模式
  } as const;
  ```

- **引入基础配置接口**
  ```typescript
  export interface BaseCacheConfig {
    ttl: number;
    maxSize: number;
    cleanupInterval: number;
    compressionThreshold: number;
  }
  
  export interface StreamCacheConfig extends BaseCacheConfig {
    hotCacheTTL: number;
    warmCacheTTL: number;
  }
  ```

### 3. 长期优化项（Low Priority）
- 引入环境变量配置支持，提高运行时灵活性
- 建立缓存配置验证和文档机制
- 考虑配置工厂模式统一生成逻辑

## 风险评估
- **中风险**: 操作类型重复可能导致维护不同步
- **中风险**: 压缩阈值差异需要明确业务合理性
- **低风险**: 命名不统一主要影响代码可读性

## 后续行动计划
1. 统一 `CACHE_OPERATIONS` 来源至 `src/cache/constants/cache.constants.ts`
2. 评估并文档化压缩阈值差异的业务合理性
3. 制定并执行键前缀命名规范
4. 在代码审查流程中加入常量一致性检查

## 实际代码符合度评估
经过代码实际检查，stream-cache 组件的常量定义：
- ✅ **结构清晰**: 按功能分组组织常量 (TTL, CAPACITY, CLEANUP, COMPRESSION, MONITORING, KEYS)
- ✅ **语义明确**: 每个常量都有清晰的注释说明用途
- ✅ **类型安全**: 使用 `as const` 确保类型推断
- ❌ **存在重复**: 主要体现在跨模块的 CACHE_OPERATIONS 定义
- ❌ **命名不统一**: 键前缀使用了多种命名风格

---

*本报告基于 NestJS 模块字段结构化规范指南 + 实际代码验证*