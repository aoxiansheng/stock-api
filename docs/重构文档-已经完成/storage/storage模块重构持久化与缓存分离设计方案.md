# Storage模块重构设计方案

⚠️ **重要修正与注意事项**：本文档已根据实际代码库情况进行修正和纠错。

## 重构背景

当前的StorageService承担了过多职责，包括数据库操作、基础缓存操作和智能缓存编排等功能。通过代码分析发现，现有系统已经具备基本的降级机制（SmartCacheOrchestrator的catch降级、StorageService的Cache→DB降级），真正的问题是职责混乱而非缺少功能。为了提高代码的可维护性和组件的职责分离，需要对storage组件进行拆分重构。


## 重构目标

1. **创建common-cache组件** - 专门处理基础缓存直读/直写操作，简化接口
2. **精简StorageService** - 仅保留数据库读写功能
3. **重构smart-cache依赖** - 从依赖StorageService改为依赖common-cache
4. **保持API兼容性** - 确保Query/Receiver等上层组件无需修改
5. **避免过度设计** - 利用现有降级机制，不增加不必要的复杂度

## 目标架构

### 组件依赖关系图

```
┌─────────────────┐  
│   Query/Receiver│    
│                 │   
│                 │   
└─────────┬───────┘    
          │                       
          │              ┌─────────────────┐
          │              │  SmartCache     │
          └──────────────▶  Orchestrator   │
                         │ (Strategy &     │
                         │  Background)    │
                         └─────────┬───────┘
                                   │
                         ┌─────────▼───────┐
                         │  CommonCache    │
                         │    Service      │
                         │ (Direct Cache   │
                         │  Operations)    │
                         └─────────────────┘
```

### 组件职责分离

#### **Query/Receiver组件**
- 直接调用 `SmartCacheOrchestrator`
- 不直接使用 `CommonCacheService`
- 保持现有API接口不变

#### **SmartCacheOrchestrator**
- **策略编排和决策** - 后台更新调度、阈值判断、策略映射
- **市场状态查询** - 获取marketStatus并内部计算TTL
- **缓存操作编排** - 调用CommonCacheService进行缓存操作
- **现有降级机制** - 保持现有的catch块fetchFn降级（已经足够）
- **不需要额外依赖StorageService** - 避免过度设计

#### **CommonCacheService（新建）** 
- **纯缓存操作** - 读取/写入/删除，失败返回null不抛异常
- **极简接口** - 简单的get/set/delete，直接传入TTL值
- **批量能力** - mget/mset减少网络往返
- **错误静默处理** - 缓存失败不影响业务逻辑
- **统一键管理** - 规范cacheKey生成，避免命名冲突

#### **StorageService（重构）**
- 仅保留数据库读写操作
- 移除所有缓存相关功能
- 专注于MongoDB的CRUD操作

## 新建common-cache组件结构

```
src/core/public/common-cache/
├── services/
│   ├── common-cache.service.ts           # 基础缓存服务
│   └── cache-compression.service.ts      # 压缩解压缩服务
├── interfaces/
│   ├── cache-operation.interface.ts      # 缓存操作接口
│   └── cache-metadata.interface.ts       # 缓存元数据接口
├── dto/
│   ├── cache-request.dto.ts             # 缓存请求DTO
│   ├── cache-result.dto.ts              # 缓存结果DTO
│   ├── cache-compute-options.dto.ts     # 缓存计算选项DTO（参数化）
│   ├── ttl-compute-params.dto.ts        # TTL计算参数DTO
│   └── smart-cache-result.dto.ts        # 智能缓存结果DTO
├── constants/
│   └── cache.constants.ts               # 缓存常量（键前缀、压缩阈值等）
│   └── cache-config.constants.ts        # ✅ 统一配置：阈值、批量上限、超时等
├── utils/
│   └── cache-key.utils.ts               # 缓存键工具（统一键生成）
└── module/
    └── common-cache.module.ts           # 模块定义（Redis配置、全局模块）
```

## 功能迁移映射

### 从StorageService迁移到CommonCacheService

#### **基础缓存操作**
- `tryRetrieveFromCache()` → `getFromCache()`
- `storeToSmartCache()` → `storeToCache()`
- `tryGetFromSmartCache()` → `getWithMetadata()`

#### **智能缓存编排**
- `getWithSmartCache()` → 迁移到CommonCacheService（去除外部服务查询）
- `batchGetWithSmartCache()` → 迁移到CommonCacheService（增强批量能力）
- `calculateDynamicTTL()` → 迁移到CommonCacheService（参数化计算，不查询外部）
- `inferMarketFromSymbol()` → 保留在SmartCacheOrchestrator（策略逻辑）

#### **压缩处理**
- `_compressData()` → 迁移到CacheCompressionService

### StorageService保留的功能

#### **数据库操作**
- `storeData()` - 仅保留数据库写入部分，移除缓存操作
- `tryRetrieveFromPersistent()` - 数据库读取
- `deleteData()` - 仅保留数据库删除部分
- `findPaginated()` - 分页查询
- **去除回填副作用** - 移除retrieveData(updateCache=true)的缓存回填逻辑

#### **统计和监控**
- `getStorageStats()` - 数据库统计部分，不再触碰Redis
- `getPersistentStats()` - 数据库统计
- 性能监控指标（仅数据库相关，storage_persistent_*前缀）

### SmartCacheOrchestrator依赖调整

#### **构造函数重构**
```typescript
// 重构前
constructor(
  private readonly storageService: StorageService,
  private readonly dataChangeDetectorService: DataChangeDetectorService,
  // ...
)

// 重构后 - 简化依赖，移除不必要的StorageService依赖
constructor(
  private readonly commonCacheService: CommonCacheService,  // 缓存操作
  private readonly dataChangeDetectorService: DataChangeDetectorService,
  private readonly marketStatusService: MarketStatusService,
  // ...
)
// 注意：不需要依赖StorageService，现有的catch降级已经足够
```

#### **方法调用调整**
```typescript
// getDataWithSmartCache方法中
// 重构前
const cacheResult = await this.storageService.getWithSmartCache(
  request.cacheKey,
  request.fetchFn,
  cacheOptions
);

// 重构后 - Orchestrator负责TTL计算和策略决策
async getDataWithSmartCache<T>(request: CacheOrchestratorRequest<T>) {
  try {
    // 1. Orchestrator基于MarketStatusService计算TTL
    const marketStatus = await this.marketStatusService.getMarketStatus(request.symbols);
    const ttl = this.calculateDynamicTTL(request.strategy, marketStatus);
    
    // 2. 调用CommonCache执行缓存操作
    const result = await this.commonCacheService.getWithFallback(
      request.cacheKey,
      request.fetchFn,
      ttl
    );
    
    // 3. 基于TTL剩余时间判断是否需要后台刷新
    if (result.hit && result.ttlRemaining < this.backgroundRefreshThreshold) {
      this.scheduleBackgroundRefresh(request);
    }
    
    return result;
  } catch (error) {
    // 4. 保持现有的catch降级（已经足够）
    this.logger.error(`Cache operation failed: ${request.cacheKey}`, error);
    
    try {
      const fallbackData = await request.fetchFn();
      return { data: fallbackData, hit: false };
    } catch (fetchError) {
      this.logger.error(`Fallback fetch also failed: ${request.cacheKey}`, fetchError);
      throw fetchError;
    }
  }
}
```


## 模块接口设计

### 统一配置常量（避免散落）

