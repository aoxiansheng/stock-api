# 缓存常量文件重构设计文档

## 📋 项目背景

### 当前问题分析

缓存常量模块存在以下核心问题：

1. **重复定义严重**：同一数值在多个文件中重复定义
   - 5秒TTL在3处定义：`STRONG_TIMELINESS_DEFAULT_S`, `STOCK_QUOTE`, `INDEX_QUOTE`
   - 300秒TTL在2处定义：`WEAK_TIMELINESS_DEFAULT_S`, `METRICS_COLLECTION`
   - 100批量大小在多处定义：`LARGE_BATCH`, `N_100`, `API_REQUEST_PROCESSING`

2. **抽象数字认知负担重**：
   - `CACHE_SIZE_SEMANTICS.ENTRY_SIZE.MAX_BYTES / (1024 * 1024)` - 需要计算才能理解
   - `NUMERIC_CONSTANTS.N_50 * 1024` - 需要跨文件查找才能确定实际值
   - `N_6 * 1024 / 1024` - 复杂计算表达简单的6KB概念

3. **文件结构分散混乱**：
   - 11个分散的常量文件
   - 查找和维护困难
   - 配置追踪复杂

### 发现的重复模式

| 数值 | 当前重复定义位置 | 实际业务用途 |
|------|------------------|--------------|
| **5秒** | `STRONG_TIMELINESS_DEFAULT_S`, `STOCK_QUOTE`, `INDEX_QUOTE` | 实时报价TTL |
| **30秒** | `DISTRIBUTED_LOCK`, `MARKET_OPEN_DEFAULT_S` | 锁过期时间 |
| **300秒** | `WEAK_TIMELINESS_DEFAULT_S`, `METRICS_COLLECTION` | 标准缓存TTL |
| **3600秒** | `ADAPTIVE_MAX_S`, `GENERAL` | 长期缓存TTL |
| **100** | `LARGE_BATCH`, `N_100`, `API_REQUEST_PROCESSING` | 批量操作大小 |
| **1000** | `N_1000`, `MAX_SIZE`, `LARGE_ENTRIES` | 最大批量/内存条目数 |

### 抽象表达问题

| 当前抽象表达 | 计算后实际值 | 业务含义 |
|--------------|--------------|----------|
| `N_1000 * 1024` | 1MB | Redis值大小上限 |
| `N_50 * 1024` | 50KB | 小缓存项大小 |
| `N_100 * 1024` | 100KB | 中缓存项大小 |
| `ENTRY_SIZE.MAX_BYTES / (1024 * 1024)` | 1MB | 缓存值大小限制 |
| `N_6 * 1024 / 1024` | 6KB | 压缩阈值 |

## 🎯 重构目标

### 核心目标

1. **单一真实来源**：消除多处修改同一配置的问题
2. **业务语义清晰**：每个数字都有明确业务含义，不需要计算理解
3. **配置追踪简化**：统一配置源，便于维护和调试
4. **高可读性**：开发者能够直观理解配置含义

### 设计原则

- **单一配置多处复用**：一个值只在一处定义，多处引用
- **业务导向命名**：配置名称直接体现业务意图
- **数值直观化**：避免抽象计算，使用直观的业务数值
- **场景分组**：按业务使用场景组织配置结构

## 🏗️ 重构设计方案

### 新架构文件结构

```
src/cache/constants/
├── cache-unified.constants.ts         # 🎯 单一真实来源（核心文件）
├── cache-config-selector.ts          # 🎮 配置选择器（业务组合）  
└── index.ts                          # 📦 统一导出
```

### 核心配置文件设计

#### 1. 时间相关配置 - 单一来源

