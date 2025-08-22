# StreamCache 架构文档

## 概述

StreamCache 是专为实时流数据设计的高性能缓存系统，采用双层缓存架构，为股票流数据处理提供毫秒级的数据访问性能。

## 架构设计

### 双层缓存架构

```
┌─────────────────┐    未命中     ┌─────────────────┐    未命中     ┌─────────────────┐
│   Hot Cache     │  ─────────→   │   Warm Cache    │  ─────────→   │   Provider API  │
│   (内存 LRU)     │               │   (Redis)       │               │   (外部数据源)   │
│   TTL: 5秒      │               │   TTL: 300秒    │               │   延迟: 100ms+   │
│   延迟: ~1ms    │  ←─────────   │   延迟: ~10ms   │  ←─────────   │                │
└─────────────────┘    命中       └─────────────────┘    命中       └─────────────────┘
        ↑                                ↑
        └────────── 数据提升 ──────────────┘
```

### 核心组件

#### 1. StreamCacheService
- **职责**: 核心缓存逻辑实现
- **位置**: `src/core/05-caching/stream-cache/services/stream-cache.service.ts`
- **特性**:
  - 智能存储策略 (auto/hot/warm)
  - LRU淘汰算法
  - 数据压缩和序列化
  - 增量查询支持

#### 2. StreamCacheModule
- **职责**: 模块配置和依赖注入
- **位置**: `src/core/05-caching/stream-cache/module/stream-cache.module.ts`
- **提供**:
  - 独立Redis连接 (DB1)
  - 配置管理
  - 服务注册

#### 3. 接口定义
- **位置**: `src/core/05-caching/stream-cache/interfaces/stream-cache.interface.ts`
- **包含**:
  - `IStreamCache` - 核心缓存接口
  - `StreamDataPoint` - 流数据格式
  - `StreamCacheStats` - 统计信息

## 数据流程

### 1. 数据写入流程

```typescript
// 1. 智能存储策略判断
const shouldUseHotCache = priority === 'hot' || 
  (priority === 'auto' && dataSize < 10KB && itemCount < 100);

// 2. 数据压缩
const compressedData = this.compressData(rawData);

// 3. 双层存储
if (shouldUseHotCache) {
  this.setToHotCache(key, compressedData);  // 内存存储
}
await this.setToWarmCache(key, compressedData); // Redis存储 (备份)
```

### 2. 数据读取流程

```typescript
// 1. Hot Cache查找
const hotResult = this.getFromHotCache(key);
if (hotResult) {
  this.stats.hotCacheHits++;
  return hotResult; // ~1ms
}

// 2. Warm Cache查找
const warmResult = await this.getFromWarmCache(key);
if (warmResult) {
  this.stats.warmCacheHits++;
  this.setToHotCache(key, warmResult); // 提升到Hot Cache
  return warmResult; // ~10ms
}

// 3. 缓存未命中
return null; // 由上层处理API调用
```

## 配置系统

### 默认配置

```typescript
export const STREAM_CACHE_CONFIG = {
  TTL: {
    HOT_CACHE_MS: 5000,      // Hot Cache: 5秒
    WARM_CACHE_SECONDS: 300,  // Warm Cache: 5分钟
  },
  CAPACITY: {
    MAX_HOT_CACHE_SIZE: 1000,     // Hot Cache最大条目数
    MAX_BATCH_SIZE: 200,          // 批量操作限制
  },
  CLEANUP: {
    INTERVAL_MS: 30000,           // 清理间隔: 30秒
  },
  COMPRESSION: {
    THRESHOLD_BYTES: 1024,        // 压缩阈值: 1KB
  },
};
```

### 环境变量配置

```bash
# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_STREAM_CACHE_DB=1  # 专用DB

# StreamCache配置
STREAM_CACHE_HOT_TTL_MS=5000
STREAM_CACHE_WARM_TTL_SECONDS=300
STREAM_CACHE_MAX_HOT_SIZE=1000
STREAM_CACHE_CLEANUP_INTERVAL_MS=30000
STREAM_CACHE_COMPRESSION_THRESHOLD=1024
```

## 性能特性

### 缓存命中率目标

| 缓存层 | 目标命中率 | 延迟 | 用途 |
|--------|------------|------|------|
| Hot Cache | > 80% | ~1ms | 超高频访问数据 |
| Warm Cache | > 15% | ~10ms | 中频访问数据 |
| 总命中率 | > 95% | 混合 | 系统整体性能 |

### 性能优化策略