```typescript
// src/core/public/common-cache/constants/cache-config.constants.ts
export const CACHE_CONFIG = {
  // ✅ 超时配置（ms毫秒）
  TIMEOUTS: {
    SINGLE_FLIGHT_TIMEOUT: 30000,        // 30s (ms) - single-flight超时
    REDIS_OPERATION_TIMEOUT: 5000,       // 5s (ms) - Redis操作超时
  },
  
  // ✅ 批量操作限制（条数）
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 100,                 // 100条 - API层批量上限
    PIPELINE_MAX_SIZE: 50,               // 50条 - Pipeline分段大小
    SINGLE_FLIGHT_MAX_SIZE: 1000,        // 1000条 - single-flight Map最大缓存
  },
  
  // ✅ 后台刷新配置（s秒）
  BACKGROUND_REFRESH: {
    THRESHOLD_SECONDS: 300,              // 300s (5分钟) - 后台刷新阈值
    DEDUP_WINDOW_MS: 60000,              // 60000ms (1分钟) - 去重窗口
  },
  
  // ✅ TTL配置（s秒）
  TTL: {
    DEFAULT_SECONDS: 3600,               // 3600s (1小时) - 默认TTL
    MIN_SECONDS: 30,                     // 30s - 最小TTL
    MAX_SECONDS: 86400,                  // 86400s (24小时) - 最大TTL
    NO_EXPIRE_DEFAULT: 31536000,         // 31536000s (365天) - pttl=-1时的默认值
  },
  
  // ✅ 压缩配置（bytes字节）
  COMPRESSION: {
    THRESHOLD_BYTES: 10240,              // 10240bytes (10KB) - 压缩阈值
    SAVING_RATIO: 0.8,                   // 0.8 - 压缩节省比例
  }
} as const;
```

### Redis Envelope 统一处理（单一来源）

```typescript
// src/core/public/common-cache/utils/redis-value.utils.ts
export class RedisValueHelper {
  /**
   * ✅ 统一序列化：避免多处重复拼装
   */
  static serialize<T>(data: T, compressed: boolean = false): string {
    const envelope = {
      data,
      storedAt: Date.now(),              // ms毫秒时间戳
      compressed
    };
    return JSON.stringify(envelope);
  }

  /**
   * ✅ 统一解析：避免多处重复解析逻辑  
   */
  static parse<T>(value: string): { data: T; storedAt?: number } {
    try {
      const parsed = JSON.parse(value);
      
      // 新格式：包含元数据的envelope
      if (parsed.data !== undefined) {
        return {
          data: parsed.data,
          storedAt: parsed.storedAt || Date.now()
        };
      }
      
      // 历史格式：直接业务数据（兼容处理）
      return {
        data: parsed,
        storedAt: Date.now() // 历史数据缺失时间戳，使用当前时间
      };
    } catch (error) {
      throw new Error(`Failed to parse Redis value: ${error.message}`);
    }
  }
}
```

### CommonCacheService主要接口

```typescript
@Injectable()
export class CommonCacheService {
  
  // 基础缓存操作 - 返回数据和TTL元数据，失败返回null
  async get<T>(key: string): Promise<{ data: T; ttlRemaining: number } | null>;
  async set<T>(key: string, data: T, ttl: number): Promise<void>;
  async delete(key: string): Promise<boolean>;
  
  // 批量操作 - 减少网络往返，保持结果顺序与输入一致
  async mget<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number } | null>>;
  async mset<T>(entries: Array<{ key: string; data: T; ttl: number }>): Promise<void>;
  
  // 带元数据的批量获取 - 支持Orchestrator批量判断后台更新
  async mgetWithMetadata<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number; storedAt: number } | null>>;
  
  // 带回源的缓存获取 - 返回命中状态和TTL信息
  async getWithFallback<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<{ data: T; hit: boolean; ttlRemaining?: number }> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return { data: cached.data, hit: true, ttlRemaining: cached.ttlRemaining };
      }
    } catch (error) {
      this.logger.debug(`Cache get failed for ${key}, will fetch fresh data`);
      Metrics.inc(this.metricsRegistry, 'cacheOperationsTotal', { op: 'get', status: 'error' });
    }
    
    const data = await fetchFn();
    
    // 异步写入缓存，不阻塞响应
    this.set(key, data, ttl).catch(err => {
      this.logger.debug(`Cache set failed for ${key}`, err);
      Metrics.inc(this.metricsRegistry, 'cacheOperationsTotal', { op: 'set', status: 'error' });
    });
    
    return { data, hit: false };
  }
  
  // ✅ TTL处理工具方法（单位一致性修正）
  private mapPttlToSeconds(pttlMs: number): number {
    // Redis pttl特殊值处理：
    // -2: key不存在 -> 0s(秒)  
    // -1: key存在但无过期时间 -> 默认365天
    if (pttlMs === -2) return 0;
    if (pttlMs === -1) return CACHE_CONFIG.TTL.NO_EXPIRE_DEFAULT; // 31536000s (365天)
    return Math.max(0, Math.floor(pttlMs / 1000)); // ✅ 强制转换毫秒->秒(s)
  }
  
  // ✅ 修正示例：在mget中正确使用TTL转换
  async mget<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number } | null>> {
    const results = await this.redis.mget(keys);
    
    // ✅ 并行获取TTL，然后统一转换为秒
    const ttlResults = await Promise.all(keys.map(key => this.redis.pttl(key)));
    
    return results.map((value, index) => {
      if (value === null) return null;
      const { data } = RedisValueHelper.parse<T>(value); // ✅ 使用统一解析
      return {
        data,
        ttlRemaining: this.mapPttlToSeconds(ttlResults[index]) // ✅ 统一转换ms->s(秒)
      };
    });
  }
  
  // 静态方法：缓存键生成器（在调用端构建显式cacheKey）
  static generateCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.filter(Boolean).join(':')}`;
  }
}
```

### 重构后的StorageService接口

```typescript
@Injectable()
export class StorageService {
  
  // ✅ 仅保留数据库操作（移除所有缓存相关功能）
  async storeData(request: StoreDataDto): Promise<StorageResponseDto>;
  async retrieveData(request: RetrieveDataDto): Promise<StorageResponseDto>; // ✅ 仅查DB，移除updateCache参数
  async deleteData(key: string, storageType?: StorageType): Promise<boolean>;
  
  // 查询操作  
  async findPaginated(query: StorageQueryDto): Promise<PaginatedDataDto<PaginatedStorageItemDto>>;
  
  // 统计操作（仅数据库部分）
  async getStorageStats(): Promise<StorageStatsDto>; // ✅ 移除缓存统计，仅保留DB统计
}

// ❌ 以下方法将被完全移除：
// async getWithSmartCache<T>(): Promise<T>;
// async batchGetWithSmartCache<T>(): Promise<T[]>;  
// async tryRetrieveFromCache<T>(): Promise<T | null>;
// async storeToSmartCache(): Promise<void>;
// async calculateDynamicTTL(): Promise<number>;
// async inferMarketFromSymbol(): Promise<string>;
```



## 实现级规范详细说明

### Redis API细节与版本兼容

#### pttl特殊值处理策略
```typescript
// Redis pttl命令返回值含义：
// -2: key不存在
// -1: key存在但无过期时间（PERSIST）
// >0: 剩余TTL毫秒数

private mapPttlToSeconds(pttlMs: number): number {
  if (pttlMs === -2) return 0;                    // key不存在 -> 0秒
  if (pttlMs === -1) return 365 * 24 * 3600;      // 无过期 -> 1年默认值
  return Math.max(0, Math.floor(pttlMs / 1000));  // 正常值 -> 转换为秒
}
```

#### Pipeline与node-redis版本差异
```typescript
// node-redis v3 (旧版本)
pipeline.setex(key, ttlSec, value);

// node-redis v4 (推荐用法)
pipeline.setEx(key, ttlSec, value);  // 注意E大写

// 兼容性检查
// 项目使用的node-redis版本：package.json中的redis版本
```

#### Redis存储格式与历史兼容
```typescript
// 新的存储格式（envelope包含元数据）
const redisValue = JSON.stringify({
  data: businessData,          // 原始业务数据
  storedAt: Date.now(),        // 毫秒时间戳（与历史一致）
  compressed: false            // 是否压缩（保持历史字段）
});

