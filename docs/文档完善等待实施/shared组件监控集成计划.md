# Core/Shared 组件监控集成计划

## 📋 概述

基于最新的监控组件使用指导文档，制定core/shared组件的标准化监控集成方案。遵循四层监控架构，确保所有shared服务通过CollectorService实现统一的监控接口。

## 🎯 集成目标

- **统一监控接口**：使用CollectorService作为唯一监控入口
- **标准化调用**：采用位置参数格式，避免对象参数
- **业务语义化**：通过metadata传递业务相关信息
- **容错设计**：监控故障不影响核心业务流程

## 📊 当前服务分析

### 1. MarketStatusService（540行）
**现状**：❌ 无监控集成  
**业务重要性**：⭐⭐⭐⭐⭐ 核心服务，提供市场状态计算  
**监控需求**：
- 缓存操作监控（Redis读写）
- 批量状态查询监控
- 性能异常检测（计算耗时）
- TTL推荐准确性监控

### 2. BaseFetcherService（278行） 
**现状**：⚠️ 使用MetricsRegistryService（架构不合规）  
**业务重要性**：⭐⭐⭐⭐ 抽象基类，影响所有数据提供商  
**监控需求**：
- 迁移到CollectorService架构
- 外部API调用监控
- 重试机制监控
- 性能阈值监控

### 3. DataChangeDetectorService（448行）
**现状**：⚠️ 仅有性能日志（不完整）  
**业务重要性**：⭐⭐⭐ 数据变化检测  
**监控需求**：
- 检测准确率统计
- 性能监控增强
- 缓存操作监控

### 4. BackgroundTaskService（32行）
**现状**：❌ 无监控集成  
**业务重要性**：⭐⭐ 简单的后台任务执行  
**监控需求**：
- 任务执行统计
- 错误率监控

### 5. FieldMappingService
**现状**：文件存在但未详细分析  
**需要**：进一步分析确定监控需求

## 🏗️ 监控架构设计

### 四层架构应用

```
┌─────────────────┐
│   Presenter     │  ← HTTP接口展示 (不涉及shared组件)
├─────────────────┤
│   Analyzer      │  ← 分析处理层 (不涉及shared组件)  
├─────────────────┤
│   Collector     │  ← ✅ Shared组件使用层
├─────────────────┤
│ Infrastructure  │  ← 基础设施层 (CollectorService内部使用)
└─────────────────┘
```

### 集成原则
1. **唯一接口**：所有shared服务只使用CollectorService
2. **位置参数**：统一使用位置参数格式，非对象参数
3. **异步隔离**：监控操作使用setImmediate()避免阻塞业务
4. **容错保护**：监控异常通过try-catch隔离

## 📝 具体实施方案

### 1. MarketStatusService 监控集成

```typescript
// src/core/shared/services/market-status.service.ts
@Injectable()
export class MarketStatusService implements OnModuleDestroy {
  constructor(
    private readonly collectorService: CollectorService, // ✅ 标准依赖注入
    private readonly logger: Logger,
  ) {}

  async getMarketStatus(market: Market): Promise<MarketStatusResult> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // 检查缓存逻辑...
      const cached = this.getCachedStatus(market);
      if (cached) {
        cacheHit = true;
        
        // ✅ 缓存命中监控
        this.safeRecordCacheOperation('get', true, Date.now() - startTime, {
          market,
          operation: 'get_market_status',
          source: 'memory_cache'
        });
        
        return cached;
      }

      // 计算市场状态逻辑...
      const status = await this.calculateLocalMarketStatus(market);
      
      // 缓存结果
      this.cacheStatus(market, status);
      
      // ✅ 缓存未命中监控
      this.safeRecordCacheOperation('get', false, Date.now() - startTime, {
        market,
        operation: 'get_market_status',
        calculation_required: true
      });

      return status;
    } catch (error) {
      // ✅ 错误监控
      this.safeRecordRequest(
        `/internal/market-status/${market}`,
        'GET',
        500,
        Date.now() - startTime,
        {
          operation: 'get_market_status',
          market,
          cache_hit: cacheHit,
          error: error.message
        }
      );
      
      throw error; // 重新抛出异常
    }
  }

  async getBatchMarketStatus(markets: Market[]): Promise<Record<Market, MarketStatusResult>> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      // 批量处理逻辑...
      const results = await Promise.allSettled(
        markets.map(market => this.getMarketStatus(market))
      );

      // 统计结果
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
        }
      });

      // ✅ 批量操作监控
      this.safeRecordRequest(
        '/internal/market-status/batch',
        'POST', 
        errorCount > 0 ? 207 : 200, // 207=部分成功
        Date.now() - startTime,
        {
          operation: 'batch_market_status',
          total_markets: markets.length,
          success_count: successCount,
          error_count: errorCount,
          markets: markets.join(',')
        }
      );

      return this.processResults(results, markets);
    } catch (error) {
      // 错误处理...
      throw error;
    }
  }

  // ✅ 监控故障隔离方法
  private safeRecordRequest(endpoint: string, method: string, statusCode: number, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordRequest(endpoint, method, statusCode, duration, metadata);
      } catch (error) {
        this.logger.warn('监控记录失败', { error: error.message, endpoint, method });
      }
    });
  }

  private safeRecordCacheOperation(operation: string, hit: boolean, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordCacheOperation(operation, hit, duration, metadata);
      } catch (error) {
        this.logger.warn('缓存监控记录失败', { error: error.message, operation });
      }
    });
  }
}
```

