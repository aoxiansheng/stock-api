# data-mapper 组件联合 data-mapper-cache 组件问题修复指南

## 📋 修复概述

基于代码审查发现的问题，本文档提供详细的修复指南。修复项目按风险等级和影响范围分类，提供具体的代码修改建议和验证方案。

## 🔥 高优先级修复项（立即处理）

### 1. 优化 updateRuleStats 数据库查询效率

**问题描述**: `FlexibleMappingRuleService.updateRuleStats()` 方法存在冗余的数据库查询

**影响范围**: 
- 每次规则应用都会触发统计更新
- 高频使用场景下影响性能
- 可能导致数据库连接池压力

**修复方案**: 

#### 1.1 优化数据库查询逻辑

**文件**: `src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`

**当前代码** (第726-740行):
```typescript
private async updateRuleStats(dataMapperRuleId: string, success: boolean): Promise<void> {
  const updateFields: any = {
    $inc: { usageCount: 1 },
    $set: { lastUsedAt: new Date() }
  };

  if (success) {
    updateFields.$inc.successfulTransformations = 1;
  } else {
    updateFields.$inc.failedTransformations = 1;
  }

  await this.ruleModel.findByIdAndUpdate(dataMapperRuleId, updateFields);

  // 🔥 问题：冗余查询
  const rule = await this.ruleModel.findById(dataMapperRuleId);
  if (rule) {
    const total = rule.successfulTransformations + rule.failedTransformations;
    const successRate = total > 0 ? rule.successfulTransformations / total : 0;
    
    await this.ruleModel.findByIdAndUpdate(dataMapperRuleId, { 
      $set: { successRate } 
    });
  }
}
```

**修复后代码**:
```typescript
private async updateRuleStats(dataMapperRuleId: string, success: boolean): Promise<void> {
  // 🔧 修复：使用 aggregation pipeline 一次性完成所有更新
  const pipeline = [
    {
      $set: {
        usageCount: { $add: ['$usageCount', 1] },
        lastUsedAt: new Date(),
        successfulTransformations: success 
          ? { $add: ['$successfulTransformations', 1] }
          : '$successfulTransformations',
        failedTransformations: success
          ? '$failedTransformations'
          : { $add: ['$failedTransformations', 1] }
      }
    },
    {
      $set: {
        successRate: {
          $cond: {
            if: { $gt: [{ $add: ['$successfulTransformations', '$failedTransformations'] }, 0] },
            then: {
              $divide: [
                '$successfulTransformations',
                { $add: ['$successfulTransformations', '$failedTransformations'] }
              ]
            },
            else: 0
          }
        }
      }
    }
  ];

  try {
    const result = await this.ruleModel.findByIdAndUpdate(
      dataMapperRuleId,
      pipeline,
      { new: true, returnDocument: 'after' }
    );

    if (!result) {
      this.logger.warn('规则统计更新失败：规则不存在', { dataMapperRuleId });
      return;
    }

    // 🔧 优化：只有统计更新成功才失效缓存，减少不必要的缓存操作
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(result);
    await this.mappingRuleCacheService.invalidateRuleCache(dataMapperRuleId, ruleDto);

  } catch (error) {
    this.logger.error('更新规则统计失败', { 
      dataMapperRuleId, 
      success, 
      error: error.message 
    });
    // 不抛出异常，避免影响主业务逻辑
  }
}
```

#### 1.2 添加批量统计更新机制