#### 1. 智能存储策略
```typescript
// 小数据优先Hot Cache
if (dataSize < 10KB && itemCount < 100) {
  useHotCache = true;
}

// 大数据仅存储到Warm Cache
if (dataSize > 100KB) {
  useHotCache = false;
}
```

#### 2. LRU淘汰算法
```typescript
// 基于访问次数和时间戳的LRU
if (entry.accessCount < lruAccessCount || 
    (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)) {
  // 淘汰该条目
}
```

#### 3. 数据压缩
```typescript
// 流数据专用压缩格式
interface StreamDataPoint {
  s: string;  // symbol (压缩字段名)
  p: number;  // price
  v: number;  // volume
  t: number;  // timestamp
  c?: number; // change (可选)
  cp?: number; // changePercent (可选)
}
```

## 与系统集成

### 模块依赖关系

```
StreamDataFetcherModule
├── StreamCacheModule (新)
│   ├── StreamCacheService
│   ├── Redis Client (独立连接)
│   └── 配置管理
├── StreamClientStateManager
├── StreamRecoveryWorkerService
└── 其他服务...
```

### 服务注入方式

```typescript
// StreamDataFetcherService中的使用
constructor(
  private readonly streamCache: StreamCacheService, // 新注入
  // ... 其他依赖
) {}

// 对外接口保持兼容
getStreamDataCache(): StreamCacheService {
  return this.streamCache;
}
```

## 监控和指标

### 关键指标

```typescript
interface StreamCacheStats {
  hotCacheHits: number;      // Hot Cache命中次数
  hotCacheMisses: number;    // Hot Cache未命中次数
  warmCacheHits: number;     // Warm Cache命中次数
  warmCacheMisses: number;   // Warm Cache未命中次数
  totalSize: number;         // Hot Cache当前大小
  compressionRatio: number;  // 数据压缩比
}
```

### 性能监控

```typescript
// 缓存命中率计算
const totalRequests = hotCacheHits + hotCacheMisses + warmCacheHits + warmCacheMisses;
const overallHitRate = (hotCacheHits + warmCacheHits) / totalRequests;

// 延迟监控
const avgHotCacheLatency = ~1; // ms
const avgWarmCacheLatency = ~10; // ms
```

## 最佳实践

### 1. 缓存键设计

```typescript
// 推荐的键命名规范
const cacheKey = `quote:${symbol}`;           // 报价数据
const cacheKey = `batch:${batchId}`;         // 批量数据  
const cacheKey = `realtime:${symbol}:${timestamp}`; // 实时数据
```

### 2. 优先级选择

```typescript
// 高频访问的小数据
await streamCache.setData(key, data, 'hot');

// 大批量数据
await streamCache.setData(key, data, 'warm');

// 让系统自动决策
await streamCache.setData(key, data, 'auto'); // 推荐
```

### 3. 增量查询使用

```typescript
// 获取最近5秒的数据变化
const incrementalData = await streamCache.getDataSince(
  'quote:AAPL.US', 
  Date.now() - 5000
);
```

### 4. 批量操作优化

```typescript
// 批量获取多个符号的数据
const batchResult = await streamCache.getBatchData([
  'quote:AAPL.US',
  'quote:TSLA.US', 
  'quote:MSFT.US'
]);
```

## 故障处理

### 容错设计

1. **Redis不可用时**:
   - Hot Cache继续工作
   - 新数据仅存储在内存
   - 自动重连机制

2. **内存不足时**:
   - LRU自动淘汰
   - Warm Cache作为备份
   - 优雅降级

3. **数据损坏时**:
   - 自动跳过损坏条目
   - 记录错误日志
   - 继续处理其他数据

### 监控告警

```typescript
// 关键指标告警阈值
const ALERT_THRESHOLDS = {
  hitRate: 0.90,           // 命中率低于90%
  latencyP99: 100,         // P99延迟超过100ms
  errorRate: 0.01,         // 错误率超过1%
  memoryUsage: 0.85,       // 内存使用率超过85%
};
```

## 升级和维护

### 版本兼容性

- **接口兼容**: `IStreamCache`接口保持向后兼容
- **配置兼容**: 新配置项提供默认值
- **数据兼容**: 支持多版本数据格式

### 运维操作

```bash
# 缓存状态检查
curl http://localhost:3000/api/v1/monitoring/stream-cache/stats

# 缓存清理
curl -X POST http://localhost:3000/api/v1/admin/stream-cache/clear

# 配置重载
curl -X POST http://localhost:3000/api/v1/admin/stream-cache/reload-config
```

---

**本文档描述了StreamCache的完整架构设计，为开发者提供实施和维护指南。**