### 2. BaseFetcherService 架构迁移

```typescript
// src/core/shared/services/base-fetcher.service.ts
@Injectable()
export abstract class BaseFetcherService {
  constructor(
    // ❌ 移除 MetricsRegistryService 直接依赖
    // @Optional() protected readonly metricsRegistry?: MetricsRegistryService,
    
    // ✅ 使用 CollectorService
    protected readonly collectorService: CollectorService,
    protected readonly logger: Logger,
  ) {}

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 2,
    retryDelayMs: number = 1000,
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // ✅ 成功监控 - 使用外部API调用监控
        this.safeRecordExternalCall(
          context,
          'POST', // 假设大多数操作是POST
          200,
          Date.now() - startTime,
          {
            operation: context,
            provider: 'external_api',
            attempt_count: attempt + 1,
            max_retries: maxRetries + 1,
            call_type: 'data_fetch'
          }
        );
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          // ✅ 最终失败监控
          this.safeRecordExternalCall(
            context,
            'POST',
            500,
            Date.now() - startTime,
            {
              operation: context,
              provider: 'external_api',
              attempt_count: attempt + 1,
              max_retries: maxRetries + 1,
              call_type: 'data_fetch',
              error: error.message,
              error_type: error.constructor.name
            }
          );
          break;
        }
        
        await this.sleep(retryDelayMs);
        retryDelayMs *= 1.5; // 指数退避
      }
    }
    
    throw lastError;
  }

  // ✅ 使用HTTP请求监控记录外部API调用
  private safeRecordExternalCall(endpoint: string, method: string, statusCode: number, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordRequest(`/external/${endpoint}`, method, statusCode, duration, metadata);
      } catch (error) {
        this.logger.warn('外部调用监控记录失败', { error: error.message, endpoint });
      }
    });
  }
}
```

### 3. DataChangeDetectorService 监控增强