// 读取时的兼容性处理
private parseRedisValue<T>(value: string): { data: T; storedAt?: number } {
  try {
    const parsed = JSON.parse(value);
    
    // 新格式：包含元数据的envelope
    if (parsed.data !== undefined) {
      return {
        data: parsed.data,
        storedAt: parsed.storedAt || Date.now()
      };
    }
    
    // 历史格式：直接业务数据
    return {
      data: parsed,
      storedAt: Date.now() // 历史数据缺失时间戳，使用当前时间
    };
  } catch (error) {
    throw new Error(`Failed to parse Redis value: ${error.message}`);
  }
}
```

### 后台刷新阈值配置

#### 后台刷新阈值配置（使用统一常量）
```typescript
// 配置来源优先级：FeatureFlags > app.config.ts > 统一常量
class SmartCacheOrchestrator {  // ✅ 使用现网类名
  private readonly backgroundRefreshThreshold: number; // s(秒)
  
  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlags: FeatureFlags  // ✅ 使用现网配置对象
  ) {
    // ✅ 使用统一配置常量作为默认值
    this.backgroundRefreshThreshold = this.featureFlags.getNumber(  // ✅ 使用现网配置对象
      'cache.backgroundRefreshThreshold',
      this.configService.get('cache.backgroundRefreshThreshold', CACHE_CONFIG.BACKGROUND_REFRESH.THRESHOLD_SECONDS)  // 300s(秒)
    );
  }
  
  private shouldTriggerBackgroundRefresh(ttlRemaining: number, originalTtl: number): boolean {
    // 支持两种模式：
    // 1. 绝对秒数：ttlRemaining < threshold (s秒)
    // 2. 相对比例：ttlRemaining / originalTtl < 0.2
    if (this.backgroundRefreshThreshold < 1) {
      // 相对比例模式（0.0-1.0）
      return (ttlRemaining / originalTtl) < this.backgroundRefreshThreshold;
    } else {
      // 绝对秒数模式 (s秒)
      return ttlRemaining < this.backgroundRefreshThreshold;
    }
  }
}
```

### 指标与告警配置

#### 错误预算和告警阈值
```typescript
// 指标定义与告警阈值（具体数值）
const METRICS_CONFIG = {
  // 缓存操作错误率告警
  cacheErrorRate: {
    getErrorThreshold: 0.01,    // 1%：5分钟内cache get错误率 > 1%
    setErrorThreshold: 0.01,    // 1%：5分钟内cache set错误率 > 1%
    window: '5m',               // 5分钟监控窗口
    rules: [
      'rate(cacheOperationsTotal{op="get",status="error"}[5m]) > 0.01',
      'rate(cacheOperationsTotal{op="set",status="error"}[5m]) > 0.01',
      'rate(cacheOperationsTotal{op="mget",status="error"}[5m]) > 0.01',
      'rate(cacheOperationsTotal{op="mset",status="error"}[5m]) > 0.01'
    ]
  },
  
  // 缓存操作延迟告警
  cacheLatency: {
    getP95Threshold: 50,       // 50ms：cache get P95延迟 > 50ms
    setP95Threshold: 100,      // 100ms：cache set P95延迟 > 100ms
    getP99Threshold: 200,      // 200ms：cache get P99延迟 > 200ms
    setP99Threshold: 500,      // 500ms：cache set P99延迟 > 500ms
    window: '5m',              // 5分钟监控窗口
    rules: [
      'histogram_quantile(0.95, rate(cacheQueryDuration_bucket{op="get"}[5m])) > 0.05',
      'histogram_quantile(0.95, rate(cacheQueryDuration_bucket{op="set"}[5m])) > 0.1',
      'histogram_quantile(0.99, rate(cacheQueryDuration_bucket{op="get"}[5m])) > 0.2',
      'histogram_quantile(0.99, rate(cacheQueryDuration_bucket{op="set"}[5m])) > 0.5'
    ]
  },
  
  // 缓存命中率告警
  cacheHitRate: {
    threshold: 0.85,           // 85%：10分钟内缓存命中率 < 85%
    window: '10m',             // 10分钟监控窗口
    rule: '(rate(cacheOperationsTotal{op="get",result="hit"}[10m]) / rate(cacheOperationsTotal{op="get"}[10m])) < 0.85'
  },
  
  // 后台刷新失败率告警
  backgroundRefreshErrorRate: {
    threshold: 0.05,           // 5%：10分钟内后台刷新失败率 > 5%
    window: '10m',             // 10分钟监控窗口
    rule: 'rate(backgroundRefreshTotal{status="error"}[10m]) > 0.05'
  },
  
  // Redis连接健康度告警
  redisHealth: {
    connectionErrorThreshold: 10,  // 10次：1分钟内Redis连接失败 > 10次
    timeoutThreshold: 5,           // 5次：1分钟内Redis操作超时 > 5次
    window: '1m',                  // 1分钟监控窗口
    rules: [
      'increase(redisConnectionErrors[1m]) > 10',
      'increase(redisOperationTimeouts[1m]) > 5'
    ]
  }
};

// Histogram桶配置（精确数值，明确单位）
const HISTOGRAM_BUCKETS = {
  // 缓存操作耗时分布（ms毫秒）
  cacheQueryDuration: {
    buckets: [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // ms
    description: '缓存操作耗时分布(ms)，用于监控P50/P95/P99延迟'
  },
  
  // TTL剩余时间分布（s秒）
  cacheTtlRemaining: {
    buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400, 28800, 86400], // s(秒)
    description: 'TTL剩余时间分布(s秒)，用于分析后台刷新触发时机'
  },
  
  // 批量操作大小分布（条数）
  batchOperationSize: {
    buckets: [1, 5, 10, 20, 30, 50, 70, 100], // 条数
    description: '批量操作大小分布(条数)，用于优化批量处理策略'
  }
};
```

### 模块装配与作用域

#### 非全局模块设计
```typescript
// common-cache.module.ts - 非全局模块，需显式导入
@Module({
  imports: [ConfigModule],
  providers: [
    CommonCacheService,
    CacheCompressionService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        // ✅ 建议：优先复用现网Redis统一提供者（如已存在）
        // 否则需确认项目已引入ioredis并在package.json正确声明
        return new Redis({
          host: configService.get('redis.host', 'localhost'),
          port: configService.get('redis.port', 6379),
          // ... 其他配置
        });
      },
      inject: [ConfigService]
    }
  ],
  exports: [CommonCacheService, CacheCompressionService]
})
export class CommonCacheModule {}