**新增文件**: `src/core/00-prepare/data-mapper/services/rule-stats-batch.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FlexibleMappingRule, FlexibleMappingRuleDocument } from '../schemas/flexible-mapping-rule.schema';
import { createLogger } from '@common/config/logger.config';

interface StatsBatch {
  ruleId: string;
  success: boolean;
  timestamp: Date;
}

@Injectable()
export class RuleStatsBatchService {
  private readonly logger = createLogger(RuleStatsBatchService.name);
  private readonly batchQueue: Map<string, StatsBatch[]> = new Map();
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 5000; // 5秒

  constructor(
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
  ) {
    // 定期清理批处理队列
    setInterval(() => this.processBatches(), this.BATCH_TIMEOUT);
  }

  /**
   * 添加统计更新到批处理队列
   */
  addStatUpdate(ruleId: string, success: boolean): void {
    if (!this.batchQueue.has(ruleId)) {
      this.batchQueue.set(ruleId, []);
    }
    
    this.batchQueue.get(ruleId)!.push({
      ruleId,
      success,
      timestamp: new Date()
    });

    // 达到批处理大小时立即处理
    if (this.batchQueue.get(ruleId)!.length >= this.BATCH_SIZE) {
      this.processBatch(ruleId);
    }
  }

  /**
   * 处理单个规则的批次
   */
  private async processBatch(ruleId: string): Promise<void> {
    const batch = this.batchQueue.get(ruleId);
    if (!batch || batch.length === 0) return;

    try {
      const successCount = batch.filter(item => item.success).length;
      const failureCount = batch.length - successCount;

      await this.ruleModel.findByIdAndUpdate(ruleId, {
        $inc: {
          usageCount: batch.length,
          successfulTransformations: successCount,
          failedTransformations: failureCount
        },
        $set: { lastUsedAt: new Date() }
      });

      // 重新计算成功率
      const rule = await this.ruleModel.findById(ruleId);
      if (rule) {
        const total = rule.successfulTransformations + rule.failedTransformations;
        const successRate = total > 0 ? rule.successfulTransformations / total : 0;
        
        await this.ruleModel.findByIdAndUpdate(ruleId, { 
          $set: { successRate } 
        });
      }

      this.logger.debug('批量统计更新完成', { 
        ruleId, 
        batchSize: batch.length, 
        successCount, 
        failureCount 
      });

    } catch (error) {
      this.logger.error('批量统计更新失败', { ruleId, error: error.message });
    } finally {
      this.batchQueue.delete(ruleId);
    }
  }

  /**
   * 处理所有待处理批次
   */
  private async processBatches(): Promise<void> {
    const ruleIds = Array.from(this.batchQueue.keys());
    await Promise.all(ruleIds.map(ruleId => this.processBatch(ruleId)));
  }
}
```

### 2. 修复 Redis KEYS 命令性能问题

**问题描述**: `DataMapperCacheService` 使用 `redis.keys()` 可能在大数据集下造成性能阻塞

**影响范围**:
- 缓存清理操作可能阻塞 Redis
- 影响所有依赖 Redis 的服务

**修复方案**:

**文件**: `src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`

**当前代码** (第380行和第415行):
```typescript
// 🔥 问题：使用 KEYS 命令
const keys = await this.redis.keys(pattern);
```

**修复后代码**:
```typescript
/**
 * 🔧 使用 SCAN 替代 KEYS 命令的安全方法
 */
private async scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  
  do {
    const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  
  return keys;
}

/**
 * 🔧 修复后的失效提供商缓存方法
 */
async invalidateProviderCache(provider: string): Promise<void> {
  try {
    const patterns = [
      `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:*`,
      `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.PROVIDER_RULES}:${provider}:*`,
    ];

    for (const pattern of patterns) {
      // 🔧 使用 SCAN 替代 KEYS
      const keys = await this.scanKeys(pattern);
      
      if (keys.length > 0) {
        // 分批删除，避免单次删除过多键
        const BATCH_SIZE = 100;
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          await this.redis.del(...batch);
        }
      }
    }

    this.logger.log('提供商相关缓存已失效', { provider });
    
    // 📊 监控记录
    this.collectorService?.recordCacheOperation(
      'delete',
      true,
      Date.now(),
      {
        cacheType: 'redis',
        service: 'DataMapperCacheService',
        operation: 'invalidateProviderCache',
        provider
      }
    );
  } catch (error) {
    this.logger.error('失效提供商缓存失败', {
      provider,
      error: error.message
    });
    throw error;
  }
}

/**
 * 🔧 修复后的清空所有缓存方法
 */
async clearAllRuleCache(): Promise<void> {
  try {
    const patterns = Object.values(DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS)
      .map(prefix => `${prefix}:*`);
    
    let totalDeleted = 0;
    
    for (const pattern of patterns) {
      const keys = await this.scanKeys(pattern);
      
      if (keys.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          await this.redis.del(...batch);
          totalDeleted += batch.length;
        }
      }
    }

    this.logger.log('所有规则缓存已清空', { deletedKeys: totalDeleted });
    
    // 📊 监控记录
    this.collectorService?.recordCacheOperation(
      'delete',
      true,
      Date.now(),
      {
        cacheType: 'redis',
        service: 'DataMapperCacheService',
        operation: 'clearAllRuleCache',
        deletedKeys: totalDeleted
      }
    );
  } catch (error) {
    this.logger.error('清空规则缓存失败', { error: error.message });
    throw error;
  }
}
```