```typescript
// src/core/shared/services/data-change-detector.service.ts
@Injectable()
export class DataChangeDetectorService {
  constructor(
    private readonly collectorService: CollectorService, // ✅ 新增监控依赖
    private readonly logger: Logger,
  ) {}

  async detectSignificantChange(
    symbol: string,
    newData: any,
    market: Market,
    marketStatus: MarketStatus,
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();
    
    try {
      // 现有检测逻辑...
      const result = await this.performDetection(symbol, newData, market, marketStatus);
      
      // ✅ 检测成功监控
      this.safeRecordRequest(
        '/internal/change-detection',
        'POST',
        200,
        Date.now() - startTime,
        {
          operation: 'detect_significant_change',
          symbol,
          market,
          market_status: marketStatus,
          has_changed: result.hasChanged,
          significant_changes: result.significantChanges.length,
          confidence: result.confidence
        }
      );
      
      // 保持现有性能日志
      this.logPerformance('detect_significant_change', startTime);
      
      return result;
    } catch (error) {
      // ✅ 检测失败监控
      this.safeRecordRequest(
        '/internal/change-detection',
        'POST',
        500,
        Date.now() - startTime,
        {
          operation: 'detect_significant_change',
          symbol,
          market,
          error: error.message
        }
      );
      
      throw error;
    }
  }

  private async getLastSnapshot(symbol: string): Promise<DataSnapshot | null> {
    const startTime = Date.now();
    
    try {
      // 现有获取逻辑...
      const snapshot = this.snapshotCache.get(symbol) || null;
      const hit = snapshot !== null;
      
      // ✅ 缓存操作监控
      this.safeRecordCacheOperation('get', hit, Date.now() - startTime, {
        cache_type: 'memory',
        operation: 'get_snapshot',
        symbol
      });
      
      return snapshot;
    } catch (error) {
      // 错误处理...
      throw error;
    }
  }

  private safeRecordRequest(endpoint: string, method: string, statusCode: number, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordRequest(endpoint, method, statusCode, duration, metadata);
      } catch (error) {
        this.logger.warn('变化检测监控记录失败', { error: error.message });
      }
    });
  }

  private safeRecordCacheOperation(operation: string, hit: boolean, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordCacheOperation(operation, hit, duration, metadata);
      } catch (error) {
        this.logger.warn('缓存操作监控记录失败', { error: error.message });
      }
    });
  }
}
```

### 4. BackgroundTaskService 监控集成

```typescript
// src/core/shared/services/background-task.service.ts
@Injectable()
export class BackgroundTaskService {
  private readonly taskCounter = new Map<string, number>(); // 任务类型计数器

  constructor(
    private readonly collectorService: CollectorService, // ✅ 新增监控依赖
    private readonly logger: Logger,
  ) {}

  run(task: () => Promise<any>, description: string): void {
    const taskId = `${description}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    
    this.logger.debug(`Executing background task: ${description}`);
    
    // 更新任务计数
    const currentCount = this.taskCounter.get(description) || 0;
    this.taskCounter.set(description, currentCount + 1);

    setImmediate(() => {
      Promise.resolve()
        .then(task)
        .then(() => {
          // ✅ 任务成功监控
          this.safeRecordRequest(
            `/internal/background-task/${description}`,
            'POST',
            200,
            Date.now() - startTime,
            {
              operation: 'background_task_execution',
              task_type: description,
              task_id: taskId,
              status: 'success'
            }
          );
        })
        .catch((error) => {
          // ✅ 任务失败监控
          this.safeRecordRequest(
            `/internal/background-task/${description}`,
            'POST',
            500,
            Date.now() - startTime,
            {
              operation: 'background_task_execution',
              task_type: description,
              task_id: taskId,
              status: 'error',
              error: error.message
            }
          );
          
          // 保持原有错误日志
          this.logger.error(
            `Background task "${description}" failed.`,
            sanitizeLogData({
              error: error.message,
              stack: error.stack,
            }),
          );
        })
        .finally(() => {
          // 减少任务计数
          const count = this.taskCounter.get(description) || 1;
          if (count <= 1) {
            this.taskCounter.delete(description);
          } else {
            this.taskCounter.set(description, count - 1);
          }
        });
    });
  }

  // ✅ 获取任务统计（新增功能）
  getTaskStatistics(): Record<string, number> {
    return Object.fromEntries(this.taskCounter.entries());
  }

  private safeRecordRequest(endpoint: string, method: string, statusCode: number, duration: number, metadata: any) {
    try {
      this.collectorService.recordRequest(endpoint, method, statusCode, duration, metadata);
    } catch (error) {
      this.logger.warn('后台任务监控记录失败', { error: error.message });
    }
  }
}
```

## 🔧 模块配置更新

### Shared模块导入监控模块

```typescript
// src/core/shared/shared.module.ts
import { Module } from '@nestjs/common';
import { MonitoringModule } from '../../monitoring/monitoring.module'; // ✅ 导入监控模块

