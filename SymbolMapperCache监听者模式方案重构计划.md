# SymbolMapperCache 监听者模式方案重构计划

## 📋 项目概述

**重构目标**: 将 SymbolMapperCacheService 拆分为纯缓存逻辑与监控逻辑两个独立组件，实现完全的关注点分离。

**重构方案**: 监听者模式 - 缓存服务发射事件，监控服务监听事件并处理监控数据。

**预期收益**:
- ✅ 完全解耦缓存与监控逻辑
- ✅ 提升代码可读性和可维护性
- ✅ 增强单元测试的粒度和质量
- ✅ 符合单一职责原则

---

## 🎯 重构范围

### 当前问题
- 缓存逻辑与监控逻辑混合在同一个类中（1642行代码）
- 监控代码分散在业务方法中（9个调用点）
- 违反单一职责原则

### 重构文件
- `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts` (修改)
- `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache-monitoring.service.ts` (新建)
- `src/core/05-caching/symbol-mapper-cache/interfaces/cache-events.interface.ts` (新建)
- `src/core/05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module.ts` (修改)

---

## 📅 分阶段实施计划

### 阶段1: 事件接口设计 (0.5天)

#### 1.1 创建缓存事件接口
**文件**: `src/core/05-caching/symbol-mapper-cache/interfaces/cache-events.interface.ts`

```typescript
/**
 * 缓存事件数据接口定义
 */
export interface CacheHitEvent {
  layer: 'l1' | 'l2' | 'l3';
  provider: string;
  symbol?: string;
  timestamp: number;
}

export interface CacheMissEvent {
  layer: 'l1' | 'l2' | 'l3';
  provider: string;
  symbol?: string;
  timestamp: number;
}

export interface CacheOperationStartEvent {
  provider: string;
  symbolCount: number;
  direction: string;
  timestamp: number;
  isBatch: boolean;
}

export interface CacheOperationCompleteEvent {
  provider: string;
  symbolCount: number;
  cacheHits: number;
  processingTime: number;
  direction: string;
  success: boolean;
}

export interface CacheOperationErrorEvent {
  provider: string;
  error: string;
  processingTime: number;
  operation: string;
  symbolCount?: number;
}

export interface CacheDisabledEvent {
  reason: string;
  provider: string;
  timestamp: number;
}

/**
 * 缓存事件类型常量
 */
export const CACHE_EVENTS = {
  HIT: 'cache:hit',
  MISS: 'cache:miss',
  OPERATION_START: 'cache:operation:start',
  OPERATION_COMPLETE: 'cache:operation:complete',
  OPERATION_ERROR: 'cache:operation:error',
  DISABLED: 'cache:disabled',
} as const;

export type CacheEventType = typeof CACHE_EVENTS[keyof typeof CACHE_EVENTS];
```

#### 1.2 验收标准
- [ ] 事件接口定义完整，覆盖所有监控场景
- [ ] 事件类型常量定义清晰
- [ ] TypeScript 类型检查通过

---

### 阶段2: 缓存服务重构 (1.5天)

#### 2.1 添加事件发射器到缓存服务
**文件**: `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts`

**修改内容**:

```typescript
import { EventEmitter } from 'events';
import { CACHE_EVENTS, CacheHitEvent, CacheMissEvent /* ... 其他事件接口 */ } from '../interfaces/cache-events.interface';

@Injectable()
export class SymbolMapperCacheService implements OnModuleInit, OnModuleDestroy {
  // 添加事件发射器
  private readonly cacheEventEmitter = new EventEmitter();

  constructor(
    private readonly repository: SymbolMappingRepository,
    private readonly featureFlags: FeatureFlags,
    private readonly configService: ConfigService,
    // 移除 eventBus: EventEmitter2 依赖
  ) {
    this.initializeCaches();
    // 移除 this.initializeStats() 调用
    this.pendingQueries = new Map();
  }

  /**
   * 事件监听器注册方法
   */
  onCacheEvent(event: CacheEventType, listener: (...args: any[]) => void): void {
    this.cacheEventEmitter.on(event, listener);
  }

  /**
   * 事件监听器移除方法
   */
  offCacheEvent(event: CacheEventType, listener: (...args: any[]) => void): void {
    this.cacheEventEmitter.off(event, listener);
  }
}
```