### 3. 修复 CollectorService 类型安全问题

**问题描述**: 使用 `any` 类型和字符串令牌注入 CollectorService

**影响范围**:
- 类型安全性差
- 运行时可能出现未定义方法错误
- IDE 无法提供代码补全

**修复方案**:

#### 3.1 创建 CollectorService 接口

**新增文件**: `src/core/05-caching/data-mapper-cache/interfaces/collector.interface.ts`

```typescript
export interface ICollectorService {
  recordCacheOperation(
    operation: string,
    hit: boolean,
    duration: number,
    metadata?: any
  ): void;

  recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void;

  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    metadata?: any
  ): void;
}
```

#### 3.2 修复 DataMapperCacheModule

**文件**: `src/core/05-caching/data-mapper-cache/module/data-mapper-cache.module.ts`

**当前代码**:
```typescript
providers: [
  DataMapperCacheService,
  // 🔥 问题：fallback mock 和 any 类型
  {
    provide: 'CollectorService',
    useFactory: () => ({
      recordCacheOperation: () => {}, // fallback mock
    }),
  },
],
```

**修复后代码**:
```typescript
import { ICollectorService } from '../interfaces/collector.interface';

@Module({
  imports: [
    NestRedisModule,
    MonitoringModule, // 确保 MonitoringModule 导出 CollectorService
  ],
  providers: [
    DataMapperCacheService,
    // 🔧 修复：移除 fallback，使用条件注入
    {
      provide: 'ICollectorService',
      useFactory: (collectorService?: CollectorService) => {
        if (!collectorService) {
          throw new Error('CollectorService 未正确注入，请检查 MonitoringModule 配置');
        }
        return collectorService;
      },
      inject: [CollectorService], // 直接注入 CollectorService 类
    },
  ],
  exports: [DataMapperCacheService],
})
export class DataMapperCacheModule {}
```

#### 3.3 修复 DataMapperCacheService

**文件**: `src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`

**当前代码**:
```typescript
constructor(
  private readonly redisService: RedisService,
  @Inject('CollectorService') private readonly collectorService: any, // 🔥 问题
) {}
```

**修复后代码**:
```typescript
import { ICollectorService } from '../interfaces/collector.interface';

constructor(
  private readonly redisService: RedisService,
  @Inject('ICollectorService') private readonly collectorService: ICollectorService, // 🔧 修复
) {}
```

## 🟡 中优先级修复项（近期处理）

### 4. 统一监控记录一致性

**问题描述**: 部分缓存操作缺少监控记录

**修复方案**:

**文件**: `src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`

在所有缺少监控的方法中添加监控记录：

```typescript
/**
 * 🔧 修复：为 cacheRuleById 添加监控记录
 */
async cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void> {
  if (!rule.id) {
    this.logger.warn('尝试缓存没有ID的规则，已跳过', {
      ruleName: rule.name,
      provider: rule.provider
    });
    return;
  }

  const startTime = Date.now();
  const cacheKey = this.buildRuleByIdKey(rule.id);
  
  try {
    await this.redis.setex(
      cacheKey,
      DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
      JSON.stringify(rule)
    );
    
    this.logger.debug('规则内容已缓存', {
      dataMapperRuleId: rule.id,
      ruleName: rule.name,
      provider: rule.provider
    });

    // 🔧 添加监控记录
    this.collectorService.recordCacheOperation(
      'set',
      true,
      Date.now() - startTime,
      {
        cacheType: 'redis',
        key: cacheKey,
        service: 'DataMapperCacheService',
        layer: 'L2_rule_by_id',
        ttl: DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID
      }
    );

  } catch (error) {
    this.logger.warn('缓存规则内容失败', {
      dataMapperRuleId: rule.id,
      error: error.message
    });

    // 🔧 添加错误监控记录
    this.collectorService.recordCacheOperation(
      'set',
      false,
      Date.now() - startTime,
      {
        cacheType: 'redis',
        key: cacheKey,
        service: 'DataMapperCacheService',
        layer: 'L2_rule_by_id',
        error: error.message
      }
    );
    
    throw error;
  }
}
```