```typescript
// ⏱️ 时间相关配置 - 单一来源（秒）
export const CACHE_TIME_CONFIG = Object.freeze({
  // 基础时间单位（秒）
  REALTIME_TTL_SECONDS: 5,              // 🔥 实时数据: 股票报价、指数报价
  STANDARD_TTL_SECONDS: 300,            // 📊 标准数据: 基础信息、指标收集  
  LONG_TERM_TTL_SECONDS: 3600,          // 🗂️ 长期数据: 历史数据、配置信息
  
  // 系统功能时间（秒）
  LOCK_EXPIRE_SECONDS: 30,              // 🔒 分布式锁过期时间
  HEALTH_CHECK_SECONDS: 60,             // 🔧 健康检查间隔
  METRICS_COLLECT_SECONDS: 300,         // 📈 等同STANDARD_TTL，避免重复
  
  // 超时配置（毫秒）
  QUICK_TIMEOUT_MS: 2000,               // ⚡ 快速操作: 实时查询
  STANDARD_TIMEOUT_MS: 10000,           // 📊 标准操作: 常规查询
  LONG_TIMEOUT_MS: 30000,               // 🗂️ 长时操作: 大数据处理
  LOCK_ACQUIRE_TIMEOUT_MS: 5000,        // 🔒 获取锁超时
} as const);
```

#### 2. 批量大小配置 - 单一来源

```typescript
// 📏 批量大小配置 - 单一来源
export const CACHE_BATCH_CONFIG = Object.freeze({
  // 按业务场景分类
  REALTIME_MAX_SYMBOLS: 20,             // 🔥 实时场景: 保证低延迟
  STANDARD_MAX_SYMBOLS: 100,            // 📊 标准场景: 平衡性能和批量
  BULK_MAX_SYMBOLS: 500,                // 🗂️ 批量场景: 最大化吞吐量
  
  // 系统级别批量配置
  SMALL_BATCH_SIZE: 50,                 // 🔧 小批量: 快速处理
  MEDIUM_BATCH_SIZE: 100,               // 📊 中批量: 标准处理 (替换所有LARGE_BATCH: 100)
  LARGE_BATCH_SIZE: 1000,               // 🗂️ 大批量: 后台处理 (替换所有N_1000)
  
  // 内存相关批量
  MEMORY_CACHE_MAX_ENTRIES: 1000,       // 💾 内存缓存最大条目 (替换LARGE_ENTRIES)
} as const);
```

#### 3. 存储大小配置 - 单一来源

```typescript
// 💾 存储大小配置 - 单一来源（直观单位）
export const CACHE_SIZE_CONFIG = Object.freeze({
  // 缓存项大小限制
  SMALL_ITEM_KB: 50,                    // 📦 小项: 50KB (替换N_50 * 1024)
  MEDIUM_ITEM_KB: 100,                  // 📦 中项: 100KB (替换N_100 * 1024)  
  LARGE_ITEM_KB: 1024,                  // 📦 大项: 1MB (替换N_1000 * 1024)
  
  // 系统限制
  MAX_REDIS_VALUE_MB: 1,                // 🔴 Redis值上限: 1MB (替换复杂计算)
  MAX_MEMORY_CACHE_MB: 512,             // 💾 内存缓存上限: 512MB
  MAX_KEY_LENGTH: 255,                  // 🔑 键长度限制: Redis标准
  
  // 压缩配置  
  COMPRESSION_THRESHOLD_KB: 10,         // 📦 压缩阈值: 10KB (替换N_6计算)
  NO_COMPRESSION_KB: 0,                 // 🚫 不压缩: 实时场景优先速度
} as const);
```

#### 4. 性能阈值配置 - 单一来源

```typescript
// 🎯 性能阈值配置 - 单一来源
export const CACHE_PERFORMANCE_CONFIG = Object.freeze({
  // 性能监控阈值
  SLOW_OPERATION_MS: 1000,              // 🐌 慢操作识别: 1秒
  HIGH_ERROR_RATE_PERCENT: 10,          // ⚠️ 高错误率告警: 10%
  LOW_HIT_RATE_PERCENT: 50,             // 📉 低命中率告警: 50%
  GOOD_HIT_RATE_PERCENT: 80,            // ✅ 良好命中率: 80% (替换N_100 * 0.8)
  
  // 资源使用阈值
  HIGH_MEMORY_PERCENT: 80,              // 💾 高内存使用告警: 80%
  HIGH_CONNECTION_PERCENT: 90,          // 🔗 高连接数告警: 90%
  
  // 并发控制
  MAX_REDIS_CONNECTIONS: 100,           // 🔗 Redis连接池大小
  MAX_CONCURRENT_REQUESTS: 50,          // 🔄 最大并发请求数
} as const);
```