#### 2.2 替换监控代码为事件发射

**在 `mapSymbols()` 方法中的具体修改**:

```typescript
async mapSymbols(
  provider: string,
  symbols: string | string[],
  direction: MappingDirection,
  requestId?: string,
): Promise<BatchMappingResult> {
  const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
  const isBatch = symbolArray.length > 1;
  const startTime = Date.now();

  // ✅ 发射操作开始事件 (替代 this.cacheStats.totalQueries++)
  this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_START, {
    provider,
    symbolCount: symbolArray.length,
    direction,
    timestamp: startTime,
    isBatch,
  } as CacheOperationStartEvent);

  // 🛡️ 缓存禁用检查
  if (!this.featureFlags.symbolMappingCacheEnabled) {
    // ✅ 发射缓存禁用事件 (替代 this.recordCacheDisabled())
    this.cacheEventEmitter.emit(CACHE_EVENTS.DISABLED, {
      reason: "feature_flag_disabled",
      provider,
      timestamp: Date.now(),
    } as CacheDisabledEvent);

    const results = await this.executeUncachedQuery(provider, symbolArray, direction);
    return this.buildDirectQueryResult(symbolArray, results, provider, direction, startTime);
  }

  try {
    // 🎯 Level 3: 批量结果缓存检查
    if (isBatch) {
      const batchKey = this.getBatchCacheKey(provider, symbolArray, direction);
      const batchCached = this.batchResultCache.get(batchKey);
      if (batchCached) {
        // ✅ 发射L3命中事件 (替代 this.recordCacheMetrics("l3", true))
        this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
          layer: 'l3',
          provider,
          timestamp: Date.now(),
        } as CacheHitEvent);

        return this.cloneResult(batchCached);
      }

      // ✅ 发射L3未命中事件 (替代 this.recordCacheMetrics("l3", false))
      this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
        layer: 'l3',
        provider,
        timestamp: Date.now(),
      } as CacheMissEvent);
    }

    // 🎯 Level 2: 单符号缓存检查
    const cacheHits = new Map<string, string>();
    const uncachedSymbols = [];

    for (const symbol of symbolArray) {
      const symbolKey = this.getSymbolCacheKey(provider, symbol, direction);
      const cached = this.symbolMappingCache.get(symbolKey);
      if (cached) {
        cacheHits.set(symbol, cached);
        // ✅ 发射L2命中事件 (替代 this.recordCacheMetrics("l2", true))
        this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
          layer: 'l2',
          provider,
          symbol,
          timestamp: Date.now(),
        } as CacheHitEvent);
      } else {
        uncachedSymbols.push(symbol);
        // ✅ 发射L2未命中事件 (替代 this.recordCacheMetrics("l2", false))
        this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
          layer: 'l2',
          provider,
          symbol,
          timestamp: Date.now(),
        } as CacheMissEvent);
      }
    }

    // 继续处理未缓存的符号...
    const finalResult = await this.processRemainingLogic(/* ... */);

    // ✅ 发射操作完成事件 (替代 this.recordPerformanceMetrics())
    this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_COMPLETE, {
      provider,
      symbolCount: symbolArray.length,
      cacheHits: cacheHits.size,
      processingTime: Date.now() - startTime,
      direction,
      success: true,
    } as CacheOperationCompleteEvent);

    return finalResult;

  } catch (error) {
    // ✅ 发射错误事件
    this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_ERROR, {
      provider,
      error: error.message,
      processingTime: Date.now() - startTime,
      operation: 'mapSymbols',
      symbolCount: symbolArray.length,
    } as CacheOperationErrorEvent);

    throw error;
  }
}
```