### 5. 添加缓存大小验证

**问题描述**: 配置了缓存大小限制但未实际验证

**修复方案**:

**文件**: `src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service.ts`

添加验证方法：

```typescript
/**
 * 🔧 新增：验证缓存键和数据大小
 */
private validateCacheData(key: string, data: any): void {
  // 验证键长度
  if (key.length > DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH) {
    throw new Error(
      `缓存键长度超限: ${key.length}/${DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH}`
    );
  }

  // 验证数据大小
  const dataStr = JSON.stringify(data);
  const sizeKB = Buffer.byteLength(dataStr, 'utf8') / 1024;
  
  if (sizeKB > DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_RULE_SIZE_KB) {
    throw new Error(
      `规则数据过大: ${sizeKB.toFixed(2)}KB/${DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_RULE_SIZE_KB}KB`
    );
  }
}

/**
 * 🔧 修复：在所有缓存设置方法中添加验证
 */
async cacheBestMatchingRule(
  provider: string,
  apiType: 'rest' | 'stream',
  transDataRuleListType: string,
  rule: FlexibleMappingRuleResponseDto
): Promise<void> {
  const startTime = Date.now();
  const cacheKey = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
  
  try {
    // 🔧 添加验证
    this.validateCacheData(cacheKey, rule);
    
    await this.redis.setex(
      cacheKey,
      DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
      JSON.stringify(rule)
    );
    
    // ... 其余代码保持不变
  } catch (error) {
    this.logger.warn('缓存最佳匹配规则失败', {
      provider,
      apiType,
      transDataRuleListType,
      error: error.message
    });
    
    throw error;
  }
}
```

### 6. 移除硬编码参数

**问题描述**: 业务逻辑中存在硬编码阈值

**修复方案**:

#### 6.1 创建业务常量文件

**新增文件**: `src/core/00-prepare/data-mapper/constants/business-rules.constants.ts`

```typescript
export const DATA_MAPPER_BUSINESS_CONSTANTS = {
  // 规则应用阈值
  RULE_APPLICATION: {
    SUCCESS_RATE_THRESHOLD: parseFloat(process.env.MAPPING_SUCCESS_THRESHOLD || '0.5'),
    MIN_CONFIDENCE_SCORE: parseFloat(process.env.MIN_CONFIDENCE_SCORE || '0.7'),
    MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_MAPPING_RETRIES || '3'),
  },

  // 缓存预热配置
  CACHE_WARMUP: {
    MAX_RULES_COUNT: parseInt(process.env.CACHE_WARMUP_RULES || '50'),
    BATCH_SIZE: parseInt(process.env.WARMUP_BATCH_SIZE || '10'),
  },

  // 性能阈值
  PERFORMANCE: {
    SLOW_MAPPING_MS: parseInt(process.env.SLOW_MAPPING_THRESHOLD || '100'),
    MAX_FIELD_MAPPINGS: parseInt(process.env.MAX_FIELD_MAPPINGS || '100'),
  },
} as const;
```

#### 6.2 修复硬编码使用

**文件**: `src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`

**当前代码**:
```typescript
success: successRate > 0.5, // 硬编码
```

**修复后代码**:
```typescript
import { DATA_MAPPER_BUSINESS_CONSTANTS } from '../constants/business-rules.constants';

// 第540行
success: successRate > DATA_MAPPER_BUSINESS_CONSTANTS.RULE_APPLICATION.SUCCESS_RATE_THRESHOLD,
```