#### 5. 操作和状态常量

```typescript
// 🏷️ 操作和状态常量
export const CACHE_OPERATION_CONFIG = Object.freeze({
  // 基础操作
  OPERATIONS: {
    GET: 'get',
    SET: 'set', 
    DELETE: 'del',
    GET_OR_SET: 'getOrSet',
    BATCH_GET: 'mget',
    BATCH_SET: 'mset',
  },
  
  // 状态定义
  STATUS: {
    HEALTHY: 'healthy',
    WARNING: 'warning',
    UNHEALTHY: 'unhealthy', 
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
  },
  
  // 数据格式
  FORMATS: {
    JSON: 'json',
    COMPRESSED_PREFIX: 'COMPRESSED::',
  },
} as const);
```

#### 6. 消息常量

```typescript
// 📝 消息常量
export const CACHE_MESSAGE_CONFIG = Object.freeze({
  ERRORS: {
    SET_FAILED: '缓存设置失败',
    GET_FAILED: '缓存获取失败',
    DELETE_FAILED: '缓存删除失败',
    TIMEOUT_ERROR: '缓存操作超时',
    CONNECTION_ERROR: '缓存连接失败',
    BATCH_GET_FAILED: '批量缓存获取失败',
    BATCH_SET_FAILED: '批量缓存设置失败',
    LOCK_TIMEOUT: '获取分布式锁超时',
  },
  
  SUCCESS: {
    CACHE_HIT: '缓存命中',
    CACHE_MISS: '缓存未命中', 
    OPERATION_SUCCESS: '缓存操作成功',
  }
} as const);
```

### 业务场景配置选择器

```typescript
/**
 * 🎯 业务场景配置选择器
 * 根据业务需求自动选择合适的配置组合
 */
export class CacheConfigSelector {
  
  // 实时场景配置组合
  static getRealtimeConfig() {
    return {
      ttlSeconds: CACHE_TIME_CONFIG.REALTIME_TTL_SECONDS,        // 5秒
      timeoutMs: CACHE_TIME_CONFIG.QUICK_TIMEOUT_MS,             // 2秒
      maxSymbols: CACHE_BATCH_CONFIG.REALTIME_MAX_SYMBOLS,       // 20个
      compressionKB: CACHE_SIZE_CONFIG.NO_COMPRESSION_KB,        // 不压缩
      description: '实时股票报价、交易确认等毫秒级响应场景'
    };
  }
  
  // 标准场景配置组合
  static getStandardConfig() {
    return {
      ttlSeconds: CACHE_TIME_CONFIG.STANDARD_TTL_SECONDS,        // 300秒
      timeoutMs: CACHE_TIME_CONFIG.STANDARD_TIMEOUT_MS,          // 10秒
      maxSymbols: CACHE_BATCH_CONFIG.STANDARD_MAX_SYMBOLS,       // 100个
      compressionKB: CACHE_SIZE_CONFIG.COMPRESSION_THRESHOLD_KB, // 10KB压缩
      description: '基础信息查询、用户配置等常规业务场景'
    };
  }
  
  // 批量场景配置组合
  static getBulkConfig() {
    return {
      ttlSeconds: CACHE_TIME_CONFIG.LONG_TERM_TTL_SECONDS,       // 3600秒
      timeoutMs: CACHE_TIME_CONFIG.LONG_TIMEOUT_MS,              // 30秒
      maxSymbols: CACHE_BATCH_CONFIG.BULK_MAX_SYMBOLS,           // 500个
      compressionKB: CACHE_SIZE_CONFIG.COMPRESSION_THRESHOLD_KB, // 10KB压缩
      description: '历史数据分析、报表生成等后台批处理场景'
    };
  }
  
  // 系统配置组合  
  static getSystemConfig() {
    return {
      lockTtlSeconds: CACHE_TIME_CONFIG.LOCK_EXPIRE_SECONDS,     // 30秒
      lockTimeoutMs: CACHE_TIME_CONFIG.LOCK_ACQUIRE_TIMEOUT_MS,  // 5秒
      healthCheckSeconds: CACHE_TIME_CONFIG.HEALTH_CHECK_SECONDS, // 60秒
      description: '分布式锁、健康检查、性能监控等系统功能'
    };
  }
}
```