#### 2.3 更新其他方法的事件发射

**在 `getProviderRules()` 方法中**:
```typescript
private async getProviderRules(provider: string): Promise<SymbolMappingRule[]> {
  const rulesKey = this.getProviderRulesKey(provider);
  const cached = this.providerRulesCache.get(rulesKey);
  if (cached) {
    // ✅ 发射L1命中事件 (替代 this.recordCacheMetrics("l1", true))
    this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
      layer: 'l1',
      provider,
      timestamp: Date.now(),
    } as CacheHitEvent);
    return cached;
  }

  // ✅ 发射L1未命中事件 (替代 this.recordCacheMetrics("l1", false))
  this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
    layer: 'l1',
    provider,
    timestamp: Date.now(),
  } as CacheMissEvent);

  // 继续数据库查询逻辑...
}
```

#### 2.4 移除监控相关代码

**需要删除的代码块**:
```typescript
// 删除 eventBus 依赖注入
// 删除 cacheStats 相关代码
// 删除 recordCacheMetrics() 方法 (518-536行)
// 删除 recordCacheDisabled() 方法 (541-562行)
// 删除 recordPerformanceMetrics() 方法 (564-600行)
// 删除 initializeStats() 方法
```

#### 2.5 验收标准
- [ ] 所有监控代码调用替换为事件发射
- [ ] 移除所有监控相关的方法和属性
- [ ] 移除 EventEmitter2 依赖
- [ ] 核心缓存逻辑保持不变
- [ ] 单元测试通过（只测试缓存逻辑）

---

### 阶段3: 监控服务创建 (1天)

