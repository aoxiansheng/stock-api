# Cache共享常量架构修正方案

## 架构洞察

基于对Common-cache组件分析的结果，确认了其**基础设施层**的定位：
- 被smart-cache通过服务注入依赖
- 被stream-cache通过接口继承复用
- 提供整个缓存体系的底层服务

因此，**共享常量模块应该放在Common-cache内部**，而不是创建独立的shared-cache-constants模块。

## 修正后的架构设计

### 1. 在Common-cache内部扩展常量体系

#### 当前结构
```
src/core/05-caching/common-cache/
├── constants/
│   ├── cache.constants.ts          # 现有基础常量
│   └── cache-config.constants.ts   # 现有配置常量
```

#### 修正后的结构
```
src/core/05-caching/common-cache/
├── constants/
│   ├── cache.constants.ts                    # 现有基础常量（保留）
│   ├── cache-config.constants.ts             # 现有配置常量（保留）
│   ├── shared-base-values.constants.ts       # 🆕 基础数值常量
│   ├── shared-ttl.constants.ts               # 🆕 共享TTL常量
│   ├── shared-intervals.constants.ts         # 🆕 共享间隔时间常量
│   ├── shared-batch-sizes.constants.ts       # 🆕 共享批处理常量
│   └── index.ts                              # 统一导出
```

### 2. 共享常量设计原则

#### 2.1 基础数值常量层
```typescript
// src/core/05-caching/common-cache/constants/shared-base-values.constants.ts

/**
 * 缓存系统基础数值常量
 * 作为整个缓存体系的数值标准，防止魔法数字重复
 */
export const CACHE_BASE_VALUES = {
  // 基础时间单位（毫秒）
  ONE_SECOND_MS: 1000,
  FIVE_SECONDS_MS: 5000,           // 统一 5秒标准
  TEN_SECONDS_MS: 10000,
  THIRTY_SECONDS_MS: 30000,        // 统一 30秒标准
  ONE_MINUTE_MS: 60000,
  FIVE_MINUTES_MS: 300000,         // 统一 5分钟标准

  // 基础时间单位（秒）
  FIVE_SECONDS: 5,
  THIRTY_SECONDS: 30,              // 统一 30秒标准
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,               // 统一 5分钟标准
  ONE_HOUR: 3600,
  ONE_DAY: 86400,

  // 基础数量标准
  SMALL_COUNT: 10,                 // 小批次标准
  MEDIUM_COUNT: 50,                // 中批次标准
  LARGE_COUNT: 100,                // 大批次标准
  EXTRA_LARGE_COUNT: 200,          // 特大批次标准

  // 基础比例标准
  LOW_THRESHOLD: 0.2,              // 低阈值标准
  MEDIUM_THRESHOLD: 0.5,           // 中等阈值标准
  HIGH_THRESHOLD: 0.8,             // 高阈值标准
  CRITICAL_THRESHOLD: 0.9,         // 严重阈值标准
} as const;
```

#### 2.2 TTL配置常量层
```typescript
// src/core/05-caching/common-cache/constants/shared-ttl.constants.ts

import { CACHE_BASE_VALUES } from './shared-base-values.constants';

/**
 * 缓存系统TTL配置常量
 * 基于业务场景的TTL标准化配置
 */
export const CACHE_SHARED_TTL = {
  // 业务场景TTL
  REAL_TIME_TTL_SECONDS: CACHE_BASE_VALUES.FIVE_SECONDS,           // 实时数据TTL
  NEAR_REAL_TIME_TTL_SECONDS: CACHE_BASE_VALUES.THIRTY_SECONDS,    // 准实时数据TTL
  BATCH_QUERY_TTL_SECONDS: CACHE_BASE_VALUES.FIVE_MINUTES,         // 批量查询TTL
  ARCHIVE_TTL_SECONDS: CACHE_BASE_VALUES.ONE_HOUR,                 // 归档数据TTL

  // 市场状态相关TTL
  TRADING_HOURS_TTL_SECONDS: CACHE_BASE_VALUES.THIRTY_SECONDS,     // 交易时段TTL
  OFF_HOURS_TTL_SECONDS: 1800,                                     // 非交易时段TTL（30分钟）
  WEEKEND_TTL_SECONDS: CACHE_BASE_VALUES.ONE_HOUR,                 // 周末TTL

  // 边界值TTL
  MIN_TTL_SECONDS: CACHE_BASE_VALUES.THIRTY_SECONDS,               // 最小TTL
  MAX_TTL_SECONDS: CACHE_BASE_VALUES.ONE_DAY,                      // 最大TTL
  DEFAULT_TTL_SECONDS: CACHE_BASE_VALUES.FIVE_MINUTES,             // 默认TTL
} as const;
```

