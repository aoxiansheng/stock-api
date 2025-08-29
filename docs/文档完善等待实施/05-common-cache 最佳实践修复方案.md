# 05-common-cache 最佳实践修复方案

## 📋 执行摘要

基于问题分析，本方案提供适合**全新项目**的最佳实践解决方案，避免过度复杂，专注核心价值。

## 🔴 P0级别修复方案 - 立即实施

### 1. Redis连接事件监听器清理机制

#### 问题描述
- Redis连接注册了4个事件监听器但未实现清理
- 模块重载或销毁时可能导致内存泄漏

#### 最佳实践方案

**方案一：使用NestJS OnModuleDestroy生命周期（推荐）**

```typescript
// src/core/05-caching/common-cache/module/common-cache.module.ts
import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Module({
  // ... existing configuration
})
export class CommonCacheModule implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(
    @Inject('REDIS_CLIENT') redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    this.redisClient = redisClient;
  }

  async onModuleInit() {
    // 健康检查
    try {
      await this.redisClient.ping();
      console.log('✅ Redis connection verified');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // 清理事件监听器
    this.redisClient.removeAllListeners();
    
    // 优雅关闭连接
    await this.redisClient.quit();
    console.log('🔌 Redis connection closed gracefully');
  }
}
```

**方案二：使用Factory Provider生命周期管理**

```typescript
// src/core/05-caching/common-cache/providers/redis.provider.ts
export const redisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: async (configService: ConfigService) => {
    const redis = new Redis({
      // ... configuration
      lazyConnect: false, // 立即连接以便早期发现问题
    });

    // 注册清理函数
    const cleanup = () => {
      redis.removeAllListeners();
      redis.disconnect();
    };

    // 进程退出时清理
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    return redis;
  },
  inject: [ConfigService],
};
```

### 2. Redis TLS加密配置

#### 问题描述
- Redis连接缺少TLS/SSL加密配置
- 密码可能以明文传输

#### 最佳实践方案

```typescript
// src/core/05-caching/common-cache/config/redis-tls.config.ts
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';

export interface RedisTLSConfig {
  tls?: {
    ca?: Buffer;
    cert?: Buffer;
    key?: Buffer;
    rejectUnauthorized?: boolean;
  };
}

export const createRedisTLSConfig = (configService: ConfigService): RedisTLSConfig => {
  const tlsEnabled = configService.get<boolean>('redis.tls.enabled', false);
  
  if (!tlsEnabled) {
    return {};
  }

  return {
    tls: {
      ca: configService.get<string>('redis.tls.ca') 
        ? readFileSync(configService.get<string>('redis.tls.ca')) 
        : undefined,
      cert: configService.get<string>('redis.tls.cert')
        ? readFileSync(configService.get<string>('redis.tls.cert'))
        : undefined,
      key: configService.get<string>('redis.tls.key')
        ? readFileSync(configService.get<string>('redis.tls.key'))
        : undefined,
      rejectUnauthorized: configService.get<boolean>('redis.tls.rejectUnauthorized', true),
    }
  };
};

// 更新Redis Provider
{
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const baseConfig = {
      host: configService.get<string>('redis.host', 'localhost'),
      port: configService.get<number>('redis.port', 6379),
      password: configService.get<string>('redis.password'),
      db: configService.get<number>('redis.db', 0),
      // ... other config
    };

    const tlsConfig = createRedisTLSConfig(configService);
    
    return new Redis({
      ...baseConfig,
      ...tlsConfig,
      // 针对云服务的额外安全配置
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
  },
  inject: [ConfigService],
}
```

## 🟡 P1级别修复方案 - 近期实施

### 3. 依赖注入类型安全改进

#### 问题描述
- 使用字符串token注入，类型为any
- 缺乏编译时类型检查

#### 最佳实践方案

```typescript
// src/monitoring/contracts/tokens/injection.tokens.ts
import { InjectionToken } from '@nestjs/common';
import { ICollector } from '../interfaces/collector.interface';

export const COLLECTOR_SERVICE_TOKEN = new InjectionToken<ICollector>('CollectorService');
export const REDIS_CLIENT_TOKEN = new InjectionToken<Redis>('RedisClient');

// src/core/05-caching/common-cache/services/common-cache.service.ts
import { COLLECTOR_SERVICE_TOKEN } from '@monitoring/contracts/tokens';
import { ICollector } from '@monitoring/contracts/interfaces';

@Injectable()
export class CommonCacheService {
  constructor(
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    @Inject(COLLECTOR_SERVICE_TOKEN) private readonly collectorService: ICollector,
    private readonly configService: ConfigService,
    private readonly compressionService: CacheCompressionService,
  ) {}
}
```