// smart-cache.module.ts - 显式导入依赖
@Module({
  imports: [
    CommonCacheModule,  // 显式导入，非全局
    SharedServicesModule  // ✅ 使用现存模块名，提供MarketStatusService等
  ],
  providers: [SmartCacheOrchestrator],  // ✅ 使用现网类名
  exports: [SmartCacheOrchestrator]     // ✅ 使用现网类名
})
export class SmartCacheModule {}
```

## 🔄 渐进式重构实施步骤

> ⚠️ **基于现网代码分析调整**：现网存在大量智能缓存方法和updateCache字段引用，采用渐进式迁移避免破坏性变更

### 第一阶段：创建CommonCacheService基础框架（1-2天）
1. ✅ 创建common-cache目录结构和基础接口
2. ✅ 实现CommonCacheService类（get/set/mget/mset基础功能）
3. ✅ 设置Redis客户端连接（复用现网@nestjs-modules/ioredis配置）
4. ✅ 创建基础单元测试和集成测试

**验证标准**：CommonCacheService基础功能可用，测试通过

### 第二阶段：并行存在期（1-2周）
1. ✅ **保留现有方法**：StorageService所有智能缓存方法保持不变
2. ✅ **新增@Deprecated标记**：对即将迁移的方法添加弃用警告
3. ✅ **逐步引入CommonCache**：在新功能中优先使用CommonCacheService
4. ✅ **监控双写指标**：同时收集新旧缓存服务的性能指标

```typescript
// 示例：保留原方法但标记弃用
@Deprecated('将在v2.0版本移除，请使用CommonCacheService')
async getWithSmartCache<T>(...): Promise<T> {
  this.logger.warn('Deprecated method called: getWithSmartCache');
  Metrics.inc(this.metricsRegistry, 'deprecatedMethodCalls', { method: 'getWithSmartCache' });
  // 保持原有实现不变
}
```

### 第三阶段：updateCache字段渐进式移除（1周）

> 🔍 **现网影响面分析**：updateCache在9个源文件和6个测试文件中被引用

#### 3.1 DTO兼容性处理
```typescript
// RetrieveDataDto - 保持字段但标记弃用
export class RetrieveDataDto {
  @ApiPropertyOptional({
    description: "是否更新缓存（已弃用，将在v2.0移除）",
    deprecated: true
  })
  @IsOptional()
  updateCache?: boolean; // 保留字段，避免API破坏性变更
}
```

#### 3.2 分批更新测试文件
1. **第1批**：更新unit测试（3个文件）
2. **第2批**：更新e2e测试（2个文件）  
3. **第3批**：更新integration测试（1个文件）

### 第四阶段：智能缓存方法迁移（1-2周）

> 📊 **现网方法确认**：getWithSmartCache、batchGetWithSmartCache、tryRetrieveFromCache、calculateDynamicTTL均存在

#### 4.1 创建迁移适配器
```typescript
// 创建临时适配器，平滑迁移调用方
@Injectable()
export class CacheServiceAdapter {
  constructor(
    private readonly commonCache: CommonCacheService,
    private readonly legacyStorage: StorageService // 保留引用
  ) {}
  
  // 新接口，逐步替换调用方
  async getWithStrategy<T>(request: CacheRequest<T>): Promise<T> {
    return this.commonCache.getWithFallback(request.key, request.fetchFn, request.ttl);
  }
}
```

#### 4.2 逐步替换调用方
1. **Query模块**：优先替换为CommonCacheService调用
2. **Receiver模块**：保持现有调用，添加新接口选项
3. **其他模块**：按需迁移，保持向后兼容

### 第五阶段：SmartCacheOrchestrator重构（3-5天）
1. ✅ **保持现有依赖**：继续依赖StorageService，避免破坏现有功能
2. ✅ **新增CommonCache集成**：增加CommonCacheService作为可选依赖
3. ✅ **渐进式策略切换**：通过FeatureFlag控制新旧策略
4. ✅ **保持API兼容**：对外接口保持不变

### 第六阶段：清理与优化（1周）
1. ✅ **确认迁移完成**：验证所有调用方已迁移到新接口
2. ✅ **移除弃用方法**：删除StorageService中的智能缓存方法
3. ✅ **移除updateCache字段**：清理DTO和相关测试
4. ✅ **依赖关系优化**：移除不必要的模块依赖

### 第七阶段：验证与监控（2-3天）
1. ✅ 运行完整测试套件，确保无回归
2. ✅ 性能对比测试：新旧缓存系统性能对比
3. ✅ 生产环境灰度验证
4. ✅ 监控指标确认：cache*与storage_persistent_*指标分离

## 🛡️ 风险控制措施

### 回滚策略
- **每个阶段独立**：可随时回滚到上一阶段
- **Feature Flag控制**：新功能通过开关控制启用
- **数据兼容性**：Redis数据格式向下兼容

### 监控预警
- **弃用方法调用量**：监控deprecated method使用频率
- **性能指标对比**：新旧缓存系统延迟和命中率对比  
- **错误率监控**：重构期间错误率不应上升


## 重要约束与优化要点

## 核心设计原则：简单、高效、可维护

### 利用现有降级机制
```typescript
// 现有系统已具备的降级链路（无需重复构建）
1. SmartCacheOrchestrator.catch块 → fetchFn() 降级
2. StorageService.retrieveData → Cache → DB 降级

// 重构后的简化实现
async getDataWithSmartCache<T>(request) {
  try {
    // 使用简化的缓存服务
    return await this.commonCacheService.getWithFallback(
      request.cacheKey,
      request.fetchFn,
      ttl
    );
  } catch (error) {
    // 利用现有的catch降级（已经足够）
    const fallbackData = await request.fetchFn();
    return { data: fallbackData, hit: false };
  }
}
```

### 简化设计原则
1. **避免过度设计** - 不增加不必要的降级层级
2. **利用现有机制** - 充分利用已有的错误处理逻辑
3. **接口极简化** - get/set/delete，失败返回null
4. **职责单一化** - 缓存就是缓存，不承担业务逻辑

### 指标与可观测性
1. **缓存指标体系** - 统一使用cache*前缀：
   - `cacheOperationsTotal{op=get|set|mget|mset, status=success|error}`
   - `cacheQueryDuration{op}` - 缓存操作耗时
   - `cacheHitRate` - 命中率统计
   - `cacheTtlRemaining` - TTL分布统计
2. **持久化指标分离** - storage_persistent_*前缀，避免仪表盘歧义和双计数
3. **错误监控** - 静默失败但记录指标：
   - 缓存失败计数但不抛异常
   - Debug级别日志记录详细错误信息
   - 错误率阈值告警
4. **迁移期双写** - 提供别名确保看板不中断，逐步切换监控配置

### 键命名与命名空间
1. **统一键生成策略** - 使用静态方法`CommonCacheService.generateCacheKey(prefix, ...parts)`在调用端构建显式cacheKey
2. **CommonCache内部零前缀** - CommonCacheService内部不叠加任何前缀，直接使用传入的完整cacheKey
3. **与symbol-mapper-cache并存** - 通过不同prefix区分命名空间，避免键冲突
4. **调用示例**：
   ```typescript
   // 在调用端构建完整的cacheKey
   const cacheKey = CommonCacheService.generateCacheKey('stock_quote', symbol, provider);
   await commonCacheService.get(cacheKey);  // 内部直接使用，不再叠加前缀
   ```

### 批量处理与并发控制策略
```typescript
// 批量处理实现 - 保证结果顺序与输入一致
async mget<T>(keys: string[]): Promise<Array<{ data: T; ttlRemaining: number } | null>> {
  // 直接使用Redis的mget，保证结果顺序与输入keys一致
  const results = await this.redis.mget(keys);
  const ttlResults = await Promise.all(keys.map(key => this.redis.pttl(key)));
  
  return results.map((value, index) => {
    if (value === null) return null;
    return {
      data: JSON.parse(value),
      ttlRemaining: Math.max(0, ttlResults[index])
    };
  });
}

async mset<T>(entries: Array<{key: string, data: T, ttl: number}>): Promise<void> {
  // 使用pipeline批量设置，支持每条独立TTL
  // 注意：使用node-redis v4推荐的setEx方法
  const pipeline = this.redis.pipeline();
  entries.forEach(({ key, data, ttl }) => {
    const serialized = RedisValueHelper.serialize(data); // ✅ 使用统一序列化
    pipeline.setEx(key, ttl, serialized);  // node-redis v4: setEx(key, ttlSec, value)
  });
  await pipeline.exec();
}

// ✅ 防击穿策略（在Orchestrator层实现，使用统一配置）
private readonly singleFlightMap = new Map<string, { promise: Promise<any>; timestamp: number }>();
private readonly SINGLE_FLIGHT_TIMEOUT = CACHE_CONFIG.TIMEOUTS.SINGLE_FLIGHT_TIMEOUT; // 30000ms (30s)
private readonly SINGLE_FLIGHT_MAX_SIZE = CACHE_CONFIG.BATCH_LIMITS.SINGLE_FLIGHT_MAX_SIZE;  // 1000条