#### 2.3 间隔时间常量层
```typescript
// src/core/05-caching/common-cache/constants/shared-intervals.constants.ts

import { CACHE_BASE_VALUES } from './shared-base-values.constants';

/**
 * 缓存系统间隔时间配置常量
 * 统一系统运维相关的时间间隔配置
 */
export const CACHE_SHARED_INTERVALS = {
  // 清理操作间隔
  CLEANUP_INTERVAL_MS: CACHE_BASE_VALUES.THIRTY_SECONDS_MS,        // 标准清理间隔
  MEMORY_CLEANUP_INTERVAL_MS: CACHE_BASE_VALUES.THIRTY_SECONDS_MS, // 内存清理间隔

  // 健康检查间隔
  HEALTH_CHECK_INTERVAL_MS: CACHE_BASE_VALUES.TEN_SECONDS_MS,      // 健康检查间隔
  HEARTBEAT_INTERVAL_MS: CACHE_BASE_VALUES.THIRTY_SECONDS_MS,      // 心跳间隔

  // 监控数据收集间隔
  METRICS_COLLECTION_INTERVAL_MS: 15000,                           // 监控指标收集（15秒）
  STATS_LOG_INTERVAL_MS: CACHE_BASE_VALUES.ONE_MINUTE_MS,          // 统计日志间隔

  // 超时配置
  OPERATION_TIMEOUT_MS: CACHE_BASE_VALUES.FIVE_SECONDS_MS,         // 通用操作超时
  CONNECTION_TIMEOUT_MS: CACHE_BASE_VALUES.FIVE_SECONDS_MS,        // 连接超时
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: CACHE_BASE_VALUES.THIRTY_SECONDS_MS, // 优雅关闭超时
} as const;
```

#### 2.4 批处理大小常量层
```typescript
// src/core/05-caching/common-cache/constants/shared-batch-sizes.constants.ts

import { CACHE_BASE_VALUES } from './shared-base-values.constants';

/**
 * 缓存系统批处理大小配置常量
 * 基于性能考虑的批处理标准
 */
export const CACHE_SHARED_BATCH_SIZES = {
  // 通用批处理大小
  DEFAULT_BATCH_SIZE: CACHE_BASE_VALUES.SMALL_COUNT,               // 默认批次大小（10）
  SMALL_BATCH_SIZE: CACHE_BASE_VALUES.SMALL_COUNT,                 // 小批次（10）
  MEDIUM_BATCH_SIZE: CACHE_BASE_VALUES.MEDIUM_COUNT,               // 中批次（50）
  LARGE_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,                 // 大批次（100）

  // 专用场景批处理
  STREAM_BATCH_SIZE: CACHE_BASE_VALUES.EXTRA_LARGE_COUNT,          // 流数据批次（200）
  SYMBOL_MAPPING_BATCH_SIZE: CACHE_BASE_VALUES.MEDIUM_COUNT,       // 符号映射批次（50）
  DATA_MAPPING_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,          // 数据映射批次（100）

  // Redis操作批次
  REDIS_SCAN_COUNT: CACHE_BASE_VALUES.LARGE_COUNT,                 // Redis SCAN操作批次
  REDIS_DELETE_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,          // Redis批量删除大小

  // 并发控制
  MIN_CONCURRENT_OPERATIONS: 2,                                    // 最小并发操作数
  MAX_CONCURRENT_OPERATIONS: 16,                                   // 最大并发操作数
  DEFAULT_CONCURRENCY_LIMIT: CACHE_BASE_VALUES.SMALL_COUNT,        // 默认并发限制
} as const;
```

