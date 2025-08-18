# SmartCacheOrchestrator 使用指南

## 📖 概述

SmartCacheOrchestrator 是一个智能缓存编排器，为 Query 和 Receiver 服务提供统一的缓存管理解决方案。经过 Phase 5 重构，它现在直接基于 CommonCacheService 构建，提供了更高的性能和更简洁的架构。

## 🚀 快速开始

### 基础导入和注入

```typescript
import { Injectable } from '@nestjs/common';
import { SmartCacheOrchestrator } from '@core/public/smart-cache/services/symbol-smart-cache-orchestrator.service';
import { 
  CacheStrategy, 
  CacheOrchestratorRequest, 
  CacheOrchestratorResult 
} from '@core/public/smart-cache/interfaces/symbol-smart-cache-orchestrator.interface';

@Injectable()
export class YourService {
  constructor(
    private readonly smartCacheOrchestrator: SmartCacheOrchestrator
  ) {}
}
```

### 基本用法示例

```typescript
async getStockData(symbols: string[]) {
  const request: CacheOrchestratorRequest<any> = {
    cacheKey: `stock:${symbols.join(',')}:quote`,
    strategy: CacheStrategy.STRONG_TIMELINESS,
    symbols,
    fetchFn: async () => {
      // 你的数据获取逻辑
      return await this.dataProvider.getStockQuotes(symbols);
    },
    metadata: {
      market: Market.US,
      requestId: 'req-123',
      dataType: 'stock-quote'
    }
  };

  const result: CacheOrchestratorResult<any> = 
    await this.smartCacheOrchestrator.getDataWithSmartCache(request);

  return result;
}
```

## 🎯 缓存策略详解

### 1. STRONG_TIMELINESS (强时效性)
适用于需要高频更新的实时数据，如股票报价。

```typescript
const request: CacheOrchestratorRequest<StockQuote> = {
  cacheKey: 'stock:AAPL:quote',
  strategy: CacheStrategy.STRONG_TIMELINESS,  // 短TTL，快速失效
  symbols: ['AAPL'],
  fetchFn: async () => await this.getRealtimeQuote('AAPL')
};
```

**特性:**
- TTL: 通常 5-60 秒
- 后台更新: 启用
- 适用场景: 实时股价、市场数据

### 2. WEAK_TIMELINESS (弱时效性)
适用于更新频率较低的分析数据。

```typescript
const request: CacheOrchestratorRequest<AnalyticalData> = {
  cacheKey: 'stock:AAPL:analysis',
  strategy: CacheStrategy.WEAK_TIMELINESS,  // 长TTL，减少更新频率
  symbols: ['AAPL'],
  fetchFn: async () => await this.getAnalyticalData('AAPL')
};
```

**特性:**
- TTL: 通常 10-60 分钟
- 后台更新: 启用，频率较低
- 适用场景: 技术分析、财务指标

### 3. MARKET_AWARE (市场感知)
根据市场开闭状态动态调整缓存策略。

```typescript
const request: CacheOrchestratorRequest<MarketData> = {
  cacheKey: 'market:US:status',
  strategy: CacheStrategy.MARKET_AWARE,  // 根据市场状态动态调整
  symbols: ['SPY'],
  fetchFn: async () => await this.getMarketData('US')
};
```

**特性:**
- 开市时: 短TTL (5-30秒)
- 闭市时: 长TTL (1-4小时)
- 自动调节: 基于市场状态
- 适用场景: 市场指数、交易量数据

### 4. NO_CACHE (无缓存)
直接获取数据，跳过缓存机制。

```typescript
const request: CacheOrchestratorRequest<OrderData> = {
  cacheKey: 'order:user123:latest',
  strategy: CacheStrategy.NO_CACHE,  // 每次都获取最新数据
  symbols: [],
  fetchFn: async () => await this.getUserOrders('user123')
};
```

**特性:**
- TTL: 无缓存
- 实时数据: 每次都执行fetchFn
- 适用场景: 订单状态、用户操作