#### 3.1 创建独立监控服务
**文件**: `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache-monitoring.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createLogger } from '@common/logging/index';
import { SYSTEM_STATUS_EVENTS } from '../../../../monitoring/contracts/events/system-status.events';
import { SymbolMapperCacheService } from './symbol-mapper-cache.service';
import {
  CACHE_EVENTS,
  CacheHitEvent,
  CacheMissEvent,
  CacheOperationStartEvent,
  CacheOperationCompleteEvent,
  CacheOperationErrorEvent,
  CacheDisabledEvent
} from '../interfaces/cache-events.interface';

@Injectable()
export class SymbolMapperCacheMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(SymbolMapperCacheMonitoringService.name);

  // 📊 缓存统计数据
  private cacheStats = {
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    l3: { hits: 0, misses: 0 },
    totalQueries: 0,
  };

  // 🔗 事件监听器引用 (用于清理)
  private eventListeners = new Map<string, Function>();

  constructor(
    private readonly eventBus: EventEmitter2,
    private readonly cacheService: SymbolMapperCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.setupEventListeners();
    this.logger.log('Symbol mapper cache monitoring service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.cleanupEventListeners();
    this.logger.log('Symbol mapper cache monitoring service destroyed');
  }

  /**
   * 🔗 设置事件监听器
   */
  private setupEventListeners(): void {
    // 缓存命中事件监听
    const hitListener = this.handleCacheHit.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.HIT, hitListener);
    this.eventListeners.set(CACHE_EVENTS.HIT, hitListener);

    // 缓存未命中事件监听
    const missListener = this.handleCacheMiss.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.MISS, missListener);
    this.eventListeners.set(CACHE_EVENTS.MISS, missListener);

    // 操作开始事件监听
    const startListener = this.handleOperationStart.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_START, startListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_START, startListener);

    // 操作完成事件监听
    const completeListener = this.handleOperationComplete.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_COMPLETE, completeListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_COMPLETE, completeListener);

    // 操作错误事件监听
    const errorListener = this.handleOperationError.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.OPERATION_ERROR, errorListener);
    this.eventListeners.set(CACHE_EVENTS.OPERATION_ERROR, errorListener);

    // 缓存禁用事件监听
    const disabledListener = this.handleCacheDisabled.bind(this);
    this.cacheService.onCacheEvent(CACHE_EVENTS.DISABLED, disabledListener);
    this.eventListeners.set(CACHE_EVENTS.DISABLED, disabledListener);
  }

  /**
   * 🧹 清理事件监听器
   */
  private cleanupEventListeners(): void {
    this.eventListeners.forEach((listener, event) => {
      this.cacheService.offCacheEvent(event as any, listener);
    });
    this.eventListeners.clear();
  }

  /**
   * 📊 处理缓存命中事件
   */
  private handleCacheHit(event: CacheHitEvent): void {
    // 更新统计数据
    this.cacheStats[event.layer].hits++;

    // 发送监控事件到全局事件总线
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_hit",
        metricValue: 1,
        tags: {
          layer: event.layer,
          provider: event.provider,
          cacheType: "symbol-mapper",
          operation: "hit",
          ...(event.symbol && { symbol: event.symbol }),
        },
      });
    });
  }

  /**
   * 📊 处理缓存未命中事件
   */
  private handleCacheMiss(event: CacheMissEvent): void {
    // 更新统计数据
    this.cacheStats[event.layer].misses++;

    // 发送监控事件到全局事件总线
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_miss",
        metricValue: 1,
        tags: {
          layer: event.layer,
          provider: event.provider,
          cacheType: "symbol-mapper",
          operation: "miss",
          ...(event.symbol && { symbol: event.symbol }),
        },
      });
    });
  }

  /**
   * 📊 处理操作开始事件
   */
  private handleOperationStart(event: CacheOperationStartEvent): void {
    this.cacheStats.totalQueries++;

    // 记录操作开始的调试日志
    this.logger.debug('Cache operation started', {
      provider: event.provider,
      symbolCount: event.symbolCount,
      direction: event.direction,
      isBatch: event.isBatch,
    });
  }

  /**
   * 📊 处理操作完成事件
   */
  private handleOperationComplete(event: CacheOperationCompleteEvent): void {
    const hitRatio = (event.cacheHits / event.symbolCount) * 100;
    const cacheEfficiency = hitRatio > 80 ? "high" : hitRatio > 50 ? "medium" : "low";

    // 记录性能日志
    this.logger.log('Cache operation completed', {
      provider: event.provider,
      symbolCount: event.symbolCount,
      cacheHits: event.cacheHits,
      hitRatio: Math.round(hitRatio),
      processingTime: event.processingTime,
      cacheEfficiency,
    });

    // 发送性能监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_mapper_cache",
        metricType: "performance",
        metricName: "mapping_performance",
        metricValue: event.processingTime,
        tags: {
          provider: event.provider,
          symbolsCount: event.symbolCount.toString(),
          hitRatio: Math.round(hitRatio).toString(),
          cacheEfficiency,
          cacheType: "symbol-mapper",
          direction: event.direction,
        },
      });
    });
  }

  /**
   * 📊 处理操作错误事件
   */
  private handleOperationError(event: CacheOperationErrorEvent): void {
    this.logger.error('Cache operation failed', {
      provider: event.provider,
      operation: event.operation,
      error: event.error,
      processingTime: event.processingTime,
      symbolCount: event.symbolCount,
    });

    // 发送错误监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_mapper_cache",
        metricType: "error",
        metricName: "cache_operation_error",
        metricValue: 1,
        tags: {
          provider: event.provider,
          operation: event.operation,
          error_type: "cache_operation",
          cacheType: "symbol-mapper",
        },
      });
    });
  }

  /**
   * 📊 处理缓存禁用事件
   */
  private handleCacheDisabled(event: CacheDisabledEvent): void {
    this.logger.warn('Symbol mapping cache disabled', {
      reason: event.reason,
      provider: event.provider,
      timestamp: new Date(event.timestamp).toISOString(),
    });

    // 发送缓存禁用监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(event.timestamp),
        source: "symbol_mapper_cache",
        metricType: "cache",
        metricName: "cache_disabled",
        metricValue: 1,
        tags: {
          reason: event.reason,
          provider: event.provider,
          cacheType: "symbol-mapper",
        },
      });
    });
  }

  /**
   * 📊 获取缓存统计信息 (用于调试和监控)
   */
  getCacheStats() {
    return { ...this.cacheStats };
  }

  /**
   * 📊 重置缓存统计信息
   */
  resetCacheStats(): void {
    this.cacheStats = {
      l1: { hits: 0, misses: 0 },
      l2: { hits: 0, misses: 0 },
      l3: { hits: 0, misses: 0 },
      totalQueries: 0,
    };
    this.logger.log('Cache statistics reset');
  }
}
```

