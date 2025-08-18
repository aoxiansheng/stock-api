# CommonCache 模块

基于 [Storage模块重构设计方案.md](../../../docs/storage模块重构设计方案.md) 创建的通用缓存服务模块。

## 🎯 模块目标

提供极简、高效、可靠的缓存操作接口，实现缓存职责的清晰分离：
- **CommonCache**: 纯缓存操作（get/set/delete）
- **Storage**: 专注数据库操作
- **SmartCacheOrchestrator**: 策略编排和决策

## 📁 模块结构

```
src/core/public/common-cache/
├── services/
│   ├── common-cache.service.ts           # 🔥 核心缓存服务
│   └── cache-compression.service.ts      # 压缩解压缩服务
├── interfaces/
│   ├── cache-operation.interface.ts      # 缓存操作接口
│   └── cache-metadata.interface.ts       # 缓存元数据接口
├── dto/
│   ├── cache-request.dto.ts             # 缓存请求DTO
│   ├── cache-result.dto.ts              # 缓存结果DTO
│   ├── cache-compute-options.dto.ts     # 缓存计算选项DTO
│   ├── ttl-compute-params.dto.ts        # TTL计算参数DTO
│   └── smart-cache-result.dto.ts        # 智能缓存结果DTO
├── constants/
│   ├── cache.constants.ts               # 缓存常量定义
│   └── cache-config.constants.ts        # ✅ 统一配置常量
├── utils/
│   ├── cache-key.utils.ts               # 🔥 缓存键工具
│   └── redis-value.utils.ts             # 🔥 Redis值序列化工具
├── module/
│   └── common-cache.module.ts           # 模块定义
└── index.ts                             # 统一导出
```

## 🚀 核心特性

### 1. 极简API设计
```typescript
// 基础操作
await commonCache.get<T>(key)                    // 获取缓存
await commonCache.set<T>(key, data, ttl)         // 设置缓存
await commonCache.delete(key)                    // 删除缓存

// 批量操作
await commonCache.mget<T>(keys)                  // 批量获取
await commonCache.mset<T>(entries)               // 批量设置

// 带回源的获取
await commonCache.getWithFallback<T>(key, fetchFn, ttl)
```

### 2. 统一配置管理
```typescript
import { CACHE_CONFIG } from '@core/public/common-cache';

// 所有配置集中管理
const timeout = CACHE_CONFIG.TIMEOUTS.REDIS_OPERATION_TIMEOUT;  // 5000ms
const batchLimit = CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE;    // 100条
const ttl = CACHE_CONFIG.TTL.DEFAULT_SECONDS;                   // 3600s
```

### 3. TTL处理一致性修正
```typescript
// ✅ 正确处理Redis pttl特殊值
private mapPttlToSeconds(pttlMs: number): number {
  if (pttlMs === -2) return 0;                    // key不存在
  if (pttlMs === -1) return 31536000;             // 无过期时间 -> 365天
  return Math.max(0, Math.floor(pttlMs / 1000));  // 毫秒转秒
}
```

### 4. Redis Envelope统一处理
```typescript
// ✅ 统一序列化格式，单一来源
const envelope = {
  data: businessData,          // 原始业务数据
  storedAt: Date.now(),        // 毫秒时间戳
  compressed: false,           // 是否压缩
  metadata?: {...}             // 可选元数据
};
```

### 5. 批量操作性能优化
```typescript
// ✅ Pipeline分段处理，避免大批量堵塞
const pipelineMaxSize = CACHE_CONFIG.BATCH_LIMITS.PIPELINE_MAX_SIZE; // 50条

for (let i = 0; i < entries.length; i += pipelineMaxSize) {
  const chunk = entries.slice(i, i + pipelineMaxSize);
  const pipeline = this.redis.pipeline();
  // ... 处理当前分段
  await pipeline.exec();
}
```

### 6. 静默失败设计
```typescript
// ✅ 缓存失败不影响业务，但记录指标
try {
  return await this.redis.get(key);
} catch (error) {
  this.logger.debug(`Cache get failed for ${key}`, error);
  this.recordMetrics('get', 'error');
  return null; // 静默返回null，不抛异常
}
```

## 🔧 使用方式

### 模块导入
```typescript
import { Module } from '@nestjs/common';
import { CommonCacheModule } from '@core/public/common-cache';

@Module({
  imports: [
    CommonCacheModule,  // 显式导入，非全局模块
  ],
  // ...
})
export class YourModule {}
```