### 5. ADAPTIVE (自适应)
基于数据变化频率动态调整缓存策略。

```typescript
const request: CacheOrchestratorRequest<DynamicData> = {
  cacheKey: 'symbol:TSLA:adaptive',
  strategy: CacheStrategy.ADAPTIVE,  // 自适应调整TTL
  symbols: ['TSLA'],
  fetchFn: async () => await this.getDynamicData('TSLA')
};
```

**特性:**
- 动态TTL: 基于数据变化频率
- 智能调节: 自动优化缓存时间
- 适用场景: 波动性较大的数据

## 🔧 高级功能

### 1. 批量数据处理

```typescript
async getBatchDataWithOptimizedConcurrency(
  requests: CacheOrchestratorRequest<any>[],
  options: {
    concurrency: number;
    enableCache: boolean;
  }
): Promise<CacheOrchestratorResult<any>[]> {
  return await this.smartCacheOrchestrator.getBatchDataWithOptimizedConcurrency(
    requests,
    options
  );
}
```

**示例:**
```typescript
const requests = symbols.map(symbol => ({
  cacheKey: `stock:${symbol}:quote`,
  strategy: CacheStrategy.STRONG_TIMELINESS,
  symbols: [symbol],
  fetchFn: () => this.getStockQuote(symbol)
}));

const results = await this.smartCacheOrchestrator.getBatchDataWithOptimizedConcurrency(
  requests,
  { concurrency: 10, enableCache: true }
);
```

### 2. 缓存预热

```typescript
async warmupHotQueries(
  hotQueries: Array<{
    key: string;
    request: CacheOrchestratorRequest<any>;
    priority: number;
  }>
): Promise<Array<{
  key: string;
  success: boolean;
  ttl?: number;
  skipped?: boolean;
}>> {
  return await this.smartCacheOrchestrator.warmupHotQueries(hotQueries);
}
```

**示例:**
```typescript
const hotQueries = [
  {
    key: 'stock:AAPL:quote',
    request: {
      cacheKey: 'stock:AAPL:quote',
      strategy: CacheStrategy.STRONG_TIMELINESS,
      symbols: ['AAPL'],
      fetchFn: () => this.getStockQuote('AAPL')
    },
    priority: 10
  }
];

const results = await this.smartCacheOrchestrator.warmupHotQueries(hotQueries);
```

### 3. 缓存性能分析

```typescript
async analyzeCachePerformance(cacheKeys: string[]) {
  const analysis = await this.smartCacheOrchestrator.analyzeCachePerformance(cacheKeys);
  
  console.log('Cache Analysis:', {
    totalKeys: analysis.summary.totalKeys,
    cached: analysis.summary.cached,
    hitRate: analysis.summary.hitRate,
    recommendations: analysis.recommendations
  });
  
  return analysis;
}
```

### 4. 自适应TTL设置

```typescript
async setDataWithAdaptiveTTL(
  key: string,
  data: any,
  context: {
    dataType: string;
    symbol: string;
    accessFrequency: 'high' | 'medium' | 'low';
    marketStatus: 'open' | 'closed';
  }
) {
  return await this.smartCacheOrchestrator.setDataWithAdaptiveTTL(
    key,
    data,
    context
  );
}
```

## 📊 返回数据格式

所有缓存操作都返回统一的 `CacheOrchestratorResult` 格式：

```typescript
interface CacheOrchestratorResult<T> {
  data: T;                    // 返回的数据
  hit: boolean;               // 缓存命中状态
  ttlRemaining?: number;      // TTL剩余时间(秒)
  dynamicTtl?: number;        // 动态计算的TTL(秒)
  strategy: CacheStrategy;    // 使用的缓存策略
  storageKey: string;         // 存储键
  timestamp?: string;         // 数据时间戳
  error?: string;             // 错误信息(如有)
}
```

