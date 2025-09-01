# Symbol Mapper Cache 组件

这是一个从 `symbol-mapper` 模块中独立出来的专用缓存组件，提供高性能的三层缓存架构。

## 功能特性

### 🎯 三层缓存架构
- **L1**: 规则缓存 (Provider Rules Cache) - 提供商映射规则
- **L2**: 符号映射缓存 (Symbol Mapping Cache) - 单符号双向映射  
- **L3**: 批量结果缓存 (Batch Result Cache) - 批量查询结果

### 🔥 核心功能
- MongoDB Change Stream 实时数据变更监听
- LRU内存缓存管理 (使用lru-cache)
- 并发控制和防重复查询机制
- 内存水位监控和自动清理
- 详细的缓存统计和性能指标
- 故障恢复和重连机制

## 使用方式

### 模块导入
```typescript
import { SymbolMapperCacheModule } from '@core/public/symbol-mapper-cache/module/symbol-mapper-cache.module';

@Module({
  imports: [
    SymbolMapperCacheModule, // 导入缓存模块
    // ... 其他模块
  ],
  // ...
})
export class YourModule {}
```

### 服务注入
```typescript
import { SymbolMapperCacheService } from '@core/public/symbol-mapper-cache/services/symbol-mapper-cache.service';

@Injectable()
export class YourService {
  constructor(
    private readonly SymbolMapperCacheService: SymbolMapperCacheService,
  ) {}
  
  async yourMethod() {
    // 使用缓存服务
    const stats = await this.SymbolMapperCacheService.getCacheStats();
    // ...
  }
}
```

### 接口使用
```typescript
import {
  SymbolMappingResult,
  BatchMappingResult,
  CacheStatsDto
} from '@core/public/symbol-mapper-cache/interfaces/cache-stats.interface';
```

## 配置

缓存配置通过 `FeatureFlags` 管理：

```typescript
// L1: 规则缓存配置
ruleCacheMaxSize: number;
ruleCacheTtl: number;

// L2: 符号映射缓存配置  
symbolCacheMaxSize: number;
symbolCacheTtl: number;

// L3: 批量结果缓存配置
batchResultCacheMaxSize: number;
batchResultCacheTtl: number;
```

## 依赖关系

- `SymbolMappingRepository` - 数据访问层
- `FeatureFlags` - 配置管理
- `EventEmitter2` - 事件驱动架构的事件总线 (符合项目监控规范)
- `DatabaseModule` - 统一数据库模块

## 测试

组件包含完整的测试套件：

```bash
# 单元测试
npm test test/jest/unit/core/public/symbol-mapper-cache/

# 集成测试  
npm test test/jest/integration/core/public/symbol-mapper-cache/

# 性能测试
npm test test/jest/performance/core/public/symbol-mapper-cache/

# E2E测试
npm test test/jest/e2e/core/public/symbol-mapper-cache/
```

## 设计原则

1. **单一职责**: 专注于缓存功能，与业务逻辑解耦
2. **可复用性**: 可以被其他需要缓存的模块使用
3. **高性能**: 三层缓存架构提供最佳性能
4. **监控友好**: 提供详细的缓存统计和监控指标
5. **故障恢复**: 具备自动故障检测和恢复能力

## 从原 symbol-mapper 模块迁移

如果你之前使用的是 `symbol-mapper` 模块中的缓存功能，现在需要：

1. 更新导入路径
2. 确保导入了 `SymbolMapperCacheModule`
3. 缓存相关接口从新位置导入

```typescript
// 旧的导入 (已废弃)
import { SymbolMapperCacheService } from '@core/public/symbol-mapper/services/symbol-mapper-cache.service';

// 新的导入（事件驱动架构）
import { SymbolMapperCacheService } from '@core/public/symbol-mapper-cache/services/symbol-mapper-cache.service';

## 监控集成说明

本组件已升级为**事件驱动架构**，符合项目监控组件集成规范：

### ✅ 事件驱动特性
- 仅注入 `EventEmitter2`，不直接依赖监控服务
- 使用 `setImmediate()` 异步发送监控事件
- 使用标准 `SYSTEM_STATUS_EVENTS.METRIC_COLLECTED` 事件类型
- 监控数据通过事件总线发送，实现完全解耦

### 监控事件示例
```typescript
// 缓存命中/未命中事件
{
  timestamp: new Date(),
  source: 'symbol_mapper_cache',
  metricType: 'cache',
  metricName: 'cache_hit', // 或 'cache_miss'
  metricValue: 1,
  tags: {
    layer: 'l1', // l1/l2/l3
    cacheType: 'symbol-mapper',
    operation: 'hit' // 或 'miss'
  }
}
```
```