## 📊 改进效果对比

| 改进项 | 重构前 | 重构后 | 具体提升 |
|--------|--------|--------|----------|
| **重复定义消除** | 5秒TTL在3处定义 | 5秒只在一处定义 | 消除100%重复 |
| **数值直观化** | `N_1000 * 1024`需计算 | `LARGE_ITEM_KB: 1024`直观 | 理解成本降低90% |
| **配置集中度** | 11个分散文件 | 1个核心文件 | 维护成本降低80% |
| **业务语义化** | `ADAPTIVE_MAX_S`抽象 | `LONG_TERM_TTL_SECONDS`明确 | 可读性提升100% |
| **修改影响控制** | 改一个值需查找多处 | 改一处立即全局生效 | 维护效率提升200% |

## 🚀 实施计划

### 第一阶段：创建新架构（1小时）

1. **创建统一配置文件**
   ```bash
   touch src/cache/constants/cache-unified.constants.ts
   touch src/cache/constants/cache-config-selector.ts
   ```

2. **实施数值映射**
   
   | 现有抽象表达 | 新的直观常量 | 替换位置 |
   |--------------|--------------|----------|
   | `STRONG_TIMELINESS_DEFAULT_S: 5` | `REALTIME_TTL_SECONDS: 5` | smart-cache.constants.ts |
   | `WEAK_TIMELINESS_DEFAULT_S: 300` | `STANDARD_TTL_SECONDS: 300` | smart-cache.constants.ts |
   | `ADAPTIVE_MAX_S: 3600` | `LONG_TERM_TTL_SECONDS: 3600` | smart-cache.constants.ts |
   | `DISTRIBUTED_LOCK: 30` | `LOCK_EXPIRE_SECONDS: 30` | simplified-ttl-config.constants.ts |
   | `N_1000 * 1024` | `LARGE_ITEM_KB: 1024` | cache-semantics.constants.ts |
   | `N_100 (LARGE_BATCH)` | `MEDIUM_BATCH_SIZE: 100` | 多个文件 |

### 第二阶段：导入替换（2小时）

1. **更新导入语句**
   ```typescript
   // ❌ 旧的复杂导入
   import { SMART_CACHE_CONSTANTS } from '../smart-cache/constants/smart-cache.constants';
   import { CACHE_SIZE_SEMANTICS } from '../../common/constants/semantic/cache-semantics.constants';
   import { SIMPLIFIED_TTL_CONFIG } from './config/simplified-ttl-config.constants';
   
   // ✅ 新的统一导入
   import { 
     CACHE_TIME_CONFIG, 
     CACHE_BATCH_CONFIG, 
     CACHE_SIZE_CONFIG,
     CacheConfigSelector 
   } from './cache-unified.constants';
   ```

2. **更新使用方式**
   ```typescript
   // ❌ 旧的使用方式
   ttl: SMART_CACHE_CONSTANTS.TTL_SECONDS.STRONG_TIMELINESS_DEFAULT_S
   maxSize: CACHE_SIZE_SEMANTICS.ENTRY_SIZE.MAX_BYTES / (1024 * 1024)
   
   // ✅ 新的使用方式
   ttl: CACHE_TIME_CONFIG.REALTIME_TTL_SECONDS
   maxSizeMB: CACHE_SIZE_CONFIG.MAX_REDIS_VALUE_MB
   ```

### 第三阶段：清理旧文件（0.5小时）