**示例响应:**
```json
{
  "data": {
    "symbol": "AAPL",
    "lastPrice": 195.89,
    "change": 2.31,
    "changePercent": 1.19
  },
  "hit": true,
  "ttlRemaining": 45,
  "dynamicTtl": 60,
  "strategy": "strong_timeliness",
  "storageKey": "stock:AAPL:quote",
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

## ⚠️ 最佳实践

### 1. 缓存键命名规范
```typescript
// ✅ 推荐格式
const cacheKey = `${prefix}:${symbol}:${dataType}`;
// 例如: "stock:AAPL:quote", "market:US:status"

// ❌ 避免的格式
const cacheKey = `data_${Math.random()}`; // 随机键名
const cacheKey = `${symbol}${dataType}`;  // 无分隔符
```

### 2. FetchFn 错误处理
```typescript
const request: CacheOrchestratorRequest<any> = {
  cacheKey: 'stock:AAPL:quote',
  strategy: CacheStrategy.STRONG_TIMELINESS,
  symbols: ['AAPL'],
  fetchFn: async () => {
    try {
      return await this.dataProvider.getQuote('AAPL');
    } catch (error) {
      // 记录错误但让SmartCacheOrchestrator处理
      this.logger.error('Failed to fetch AAPL quote', error);
      throw error; // 重新抛出让编排器处理
    }
  }
};
```

### 3. 元数据使用
```typescript
const request: CacheOrchestratorRequest<any> = {
  // ... 其他配置
  metadata: {
    market: Market.US,           // 有助于TTL计算
    requestId: generateId(),     // 用于调试追踪
    dataType: 'stock-quote',     // 影响缓存策略
    userId: 'user123',          // 可用于个性化缓存
    priority: 'high'            // 影响后台更新优先级
  }
};
```

### 4. 批量操作优化
```typescript
// ✅ 推荐: 使用批量API
const results = await this.smartCacheOrchestrator.getBatchDataWithOptimizedConcurrency(
  requests,
  { concurrency: 10, enableCache: true }
);

// ❌ 避免: 循环调用单个API
for (const symbol of symbols) {
  await this.smartCacheOrchestrator.getDataWithSmartCache(/* ... */);
}
```

## 🔍 调试和监控

### 1. 日志配置
SmartCacheOrchestrator 提供详细的调试日志：

```typescript
// 在应用配置中启用调试日志
export const loggerConfig = {
  level: 'debug', // 启用debug级别日志
  context: ['SmartCacheOrchestrator']
};
```

### 2. 性能监控
```typescript
// 检查缓存性能指标
const stats = await this.smartCacheOrchestrator.analyzeCachePerformance([
  'stock:AAPL:quote',
  'stock:GOOGL:quote'
]);

console.log('Cache Hit Rate:', stats.summary.hitRate);
console.log('Recommendations:', stats.recommendations);
```

### 3. 错误处理
```typescript
try {
  const result = await this.smartCacheOrchestrator.getDataWithSmartCache(request);
  return result.data;
} catch (error) {
  // SmartCacheOrchestrator已经处理了大部分错误
  // 这里通常是严重错误，比如fetchFn完全失败
  this.logger.error('Critical cache error', error);
  throw new ServiceUnavailableException('Cache service unavailable');
}
```

## 🔧 配置选项

### 模块配置
```typescript
import { SmartCacheModule } from '@core/public/smart-cache/smart-cache.module';

@Module({
  imports: [
    SmartCacheModule.forRoot({
      defaultMinUpdateInterval: 30000,    // 默认最小更新间隔(ms)
      maxConcurrentUpdates: 10,          // 最大并发更新数
      gracefulShutdownTimeout: 5000,     // 优雅关闭超时时间(ms)
      enableBackgroundUpdate: true,      // 启用后台更新
      enableDataChangeDetection: false,  // 启用数据变化检测
      enableMetrics: true                // 启用性能指标
    })
  ]
})
export class YourModule {}
```

---

**文档版本**: v2.0  
**最后更新**: 2025年8月18日  
**适用版本**: SmartCacheOrchestrator Phase 5+