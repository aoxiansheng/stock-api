# CommonCacheService 使用示例

本目录包含了如何在新功能中使用 `CommonCacheService` 的具体示例，展示了从旧的 `StorageService` 智能缓存方法迁移到新架构的最佳实践。

## 📚 示例文件说明

### 1. `stock-data-cache.service.ts` - 股票数据缓存服务
展示了在股票数据处理中使用 CommonCacheService 的典型场景：

**主要功能：**
- ✅ **获取股票报价** - 使用 `getWithFallback` 自动回源
- ✅ **批量数据操作** - 使用 `mget/mset` 提升性能
- ✅ **市场状态缓存** - 简单的 `set/get` 操作
- ✅ **符号映射缓存** - 批量设置长期缓存
- ✅ **智能缓存清理** - 精确删除相关缓存
- ✅ **健康检查监控** - 内置的健康状态检查

**关键特性：**
```typescript
// 带回源的缓存获取
const result = await this.commonCache.getWithFallback(key, fetchFn, ttl);

// 批量操作优化
const results = await this.commonCache.mget(keys);
await this.commonCache.mset(entries);

// 健康检查
const isHealthy = await this.commonCache.isHealthy();
```

### 2. `query-cache.service.ts` - 查询缓存服务
展示了如何在 Query 模块中替代原有的智能缓存逻辑：

**迁移对照：**
- ❌ `StorageService.getWithSmartCache()` → ✅ `CommonCacheService.getWithFallback()`
- ❌ `StorageService.batchGetWithSmartCache()` → ✅ `CommonCacheService.mget()` + 批量回源
- ❌ `StorageService.calculateDynamicTTL()` → ✅ 智能TTL计算策略

**高级功能：**
```typescript
// 智能TTL计算
await this.setQueryResultWithSmartTTL(key, data, {
  dataType: 'stock_quote',
  accessFrequency: 'high',
  dataSize: estimatedSize,
});

// 查询预热
await this.warmupQueryCache(hotQueries);

// 缓存分析
const analysis = await this.analyzeCacheUsage(queryKeys);
```

## 🎯 使用模式对比

### 旧模式 (StorageService - 已弃用)
```typescript
// ❌ 不推荐：使用已弃用的方法
const result = await this.storageService.getWithSmartCache(
  key, 
  fallbackFn, 
  { updateCache: true, ttl: 3600 }
);
```

### 新模式 (CommonCacheService - 推荐)
```typescript
// ✅ 推荐：使用新的CommonCacheService
const result = await this.commonCache.getWithFallback(key, fallbackFn, 3600);
```

## 🚀 集成到现有模块

### 1. 模块导入
```typescript
import { Module } from '@nestjs/common';
import { CommonCacheModule } from '@core/public/common-cache';
import { StockDataCacheService } from './examples/stock-data-cache.service';

@Module({
  imports: [CommonCacheModule],
  providers: [StockDataCacheService],
  exports: [StockDataCacheService],
})
export class YourFeatureModule {}
```

### 2. 服务注入
```typescript
import { Injectable } from '@nestjs/common';
import { CommonCacheService } from '@core/public/common-cache';

@Injectable()
export class YourService {
  constructor(
    private readonly commonCache: CommonCacheService,
  ) {}
  
  async getData(key: string) {
    return await this.commonCache.get(key);
  }
}
```

## 📊 性能优势

### 批量操作优化
```typescript
// ✅ 高效：使用mget批量获取
const results = await this.commonCache.mget(keys);

// ❌ 低效：循环单次获取
const results = [];
for (const key of keys) {
  const result = await this.commonCache.get(key);
  results.push(result);
}
```

### Pipeline 分段处理
```typescript
// ✅ 自动分段：CommonCacheService内部处理
await this.commonCache.mset(largeEntries); // 自动分段为50条/pipeline

// ❌ 手动处理：需要自己管理分段逻辑
```

### 静默失败设计
```typescript
// ✅ 缓存失败不影响业务
try {
  const data = await fetchFromDatabase();
  // 缓存操作失败不抛异常，只记录日志
  await this.commonCache.set(key, data, ttl);
  return data;
} catch (dbError) {
  // 只有数据库错误才抛异常
  throw dbError;
}
```

