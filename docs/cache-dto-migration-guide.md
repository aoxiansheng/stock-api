# Cache DTO 迁移指南

## 从单一文件迁移到模块化结构

以下是Cache组件DTO文件的迁移映射表，用于从单一文件结构迁移到模块化结构：

### 配置相关
- **CacheConfigDto** → `config/cache-config.dto.ts`

### 操作相关  
- **CacheOperationResultDto** → `operations/cache-operation-result.dto.ts`
- **BatchCacheOperationDto** → `operations/batch-operation.dto.ts`
- **CacheWarmupConfigDto** → `operations/warmup-config.dto.ts`

### 健康检查
- **CacheHealthCheckResultDto** → `health/health-check-result.dto.ts`

### 数据处理
- **CacheCompressionInfoDto** → `data-processing/compression-info.dto.ts`
- **CacheSerializationInfoDto** → `data-processing/serialization-info.dto.ts`

### 锁机制
- **DistributedLockInfoDto** → `locking/distributed-lock-info.dto.ts`

### 分析和监控
- **CacheKeyPatternAnalysisDto** → `analytics/key-pattern-analysis.dto.ts`
- **CachePerformanceMonitoringDto** → `monitoring/performance-monitoring.dto.ts`

### 指标
- **CacheMetricsUpdateDto** → `metrics/metrics-update.dto.ts`

## 迁移说明

1. **导入路径更新**: 将所有单一文件导入更新为相应的模块化路径
2. **类型引用**: 确保所有TypeScript类型引用都已更新
3. **向后兼容**: 模块化结构保持与原单一文件的API兼容性

## 示例

### 迁移前
```typescript
import { CacheConfigDto, CacheOperationResultDto } from './cache-internal.dto';
```

### 迁移后  
```typescript
import { CacheConfigDto } from './config/cache-config.dto';
import { CacheOperationResultDto } from './operations/cache-operation-result.dto';
```

---

*文档生成时间: 2025-09-12*  
*来源: cache-internal.dto.ts 中的 CACHE_DTO_MIGRATION_GUIDE 常量*