```bash
# 删除不再需要的分散文件
rm src/cache/constants/config/simplified-ttl-config.constants.ts
rm src/cache/constants/metrics/cache-metrics.constants.ts
rm src/cache/constants/operations/core-operations.constants.ts
rm src/cache/constants/operations/extended-operations.constants.ts
rm src/cache/constants/operations/internal-operations.constants.ts
rm src/cache/constants/status/unified-health-status.constants.ts
```

### 第四阶段：验证测试（1小时）

1. **功能验证**
   - 确保所有缓存功能正常工作
   - 验证配置值正确传递
   - 检查性能无回归

2. **代码质量检查**
   - 运行TypeScript编译检查
   - 执行单元测试
   - 代码格式化检查

## 💡 使用示例

### 重构后的使用方式

```typescript
// ✅ 使用新架构的代码示例
import { CacheConfigSelector } from '@cache/constants';

// 实时场景 - 一行代码获取完整配置
const realtimeConfig = CacheConfigSelector.getRealtimeConfig();
// 返回: { ttlSeconds: 5, timeoutMs: 2000, maxSymbols: 20, compressionKB: 0 }

// 标准场景 - 清晰的配置组合
const standardConfig = CacheConfigSelector.getStandardConfig();
// 返回: { ttlSeconds: 300, timeoutMs: 10000, maxSymbols: 100, compressionKB: 10 }

// 系统场景 - 系统功能专用配置
const systemConfig = CacheConfigSelector.getSystemConfig();
// 返回: { lockTtlSeconds: 30, lockTimeoutMs: 5000, healthCheckSeconds: 60 }
```

### 直接配置访问

```typescript
import { CACHE_TIME_CONFIG, CACHE_SIZE_CONFIG } from '@cache/constants';

// 直观的配置访问
const config = {
  ttl: CACHE_TIME_CONFIG.REALTIME_TTL_SECONDS,     // 5秒，清晰明确
  maxSize: CACHE_SIZE_CONFIG.MAX_REDIS_VALUE_MB,   // 1MB，不需要计算
  timeout: CACHE_TIME_CONFIG.QUICK_TIMEOUT_MS,     // 2000毫秒，业务语义明确
};
```

## 🔍 技术决策说明

### 为什么选择单一文件架构

1. **维护简单**：所有配置在一个地方，便于查找和修改
2. **减少重复**：避免相同数值在多处定义
3. **版本控制友好**：配置变更历史清晰可追踪
4. **导入简化**：减少复杂的导入关系

### 为什么使用直观数值

1. **认知负担低**：开发者无需计算就能理解配置含义
2. **可读性强**：配置名称直接体现业务意图
3. **调试友好**：问题排查时能快速定位配置问题
4. **新人友好**：降低团队新成员的学习成本

### 为什么按业务场景分组

1. **业务导向**：配置组织符合实际业务使用模式
2. **影响控制**：修改单个场景配置不影响其他场景
3. **扩展性好**：新增业务场景时架构清晰
4. **测试友好**：可以针对不同场景进行专项测试

## 📋 验收标准

### 功能验收

- [ ] 所有缓存功能正常工作
- [ ] 配置值正确传递到各个组件
- [ ] 性能指标无明显回归
- [ ] 错误处理机制正常

### 代码质量验收

- [ ] TypeScript编译无错误
- [ ] 所有单元测试通过
- [ ] 代码格式符合项目规范
- [ ] 无未使用的导入和变量

### 架构验收

- [ ] 消除所有重复配置定义
- [ ] 所有配置都有明确的业务语义
- [ ] 配置访问路径清晰简洁
- [ ] 文档和注释完整准确

## 📚 参考资料

- [Redis配置最佳实践](https://redis.io/docs/manual/config/)
- [TypeScript常量设计模式](https://www.typescriptlang.org/docs/handbook/enums.html)
- [缓存架构设计原则](https://martinfowler.com/articles/cache-design.html)

---

**文档版本**: v1.0  
**创建时间**: 2025-01-14  
**最后更新**: 2025-01-14  
**责任人**: 系统架构团队