## 🔧 配置和调优

### TTL 策略配置
```typescript
// 根据数据特征选择合适的TTL
const ttlStrategy = {
  stock_quote: 300,      // 5分钟 - 实时性要求高
  market_status: 1800,   // 30分钟 - 相对稳定
  symbol_mapping: 86400, // 24小时 - 很少变化
  user_preferences: 3600, // 1小时 - 中等变化频率
};
```

### 批量操作限制
```typescript
// 遵循配置的批量限制
import { CACHE_CONFIG } from '@core/public/common-cache';

const maxBatchSize = CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE; // 100
const pipelineSize = CACHE_CONFIG.BATCH_LIMITS.PIPELINE_MAX_SIZE; // 50
```

## 🧪 测试示例

### 单元测试
```typescript
describe('StockDataCacheService', () => {
  let service: StockDataCacheService;
  let mockCommonCache: jest.Mocked<CommonCacheService>;

  beforeEach(async () => {
    const mockCache = {
      getWithFallback: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      isHealthy: jest.fn(),
      getStats: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        StockDataCacheService,
        {
          provide: CommonCacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get(StockDataCacheService);
    mockCommonCache = module.get(CommonCacheService);
  });

  it('should get stock quote with fallback', async () => {
    const mockData = { symbol: 'AAPL', price: 150 };
    mockCommonCache.getWithFallback.mockResolvedValue({
      data: mockData,
      hit: true,
      ttlRemaining: 3600,
    });

    const result = await service.getStockQuote('AAPL', 'longport');
    expect(result.data).toEqual(mockData);
    expect(mockCommonCache.getWithFallback).toHaveBeenCalled();
  });
});
```

### 集成测试
```typescript
describe('QueryCacheService Integration', () => {
  it('should handle real cache operations', async () => {
    // 需要真实的Redis连接
    const result = await queryService.getQueryResult(
      'test:integration',
      async () => ({ data: 'test' }),
      { ttl: 60 }
    );
    
    expect(result.hit).toBe(false); // 首次应该未命中
    
    const result2 = await queryService.getQueryResult(
      'test:integration',
      async () => ({ data: 'test' }),
      { ttl: 60 }
    );
    
    expect(result2.hit).toBe(true); // 第二次应该命中
  });
});
```

## 🎯 迁移检查清单

### ✅ 新功能开发检查项
- [ ] 使用 `CommonCacheService` 而不是 `StorageService` 智能缓存方法
- [ ] 导入 `CommonCacheModule` 到相关模块
- [ ] 使用 `CacheKeyUtils` 生成统一的缓存键
- [ ] 遵循 `CACHE_CONFIG` 中的配置限制
- [ ] 编写对应的单元测试和集成测试
- [ ] 添加适当的日志记录和错误处理

### ✅ 代码review检查项
- [ ] 不使用任何标记为 `@deprecated` 的方法
- [ ] 缓存操作有适当的错误处理（静默失败）
- [ ] TTL设置合理（不超过MAX_SECONDS，不低于MIN_SECONDS）
- [ ] 批量操作不超过配置的限制
- [ ] 有适当的监控和日志记录

## 📈 监控和告警

### 关键指标
```typescript
// 缓存操作监控
cacheOperationsTotal{op="get|set|mget|mset", status="success|error"}
cacheQueryDuration{op="get|set|mget|mset"}
cacheHitRate

// 业务指标监控  
stockQuoteHitRate
batchQueryCacheEfficiency
cacheWarmupSuccess
```

### 告警配置
- **缓存错误率** > 1% (5分钟窗口)
- **缓存延迟P95** > 50ms
- **命中率** < 85% (10分钟窗口)
- **健康检查失败** 连续3次

---

## 📝 总结

这些示例展示了如何在新功能开发中正确使用 CommonCacheService，实现：

1. **更简洁的API** - 统一的缓存操作接口
2. **更好的性能** - 批量操作和pipeline优化
3. **更强的可靠性** - 静默失败和健康检查
4. **更清晰的职责分离** - 缓存逻辑与业务逻辑分离
5. **更好的可维护性** - 统一的配置和监控

通过这些示例，开发团队可以快速上手新的缓存架构，确保新功能的缓存使用符合最佳实践。