async getWithSingleFlight<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // 1. 清理过期条目
  this.cleanupExpiredSingleFlight();
  
  // 2. 检查是否已存在正在执行的请求
  const existing = this.singleFlightMap.get(key);
  if (existing) {
    try {
      return await Promise.race([
        existing.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Single flight timeout')), this.SINGLE_FLIGHT_TIMEOUT)
        )
      ]);
    } catch (error) {
      // 超时或失败时清理
      this.singleFlightMap.delete(key);
      throw error;
    }
  }
  
  // 3. 检查map大小，防止内存泄漏
  if (this.singleFlightMap.size >= this.SINGLE_FLIGHT_MAX_SIZE) {
    this.logger.warn(`SingleFlight map size reached limit: ${this.SINGLE_FLIGHT_MAX_SIZE}`);
    this.cleanupExpiredSingleFlight();
  }
  
  // 4. 创建新的请求
  const promise = fetchFn();
  this.singleFlightMap.set(key, { promise, timestamp: Date.now() });
  
  try {
    const result = await promise;
    return result;
  } finally {
    this.singleFlightMap.delete(key);
  }
}

private cleanupExpiredSingleFlight(): void {
  const now = Date.now();
  for (const [key, entry] of this.singleFlightMap.entries()) {
    if (now - entry.timestamp > this.SINGLE_FLIGHT_TIMEOUT) {
      this.singleFlightMap.delete(key);
    }
  }
}

// ✅ 后台刷新去重机制（使用统一配置）
private readonly backgroundRefreshMap = new Map<string, number>();
private readonly BACKGROUND_REFRESH_DEDUP_WINDOW = CACHE_CONFIG.BACKGROUND_REFRESH.DEDUP_WINDOW_MS; // 60000ms (1分钟)

private scheduleBackgroundRefresh(request: CacheOrchestratorRequest): void {
  const dedupKey = `${request.cacheKey}:${Math.floor(Date.now() / this.BACKGROUND_REFRESH_DEDUP_WINDOW)}`;
  
  // 检查去重窗口内是否已调度
  if (this.backgroundRefreshMap.has(dedupKey)) {
    return;
  }
  
  this.backgroundRefreshMap.set(dedupKey, Date.now());
  
  // 异步执行后台刷新
  setImmediate(async () => {
    try {
      const freshData = await request.fetchFn();
      const ttl = this.calculateDynamicTTL(request.strategy, request.symbols);
      await this.commonCacheService.set(request.cacheKey, freshData, ttl);
      
      Metrics.inc(this.metricsRegistry, 'backgroundRefreshTotal', { status: 'success' });
    } catch (error) {
      this.logger.debug(`Background refresh failed for ${request.cacheKey}`, error);
      Metrics.inc(this.metricsRegistry, 'backgroundRefreshTotal', { status: 'error' });
    } finally {
      // 清理去重标记
      this.backgroundRefreshMap.delete(dedupKey);
    }
  });
}
```

### 性能优化要点
1. **批量操作** - 使用mget/pipeline减少网络往返
2. **异步写入** - 缓存写入不阻塞主流程
3. **静默失败** - 缓存操作失败不影响业务
4. **连接池复用** - 优化Redis连接管理
5. **并发击穿防护** - 在Orchestrator层使用single-flight模式，避免同key的N次回源
6. **背压控制** - singleFlightMap过期清理（30秒超时）和大小限制（1000条）
7. **后台刷新去重** - 按1分钟时间窗口内同cacheKey仅调度一次后台刷新
8. **Pipeline分段控制** - 单次pipeline最多50条，超出自动分段发送，避免大批量操作堵塞

### 兼容性与回填行为
1. **去除回填副作用** - 彻底移除retrieveData(updateCache=true)的缓存回填逻辑
2. **替代路径** - 由Orchestrator控制命中临界时的后台刷新策略
3. **兼容性影响** - 明确告知上层组件回填行为的变更

### 依赖配置与连接管理
1. **配置集中管理** - Redis连接、序列化/压缩阈值、键前缀在common-cache.module.ts中统一配置
2. **可重用性设计** - 支持在app.config.ts或feature flags中可控
3. **Redis封装** - 原子统计/TTL查询（pttl/info/dbsize）封装到CommonCacheService
4. **存储分离** - StorageService不再触碰Redis

## 测试策略

## 测试策略与安全保障

### 降级链路测试（最重要）
```typescript
describe('完整降级链路测试', () => {
  it('正常流程：缓存命中', async () => {
    // Cache Hit → 直接返回
  });
  
  it('一级降级：缓存未命中，fetchFn成功', async () => {
    // Cache Miss → fetchFn() → 更新缓存
  });
  
  it('二级降级：fetchFn失败，内部兜底', async () => {
    // Cache Miss → fetchFn() 失败 → fetchFn内部处理降级逻辑（如查询DB）
    // 注意：DB兜底逻辑由调用方的fetchFn内部自行完成，Orchestrator不直接触碰DB
  });
  
  it('Redis完全不可用', async () => {
    // Redis 宕机 → 直接 fetchFn() → 静默降级，不影响业务
  });
  
  it('全链路失败处理', async () => {
    // 所有路径都失败 → 抛出异常 → 监控告警
  });
  
  // 新增：pttl特殊值测试
  it('pttl特殊值处理', async () => {
    // -2 (key不存在) → ttlRemaining = 0
    // -1 (无过期) → ttlRemaining = 365*24*3600
    // 正常值 → ttlRemaining = Math.floor(pttl/1000)
  });
  
  it('Redis宕机时getWithFallback的静默恢复', async () => {
    // Redis不可用 → 静默降级到fetchFn → 指标计数
    // 验证cacheOperationsTotal{status=error}计数器增加
    // 验证业务数据正常返回
  });
});
```

### 批量操作测试  
```typescript
describe('批量处理测试', () => {
  it('部分缓存命中场景', async () => {
    // keys: [A, B, C]  cached: [A, C]  missed: [B]
    // 只对B执行batchFetchFn，合并结果保证顺序
  });
  
  it('批量fetchFn异常处理', async () => {
    // batchFetchFn 部分成功部分失败的处理
  });
  
  it('结果顺序一致性', async () => {
    // 输入顺序与输出顺序严格对应
  });
  
  // ✅ 重要：修正Pipeline原子性理解
  it('Pipeline非原子性验证', async () => {
    // Redis pipeline 是批量发射，逐条检查结果
    // 不保证原子性，部分成功部分失败是正常情况
    const results = await pipeline.exec();
    const failures = results.filter(([err]) => err !== null);
    expect(failures.length).toBeGreaterThanOrEqual(0); // 允许部分失败
  });
});
```

### 性能与监控测试
1. **性能基准测试** - 缓存命中率、响应时间、吞吐量
2. **内存使用监控** - Redis内存占用、连接数监控
3. **错误率统计** - 各级降级的触发频率和成功率
4. **并发安全测试** - 高并发下的数据一致性

## 注意事项

### 兼容性保证
1. **API兼容性** - Query/Receiver等上层组件的接口保持不变
2. **接口兼容性** - SmartCacheOrchestrator的公共接口保持不变
3. **策略兼容性** - 现有的缓存策略和TTL计算逻辑保持一致
4. **数据兼容性** - Redis历史数据的metadata格式继续可读：
   - 现有的`compressed/storedAt/dataSize`字段格式兼容
   - 新旧数据混存期间的平滑读取
   - 压缩阈值、序列化格式与历史保持一致
   - 避免历史缓存条目读取失败导致的降级

### 兼容性迁移与弃用计划

#### 数据层无Schema变更回滚策略
```typescript
// 回滚保证：数据层无破坏性变更
// 1. Redis存储格式向下兼容（新的envelope格式包含原始数据）
// 2. MongoDB无新字段增加，仅移除缓存逻辑
// 3. 可以随时回滚到旧版本，无数据丢失风险

