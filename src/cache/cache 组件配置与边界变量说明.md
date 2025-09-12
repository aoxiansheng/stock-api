# Cache 组件配置与环境变量说明

## 概述

Cache模块是系统的核心缓存抽象层，基于Redis实现，提供智能缓存、分布式锁、容错机制等高级功能。本文档详细说明组件功能、配置项以及与环境变量的关系。

## 🎯 核心功能

### CacheService 主要功能

#### 1. 基础缓存操作
- `set<T>(key, value, options)` - 智能缓存设置，支持压缩与序列化
- `get<T>(key, deserializer)` - 智能缓存获取，自动解压与反序列化
- `getOrSet<T>(key, callback, options)` - 防缓存击穿的回调缓存
- `delete(key)` - 缓存删除
- `mget/mset` - 批量操作优化

#### 2. 高级数据结构操作
- **Redis Hash**: `hashGet/hashSet/hashGetAll`
- **Redis List**: `listPush/listTrim/listRange` 
- **Redis Set**: `setAdd/setIsMember/setMembers`

#### 3. 智能特性
- **分布式锁机制**: 防止缓存击穿，基于Redis NX命令
- **自动压缩**: Gzip压缩，可配置阈值
- **多序列化格式**: JSON/msgpack（msgpack待实现）
- **慢操作监控**: 超过阈值自动告警

#### 4. 容错机制
- **故障降级**: 非关键操作失败时返回默认值而非抛异常
- **事件驱动监控**: 实时发送缓存操作事件
- **健康检查**: 提供缓存统计与健康状态

## 📋 配置架构

### 内置常量配置

#### TTL配置（单位：秒）
```typescript
// 文件：src/cache/constants/config/simplified-ttl-config.constants.ts
export const TTL_VALUES = {
  // 实时数据
  STOCK_QUOTE: 5,        // 实时报价
  INDEX_QUOTE: 5,        // 指数报价
  
  // 系统运维
  LOCK_TTL: 30,          // 分布式锁
  METRICS: 300,          // 指标收集
  
  // 默认值
  DEFAULT: 3600,         // 通用默认：1小时
}
```

#### 限制配置
```typescript
// 文件：src/cache/constants/cache.constants.ts
export const CACHE_CONSTANTS = {
  SIZE_LIMITS: {
    MAX_KEY_LENGTH: 255,              // 最大键长度
    COMPRESSION_THRESHOLD_KB: 10,     // 压缩阈值：10KB
    MAX_BATCH_SIZE: 1000,            // 最大批量大小
  },
  MONITORING_CONFIG: {
    SLOW_OPERATION_MS: 100,          // 慢操作阈值：100ms
  },
  REDIS_CONFIG: {
    RETRY_DELAY_MS: 100,             // 重试延迟
  }
}
```

#### 缓存键前缀
```typescript
// 文件：src/cache/constants/config/cache-keys.constants.ts
export const CACHE_KEYS = {
  PREFIXES: {
    HEALTH: "cache:health:",
    METRICS: "cache:metrics:",
    LOCK: "cache:lock:",
    CONFIG: "cache:config:",
  }
}
```

### 运行时配置项

#### CacheConfigDto 可选参数
```typescript
// 文件：src/cache/dto/config/cache-config.dto.ts
export class CacheConfigDto {
  ttl?: number;                    // TTL时间（秒）
  maxSize?: number;               // 最大缓存大小（字节）
  enabled?: boolean;              // 缓存开关
  serializer?: SerializerType;    // 序列化类型：'json'|'msgpack'
  compressionThreshold?: number;  // 压缩阈值（字节）
}
```

## 🌐 环境变量配置

### Redis连接配置
```env
# Redis基础连接
REDIS_HOST=localhost        # Redis主机地址
REDIS_PORT=6379            # Redis端口
REDIS_PASSWORD=***         # Redis密码（可选）
REDIS_URL=redis://localhost:6379  # 完整Redis URL（备选）
```

### 全局缓存配置
```env
# 文件：src/appcore/config/app.config.ts
CACHE_DEFAULT_TTL=300              # 默认TTL（秒，默认300）
CACHE_MAX_ITEMS=10000             # 最大条目数（默认10000）
CACHE_COMPRESSION_THRESHOLD=1024  # 压缩阈值（字节，默认1024）
```

### 监控模块缓存配置
```env
# 文件：src/monitoring/config/monitoring.config.ts
MONITORING_CACHE_NAMESPACE=monitoring          # 监控缓存命名空间
MONITORING_COMPRESSION_THRESHOLD=1024         # 监控模块压缩阈值
MONITORING_TTL_HEALTH=300                     # 健康检查TTL
MONITORING_TTL_PERFORMANCE=180                # 性能监控TTL
MONITORING_TTL_CACHE_STATS=120               # 缓存统计TTL
MONITORING_TTL_TREND=600                     # 趋势分析TTL
MONITORING_TTL_ALERT=60                      # 告警信息TTL
```