### 4. 动态并发控制实现

#### 问题描述
- 解压缩并发数固定为10
- 高负载时可能成为瓶颈，低负载时资源未充分利用

#### 最佳实践方案

```typescript
// src/core/05-caching/common-cache/services/adaptive-semaphore.service.ts
import { Injectable } from '@nestjs/common';
import { ICollector } from '@monitoring/contracts/interfaces';
import * as os from 'os';

@Injectable()
export class AdaptiveSemaphoreService {
  private permits: number;
  private readonly minPermits = 2;
  private readonly maxPermits = 50;
  private waiting: (() => void)[] = [];
  private lastAdjustTime = Date.now();
  private readonly adjustInterval = 10000; // 10秒调整一次

  constructor(
    @Inject(COLLECTOR_SERVICE_TOKEN) private readonly collector: ICollector,
  ) {
    this.permits = this.calculateOptimalPermits();
    this.startAutoAdjustment();
  }

  private calculateOptimalPermits(): number {
    const cpuCount = os.cpus().length;
    const freeMemoryRatio = os.freemem() / os.totalmem();
    
    // 基于CPU核心数和内存可用率计算
    let optimal = Math.floor(cpuCount * 2.5); // 基准：CPU核心数的2.5倍
    
    // 内存压力调整
    if (freeMemoryRatio < 0.2) {
      optimal = Math.floor(optimal * 0.5); // 内存不足，减半
    } else if (freeMemoryRatio > 0.5) {
      optimal = Math.floor(optimal * 1.5); // 内存充足，增加50%
    }
    
    return Math.max(this.minPermits, Math.min(optimal, this.maxPermits));
  }

  private startAutoAdjustment(): void {
    setInterval(() => {
      const newPermits = this.calculateOptimalPermits();
      if (newPermits !== this.permits) {
        const oldPermits = this.permits;
        this.permits = newPermits;
        
        // 上报调整事件
        this.collector.recordCacheOperation(
          'semaphore_adjustment',
          true,
          0,
          { 
            oldPermits,
            newPermits,
            waitingCount: this.waiting.length,
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
          }
        );
      }
    }, this.adjustInterval);
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    
    return new Promise<void>(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }

  getStatus() {
    return {
      availablePermits: this.permits,
      waitingCount: this.waiting.length,
      maxPermits: this.maxPermits,
      cpuLoad: os.loadavg()[0],
      memoryUsage: process.memoryUsage(),
    };
  }
}
```

### 5. 批量操作内存控制

#### 问题描述
- 批量大小固定100，不考虑数据实际大小
- 可能导致内存峰值

#### 最佳实践方案

```typescript
// src/core/05-caching/common-cache/services/batch-memory-controller.ts
@Injectable()
export class BatchMemoryController {
  private readonly MAX_BATCH_MEMORY = 50 * 1024 * 1024; // 50MB
  private readonly MIN_BATCH_SIZE = 10;
  private readonly MAX_BATCH_SIZE = 100;

  /**
   * 计算安全的批量大小
   */
  calculateSafeBatchSize<T>(items: T[], estimator?: (item: T) => number): number {
    if (!estimator) {
      // 默认估算：JSON序列化后的大小
      estimator = (item: T) => JSON.stringify(item).length;
    }

    let totalSize = 0;
    let safeCount = 0;

    for (const item of items) {
      const itemSize = estimator(item);
      if (totalSize + itemSize > this.MAX_BATCH_MEMORY) {
        break;
      }
      totalSize += itemSize;
      safeCount++;
    }

    return Math.max(
      this.MIN_BATCH_SIZE,
      Math.min(safeCount || this.MIN_BATCH_SIZE, this.MAX_BATCH_SIZE)
    );
  }

  /**
   * 将数组分割为内存安全的批次
   */
  splitIntoSafeBatches<T>(
    items: T[],
    estimator?: (item: T) => number
  ): T[][] {
    const batches: T[][] = [];
    let currentBatch: T[] = [];
    let currentSize = 0;

    const sizeEstimator = estimator || ((item: T) => JSON.stringify(item).length);

    for (const item of items) {
      const itemSize = sizeEstimator(item);
      
      if (currentSize + itemSize > this.MAX_BATCH_MEMORY && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
      
      currentBatch.push(item);
      currentSize += itemSize;
      
      if (currentBatch.length >= this.MAX_BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}

// 在CommonCacheService中使用
async mset<T>(entries: Array<{ key: string; data: T; ttl: number }>): Promise<void> {
  const batches = this.batchMemoryController.splitIntoSafeBatches(
    entries,
    entry => JSON.stringify(entry.data).length + entry.key.length
  );

  for (const batch of batches) {
    await this.processBatch(batch);
  }
}
```