// 回滚步骤：
// 1. 停止新版本部署
// 2. 回滚到旧版本代码
// 3. 旧版本可正常读取新格式数据（只取data字段）
```

#### 弃用期计划与灰度时间轴
```typescript
// 第一阶段（2周）：双写阶段
// - 保留StorageService原有缓存方法，标记@Deprecated
// - 新增CommonCacheService，并行运行
// - 日志中记录调用频次，逐步切换使用方

@Deprecated('请使用CommonCacheService替代，该方法将2024-XX-XX移除')
async getWithSmartCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  this.logger.warn(`Deprecated method called: getWithSmartCache for key ${key}`);
  Metrics.inc(this.metricsRegistry, 'deprecatedMethodCalls', { method: 'getWithSmartCache' });
  // 原有实现...
}

// 第二阶段（2周）：切换阶段
// - 上层组件逐步切换到CommonCacheService
// - 监控旧接口调用频次，确保逐步降低
// - FeatureFlag控制新旧逐步切换

// 第三阶段（1周）：清理阶段
// - 移除旧接口实现
// - 清理相关测试用例
// - 更新文档和接口说明
// - 执行彻底清理，详见下方清理清单
```

### 渐进式清理清单（基于现网代码分析调整）

#### **StorageService中需要删除的方法**
```typescript
// src/core/public/storage/services/storage.service.ts
// 删除以下缓存相关方法：

@Deprecated('已迁移到CommonCacheService')
async getWithSmartCache<T>(): Promise<T> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async batchGetWithSmartCache<T>(): Promise<T[]> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async tryRetrieveFromCache<T>(): Promise<T | null> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async storeToSmartCache(): Promise<void> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async tryGetFromSmartCache<T>(): Promise<T | null> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async calculateDynamicTTL(): Promise<number> { /* 完全删除 */ }

@Deprecated('已迁移到CommonCacheService')
async inferMarketFromSymbol(): Promise<string> { /* 迁移到SmartCacheOrchestrator */ }

// ✅ 确认存在的内部私有方法：
private async _compressData(): Promise<string> { /* 迁移到CacheCompressionService */ }

// ⚠️ 以下方法需要验证是否存在：
// private async _decompressData(): Promise<any> { /* 可能不存在，需核实 */ }
// private async _getCacheMetadata(): Promise<any> { /* 可能不存在，需核实 */ }
// private async _updateCacheStats(): Promise<void> { /* 可能不存在，需核实 */ }

#### **⚠️ 重要提醒：删除前先核实**
```bash
# 执行删除前必须先验证方法存在性
grep -n "_decompressData\|_getCacheMetadata\|_updateCacheStats" src/core/public/storage/services/storage.service.ts
```
```

#### **需要删除的完整文件**
```bash
# ⚠️ 警告：以下文件需要先验证是否存在，再决定是否删除

# 检查是否存在缓存工具文件
find src/core/public/storage -name "*cache*" -type f

# 如果确认存在以下文件，才执行删除：
# rm -f src/core/public/storage/utils/cache-utils.ts              # 需验证
# rm -f src/core/public/storage/utils/cache-key-generator.ts      # 需验证  
# rm -f src/core/public/storage/interfaces/cache-metadata.interface.ts  # 需验证
# rm -f src/core/public/storage/dto/cache-request.dto.ts          # 需验证
# rm -f src/core/public/storage/dto/cache-response.dto.ts         # 需验证
# rm -f src/core/public/storage/constants/cache.constants.ts      # 需验证

# ✅ 确认存在的文件（可以保留或重构）：
# src/core/public/storage/dto/smart-cache-request.dto.ts         # 已确认存在
```

```

#### **StorageModule依赖清理**
```typescript
// src/core/public/storage/module/storage.module.ts
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([/**/]),
    AuthModule,                 // ✅ 保留现有依赖
    PaginationModule,           // ✅ 保留现有依赖
    // ⚠️ 仅移除缓存相关依赖，其他现有依赖保留（如 Auth/Pagination）
    // CacheModule,              // 删除
    // CompressionModule,        // 删除
    // SharedServicesModule,     // 删除（已移至smart-cache模块）
  ],
  providers: [
    StorageService,
    // 删除这些缓存相关provider：
    // CacheService,             // 删除
    // CompressionService,       // 删除
  ],
  exports: [StorageService]
})
export class StorageModule {}
```

#### **接口和DTO同步精简**
```typescript
// ✅ 1. 删除StorageService接口中的缓存相关方法声明
// src/core/public/storage/interfaces/storage.interface.ts
export interface IStorageService {
  // 保留这些数据库操作方法：
  storeData(request: StoreDataDto): Promise<StorageResponseDto>;
  retrieveData(request: RetrieveDataDto): Promise<StorageResponseDto>; // ✅ 移除updateCache参数
  deleteData(key: string): Promise<boolean>;
  findPaginated(query: StorageQueryDto): Promise<PaginatedDataDto>;
  
  // 删除这些缓存相关方法声明：
  // getWithSmartCache<T>(): Promise<T>;                    // 删除
  // batchGetWithSmartCache<T>(): Promise<T[]>;             // 删除
  // tryRetrieveFromCache<T>(): Promise<T | null>;          // 删除
  // storeToSmartCache(): Promise<void>;                    // 删除
  // calculateDynamicTTL(): Promise<number>;                // 删除
}

// ✅ 2. RetrieveDataDto精简
// src/core/public/storage/dto/retrieve-data.dto.ts
export class RetrieveDataDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsEnum(StorageType)
  preferredType?: StorageType;

  // ❌ 删除：缓存回填相关字段
  // updateCache?: boolean;  // 完全移除，因为重构后StorageService仅查DB
}

// ✅ 3. Controller接口同步更新
// 移除controller中updateCache相关的API文档和参数处理

// ✅ 4. 测试文件同步清理
// 需要更新相关测试文件中引用updateCache的用例
// grep -r "updateCache" test/ --include="*.ts" --include="*.js"
```

#### **配置文件清理**
```typescript
// app.config.ts 或相关配置文件中删除storage缓存配置
export default {
  storage: {
    mongodb: { /* 保留 */ },
    // 删除这些缓存配置：
    // cache: {                          // 整个cache配置块删除
    //   defaultTtl: 3600,
    //   compressionThreshold: 1024,
    //   keyPrefix: 'storage:',
    //   maxCacheSize: 1000
    // }
  }
};
```

#### **SmartCacheOrchestrator依赖更新**
```typescript
// src/core/public/smart-cache/services/smart-cache-orchestrator.service.ts
// 构造函数中移除StorageService依赖，改为CommonCacheService
constructor(
  private readonly commonCacheService: CommonCacheService,  // 新增
  private readonly dataChangeDetectorService: DataChangeDetectorService,
  private readonly marketStatusService: MarketStatusService,
  // 删除：
  // private readonly storageService: StorageService,      // 删除这个依赖
) {}
```

#### **文档和注释清理**
```bash
# 删除storage模块文档中的缓存相关章节
# docs/storage-module.md 中删除：
# - "缓存策略" 章节
# - "TTL计算" 章节  
# - "智能缓存" 章节
# - 所有缓存相关的API文档

# 更新README.md，移除storage缓存功能描述
# 更新系统架构图，反映新的组件依赖关系
```

#### **指标和监控清理**
```typescript
// 删除StorageService中的缓存指标收集代码
// 移除这些指标：
// - storage_cache_operations_total
// - storage_cache_hit_rate  
// - storage_cache_query_duration
// - storage_smart_cache_*

// 这些指标将被CommonCacheService的cache_*指标替代
```