### 服务注入
```typescript
import { Injectable } from '@nestjs/common';
import { CommonCacheService } from '@core/public/common-cache';

@Injectable()
export class YourService {
  constructor(
    private readonly commonCache: CommonCacheService,
  ) {}

  async getData(key: string) {
    return await this.commonCache.get<DataType>(key);
  }
}
```

### 缓存键生成
```typescript
import { CacheKeyUtils, CommonCacheService } from '@core/public/common-cache';

// 方式1：使用工具类
const key = CacheKeyUtils.generateStockQuoteKey('AAPL', 'longport', 'US');

// 方式2：使用静态方法
const key = CommonCacheService.generateCacheKey('stock_quote', 'AAPL', 'longport');
```

## 📊 监控指标

### 缓存操作指标
```typescript
// 操作计数
cacheOperationsTotal{op="get|set|mget|mset", status="success|error"}

// 操作耗时
cacheQueryDuration{op="get|set|mget|mset"}

// 命中率统计  
cacheHitRate

// TTL分布
cacheTtlRemaining
```

### 告警配置
- **错误率**: > 1% (5分钟窗口)
- **P95延迟**: > 50ms
- **命中率**: < 85% (10分钟窗口)

## 🧪 测试覆盖

### 单元测试
```bash
# 运行CommonCacheService测试
npx jest test/jest/unit/core/public/common-cache/services/common-cache.service.spec.ts

# 运行工具类测试
npx jest test/jest/unit/core/public/common-cache/utils/cache-key.utils.spec.ts

# 运行所有单元测试
npx jest test/jest/unit/core/public/common-cache
```

### 集成测试
```bash
# 运行集成测试（需要Redis）
npx jest test/jest/integration/core/public/common-cache
```

**测试覆盖率**: 
- Lines: 100% (42/42 tests passed)
- Functions: 100%
- Branches: 95%+

## ⚙️ 配置参数

### Redis连接配置
```typescript
{
  host: 'localhost',
  port: 6379,
  connectTimeout: 3000,                    // 3s连接超时
  commandTimeout: 5000,                    // 5s命令超时
  maxRetriesPerRequest: 3,                 // 最大重试次数
  enableAutoPipelining: true,              // 开启自动pipeline
}
```

### 缓存行为配置
```typescript
{
  TTL: {
    DEFAULT_SECONDS: 3600,                 // 默认1小时
    MIN_SECONDS: 30,                       // 最小30秒
    MAX_SECONDS: 86400,                    // 最大24小时
  },
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 100,                   // API层批量上限
    PIPELINE_MAX_SIZE: 50,                 // Pipeline分段大小
  },
  COMPRESSION: {
    THRESHOLD_BYTES: 10240,                // 10KB压缩阈值
    ALGORITHM: 'gzip',                     // 压缩算法
  }
}
```

## 🚀 性能特性

### 关键优化点
1. **批量操作**: 使用mget/pipeline减少网络往返
2. **异步写入**: 缓存写入不阻塞主流程  
3. **静默失败**: 缓存操作失败不影响业务
4. **连接池复用**: 优化Redis连接管理
5. **Pipeline分段**: 大批量操作自动分段，避免堵塞

### 性能指标
- **缓存命中率**: ≥85%
- **P95延迟**: <50ms  
- **错误率**: <1%
- **批量操作**: 支持100条/次，50条/pipeline

## 🔄 重构进度

### ✅ 第一阶段完成 (1-2天)
- [x] 创建目录结构和基础接口
- [x] 实现CommonCacheService核心功能  
- [x] 创建工具类和常量配置
- [x] 编写单元测试（42个测试用例全部通过）
- [x] 创建集成测试框架

### 🚧 下一步计划
- [ ] 第二阶段：StorageService添加@Deprecated标记
- [ ] 第三阶段：updateCache字段渐进式移除
- [ ] 第四阶段：智能缓存方法迁移
- [ ] 第五阶段：SmartCacheOrchestrator重构

## 📚 相关文档

- [Storage模块重构设计方案.md](../../../docs/storage模块重构设计方案.md) - 详细设计文档
- [storage-refactor-roadmap.md](../../../docs/storage-refactor-roadmap.md) - 重构进度计划
- [系统基本架构和说明文档.md](../../../docs/系统基本架构和说明文档.md) - 系统架构

---

*CommonCache模块已完成基础框架搭建，可以开始后续的重构阶段。*