### 3. 统一导出策略

#### 3.1 Common-cache统一导出
```typescript
// src/core/05-caching/common-cache/constants/index.ts

// 现有常量（保持不变）
export * from './cache.constants';
export * from './cache-config.constants';

// 新增共享常量
export * from './shared-base-values.constants';
export * from './shared-ttl.constants';
export * from './shared-intervals.constants';
export * from './shared-batch-sizes.constants';

// 便利性重导出
export {
  CACHE_BASE_VALUES as BASE_VALUES,
  CACHE_SHARED_TTL as SHARED_TTL,
  CACHE_SHARED_INTERVALS as SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES as SHARED_BATCH_SIZES,
} from './shared-base-values.constants';
```

#### 3.2 Common-cache主导出文件更新
```typescript
// src/core/05-caching/common-cache/index.ts

// 现有导出（保持不变）
export { CommonCacheService } from "./services/common-cache.service";
export { CommonCacheModule } from "./module/common-cache.module";
// ... 其他现有导出

// 新增共享常量导出
export {
  CACHE_BASE_VALUES,
  CACHE_SHARED_TTL,
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES,
  // 便利性别名
  BASE_VALUES,
  SHARED_TTL,
  SHARED_INTERVALS,
  SHARED_BATCH_SIZES,
} from "./constants";
```

### 4. 其他组件的使用方式

#### 4.1 Smart Cache重构
```typescript
// smart-cache/constants/smart-cache.constants.ts

import {
  CACHE_SHARED_TTL,
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES
} from '../../common-cache';

/**
 * Smart Cache 特有常量
 * 使用Common-cache的共享常量作为基础
 */
export const SMART_CACHE_CONSTANTS = {
  // 业务策略常量 - 使用共享TTL
  STRATEGIES: {
    STRONG_TIMELINESS_TTL_S: CACHE_SHARED_TTL.REAL_TIME_TTL_SECONDS,
    WEAK_TIMELINESS_TTL_S: CACHE_SHARED_TTL.BATCH_QUERY_TTL_SECONDS,
    MARKET_OPEN_TTL_S: CACHE_SHARED_TTL.TRADING_HOURS_TTL_SECONDS,
    MARKET_CLOSED_TTL_S: CACHE_SHARED_TTL.OFF_HOURS_TTL_SECONDS,
  },

  // 性能配置 - 使用共享批次大小
  PERFORMANCE: {
    DEFAULT_BATCH_SIZE: CACHE_SHARED_BATCH_SIZES.DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE: CACHE_SHARED_BATCH_SIZES.LARGE_BATCH_SIZE,
    CONCURRENCY_LIMIT: CACHE_SHARED_BATCH_SIZES.DEFAULT_CONCURRENCY_LIMIT,
  },

  // 运维配置 - 使用共享间隔
  OPERATIONS: {
    CLEANUP_INTERVAL_MS: CACHE_SHARED_INTERVALS.CLEANUP_INTERVAL_MS,
    HEALTH_CHECK_INTERVAL_MS: CACHE_SHARED_INTERVALS.HEALTH_CHECK_INTERVAL_MS,
    METRICS_INTERVAL_MS: CACHE_SHARED_INTERVALS.METRICS_COLLECTION_INTERVAL_MS,
  },

  // Smart Cache特有的配置（不能共享的）
  ADAPTIVE_CONFIG: {
    MEMORY_PRESSURE_THRESHOLD: 0.85,          // 智能缓存特有
    CPU_PRESSURE_THRESHOLD: 0.8,              // 智能缓存特有
    CACHE_HIT_RATE_TARGET: 0.9,               // 智能缓存特有
  },

  // 组件标识
  METADATA: {
    COMPONENT_NAME: "smart_cache_orchestrator",
    VERSION: "2.0.0",
    NAMESPACE: "smart-cache",
  },
} as const;
```