**第835行**:
```typescript
// 当前
.limit(50) // 硬编码

// 修复后
.limit(DATA_MAPPER_BUSINESS_CONSTANTS.CACHE_WARMUP.MAX_RULES_COUNT)
```

## 🔵 低优先级修复项（长期优化）

### 7. 简化缓存服务架构

**问题描述**: `MappingRuleCacheService` 是不必要的代理层

**修复方案**:

#### 7.1 逐步迁移直接依赖

**文件**: `src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`

```typescript
// 🔧 逐步替换注入的服务
constructor(
  @InjectModel(FlexibleMappingRule.name)
  private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
  @InjectModel(DataSourceTemplate.name)
  private readonly templateModel: Model<DataSourceTemplateDocument>,
  private readonly paginationService: PaginationService,
  private readonly templateService: DataSourceTemplateService,
  // 🔧 直接注入 DataMapperCacheService
  private readonly dataMapperCacheService: DataMapperCacheService,
  private readonly collectorService: CollectorService,
) {}

// 🔧 将所有 mappingRuleCacheService 调用替换为 dataMapperCacheService
```

#### 7.2 移除 MappingRuleCacheService

在确认所有引用都已更新后：

1. 从 `data-mapper.module.ts` 中移除 `MappingRuleCacheService`
2. 删除文件 `src/core/00-prepare/data-mapper/services/mapping-rule-cache.service.ts`

### 8. 内存泄漏防护

**问题描述**: 高频异步任务可能导致内存累积

**修复方案**:

#### 8.1 添加异步任务队列管理

**新增文件**: `src/core/00-prepare/data-mapper/services/async-task-manager.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';

@Injectable()
export class AsyncTaskManager {
  private readonly logger = createLogger(AsyncTaskManager.name);
  private pendingTasks = new Set<Promise<any>>();
  private readonly MAX_PENDING_TASKS = 1000;

  async scheduleTask<T>(taskFn: () => Promise<T>): Promise<void> {
    // 检查是否超过最大pending任务数
    if (this.pendingTasks.size >= this.MAX_PENDING_TASKS) {
      this.logger.warn('异步任务队列已满，跳过任务', {
        pendingTasks: this.pendingTasks.size,
        maxTasks: this.MAX_PENDING_TASKS
      });
      return;
    }

    const task = taskFn().finally(() => {
      this.pendingTasks.delete(task);
    });

    this.pendingTasks.add(task);
  }

  getTaskCount(): number {
    return this.pendingTasks.size;
  }
}
```

#### 8.2 修复异步任务调用

**文件**: `src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`

```typescript
constructor(
  // ... 其他依赖
  private readonly asyncTaskManager: AsyncTaskManager,
) {}

// 🔧 修复异步缓存调用
async findRuleById(id: string): Promise<FlexibleMappingRuleResponseDto> {
  // ... 查询逻辑

  // 🔧 使用任务管理器替代 setImmediate
  this.asyncTaskManager.scheduleTask(async () => {
    try {
      await this.dataMapperCacheService.cacheRuleById(ruleDto);
    } catch (error) {
      this.logger.warn('缓存规则失败', { id, error: error.message });
    }
  });

  return ruleDto;
}
```

## 🧪 验证和测试方案

### 1. 性能测试

#### 1.1 数据库查询性能测试

**新增文件**: `test/performance/data-mapper-performance.spec.ts`

```typescript
describe('Data Mapper Performance Tests', () => {
  it('should handle high-frequency rule stats updates efficiently', async () => {
    const ruleId = 'test-rule-id';
    const iterations = 1000;
    
    const startTime = Date.now();
    
    // 并发更新统计
    const promises = Array(iterations).fill(0).map((_, index) => 
      service.updateRuleStats(ruleId, index % 2 === 0)
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 1000次更新应在5秒内完成
  });

  it('should handle Redis SCAN operations without blocking', async () => {
    // 创建大量测试键
    const testKeys = Array(10000).fill(0).map((_, i) => `dm:test:key:${i}`);
    await Promise.all(testKeys.map(key => redis.set(key, 'test-value')));
    
    const startTime = Date.now();
    
    // 测试 SCAN 性能
    const keys = await cacheService.scanKeys('dm:test:key:*');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // SCAN 应在1秒内完成
    expect(keys.length).toBe(10000);
  });
});
```