@Module({
  imports: [
    MonitoringModule, // ✅ 标准监控模块导入，获得CollectorService
  ],
  providers: [
    MarketStatusService,
    BaseFetcherService,
    BackgroundTaskService, 
    DataChangeDetectorService,
    FieldMappingService,
  ],
  exports: [
    MarketStatusService,
    BaseFetcherService,
    BackgroundTaskService,
    DataChangeDetectorService,
    FieldMappingService,
  ],
})
export class SharedModule {}
```

## 🧪 测试策略

### 单元测试模板

```typescript
// 测试示例：market-status.service.spec.ts
describe('MarketStatusService', () => {
  let service: MarketStatusService;
  let mockCollectorService: jest.Mocked<CollectorService>;
  
  beforeEach(async () => {
    const mockCollector = {
      recordRequest: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordDatabaseOperation: jest.fn(),
    };
    
    const module = await Test.createTestingModule({
      providers: [
        MarketStatusService,
        { provide: CollectorService, useValue: mockCollector },
      ],
    }).compile();
    
    service = module.get<MarketStatusService>(MarketStatusService);
    mockCollectorService = module.get(CollectorService);
  });
  
  it('should record cache hit metrics on successful cache lookup', async () => {
    // 测试逻辑...
    
    expect(mockCollectorService.recordCacheOperation).toHaveBeenCalledWith(
      'get',                              // operation
      true,                               // hit
      expect.any(Number),                 // duration
      expect.objectContaining({           // metadata
        market: 'HK',
        operation: 'get_market_status'
      })
    );
  });
});
```

## 📊 关键监控指标

### 1. MarketStatusService
- `cache_hit_rate`: 缓存命中率 (目标 > 80%)
- `calculation_duration`: 市场状态计算耗时 (目标 < 100ms)
- `batch_processing_efficiency`: 批量处理效率

### 2. BaseFetcherService
- `retry_success_rate`: 重试成功率
- `external_api_response_time`: 外部API响应时间
- `error_rate_by_provider`: 按提供商分组的错误率

### 3. DataChangeDetectorService
- `detection_accuracy`: 检测准确率
- `change_detection_duration`: 检测耗时 (目标 < 10ms)
- `cache_efficiency`: 快照缓存效率

### 4. BackgroundTaskService
- `task_success_rate`: 任务成功率
- `average_task_duration`: 平均任务执行时间
- `concurrent_task_count`: 并发任务数量

## ⏱️ 实施时间表

### 阶段1：架构迁移 (1-2天)
- [ ] BaseFetcherService迁移到CollectorService
- [ ] 移除所有MetricsRegistryService直接依赖
- [ ] 验证架构边界清晰

### 阶段2：标准监控集成 (2-3天)
- [ ] MarketStatusService监控集成
- [ ] DataChangeDetectorService监控增强
- [ ] BackgroundTaskService监控集成
- [ ] FieldMappingService分析和集成

### 阶段3：测试和验证 (1-2天)
- [ ] 单元测试更新和验证
- [ ] 监控数据流验证
- [ ] 性能影响评估

### 阶段4：文档和部署 (1天)
- [ ] 更新API文档
- [ ] 监控指标仪表板配置
- [ ] 部署和验收测试

## 🎯 成功标准

1. **架构合规**：所有shared服务只使用CollectorService，零MetricsRegistryService直接依赖
2. **监控覆盖**：核心业务操作100%监控覆盖
3. **性能无影响**：监控添加对业务性能影响 < 1%
4. **测试通过**：单元测试和集成测试100%通过
5. **文档完整**：监控API使用文档和指标说明完整

## 🔍 风险控制

1. **分批实施**：按服务重要性分批实施，降低风险
2. **监控隔离**：监控故障通过try-catch隔离，不影响业务
3. **性能测试**：每个阶段完成后进行性能回归测试
4. **回滚准备**：保留原有实现，支持快速回滚

## 📈 后续优化

1. **智能阈值**：基于历史数据动态调整监控阈值
2. **预警机制**：集成告警系统，实时监控异常
3. **性能优化**：基于监控数据持续优化性能热点
4. **扩展性**：为未来新增shared服务预留监控模板

---

**文档版本**: v1.0  
**更新时间**: 2025-08-25  
**负责人**: Core/Shared组件团队  
**审核状态**: 待审核