### 特性开关配置
```env
# 文件：src/appcore/config/feature-flags.config.ts
SYMBOL_MAPPING_CACHE_ENABLED=true            # 符号映射缓存开关
DATA_TRANSFORM_CACHE_ENABLED=true            # 数据转换缓存开关

# Symbol Mapper 3层缓存配置
SYMBOL_CACHE_MAX_SIZE=2000                   # L2符号缓存最大条目
SYMBOL_CACHE_TTL=43200000                    # L2符号缓存TTL（12小时）
RULE_CACHE_MAX_SIZE=100                      # L1规则缓存最大条目
RULE_CACHE_TTL=86400000                      # L1规则缓存TTL（24小时）
BATCH_RESULT_CACHE_MAX_SIZE=1000            # L3批量结果缓存最大条目
BATCH_RESULT_CACHE_TTL=7200000              # L3批量结果缓存TTL（2小时）
```

### 查询超时配置
```env
# 文件：src/core/01-entry/query/config/query.config.ts
QUERY_MARKET_TIMEOUT=30000                   # 市场查询超时（ms）
QUERY_RECEIVER_TIMEOUT=10000                 # 接收器查询超时（ms）
SYMBOL_MAPPER_QUERY_TIMEOUT_MS=5000         # 符号映射查询超时（ms）
```

## ⚠️ 配置重复与冲突分析

### 存在的配置重复

#### 1. 压缩阈值重复
- `CACHE_COMPRESSION_THRESHOLD=1024` (app.config.ts:118)
- `MONITORING_COMPRESSION_THRESHOLD=1024` (monitoring.config.ts:44)  
- `COMPRESSION_THRESHOLD_KB: 10` (cache.constants.ts:86)

**冲突影响**: 不同模块使用不同的压缩阈值，可能导致行为不一致

#### 2. TTL配置重复
- `CACHE_DEFAULT_TTL=300` (环境变量，app.config.ts:115)
- `TTL_VALUES.DEFAULT: 3600` (cache常量，simplified-ttl-config.constants.ts:70)
- 各种监控TTL与缓存TTL功能重叠

**冲突影响**: 默认TTL值不一致（300秒 vs 3600秒），可能导致缓存行为混乱

#### 3. 缓存开关重复
- 全局缓存开关 vs 各模块独立开关
- 缺乏统一的缓存策略管理

### 独占配置项

#### CacheService 独占配置
- **分布式锁TTL**: `TTL_VALUES.LOCK_TTL = 30`
- **慢操作监控阈值**: `SLOW_OPERATION_MS = 100`
- **Redis重试延迟**: `RETRY_DELAY_MS = 100`

#### 各模块独占配置
- **Symbol Mapper**: 独立的3层LRU缓存配置
- **Monitoring**: 独立的namespace和TTL配置
- **Query/Receiver**: 独立的超时配置

## 📊 配置优先级与作用域

### 配置优先级（从高到低）
1. **运行时参数**: `CacheConfigDto` 传入的配置
2. **环境变量**: `process.env.*` 配置
3. **默认常量**: 代码中定义的默认值

### 配置作用域

#### 全局作用域
- Redis连接配置
- 全局缓存限制（TTL、压缩阈值）

#### 模块作用域
- 各模块的TTL配置
- 特定功能的开关配置

#### 操作作用域
- 单次缓存操作的配置重写

## 🔧 优化建议

### 1. 统一配置管理
```typescript
// 建议：创建统一的缓存配置中心
export const UNIFIED_CACHE_CONFIG = {
  compression: {
    threshold: process.env.CACHE_COMPRESSION_THRESHOLD || 1024,
    enabled: true
  },
  ttl: {
    default: process.env.CACHE_DEFAULT_TTL || 300,
    realtime: 5,
    static: 3600,
    lock: 30
  }
}
```

### 2. 分层配置策略
- **Global**: 系统级默认配置
- **Module**: 模块级配置覆盖
- **Operation**: 操作级配置覆盖

### 3. 配置验证
```typescript
// 建议：添加配置有效性检查
export function validateCacheConfig(config: CacheConfigDto): void {
  if (config.ttl && config.ttl <= 0) {
    throw new Error('TTL must be positive');
  }
  if (config.compressionThreshold && config.compressionThreshold < 0) {
    throw new Error('Compression threshold must be non-negative');
  }
}
```

### 4. 文档完善
需要明确定义：
- 各配置项的作用域与优先级
- 配置项之间的依赖关系
- 推荐的配置值与性能影响

## 📝 使用示例

### 基础使用
```typescript
// 使用默认配置
await cacheService.set('key', value);

// 自定义配置
await cacheService.set('key', value, {
  ttl: 600,
  compressionThreshold: 2048,
  serializer: 'json'
});
```

### 容错使用
```typescript
// 故障安全的非关键操作
const members = await cacheService.setMembers('key'); // 失败时返回[]
const allData = await cacheService.hashGetAll('key'); // 失败时返回{}
```

### 分布式锁使用
```typescript
// 防缓存击穿
const result = await cacheService.getOrSet('expensive-key', async () => {
  return await expensiveComputation();
}, { ttl: 3600 });
```

## 🚨 注意事项

1. **环境变量优先**: 生产环境中环境变量会覆盖代码中的默认值
2. **配置冲突**: 注意不同模块间的配置一致性
3. **性能影响**: 压缩阈值和TTL设置直接影响系统性能
4. **容错机制**: 理解哪些操作会抛异常，哪些会返回默认值

---

*最后更新: 2025-09-12*
*版本: 1.0*