### 6. 配置验证机制

#### 问题描述
- 配置项缺乏运行时验证
- 无效配置可能导致运行时错误

#### 最佳实践方案

```typescript
// src/core/05-caching/common-cache/config/cache-config.validator.ts
import { Injectable } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class CacheConfigValidator {
  private readonly schema = Joi.object({
    TIMEOUTS: Joi.object({
      SINGLE_FLIGHT_TIMEOUT: Joi.number().min(1000).max(60000),
      REDIS_OPERATION_TIMEOUT: Joi.number().min(100).max(30000),
      FETCH_TIMEOUT: Joi.number().min(1000).max(120000),
      CONNECTION_TIMEOUT: Joi.number().min(100).max(10000),
    }),
    
    BATCH_LIMITS: Joi.object({
      MAX_BATCH_SIZE: Joi.number().min(1).max(1000),
      PIPELINE_MAX_SIZE: Joi.number().min(1).max(500),
      SINGLE_FLIGHT_MAX_SIZE: Joi.number().min(100).max(10000),
      MGET_OPTIMAL_SIZE: Joi.number().min(1).max(100),
    }),
    
    TTL: Joi.object({
      DEFAULT_SECONDS: Joi.number().min(1).max(86400),
      MIN_SECONDS: Joi.number().min(1).max(3600),
      MAX_SECONDS: Joi.number().min(3600).max(2592000),
      NO_EXPIRE_DEFAULT: Joi.number().min(86400),
      MARKET_OPEN_SECONDS: Joi.number().min(1).max(3600),
      MARKET_CLOSED_SECONDS: Joi.number().min(60).max(86400),
    }),
    
    COMPRESSION: Joi.object({
      THRESHOLD_BYTES: Joi.number().min(1024).max(1048576),
      SAVING_RATIO: Joi.number().min(0.1).max(1),
      ALGORITHM: Joi.string().valid('gzip', 'brotli', 'deflate'),
      LEVEL: Joi.number().min(1).max(9),
    }),
  });

  validate(config: any): void {
    const { error, value } = this.schema.validate(config, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      const errors = error.details.map(d => `${d.path.join('.')}: ${d.message}`);
      throw new Error(`Cache configuration validation failed:\n${errors.join('\n')}`);
    }

    // 额外的业务逻辑验证
    if (value.TTL.MIN_SECONDS >= value.TTL.MAX_SECONDS) {
      throw new Error('TTL.MIN_SECONDS must be less than TTL.MAX_SECONDS');
    }

    if (value.BATCH_LIMITS.PIPELINE_MAX_SIZE > value.BATCH_LIMITS.MAX_BATCH_SIZE) {
      throw new Error('PIPELINE_MAX_SIZE should not exceed MAX_BATCH_SIZE');
    }
  }
}

// 在模块初始化时验证
export class CommonCacheModule implements OnModuleInit {
  constructor(
    private readonly configValidator: CacheConfigValidator,
  ) {}

  onModuleInit() {
    // 验证配置
    this.configValidator.validate(CACHE_CONFIG);
    console.log('✅ Cache configuration validated successfully');
  }
}
```

### 7. 监控指标增强

#### 问题描述
- 未充分利用现有CollectorService能力
- 缺少关键性能指标上报

#### 最佳实践方案