#### 1.2 缓存一致性测试

```typescript
describe('Cache Consistency Tests', () => {
  it('should maintain cache consistency during concurrent updates', async () => {
    const ruleId = 'consistency-test-rule';
    
    // 并发更新规则
    const updatePromises = Array(100).fill(0).map(() => 
      service.updateRule(ruleId, { description: `Updated at ${Date.now()}` })
    );
    
    await Promise.all(updatePromises);
    
    // 验证缓存一致性
    const cachedRule = await cacheService.getCachedRuleById(ruleId);
    const dbRule = await service.findRuleById(ruleId);
    
    expect(cachedRule.description).toBe(dbRule.description);
  });
});
```

### 2. 监控指标验证

#### 2.1 创建监控仪表板

**配置文件**: `monitoring/dashboards/data-mapper-metrics.json`

```json
{
  "dashboard": {
    "title": "Data Mapper Performance",
    "panels": [
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])",
            "legendFormat": "Cache Hit Rate"
          }
        ]
      },
      {
        "title": "Database Query Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))",
            "legendFormat": "P95 Query Duration"
          }
        ]
      },
      {
        "title": "Async Task Queue Size",
        "targets": [
          {
            "expr": "async_task_queue_size",
            "legendFormat": "Pending Tasks"
          }
        ]
      }
    ]
  }
}
```

## 🚀 部署和回滚方案

### 1. 分阶段部署计划

#### Phase 1: 数据库优化（风险：低）
- 部署 `updateRuleStats` 优化
- 监控数据库性能指标
- 回滚条件：数据库CPU使用率超过80%

#### Phase 2: 缓存优化（风险：中）
- 部署 Redis SCAN 优化
- 部署缓存验证机制
- 监控Redis性能和内存使用
- 回滚条件：Redis响应时间超过100ms

#### Phase 3: 架构简化（风险：高）
- 逐步替换 MappingRuleCacheService 依赖
- 全面测试功能完整性
- 回滚条件：任何功能异常

### 2. 监控告警配置

```yaml
alerts:
  - alert: DataMapperCacheHitRateLow
    expr: cache_hit_rate < 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Data Mapper缓存命中率低于80%"

  - alert: DataMapperSlowQueries
    expr: histogram_quantile(0.95, db_query_duration_seconds) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Data Mapper数据库查询P95超过100ms"

  - alert: AsyncTaskQueueOverflow
    expr: async_task_queue_size > 500
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "异步任务队列积压超过500个任务"
```

## 📋 执行检查清单

### 修复前检查
- [ ] 备份当前代码分支
- [ ] 确认测试环境可用
- [ ] 准备性能监控工具
- [ ] 通知相关团队维护窗口

### 修复执行
- [ ] **高优先级修复**
  - [ ] 优化 updateRuleStats 数据库查询
  - [ ] 修复 Redis KEYS 命令
  - [ ] 修复 CollectorService 类型安全
- [ ] **中优先级修复**
  - [ ] 统一监控记录
  - [ ] 添加缓存大小验证
  - [ ] 移除硬编码参数
- [ ] **低优先级修复**
  - [ ] 简化缓存服务架构
  - [ ] 添加内存泄漏防护

### 修复后验证
- [ ] 运行完整测试套件
- [ ] 性能基准测试
- [ ] 监控指标验证
- [ ] 文档更新

### 生产部署
- [ ] 分阶段部署执行
- [ ] 实时监控关键指标
- [ ] 功能回归测试
- [ ] 用户反馈收集

---

**修复完成标志**: 
- 所有测试通过 ✅
- 性能指标达标 ✅  
- 监控告警正常 ✅
- 代码审查通过 ✅

**文档版本**: v1.0
**更新日期**: 2025-01-XX
**负责团队**: Backend Team