#### 3.2 验收标准
- [ ] 监控服务能够正确监听所有缓存事件
- [ ] 监控数据发送到全局事件总线
- [ ] 统计数据正确维护
- [ ] 事件监听器正确清理

---

### 阶段4: 模块配置更新 (0.5天)

#### 4.1 更新模块依赖
**文件**: `src/core/05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { FeatureFlags } from "@config/feature-flags.config";
import { DatabaseModule } from "../../../../database/database.module";
import { SymbolMappingRepository } from "../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository";
import { SymbolMapperCacheService } from "../services/symbol-mapper-cache.service";
import { SymbolMapperCacheMonitoringService } from "../services/symbol-mapper-cache-monitoring.service"; // 新增

/**
 * Symbol Mapper Cache 独立模块
 *
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - MongoDB Change Stream 实时数据变更监听
 * - LRU内存缓存管理
 * - 并发控制和防重复查询
 * - 内存水位监控和自动清理
 * - 监听者模式监控数据收集
 */
@Module({
  imports: [
    DatabaseModule, // 统一数据库模块
    // EventEmitterModule 在 AppModule 中全局配置
  ],
  providers: [
    SymbolMapperCacheService,           // 核心缓存服务
    SymbolMapperCacheMonitoringService, // 监控服务
    SymbolMappingRepository,            // 数据库访问
    FeatureFlags,                       // 配置参数
  ],
  exports: [
    SymbolMapperCacheService,           // 只导出缓存服务
    // 不导出监控服务，保持监控逻辑内部化
  ],
})
export class SymbolMapperCacheModule {}
```

#### 4.2 验收标准
- [ ] 模块能正确注册两个服务
- [ ] 依赖注入正常工作
- [ ] 只导出缓存服务，不暴露监控实现

---

### 阶段5: 测试更新 (1天)

#### 5.1 更新缓存服务单元测试

**创建/更新测试文件**:
- `test/jest/unit/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.spec.ts`
- `test/jest/unit/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache-monitoring.service.spec.ts`

**缓存服务测试示例**:
```typescript
describe('SymbolMapperCacheService', () => {
  let service: SymbolMapperCacheService;
  let mockEventEmitter: jest.Mocked<EventEmitter>;

  beforeEach(async () => {
    // 测试配置，专注缓存逻辑
    // 不需要 EventEmitter2 依赖
  });

  describe('mapSymbols', () => {
    it('should emit cache hit event when L2 cache hits', async () => {
      // 准备缓存数据
      // 执行操作
      // 验证事件发射
      const eventSpy = jest.spyOn(service['cacheEventEmitter'], 'emit');

      await service.mapSymbols('longport', ['00700.HK'], 'to_standard');

      expect(eventSpy).toHaveBeenCalledWith(CACHE_EVENTS.HIT, expect.objectContaining({
        layer: 'l2',
        provider: 'longport'
      }));
    });

    it('should focus on cache logic without monitoring concerns', async () => {
      // 纯缓存逻辑测试
      // 验证缓存命中、未命中、数据正确性
      // 不关心监控数据
    });
  });
});
```