#### 4.2 Stream Cache重构
```typescript
// stream-cache/constants/stream-cache.constants.ts

import {
  CACHE_SHARED_TTL,
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES
} from '../../common-cache';

export const STREAM_CACHE_CONFIG = {
  // TTL配置 - 使用共享常量
  TTL: {
    HOT_CACHE_TTL_S: CACHE_SHARED_TTL.REAL_TIME_TTL_SECONDS,
    WARM_CACHE_TTL_S: CACHE_SHARED_TTL.BATCH_QUERY_TTL_SECONDS,
  },

  // 容量配置 - 使用共享批次大小
  CAPACITY: {
    MAX_HOT_CACHE_SIZE: 1000,                                    // 流缓存特有
    MAX_BATCH_SIZE: CACHE_SHARED_BATCH_SIZES.STREAM_BATCH_SIZE,  // 使用流数据专用批次
  },

  // 清理配置 - 使用共享间隔
  CLEANUP: {
    INTERVAL_MS: CACHE_SHARED_INTERVALS.CLEANUP_INTERVAL_MS,
    MAX_CLEANUP_ITEMS: CACHE_SHARED_BATCH_SIZES.LARGE_BATCH_SIZE,
  },

  // 流缓存特有配置
  STREAM_SPECIFIC: {
    COMPRESSION_THRESHOLD_BYTES: 1024,        // 流数据压缩阈值
    CONNECTION_TIMEOUT_MS: CACHE_SHARED_INTERVALS.CONNECTION_TIMEOUT_MS,
    HEARTBEAT_INTERVAL_MS: CACHE_SHARED_INTERVALS.HEARTBEAT_INTERVAL_MS,
  },
} as const;
```

### 5. 架构优势

#### 5.1 符合基础设施层定位
- ✅ 共享常量作为基础设施的一部分，由Common-cache统一管理
- ✅ 其他组件通过依赖Common-cache获得共享常量
- ✅ 保持了清晰的单向依赖关系

#### 5.2 减少重复定义
- ✅ 30000、300、5000等高频数值统一定义在基础层
- ✅ 消除了跨组件的常量重复问题
- ✅ 提供了语义化的常量名称

#### 5.3 保持组件特色
- ✅ 各组件保留自己特有的常量定义
- ✅ 仅共享真正通用的基础数值
- ✅ 业务语义层面的差异得到保留

### 6. 迁移策略

#### 阶段1: 在Common-cache中创建共享常量（1-2天）
1. 创建4个新的常量文件
2. 定义基础数值和共享配置
3. 更新Common-cache的导出

#### 阶段2: 重构Smart Cache常量（2-3天）
1. 分析现有常量的共享性
2. 引用Common-cache的共享常量
3. 保留Smart Cache特有的配置

#### 阶段3: 重构其他组件常量（2-3天）
1. Stream Cache常量重构
2. Data Mapper Cache常量重构
3. Symbol Mapper Cache常量重构

#### 阶段4: 验证和测试（1-2天）
1. 类型检查验证
2. 功能测试验证
3. 性能回归测试

### 7. 成功指标

- **重复常量减少**: 从42个重复降至 <5个 (88%减少)
- **依赖关系清晰**: 所有组件通过Common-cache获取共享常量
- **架构一致性**: 符合基础设施层统一管理共享资源的原则
- **向后兼容**: 现有代码无需大幅修改，仅需引用路径调整

## 结论

将共享常量模块放在Common-cache内部是正确的架构决策：

1. **符合基础设施层定位**：Common-cache作为基础服务，统一管理共享资源
2. **保持依赖关系清晰**：其他组件已经依赖Common-cache，无需引入新的依赖
3. **实现真正的常量共享**：通过基础设施层分发共享常量给所有消费者
4. **简化架构复杂度**：避免创建额外的独立模块

这个方案既解决了常量重复问题，又保持了良好的架构设计原则。

---
**修正日期**: 2024-09-23
**架构原则**: 基础设施层统一管理共享资源
**实施周期**: 1-2周
**风险评级**: 低（符合现有架构模式）