```typescript
// src/core/05-caching/common-cache/services/cache-metrics.service.ts
@Injectable()
export class CacheMetricsService {
  constructor(
    @Inject(COLLECTOR_SERVICE_TOKEN) private readonly collector: ICollector,
  ) {}

  /**
   * 记录批量操作指标
   */
  recordBatchOperation(
    operation: 'mget' | 'mset',
    batchSize: number,
    duration: number,
    success: boolean,
    metadata?: {
      dataSize?: number;
      compressionRatio?: number;
      errorType?: string;
    }
  ): void {
    this.collector.recordCacheOperation(
      `batch_${operation}`,
      success,
      duration,
      {
        batchSize,
        layer: 'common-cache',
        ...metadata,
      }
    );
  }

  /**
   * 记录内存使用指标
   */
  recordMemoryUsage(
    operation: string,
    beforeSize: number,
    afterSize: number,
  ): void {
    const delta = afterSize - beforeSize;
    
    this.collector.recordCacheOperation(
      'memory_usage',
      true,
      0,
      {
        operation,
        beforeSize,
        afterSize,
        delta,
        layer: 'common-cache',
      }
    );
  }

  /**
   * 记录解压缩性能
   */
  recordDecompressionPerformance(
    originalSize: number,
    compressedSize: number,
    decompressionTime: number,
    success: boolean,
  ): void {
    const compressionRatio = originalSize > 0 
      ? (1 - compressedSize / originalSize) * 100 
      : 0;

    this.collector.recordCacheOperation(
      'decompression',
      success,
      decompressionTime,
      {
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(2),
        throughputMBps: (originalSize / decompressionTime / 1024).toFixed(2),
        layer: 'common-cache',
      }
    );
  }
}
```

## 📊 实施优先级和时间线

### Phase 1: 安全和稳定性（第1周）
- [ ] P0-1: Redis事件监听器清理
- [ ] P0-2: Redis TLS配置
- [ ] P1-1: 依赖注入类型安全

### Phase 2: 性能优化（第2周）
- [ ] P1-2: 动态并发控制
- [ ] P1-3: 批量操作内存控制
- [ ] P1-4: 监控指标增强

### Phase 3: 可靠性增强（第3周）
- [ ] P1-5: 配置验证机制
- [ ] 集成测试
- [ ] 性能基准测试

## 🎯 预期收益

### 技术收益
- **内存安全**: 避免OOM和内存泄漏
- **性能提升**: 动态资源分配，提升30-50%吞吐量
- **安全增强**: TLS加密保护敏感数据
- **类型安全**: 编译时错误检查，减少运行时错误

### 业务收益
- **稳定性提升**: 减少生产环境故障
- **运维效率**: 更好的监控和诊断能力
- **开发效率**: 类型安全提升开发体验

## 📝 测试计划

### 单元测试
```typescript
describe('AdaptiveSemaphoreService', () => {
  it('should adjust permits based on system load', async () => {
    // 模拟高负载
    jest.spyOn(os, 'freemem').mockReturnValue(1024 * 1024 * 100); // 100MB
    jest.spyOn(os, 'totalmem').mockReturnValue(1024 * 1024 * 1024); // 1GB
    
    const service = new AdaptiveSemaphoreService(mockCollector);
    const permits = service.getStatus().availablePermits;
    
    expect(permits).toBeLessThanOrEqual(10); // 内存压力下permits应该减少
  });
});
```

### 压力测试
```typescript
// test/performance/cache-stress.test.ts
describe('Cache Stress Test', () => {
  it('should handle 10000 concurrent operations', async () => {
    const operations = Array(10000).fill(0).map((_, i) => 
      cacheService.set(`key-${i}`, { data: 'x'.repeat(1000) }, 300)
    );
    
    const start = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // 5秒内完成
    // 验证内存使用未超限
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB
  });
});
```

## 🔧 监控和告警配置

```yaml
# prometheus-rules.yml
groups:
  - name: cache_alerts
    rules:
      - alert: CacheHighMemoryUsage
        expr: nodejs_heap_used_bytes > 500000000
        for: 5m
        annotations:
          summary: "Cache service high memory usage"
          
      - alert: CacheHighDecompressionLatency
        expr: cache_decompression_duration_seconds > 0.1
        for: 5m
        annotations:
          summary: "Cache decompression taking too long"
```

## ✅ 完成标准

1. **代码质量**
   - 所有TypeScript编译错误清零
   - ESLint检查通过
   - 单元测试覆盖率 > 80%

2. **性能指标**
   - P95延迟 < 50ms
   - 内存使用峰值 < 500MB
   - 并发处理能力 > 1000 ops/s

3. **安全合规**
   - Redis连接使用TLS加密
   - 无内存泄漏（压测验证）
   - 配置验证100%覆盖

## 📚 参考资料

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Redis TLS Configuration](https://redis.io/docs/manual/security/encryption/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/diagnostics/memory-leaks)
- [TypeScript Injection Tokens](https://docs.nestjs.com/fundamentals/custom-providers#injection-tokens)