**监控服务测试示例**:
```typescript
describe('SymbolMapperCacheMonitoringService', () => {
  let monitoringService: SymbolMapperCacheMonitoringService;
  let cacheService: jest.Mocked<SymbolMapperCacheService>;
  let eventBus: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // 监控服务测试配置
  });

  describe('event handling', () => {
    it('should handle cache hit events correctly', () => {
      const event: CacheHitEvent = {
        layer: 'l2',
        provider: 'longport',
        symbol: '00700.HK',
        timestamp: Date.now()
      };

      monitoringService['handleCacheHit'](event);

      // 验证统计数据更新
      expect(monitoringService.getCacheStats().l2.hits).toBe(1);

      // 验证监控事件发送
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: "symbol_mapper_cache",
          metricName: "cache_hit"
        })
      );
    });
  });
});
```

#### 5.2 集成测试更新

**测试监控服务与缓存服务的集成**:
```typescript
describe('SymbolMapperCache Integration', () => {
  let cacheService: SymbolMapperCacheService;
  let monitoringService: SymbolMapperCacheMonitoringService;
  let eventBus: jest.Mocked<EventEmitter2>;

  it('should properly integrate cache and monitoring services', async () => {
    // 执行缓存操作
    await cacheService.mapSymbols('longport', ['00700.HK'], 'to_standard');

    // 验证监控数据
    const stats = monitoringService.getCacheStats();
    expect(stats.totalQueries).toBeGreaterThan(0);

    // 验证监控事件发送
    expect(eventBus.emit).toHaveBeenCalledWith(
      SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
      expect.any(Object)
    );
  });
});
```

#### 5.3 验收标准
- [ ] 缓存服务单元测试专注缓存逻辑
- [ ] 监控服务单元测试专注监控逻辑
- [ ] 集成测试验证两个服务协作
- [ ] 所有测试通过，覆盖率保持现有水平

---

## 🚀 实施时间表

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| 阶段1 | 事件接口设计 | 0.5天 | 开发者 |
| 阶段2 | 缓存服务重构 | 1.5天 | 开发者 |
| 阶段3 | 监控服务创建 | 1天 | 开发者 |
| 阶段4 | 模块配置更新 | 0.5天 | 开发者 |
| 阶段5 | 测试更新 | 1天 | 开发者 |

**总计**: 4.5天

---

## ✅ 验收检查清单

### 代码质量
- [ ] 缓存服务专注单一职责（符号映射缓存）
- [ ] 监控服务专注单一职责（监控数据收集）
- [ ] 事件接口定义清晰，类型安全
- [ ] 代码可读性和可维护性提升

### 功能完整性
- [ ] 所有原有监控功能保持不变
- [ ] 缓存功能保持不变
- [ ] 事件传递正确无误
- [ ] 监控数据准确性验证

### 测试覆盖
- [ ] 缓存逻辑单元测试通过
- [ ] 监控逻辑单元测试通过
- [ ] 集成测试通过
- [ ] 测试覆盖率不低于重构前

### 性能要求
- [ ] 重构后性能不低于重构前
- [ ] 事件发射开销可忽略
- [ ] 内存使用无显著增加

---

## 🎯 预期成果

### 架构改进
- ✅ 完全实现关注点分离
- ✅ 符合单一职责原则
- ✅ 提升代码可测试性
- ✅ 增强代码可维护性

### 代码指标
- **缓存服务**: ~1200行（专注缓存逻辑）
- **监控服务**: ~400行（专注监控逻辑）
- **总代码量**: 基本不变，但职责更清晰

### 开发体验
- 缓存逻辑修改不影响监控逻辑
- 监控逻辑修改不影响缓存逻辑
- 独立测试提升调试效率
- 代码审查更加专注

---

*重构计划 v1.0 | 监听者模式 | 预计4.5天完成*