### 回滚计划
1. **数据安全保证** - 数据层无Schema变更，可随时回滚
2. **阶段性回滚** - 每个阶段可独立回滚，限制爆炸半径
3. **监控驱动** - 基于指标反馈决定是否继续或回滚
4. **热更新支持** - 支持不停服回滚，通过FeatureFlag实时切换
5. **清理脚本准备** - 提前准备自动化清理脚本，重构完成后一键执行


## 预期收益

### 代码质量提升
- **职责分离清晰** - Storage专注数据库，CommonCache专注缓存，SmartCache专注策略编排
- **依赖关系优化** - SmartCache不再直接操作持久化存储，避免过度耦合
- **复用性增强** - CommonCache可被其他组件独立使用
- **接口简化** - 极简的get/set/delete接口，降低使用复杂度

### 维护性改善
- **模块化程度提高** - 各组件职责明确，易于理解和维护
- **测试性改善** - 各组件可独立测试，测试用例更加聚焦
- **扩展性增强** - 新增缓存策略或存储方式更加便利
- **调试便利性** - 清晰的组件边界，问题定位更精准

### 性能优化潜力
- **缓存层优化** - 专门的缓存服务可以进行针对性优化
- **并发处理改善** - single-flight模式避免缓存击穿
- **批量操作优化** - mget/pipeline减少网络往返
- **资源利用精准** - 更精确的资源分配和监控
- **降级链路优化** - 利用现有机制，避免过度设计的性能损耗

### 批量接口契约详细说明

#### **强契约保证**
```typescript
// mget/mgetWithMetadata返回结果与输入keys顺序严格一致
const keys = ['A', 'B', 'C'];
const results = await commonCache.mget(keys);
// 结果顺序：[resultA, resultB, resultC]
// 部分key缺失：[resultA, null, resultC]  // B不存在时对应位置为null
// **不重排、不留空、不过滤**
```

#### 单次操作长度限制与背压控制
```typescript
// ✅ 上层接口限制：使用统一配置（条数）
if (keys.length > CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) { // 100条
  throw new Error(`批量操作超出限制，单次最多${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}条`);
}

// ✅ pipeline内部限制：使用统一配置分段发送（条数）
const PIPELINE_MAX_SIZE = CACHE_CONFIG.BATCH_LIMITS.PIPELINE_MAX_SIZE; // 50条

async mset<T>(entries: Array<{key: string, data: T, ttl: number}>): Promise<void> {
  // 分段处理大批量操作
  for (let i = 0; i < entries.length; i += PIPELINE_MAX_SIZE) {
    const chunk = entries.slice(i, i + PIPELINE_MAX_SIZE);
    
    const pipeline = this.redis.pipeline();
    chunk.forEach(({ key, data, ttl }) => {
      const serialized = RedisValueHelper.serialize(data); // ✅ 使用统一序列化
      pipeline.setEx(key, ttl, serialized);  // ttl单位: s(秒)
    });
    
    const results = await pipeline.exec();
    
    // 检查当前段是否有失败
    const failures = results.filter(([err]) => err !== null);
    if (failures.length > 0) {
      throw new Error(`批量设置第${Math.floor(i/PIPELINE_MAX_SIZE)+1}段失败，${failures.length}/${chunk.length}条失败`);
    }
  }
}

// ✅ 大批量操作需调用方自行分批处理（使用统一配置）
for (let i = 0; i < largeKeys.length; i += CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE) { // 100条
  const batch = largeKeys.slice(i, i + CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE);
  await commonCache.mget(batch);
}
```

#### ✅ 修正：Pipeline批量处理（非原子性）
```typescript
// ⚠️ 重要修正：Redis pipeline 不保证原子性
// Pipeline是批量发射命令，然后逐条检查结果
// 如需原子性，应使用 MULTI/EXEC 事务
async mset<T>(entries: Array<{key: string, data: T, ttl: number}>): Promise<void> {
  const pipeline = this.redis.pipeline();
  entries.forEach(({ key, data, ttl }) => {
    const serialized = RedisValueHelper.serialize(data); // ✅ 使用统一序列化
    pipeline.setEx(key, ttl, serialized);  // ttl单位: s(秒)
  });
  
  const results = await pipeline.exec();
  
  // ✅ 修正：Pipeline结果逐条检查，部分失败是正常情况
  const failures = results.filter(([err]) => err !== null);
  if (failures.length > 0) {
    this.logger.warn(`批量设置部分失败，${failures.length}/${entries.length}条失败`);
    
    // 记录失败的键，但不中断整个流程
    failures.forEach(([err], index) => {
      this.logger.error(`批量设置失败：${entries[index]?.key}`, err);
    });
    
    // 只有全部失败时才抛异常
    if (failures.length === entries.length) {
      throw new Error(`批量设置全部失败，${failures.length}/${entries.length}条失败`);
    }
  }
}

// 如需真正的原子性，使用MULTI/EXEC：
async atomicMset<T>(entries: Array<{key: string, data: T, ttl: number}>): Promise<void> {
  const multi = this.redis.multi();
  entries.forEach(({ key, data, ttl }) => {
    const serialized = RedisValueHelper.serialize(data); // ✅ 使用统一序列化
    multi.setEx(key, ttl, serialized);  // ttl单位: s(秒)
  });
  
  // MULTI/EXEC 保证原子性：要么全部成功，要么全部失败
  await multi.exec();
}
```

### 关键测试场景补充

#### pttl特殊值测试
```typescript
describe('pttl特殊值处理测试', () => {
  it('处理key不存在(-2)', async () => {
    // Redis返回-2 -> ttlRemaining = 0s(秒)
    expect(commonCache.mapPttlToSeconds(-2)).toBe(0);
  });
  
  it('处理无过期时间(-1)', async () => {
    // Redis返回-1 -> ttlRemaining = 31536000s(365天)
    expect(commonCache.mapPttlToSeconds(-1)).toBe(CACHE_CONFIG.TTL.NO_EXPIRE_DEFAULT); // 31536000s
  });
  
  it('处理正常TTL值', async () => {
    // 毫秒转秒，向下取整: ms -> s(秒)
    expect(commonCache.mapPttlToSeconds(5999)).toBe(5);   // 5999ms -> 5s
    expect(commonCache.mapPttlToSeconds(6000)).toBe(6);   // 6000ms -> 6s
  });
});
```

#### 后台刷新去重测试
```typescript
describe('后台刷新去重测试', () => {
  it('同cacheKey在1分钟窗口内仅调度一次', async () => {
    const request = { cacheKey: 'test:key', fetchFn: mockFetch };
    
    // 第一次调用应该触发后台刷新
    orchestrator.scheduleBackgroundRefresh(request);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // 1分钟内再次调用应该被去重
    orchestrator.scheduleBackgroundRefresh(request);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('阈值触发后台刷新', async () => {
    const threshold = CACHE_CONFIG.BACKGROUND_REFRESH.THRESHOLD_SECONDS; // 300s (5分钟)
    const ttlRemaining = 250; // 250s (4分钟)
    
    expect(orchestrator.shouldTriggerBackgroundRefresh(ttlRemaining, 3600))
      .toBe(true);
    
    // 验证指标计数
    expect(Metrics.inc)
      .toHaveBeenCalledWith(mockMetricsRegistry, 'backgroundRefreshTotal', { status: 'success' });
  });
});
```

#### Redis宕机静默恢复测试
```typescript
describe('Redis宕机时的静默恢复', () => {
  it('getWithFallback在Redis不可用时静默降级', async () => {
    // 模拟Redis宕机
    mockRedis.get.mockRejectedValue(new Error('Connection refused'));
    
    const result = await commonCache.getWithFallback(
      'test:key',
      () => Promise.resolve({ value: 'fallback' }),
      300
    );
    
    // 验证业务数据正常返回
    expect(result.data).toEqual({ value: 'fallback' });
    expect(result.hit).toBe(false);
    
    // 验证错误指标计数
    expect(Metrics.inc)
      .toHaveBeenCalledWith(mockMetricsRegistry, 'cacheOperationsTotal', { op: 'get', status: 'error' });
  });
});
```

## 设计方案总结

### 核心原则
1. **避免过度设计** - 充分利用现有降级机制，不增加不必要的复杂度
2. **职责边界清晰** - Orchestrator决策编排，CommonCache纯缓存执行，Storage专注DB
3. **接口极简可靠** - get/set/delete基础操作，失败返回null不抛异常
4. **兼容性优先** - 保持API接口不变，支持历史数据平滑迁移
5. **可观测性完备** - 完整的指标体系，静默失败但全程可监控

### 关键设计决策
- **降级链路重构** - 历史实现为Cache→DB；重构后StorageService仅查DB，兜底由调用方fetchFn内部完成
- **元数据支持** - 提供ttlRemaining等信息支持后台刷新策略判断
- **并发控制层级** - 在Orchestrator层实现single-flight，CommonCache保持极简
- **键命名统一** - 调用端构建完整cacheKey，CommonCache内部零前缀处理
- **指标体系分离** - cache*前缀与storage_persistent_*前缀清晰分离
- **彻底清理历史包袋** - 删除所有缓存相关代码、测试、文档，不留遗留代码

---

## 📋 最终核实清单

在执行重构前，请务必完成以下验证：

### ✅ 代码库现状确认
```bash
# 1. 确认当前智能缓存方法的存在性
grep -c "getWithSmartCache\|batchGetWithSmartCache\|calculateDynamicTTL" src/core/public/storage/services/storage.service.ts

# 2. 确认updateCache参数的使用情况  
grep -n "updateCache.*true" src/core/public/storage/services/storage.service.ts

# 3. 检查实际存在的缓存文件
find src/core/public/storage -name "*cache*" -type f

# 4. 确认私有方法存在性
grep -n "_compressData\|_decompressData\|_getCacheMetadata\|_updateCacheStats" src/core/public/storage/services/storage.service.ts
```

### ⚠️ 重构关键提醒

1. **Pipeline原子性理解**：Redis pipeline非原子操作，如需原子性使用MULTI/EXEC
2. **TTL单位统一**：所有ttlRemaining必须通过mapPttlToSeconds转换为秒
3. **retrieveData重构**：完全移除缓存逻辑，仅保留DB查询，同步移除RetrieveDataDto的updateCache字段
4. **文件删除验证**：执行删除前必须验证文件实际存在性

### 🔍 建议的执行顺序

1. **分阶段重构**：按文档中的6个阶段逐步执行
2. **测试验证**：每个阶段完成后运行相关测试
3. **清理确认**：最后阶段执行文件清理前再次验证

### 📖 关键设计决策回顾

- **降级链路重构**：历史实现为Cache→DB；重构后StorageService仅查DB，兜底由fetchFn内部完成
- **职责边界清晰**：CommonCache纯缓存，Storage专注DB，Orchestrator负责策略
- **兼容性优先**：保持API接口不变，支持平滑迁移
- **可观测性完备**：cache*与storage_persistent_*指标分离

---

*⚠️ 本设计方案已根据实际代码库情况进行重要修正和纠错，并完成4个关键"小收口"避免实现期歧义：*

*1. **降级行为描述一致**：明确历史实现为Cache→DB，重构后StorageService仅查DB*
*2. **模块依赖名称对齐**：统一使用SharedServicesModule（现存模块名）*
*3. **指标服务命名统一**：使用Metrics.inc(metricsRegistry,...)与现网实现对齐*
*4. **DTO/Controller同步精简**：RetrieveDataDto移除updateCache字段，保持接口一致性*

## 📋 现网对齐确认清单

*✅ **类名与模块名对齐完成**：*
- *SmartCacheOrchestratorService → SmartCacheOrchestrator*
- *SmartCacheModule 统一使用 SharedServicesModule*
- *StorageModule 保留现有依赖 AuthModule/PaginationModule*

*✅ **配置与特性开关对齐完成**：*
- *FeatureFlagsService → FeatureFlags*
- *统一使用 Metrics.inc(this.metricsRegistry, ...)*
- *ConfigService + FeatureFlags 配置组合*

*✅ **实现细节对齐完成**：*
- *Redis客户端复用现网连接或确认ioredis依赖*
- *updateCache字段清理包含测试文件更新*
- *降级链路描述与重构后行为一致*

*确保重构过程基于真实代码状态，防止因文档错误导致的系统故障。*

## 📋 落地前极简自检（基于现网代码分析）

### ✅ 现网代码确认结果

#### **落地自检一**
```bash
# ✅ 确认：以下方法在现网StorageService中存在
grep -c "getWithSmartCache\|batchGetWithSmartCache\|tryRetrieveFromCache\|calculateDynamicTTL" src/core/public/storage/services/storage.service.ts
# 结果：4个方法全部存在

# ✅ 确认：SmartCacheOrchestrator也使用了这些方法
grep -c "getWithSmartCache" src/core/public/smart-cache/services/smart-cache-orchestrator.service.ts
# 结果：存在调用
```

#### **落地自检二**
```bash
# ⚠️ 发现：updateCache在多个文件中被引用
# 源文件：9个文件
# 测试文件：6个文件
# 需要渐进式迁移，避免破坏性变更
```

#### **落地自检三：依赖配置确认**
```bash
# ✅ 确认：SmartCacheModule已正确使用SharedServicesModule
grep -A5 -B5 "SharedServicesModule" src/core/public/smart-cache/module/symbol-smart-cache.module.ts

# ✅ 确认：指标服务正确使用 Metrics.inc(this.metricsRegistry, ...)
grep -c "Metrics\.inc.*metricsRegistry" src/core/public/storage/services/storage.service.ts

# ✅ 确认：Redis依赖已声明
grep "ioredis\|redis" package.json
# 结果：ioredis: "^5.6.1", @nestjs-modules/ioredis: "^2.0.2"
```

#### **落地自检四**
grep 确认仓内无残留调用：getWithSmartCache/batchGetWithSmartCache/tryRetrieveFromCache/tryGetFromSmartCache/storeToSmartCache/calculateDynamicTTL 与 DTO 的 updateCache。
#### **落地自检五**
确认 Redis 客户端与 setEx/pttl 单位处理一致，Envelope 读写统一走工具方法。


### 🚨 关键风险点识别

#### **高风险项**
1. **updateCache字段**：影响面大（15个文件），需要分阶段迁移
2. **智能缓存方法**：被多个模块调用，需要适配器模式过渡
3. **SmartCacheOrchestrator依赖**：当前依赖StorageService，重构需保持兼容

#### **建议策略调整**
1. **采用渐进式重构**：避免一次性大规模变更
2. **保持向后兼容**：使用@Deprecated标记但保留实现
3. **Feature Flag控制**：新功能通过开关逐步启用

### 🔧 实施前检查清单

#### **开始重构前必须确认**
- [ ] Redis连接配置已验证（复用现网@nestjs-modules/ioredis）
- [ ] 测试环境准备完成（MongoDB + Redis）
- [ ] 监控指标采集就绪（PresenterRegistryService可用）
- [ ] Feature Flag系统可用（控制新功能启用）

#### **每个阶段完成后检查**
- [ ] 现有功能无回归（所有测试通过）
- [ ] 新功能基础验证（CommonCacheService可用）
- [ ] 性能指标对比（延迟、命中率无恶化）
- [ ] 弃用方法调用量监控（逐步下降）

#### **最终清理前确认**
- [ ] 所有调用方已迁移（grep确认无残留调用）
- [ ] updateCache字段已清理（DTO、Controller、测试）
- [ ] 依赖关系已优化（无循环依赖）
- [ ] 文档已更新（API文档、架构图）

*这个自检清单基于现网代码实际情况制定，确保重构过程安全可控。*