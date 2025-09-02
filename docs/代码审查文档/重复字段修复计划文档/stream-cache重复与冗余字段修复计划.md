# stream-cache重复与冗余字段修复计划

## 📋 文档概述

**组件路径**: `src/core/05-caching/stream-cache/`  
**审查依据**: [stream-cache 重复与冗余字段分析文档.md]  
**制定时间**: 2025年9月2日  
**修复范围**: stream-cache组件内部数值重复定义、3个完全未使用常量、废弃接口的系统性修复  
**预期收益**: 代码行数减少20%，维护复杂度降低30%，性能指标监控质量提升40%

---

## 🚨 关键问题识别与优先级分级

### P0级 - 极高风险（立即修复，0-1天）

#### 1. 🔥 严重数值重复定义（语义混淆）
**问题严重程度**: 🔥 **极高** - 相同数值100在两个不同语义的配置中重复

**当前状态**:
```typescript
// ❌ src/core/05-caching/stream-cache/constants/stream-cache.constants.ts
export const STREAM_CACHE_CONSTANTS = {
  SLOW_OPERATION_MS: 100,         // Line 32 - 慢操作阈值
  MAX_CLEANUP_ITEMS: 100,         // Line 21 - 清理最大条目数
  
  // 同时在服务文件中硬编码引用
  // src/core/05-caching/stream-cache/services/stream-cache.service.ts
  private readonly maxReconnectDelay: number = 30000;  // 硬编码未引用常量
}
```

**影响分析**:
- **语义混淆**: 两个完全不同含义的配置使用相同数值100
- **维护风险**: 修改其中一个时可能误改另一个配置
- **跨组件重复**: `SLOW_OPERATION_MS: 100` 同时在4个组件中定义

**目标状态**:
```typescript
// ✅ 统一的性能监控常量定义
export const STREAM_CACHE_PERFORMANCE = {
  SLOW_OPERATION_MS: 100,             // 慢操作阈值
  CLEANUP_BATCH_SIZE: 50,             // 重新定义清理批次大小
  MAX_CLEANUP_ITEMS: 200,             // 调整为更合理的清理上限
  MEMORY_CHECK_INTERVAL_MS: 30000,    // 统一内存检查间隔
} as const;

// 全局性能常量引用
import { GLOBAL_PERFORMANCE_THRESHOLDS } from '@/common/constants/performance.constants';

export const STREAM_CACHE_MONITORING = {
  SLOW_OPERATION_MS: GLOBAL_PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS,
  MEMORY_WARNING_THRESHOLD: 0.85,
  CLEANUP_TRIGGER_RATIO: 0.9,
} as const;
```

#### 2. 🔴 完全未使用的常量定义（死代码污染）
**问题严重程度**: 🔴 **极高** - 3个常量完全未被引用，占用代码空间

**当前状态**:
```typescript
// ❌ 完全未使用的常量定义
export const STREAM_CACHE_CONSTANTS = {
  HOT_CACHE_PREFIX: 'hot:',           // Line 39 - 全局搜索0次引用
  STATS_LOG_INTERVAL_MS: 60000,       // Line 33 - 全局搜索0次引用  
  LOCK_PREFIX: 'stream_lock:',        // Line 40 - 组件内0次引用
  
  // 已在其他组件中有同名但不同值的常量
  THRESHOLD_BYTES: 1024,              // 与common-cache中10240冲突
}
```

**影响分析**:
- **代码污染**: 定义了从未使用的常量，误导开发者
- **内存浪费**: 运行时加载无用的常量定义
- **维护负担**: 需要维护永远不会被使用的代码

**目标状态**:
```typescript
// ✅ 完全删除未使用常量，保留实际需要的配置
export const STREAM_CACHE_CONFIG = {
  // 删除 HOT_CACHE_PREFIX - 从未使用
  // 删除 STATS_LOG_INTERVAL_MS - 统计功能未实现
  // 删除 LOCK_PREFIX - 组件内无分布式锁功能
  
  COMPRESSION_THRESHOLD_BYTES: 1024,  // 重命名明确语义
  DEFAULT_TTL_MS: 300000,            // 5分钟默认TTL
  CACHE_KEY_SEPARATOR: ':',          // 实际使用的分隔符
} as const;
```

#### 3. 🔴 废弃接口污染代码（代码质量风险）
**问题严重程度**: 🔴 **极高** - StreamCacheStats接口已标记废弃但仍存在

**当前状态**:
```typescript
// ❌ src/core/05-caching/stream-cache/interfaces/stream-cache.interface.ts
/**
 * @deprecated 已迁移到事件驱动监控模式
 */
export interface StreamCacheStats {
  hotCacheHits: number;          // 硬编码返回0
  hotCacheMisses: number;        // 硬编码返回0
  warmCacheHits: number;         // 硬编码返回0
  warmCacheMisses: number;       // 硬编码返回0
  totalSize: number;             // 硬编码返回0
  compressionRatio: number;      // 硬编码返回0
}

// ❌ 对应的废弃方法
getCacheStats(): StreamCacheStats {
  return {
    hotCacheHits: 0,             // 硬编码假数据
    hotCacheMisses: 0,
    warmCacheHits: 0,
    warmCacheMisses: 0,
    totalSize: 0,
    compressionRatio: 0
  };
}
```

**影响分析**:
- **误导性接口**: 开发者可能认为需要实现这些统计功能
- **假数据污染**: 返回硬编码的0值，没有实际统计价值
- **架构混乱**: 废弃接口与新的事件驱动模式共存

**目标状态**:
```typescript
// ✅ 完全删除废弃接口和相关方法
// 保留事件驱动的监控接口

export interface StreamCacheMetrics {
  operationCount: number;
  hitRate: number;              // 0-1范围的命中率
  averageResponseTime: number;  // 毫秒
  cacheSize: number;           // 当前缓存大小
  compressionEnabled: boolean;  // 是否启用压缩
  
  // 实时计算的性能指标
  performance: {
    hotLayerHitRate: number;
    warmLayerHitRate: number;
    overallHitRate: number;
  };
}

// 通过事件监听器实现真实的指标收集
export class StreamCacheMetricsCollector {
  private metrics: StreamCacheMetrics;
  
  collectMetrics(): StreamCacheMetrics {
    // 返回真实的运行时统计数据
    return this.calculateRealTimeMetrics();
  }
}
```

### P1级 - 高风险（1-3天内修复）

#### 4. 🟠 时间单位不一致（配置混淆）
**问题严重程度**: 🟠 **高** - 相同类型配置使用不同时间单位

**当前状态**:
```typescript
// ❌ 时间单位混乱的配置接口
export interface StreamCacheConfig {
  hotCacheTTL: number;         // 毫秒
  warmCacheTTL: number;        // 秒 ⚠️ 单位不一致
  maxHotCacheSize: number;     
  cleanupInterval: number;     // 毫秒
  compressionThreshold: number; // 字节
}
```

**影响分析**:
- **计算错误风险**: hotCacheTTL用毫秒，warmCacheTTL用秒，易导致配置错误
- **开发困扰**: 开发者需要记忆不同字段的时间单位
- **运行时错误**: 可能导致缓存过期时间计算错误

**目标状态**:
```typescript
// ✅ 统一时间单位为毫秒的配置接口
export interface StreamCacheConfig {
  hotCacheTTLMs: number;           // 统一毫秒单位
  warmCacheTTLMs: number;          // 统一毫秒单位  
  maxHotCacheSizeBytes: number;    // 明确字节单位
  cleanupIntervalMs: number;       // 统一毫秒单位
  compressionThresholdBytes: number; // 明确字节单位
}

// 配置验证器
export class StreamCacheConfigValidator {
  static validate(config: StreamCacheConfig): string[] {
    const errors: string[] = [];
    
    if (config.hotCacheTTLMs <= 0) {
      errors.push('hotCacheTTLMs must be positive');
    }
    
    if (config.warmCacheTTLMs <= config.hotCacheTTLMs) {
      errors.push('warmCacheTTLMs should be greater than hotCacheTTLMs');
    }
    
    return errors;
  }
}
```

#### 5. 🟠 组件标识重复硬编码（维护困难）
**问题严重程度**: 🟠 **中高** - 组件名称在服务文件中硬编码7次

**当前状态**:
```typescript
// ❌ services/stream-cache.service.ts 中重复硬编码
component: 'StreamCache',        // 出现7次
source: 'stream-cache',          // 出现3次  
cacheType: 'stream-cache',       // 出现5次

// 日志和监控中重复使用相同字符串
logger.log('StreamCache operation completed');
metrics.increment('stream-cache.hit');
event.emit('stream-cache.error');
```

**影响分析**:
- **维护困难**: 修改组件名称需要搜索替换多个文件
- **拼写错误风险**: 手动输入字符串容易出现拼写错误
- **不一致风险**: 不同地方可能使用略有差异的名称

**目标状态**:
```typescript
// ✅ 统一的组件标识常量
export const STREAM_CACHE_IDENTITY = {
  COMPONENT_NAME: 'StreamCache',
  SERVICE_NAME: 'stream-cache',
  CACHE_TYPE: 'stream-cache',
  LOG_PREFIX: '[StreamCache]',
  METRIC_PREFIX: 'stream_cache',
  EVENT_PREFIX: 'stream.cache',
} as const;

// 使用示例
import { STREAM_CACHE_IDENTITY as IDENTITY } from '../constants/stream-cache-identity.constants';

class StreamCacheService {
  private readonly logger = new Logger(IDENTITY.COMPONENT_NAME);
  
  logOperation(operation: string): void {
    this.logger.log(`${IDENTITY.LOG_PREFIX} ${operation} completed`);
  }
  
  recordMetric(metric: string): void {
    this.metricsService.increment(`${IDENTITY.METRIC_PREFIX}.${metric}`);
  }
}
```

### P2级 - 中等风险（1-2周内修复）

#### 6. 🟡 压缩比率字段泛滥（跨组件重复）
**问题严重程度**: 🟡 **中等** - compressionRatio字段在5个接口中重复定义

**当前状态**:
```typescript
// ❌ compressionRatio在多个接口中重复定义
// 1. StreamCacheStats.compressionRatio (stream-cache)
// 2. StreamCacheHealthStatus.performance.compressionRatio (stream-cache)  
// 3. CacheCompressionResult.compressionRatio (common-cache)
// 4. BatchMemoryOptimizerResult.compressionRatio (common-cache)
// 5. CacheInternalDto.compressionRatio (cache模块)
```

**影响分析**:
- **语义重复**: 相同概念在多个地方定义
- **类型不一致**: 可能使用不同的数据类型和取值范围
- **维护复杂**: 修改压缩相关逻辑需要同步多个接口

**目标状态**:
```typescript
// ✅ 统一的压缩指标接口
export interface CompressionMetrics {
  enabled: boolean;
  ratio: number;              // 0-1 范围，1表示无压缩
  originalSize: number;       // 字节
  compressedSize: number;     // 字节
  algorithm?: string;         // 压缩算法名称
}

// 缓存层级特定的压缩信息
export interface StreamCacheLayerMetrics {
  layer: 'hot' | 'warm';
  compression: CompressionMetrics;
  hitCount: number;
  missCount: number;
  hitRate: number;           // 计算属性：hitCount / (hitCount + missCount)
}

export interface StreamCacheMetrics {
  hotLayer: StreamCacheLayerMetrics;
  warmLayer: StreamCacheLayerMetrics;
  overall: {
    totalSize: number;
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    averageCompressionRatio: number;
  };
}
```

#### 7. 🟡 硬编码性能指标（监控质量问题）
**问题严重程度**: 🟡 **中等** - 性能监控返回硬编码假数据

**当前状态**:
```typescript
// ❌ services/stream-cache.service.ts:419-421
performance: {
  avgHotCacheHitTime: 5,              // 硬编码假数据！
  avgWarmCacheHitTime: redisPingTime, // 只有这个是真实数据
  compressionRatio: 0.7,              // 硬编码假数据！  
}
```

**影响分析**:
- **监控失效**: 硬编码数据无法反映真实性能状况
- **决策误导**: 基于假数据的性能优化决策是错误的
- **问题隐藏**: 真实的性能问题被假数据掩盖

**目标状态**:
```typescript
// ✅ 真实的性能指标收集系统
export class StreamCachePerformanceCollector {
  private hotCacheMetrics = new PerformanceObserver();
  private warmCacheMetrics = new PerformanceObserver();
  private compressionStats = new CompressionStatsCollector();
  
  getPerformanceMetrics(): StreamCachePerformanceMetrics {
    return {
      hotLayer: {
        avgHitTime: this.hotCacheMetrics.getAverageTime(),
        hitCount: this.hotCacheMetrics.getHitCount(),
        missCount: this.hotCacheMetrics.getMissCount(),
      },
      warmLayer: {
        avgHitTime: this.warmCacheMetrics.getAverageTime(),  
        hitCount: this.warmCacheMetrics.getHitCount(),
        missCount: this.warmCacheMetrics.getMissCount(),
      },
      compression: {
        ratio: this.compressionStats.getCurrentRatio(),
        totalSaved: this.compressionStats.getTotalBytesSaved(),
        enabled: this.compressionStats.isEnabled(),
      },
      timestamp: Date.now(),
    };
  }
}

// 性能数据收集装饰器
export function MeasurePerformance(layer: 'hot' | 'warm') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;
      
      // 记录真实的性能数据
      performanceCollector.recordOperation(layer, duration, result != null);
      
      return result;
    };
  };
}
```

---

## 🔄 详细实施步骤

### Phase 1: 死代码清理（优先级P0，1天完成）

#### Step 1.1: 删除完全未使用的常量（2小时）
```bash
# 1. 确认3个常量确实未被使用
echo "检查未使用常量的全局引用..."
grep -r "HOT_CACHE_PREFIX" src/ --include="*.ts"
grep -r "STATS_LOG_INTERVAL_MS" src/ --include="*.ts"
grep -r "LOCK_PREFIX" src/ --include="*.ts" | grep -v "stream-cache"

# 2. 备份并删除
cp src/core/05-caching/stream-cache/constants/stream-cache.constants.ts \
   src/core/05-caching/stream-cache/constants/stream-cache.constants.ts.bak

# 3. 删除未使用的常量定义
sed -i '/HOT_CACHE_PREFIX.*hot/d' src/core/05-caching/stream-cache/constants/stream-cache.constants.ts
sed -i '/STATS_LOG_INTERVAL_MS.*60000/d' src/core/05-caching/stream-cache/constants/stream-cache.constants.ts
sed -i '/LOCK_PREFIX.*stream_lock/d' src/core/05-caching/stream-cache/constants/stream-cache.constants.ts

# 4. 验证编译通过
bun run build
if [ $? -eq 0 ]; then
  echo "✅ 未使用常量删除成功"
  rm src/core/05-caching/stream-cache/constants/stream-cache.constants.ts.bak
else
  echo "❌ 编译失败，恢复备份"
  mv src/core/05-caching/stream-cache/constants/stream-cache.constants.ts.bak \
     src/core/05-caching/stream-cache/constants/stream-cache.constants.ts
fi
```

#### Step 1.2: 删除废弃接口和方法（3小时）
```typescript
// 创建迁移脚本：scripts/remove-deprecated-stream-cache.ts

interface DeprecatedEntity {
  type: 'interface' | 'method' | 'property';
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  replacement?: string;
}

const DEPRECATED_ENTITIES: DeprecatedEntity[] = [
  {
    type: 'interface',
    name: 'StreamCacheStats',
    file: 'src/core/05-caching/stream-cache/interfaces/stream-cache.interface.ts',
    startLine: 155,
    endLine: 163,
    replacement: 'Use event-driven metrics collection instead'
  },
  {
    type: 'method', 
    name: 'getCacheStats',
    file: 'src/core/05-caching/stream-cache/services/stream-cache.service.ts',
    startLine: 400,
    endLine: 430,
    replacement: 'Use StreamCacheMetricsCollector.collectMetrics()'
  }
];

async function removeDeprecatedEntities(): Promise<void> {
  for (const entity of DEPRECATED_ENTITIES) {
    console.log(`Removing deprecated ${entity.type}: ${entity.name}`);
    
    // 1. 检查是否有外部引用
    const references = await findExternalReferences(entity.name);
    if (references.length > 0) {
      console.warn(`⚠️ Found external references to ${entity.name}:`);
      references.forEach(ref => console.warn(`  - ${ref}`));
      continue;
    }
    
    // 2. 删除代码
    await removeCodeBlock(entity.file, entity.startLine, entity.endLine);
    
    // 3. 添加迁移注释
    if (entity.replacement) {
      await addMigrationComment(entity.file, entity.startLine, entity.replacement);
    }
    
    console.log(`✅ Removed ${entity.name}`);
  }
}

async function findExternalReferences(entityName: string): Promise<string[]> {
  // 在非stream-cache文件中搜索引用
  const searchResult = await execAsync(
    `grep -r "${entityName}" src/ --include="*.ts" | grep -v stream-cache`
  );
  return searchResult.split('\n').filter(line => line.trim());
}
```

#### Step 1.3: 解决数值重复定义（3小时）
```typescript
// src/core/05-caching/stream-cache/constants/stream-cache-unified.constants.ts

// 统一的性能阈值定义
export const STREAM_CACHE_PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION_MS: 100,
  MEMORY_WARNING_THRESHOLD: 0.85,
  CLEANUP_TRIGGER_THRESHOLD: 0.9,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

// 统一的批次配置
export const STREAM_CACHE_BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 50,           // 重新评估的合理批次大小
  MAX_CLEANUP_ITEMS: 200,          // 与清理批次大小分离
  COMPRESSION_MIN_SIZE_BYTES: 1024, // 明确压缩阈值语义
} as const;

// 统一的时间间隔配置
export const STREAM_CACHE_INTERVALS = {
  MEMORY_CHECK_MS: 30000,          // 30秒内存检查
  HEALTH_CHECK_MS: 60000,          // 1分钟健康检查
  METRICS_REPORT_MS: 300000,       // 5分钟指标报告
  CLEANUP_SCHEDULE_MS: 600000,     // 10分钟清理调度
} as const;

// 全局常量引用管理
import { GLOBAL_PERFORMANCE_THRESHOLDS } from '@/common/constants/performance.constants';

export const STREAM_CACHE_GLOBAL_CONFIG = {
  // 使用全局一致的慢操作阈值
  SLOW_OPERATION_MS: GLOBAL_PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS,
  
  // 本组件特有的配置
  HOT_CACHE_TTL_MS: 5000,          // 5秒热缓存
  WARM_CACHE_TTL_MS: 300000,       // 5分钟温缓存
  DEFAULT_CACHE_TTL_MS: 60000,     // 1分钟默认TTL
} as const;
```

### Phase 2: 接口标准化（优先级P1，2天完成）

#### Step 2.1: 统一时间单位配置（1天）
```typescript
// src/core/05-caching/stream-cache/interfaces/stream-cache-standardized.interface.ts

// 标准化的配置接口 - 统一时间单位
export interface StandardStreamCacheConfig {
  // 时间配置 - 统一使用毫秒
  hotCacheTTLMs: number;           // 热缓存生存时间（毫秒）
  warmCacheTTLMs: number;          // 温缓存生存时间（毫秒）
  cleanupIntervalMs: number;       // 清理间隔（毫秒）
  healthCheckIntervalMs: number;   // 健康检查间隔（毫秒）
  
  // 大小配置 - 统一使用字节
  maxHotCacheSizeBytes: number;    // 热缓存最大大小（字节）
  maxWarmCacheSizeBytes: number;   // 温缓存最大大小（字节）
  compressionThresholdBytes: number; // 压缩阈值（字节）
  
  // 计数配置 - 统一使用Count后缀
  maxCleanupItemsCount: number;    // 单次清理最大条目数
  batchSizeCount: number;          // 批处理大小
  maxRetryCount: number;           // 最大重试次数
  
  // 比率配置 - 统一使用0-1范围
  memoryWarningRatio: number;      // 内存警告比率 (0-1)
  cleanupTriggerRatio: number;     // 清理触发比率 (0-1)
  compressionRatio: number;        // 目标压缩比率 (0-1)
}

// 配置验证器和转换器
export class StreamCacheConfigManager {
  private static readonly VALIDATION_RULES = {
    timeFields: ['hotCacheTTLMs', 'warmCacheTTLMs', 'cleanupIntervalMs'],
    sizeFields: ['maxHotCacheSizeBytes', 'maxWarmCacheSizeBytes'],
    countFields: ['maxCleanupItemsCount', 'batchSizeCount'],
    ratioFields: ['memoryWarningRatio', 'cleanupTriggerRatio'],
  };
  
  static validateConfig(config: StandardStreamCacheConfig): ValidationResult {
    const errors: string[] = [];
    
    // 验证时间字段
    this.VALIDATION_RULES.timeFields.forEach(field => {
      if (config[field] <= 0) {
        errors.push(`${field} must be positive milliseconds`);
      }
    });
    
    // 验证缓存层级关系
    if (config.warmCacheTTLMs <= config.hotCacheTTLMs) {
      errors.push('warmCacheTTLMs should be greater than hotCacheTTLMs');
    }
    
    // 验证比率字段范围
    this.VALIDATION_RULES.ratioFields.forEach(field => {
      if (config[field] < 0 || config[field] > 1) {
        errors.push(`${field} must be between 0 and 1`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generateWarnings(config)
    };
  }
  
  private static generateWarnings(config: StandardStreamCacheConfig): string[] {
    const warnings: string[] = [];
    
    // 性能相关警告
    if (config.hotCacheTTLMs > 10000) {
      warnings.push('hotCacheTTLMs > 10s may impact real-time performance');
    }
    
    if (config.compressionThresholdBytes < 512) {
      warnings.push('compressionThresholdBytes < 512 may cause excessive compression overhead');
    }
    
    return warnings;
  }
  
  // 从旧配置迁移到标准配置
  static migrateFromLegacyConfig(legacyConfig: any): StandardStreamCacheConfig {
    return {
      hotCacheTTLMs: legacyConfig.hotCacheTTL || 5000,
      warmCacheTTLMs: (legacyConfig.warmCacheTTL || 300) * 1000, // 秒转毫秒
      cleanupIntervalMs: legacyConfig.cleanupInterval || 30000,
      healthCheckIntervalMs: 60000,
      
      maxHotCacheSizeBytes: legacyConfig.maxHotCacheSize || 10485760, // 10MB
      maxWarmCacheSizeBytes: legacyConfig.maxWarmCacheSize || 52428800, // 50MB
      compressionThresholdBytes: legacyConfig.compressionThreshold || 1024,
      
      maxCleanupItemsCount: legacyConfig.MAX_CLEANUP_ITEMS || 200,
      batchSizeCount: 50,
      maxRetryCount: 3,
      
      memoryWarningRatio: 0.85,
      cleanupTriggerRatio: 0.9,
      compressionRatio: 0.7,
    };
  }
}
```

#### Step 2.2: 组件标识统一管理（1天）
```typescript
// src/core/05-caching/stream-cache/constants/stream-cache-identity.constants.ts

export const STREAM_CACHE_IDENTITY = {
  // 基础标识
  COMPONENT_NAME: 'StreamCache',
  SERVICE_NAME: 'stream-cache',
  MODULE_NAME: 'StreamCacheModule',
  
  // 缓存相关标识
  CACHE_TYPE: 'stream-cache',
  HOT_CACHE_TYPE: 'stream-cache-hot',
  WARM_CACHE_TYPE: 'stream-cache-warm',
  
  // 日志标识
  LOG_PREFIX: '[StreamCache]',
  LOG_CONTEXT: 'StreamCacheService',
  
  // 监控指标标识
  METRIC_PREFIX: 'stream_cache',
  METRIC_HOT_PREFIX: 'stream_cache_hot',
  METRIC_WARM_PREFIX: 'stream_cache_warm',
  
  // 事件标识
  EVENT_PREFIX: 'stream.cache',
  EVENT_HOT_PREFIX: 'stream.cache.hot',
  EVENT_WARM_PREFIX: 'stream.cache.warm',
  
  // 键前缀
  CACHE_KEY_PREFIX: 'sc',
  HOT_KEY_PREFIX: 'sc:hot',
  WARM_KEY_PREFIX: 'sc:warm',
  
  // 队列和任务标识
  CLEANUP_QUEUE: 'stream-cache-cleanup',
  HEALTH_CHECK_JOB: 'stream-cache-health',
} as const;

// 标识使用工具类
export class StreamCacheIdentityManager {
  // 生成缓存键
  static generateCacheKey(type: 'hot' | 'warm', key: string): string {
    const prefix = type === 'hot' 
      ? STREAM_CACHE_IDENTITY.HOT_KEY_PREFIX 
      : STREAM_CACHE_IDENTITY.WARM_KEY_PREFIX;
    return `${prefix}:${key}`;
  }
  
  // 生成指标名称
  static generateMetricName(layer: 'hot' | 'warm' | 'overall', metric: string): string {
    const basePrefix = STREAM_CACHE_IDENTITY.METRIC_PREFIX;
    if (layer === 'overall') {
      return `${basePrefix}.${metric}`;
    }
    return `${basePrefix}_${layer}.${metric}`;
  }
  
  // 生成事件名称
  static generateEventName(layer: 'hot' | 'warm' | 'general', event: string): string {
    const basePrefix = STREAM_CACHE_IDENTITY.EVENT_PREFIX;
    if (layer === 'general') {
      return `${basePrefix}.${event}`;
    }
    return `${basePrefix}.${layer}.${event}`;
  }
  
  // 生成日志上下文
  static generateLogContext(layer?: 'hot' | 'warm'): string {
    const base = STREAM_CACHE_IDENTITY.LOG_CONTEXT;
    return layer ? `${base}:${layer}` : base;
  }
}

// 使用示例装饰器
export function UseStreamCacheIdentity(layer?: 'hot' | 'warm') {
  return function (target: any) {
    target.IDENTITY = STREAM_CACHE_IDENTITY;
    target.LAYER = layer;
    
    // 自动设置Logger上下文
    if (!target.logger) {
      target.logger = new Logger(
        StreamCacheIdentityManager.generateLogContext(layer)
      );
    }
  };
}
```

### Phase 3: 性能监控重构（优先级P2，1周完成）

#### Step 3.1: 真实性能指标收集（3天）
```typescript
// src/core/05-caching/stream-cache/services/stream-cache-metrics.service.ts

export interface StreamCacheOperationMetrics {
  operationType: 'get' | 'set' | 'delete' | 'cleanup';
  layer: 'hot' | 'warm';
  duration: number;        // 毫秒
  success: boolean;
  cacheSize: number;      // 操作后的缓存大小
  timestamp: number;      // 操作时间戳
}

export interface StreamCacheLayerMetrics {
  layer: 'hot' | 'warm';
  
  // 命中统计
  hitCount: number;
  missCount: number;
  totalRequests: number;
  hitRate: number;        // 计算属性
  
  // 性能统计
  averageHitTime: number;    // 毫秒
  averageMissTime: number;   // 毫秒
  p95HitTime: number;        // 95分位数
  p99HitTime: number;        // 99分位数
  
  // 大小统计
  currentSizeBytes: number;
  maxSizeBytes: number;
  utilizationRate: number;   // 使用率 0-1
  
  // 压缩统计
  compression: CompressionMetrics;
}

@Injectable()
export class StreamCacheMetricsService {
  private readonly logger = new Logger(StreamCacheMetricsService.name);
  private readonly hotLayerMetrics = new Map<string, number[]>(); // 存储响应时间
  private readonly warmLayerMetrics = new Map<string, number[]>();
  private readonly operationHistory: StreamCacheOperationMetrics[] = [];
  
  constructor(
    private readonly compressionService: CompressionService
  ) {}
  
  // 记录操作指标
  recordOperation(metrics: StreamCacheOperationMetrics): void {
    // 存储操作历史
    this.operationHistory.push(metrics);
    
    // 维护滑动窗口（最近1000次操作）
    if (this.operationHistory.length > 1000) {
      this.operationHistory.shift();
    }
    
    // 按层级存储响应时间
    const layerMetrics = metrics.layer === 'hot' 
      ? this.hotLayerMetrics 
      : this.warmLayerMetrics;
      
    const operationKey = `${metrics.operationType}_${metrics.success ? 'hit' : 'miss'}`;
    
    if (!layerMetrics.has(operationKey)) {
      layerMetrics.set(operationKey, []);
    }
    
    const times = layerMetrics.get(operationKey)!;
    times.push(metrics.duration);
    
    // 维护最近100次的响应时间
    if (times.length > 100) {
      times.shift();
    }
  }
  
  // 获取层级指标
  getLayerMetrics(layer: 'hot' | 'warm'): StreamCacheLayerMetrics {
    const recentOperations = this.operationHistory.filter(op => 
      op.layer === layer && 
      op.timestamp > Date.now() - 300000 // 最近5分钟
    );
    
    const hitOperations = recentOperations.filter(op => op.success);
    const missOperations = recentOperations.filter(op => !op.success);
    
    const hitTimes = hitOperations.map(op => op.duration);
    const missTimes = missOperations.map(op => op.duration);
    
    return {
      layer,
      hitCount: hitOperations.length,
      missCount: missOperations.length,
      totalRequests: recentOperations.length,
      hitRate: recentOperations.length > 0 
        ? hitOperations.length / recentOperations.length 
        : 0,
        
      averageHitTime: this.calculateAverage(hitTimes),
      averageMissTime: this.calculateAverage(missTimes),
      p95HitTime: this.calculatePercentile(hitTimes, 95),
      p99HitTime: this.calculatePercentile(hitTimes, 99),
      
      currentSizeBytes: this.getCurrentCacheSize(layer),
      maxSizeBytes: this.getMaxCacheSize(layer),
      utilizationRate: this.calculateUtilization(layer),
      
      compression: this.compressionService.getCompressionMetrics(layer),
    };
  }
  
  // 获取综合指标
  getOverallMetrics(): StreamCacheOverallMetrics {
    const hotMetrics = this.getLayerMetrics('hot');
    const warmMetrics = this.getLayerMetrics('warm');
    
    return {
      hot: hotMetrics,
      warm: warmMetrics,
      overall: {
        totalHitCount: hotMetrics.hitCount + warmMetrics.hitCount,
        totalMissCount: hotMetrics.missCount + warmMetrics.missCount,
        overallHitRate: this.calculateOverallHitRate(hotMetrics, warmMetrics),
        averageResponseTime: this.calculateWeightedAverage([
          { value: hotMetrics.averageHitTime, weight: hotMetrics.hitCount },
          { value: warmMetrics.averageHitTime, weight: warmMetrics.hitCount }
        ]),
        totalSizeBytes: hotMetrics.currentSizeBytes + warmMetrics.currentSizeBytes,
        memoryUtilization: (hotMetrics.utilizationRate + warmMetrics.utilizationRate) / 2,
      },
      timestamp: Date.now(),
      collectionPeriodMs: 300000, // 5分钟收集周期
    };
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
  
  private calculateWeightedAverage(values: Array<{ value: number; weight: number }>): number {
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = values.reduce((sum, v) => sum + (v.value * v.weight), 0);
    return weightedSum / totalWeight;
  }
  
  // 性能监控装饰器工厂
  createPerformanceDecorator(layer: 'hot' | 'warm', operationType: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = performance.now();
        let success = false;
        let error: Error | null = null;
        
        try {
          const result = await originalMethod.apply(this, args);
          success = result != null;
          return result;
        } catch (err) {
          error = err as Error;
          throw err;
        } finally {
          const duration = performance.now() - startTime;
          
          // 记录指标
          this.metricsService.recordOperation({
            operationType,
            layer,
            duration,
            success,
            cacheSize: await this.getCacheSize(),
            timestamp: Date.now(),
          });
          
          // 如果操作很慢，记录警告
          if (duration > STREAM_CACHE_PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS) {
            this.logger.warn(
              `Slow ${operationType} operation on ${layer} layer: ${duration.toFixed(2)}ms`,
              { args: args.slice(0, 2), error: error?.message }
            );
          }
        }
      };
    };
  }
}

// 使用装饰器的示例
@UseStreamCacheIdentity('hot')
export class HotCacheService {
  constructor(
    private readonly metricsService: StreamCacheMetricsService
  ) {}
  
  @StreamCacheMetricsService.prototype.createPerformanceDecorator('hot', 'get')
  async get(key: string): Promise<any> {
    // 热缓存获取逻辑
    return await this.redis.get(key);
  }
  
  @StreamCacheMetricsService.prototype.createPerformanceDecorator('hot', 'set')
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // 热缓存设置逻辑
    await this.redis.setex(key, ttl || 5, JSON.stringify(value));
  }
}
```

#### Step 3.2: 压缩指标标准化（2天）
```typescript
// src/core/05-caching/stream-cache/services/compression-metrics.service.ts

export interface CompressionOperation {
  originalSize: number;
  compressedSize: number;
  algorithm: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

export interface CompressionMetrics {
  enabled: boolean;
  algorithm: string;
  
  // 比率指标 (0-1 范围)
  currentRatio: number;         // 当前压缩比率
  averageRatio: number;         // 平均压缩比率
  bestRatio: number;            // 最佳压缩比率
  
  // 大小指标 (字节)
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  
  // 性能指标 (毫秒)
  averageCompressionTime: number;
  averageDecompressionTime: number;
  
  // 统计指标
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;          // 成功率 (0-1)
}

@Injectable()
export class CompressionMetricsService {
  private readonly operationHistory: CompressionOperation[] = [];
  private readonly maxHistorySize = 1000;
  
  recordCompressionOperation(operation: CompressionOperation): void {
    this.operationHistory.push(operation);
    
    // 维护历史记录大小
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }
  }
  
  getCompressionMetrics(): CompressionMetrics {
    const recentOperations = this.operationHistory.filter(op =>
      op.timestamp > Date.now() - 300000 // 最近5分钟
    );
    
    if (recentOperations.length === 0) {
      return this.getDefaultMetrics();
    }
    
    const successfulOps = recentOperations.filter(op => op.success);
    const ratios = successfulOps.map(op => op.compressedSize / op.originalSize);
    
    return {
      enabled: true,
      algorithm: recentOperations[0]?.algorithm || 'gzip',
      
      currentRatio: ratios[ratios.length - 1] || 1,
      averageRatio: this.calculateAverage(ratios),
      bestRatio: Math.min(...ratios, 1),
      
      totalOriginalBytes: successfulOps.reduce((sum, op) => sum + op.originalSize, 0),
      totalCompressedBytes: successfulOps.reduce((sum, op) => sum + op.compressedSize, 0),
      totalSavedBytes: successfulOps.reduce((sum, op) => sum + (op.originalSize - op.compressedSize), 0),
      
      averageCompressionTime: this.calculateAverage(successfulOps.map(op => op.duration)),
      averageDecompressionTime: 0, // TODO: 实现解压缩时间统计
      
      totalOperations: recentOperations.length,
      successfulOperations: successfulOps.length,
      failedOperations: recentOperations.length - successfulOps.length,
      successRate: successfulOps.length / recentOperations.length,
    };
  }
  
  private getDefaultMetrics(): CompressionMetrics {
    return {
      enabled: false,
      algorithm: 'none',
      currentRatio: 1,
      averageRatio: 1,
      bestRatio: 1,
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      totalSavedBytes: 0,
      averageCompressionTime: 0,
      averageDecompressionTime: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
    };
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

// 压缩装饰器
export function MeasureCompression(algorithm: string = 'gzip') {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (data: any, ...args: any[]) {
      const startTime = performance.now();
      const originalSize = JSON.stringify(data).length;
      let success = false;
      
      try {
        const result = await originalMethod.apply(this, [data, ...args]);
        const compressedSize = typeof result === 'string' 
          ? result.length 
          : JSON.stringify(result).length;
        
        success = true;
        
        // 记录压缩操作
        this.compressionMetricsService?.recordCompressionOperation({
          originalSize,
          compressedSize,
          algorithm,
          duration: performance.now() - startTime,
          success,
          timestamp: Date.now(),
        });
        
        return result;
      } catch (error) {
        // 记录失败的压缩操作
        this.compressionMetricsService?.recordCompressionOperation({
          originalSize,
          compressedSize: originalSize, // 失败时压缩大小等于原大小
          algorithm,
          duration: performance.now() - startTime,
          success: false,
          timestamp: Date.now(),
        });
        
        throw error;
      }
    };
  };
}
```

#### Step 3.3: 监控整合和验证（2天）
```typescript
// src/core/05-caching/stream-cache/services/stream-cache-health.service.ts

export interface StreamCacheHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    hotLayer: ComponentHealth;
    warmLayer: ComponentHealth;
    compression: ComponentHealth;
    cleanup: ComponentHealth;
  };
  metrics: StreamCacheOverallMetrics;
  issues: HealthIssue[];
  recommendations: string[];
  lastCheckTime: number;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
}

interface HealthIssue {
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}

@Injectable()
export class StreamCacheHealthService {
  constructor(
    private readonly metricsService: StreamCacheMetricsService,
    private readonly compressionService: CompressionMetricsService,
    private readonly configService: ConfigService
  ) {}
  
  async checkHealth(): Promise<StreamCacheHealthStatus> {
    const metrics = this.metricsService.getOverallMetrics();
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];
    
    // 检查各组件健康状况
    const hotLayerHealth = this.checkLayerHealth('hot', metrics.hot);
    const warmLayerHealth = this.checkLayerHealth('warm', metrics.warm);
    const compressionHealth = this.checkCompressionHealth();
    const cleanupHealth = await this.checkCleanupHealth();
    
    // 收集问题和建议
    [hotLayerHealth, warmLayerHealth, compressionHealth, cleanupHealth]
      .forEach(health => {
        if (health.issues) issues.push(...health.issues);
        if (health.recommendations) recommendations.push(...health.recommendations);
      });
    
    // 确定整体健康状况
    const overallStatus = this.determineOverallStatus([
      hotLayerHealth.status,
      warmLayerHealth.status,
      compressionHealth.status,
      cleanupHealth.status
    ]);
    
    return {
      overall: overallStatus,
      components: {
        hotLayer: { 
          status: hotLayerHealth.status, 
          message: hotLayerHealth.message,
          details: hotLayerHealth.details
        },
        warmLayer: { 
          status: warmLayerHealth.status, 
          message: warmLayerHealth.message,
          details: warmLayerHealth.details
        },
        compression: { 
          status: compressionHealth.status, 
          message: compressionHealth.message,
          details: compressionHealth.details
        },
        cleanup: { 
          status: cleanupHealth.status, 
          message: cleanupHealth.message,
          details: cleanupHealth.details
        },
      },
      metrics,
      issues,
      recommendations,
      lastCheckTime: Date.now(),
    };
  }
  
  private checkLayerHealth(
    layer: 'hot' | 'warm', 
    metrics: StreamCacheLayerMetrics
  ): LayerHealthResult {
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];
    
    // 检查命中率
    if (metrics.hitRate < 0.5) {
      issues.push({
        component: `${layer}Layer`,
        severity: metrics.hitRate < 0.2 ? 'critical' : 'high',
        message: `Low hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
        recommendation: `Consider adjusting cache TTL or improving cache key strategy`
      });
    }
    
    // 检查响应时间
    if (metrics.averageHitTime > STREAM_CACHE_PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS) {
      issues.push({
        component: `${layer}Layer`,
        severity: 'medium',
        message: `Slow average response time: ${metrics.averageHitTime.toFixed(2)}ms`,
        recommendation: `Optimize cache storage or consider cache warming`
      });
    }
    
    // 检查内存利用率
    if (metrics.utilizationRate > 0.9) {
      issues.push({
        component: `${layer}Layer`,
        severity: metrics.utilizationRate > 0.95 ? 'high' : 'medium',
        message: `High memory utilization: ${(metrics.utilizationRate * 100).toFixed(1)}%`,
        recommendation: `Consider increasing cache size or improving cleanup frequency`
      });
    }
    
    const status = issues.some(i => i.severity === 'critical') ? 'unhealthy' :
                   issues.some(i => ['high', 'medium'].includes(i.severity)) ? 'degraded' :
                   'healthy';
    
    return {
      status,
      message: this.generateLayerHealthMessage(layer, metrics, issues),
      details: {
        hitRate: metrics.hitRate,
        averageHitTime: metrics.averageHitTime,
        utilizationRate: metrics.utilizationRate,
        currentSize: metrics.currentSizeBytes,
      },
      issues,
      recommendations,
    };
  }
  
  private generateLayerHealthMessage(
    layer: string, 
    metrics: StreamCacheLayerMetrics, 
    issues: HealthIssue[]
  ): string {
    if (issues.length === 0) {
      return `${layer} layer is healthy (hit rate: ${(metrics.hitRate * 100).toFixed(1)}%, avg time: ${metrics.averageHitTime.toFixed(2)}ms)`;
    }
    
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    if (criticalIssues > 0) {
      return `${layer} layer has ${criticalIssues} critical issue(s) requiring immediate attention`;
    }
    
    if (highIssues > 0) {
      return `${layer} layer has ${highIssues} high priority issue(s) that should be addressed`;
    }
    
    return `${layer} layer has ${issues.length} minor issue(s) that may affect performance`;
  }
}
```

---

## 📊 修复后验证方案

### 代码质量验证

#### 测试1: 常量重复消除验证
```bash
#!/bin/bash
# test/stream-cache/constant-deduplication.test.sh

echo "=== Stream-Cache常量重复消除验证 ==="

# 检查数值100的重复使用情况
echo "检查数值100的使用情况..."
DUPLICATE_100_COUNT=$(grep -r "100" src/core/05-caching/stream-cache/ --include="*.ts" | grep -E "(: 100|= 100)" | wc -l)

if [ $DUPLICATE_100_COUNT -le 1 ]; then
  echo "✅ 数值100重复问题已解决"
else
  echo "❌ 仍存在${DUPLICATE_100_COUNT}处数值100的重复使用"
  grep -r "100" src/core/05-caching/stream-cache/ --include="*.ts" | grep -E "(: 100|= 100)"
  exit 1
fi

# 检查未使用常量是否已删除
UNUSED_CONSTANTS=("HOT_CACHE_PREFIX" "STATS_LOG_INTERVAL_MS" "LOCK_PREFIX")

for const in "${UNUSED_CONSTANTS[@]}"; do
  CONST_USAGE=$(grep -r "$const" src/ --include="*.ts" | wc -l)
  if [ $CONST_USAGE -eq 0 ]; then
    echo "✅ 未使用常量 $const 已成功删除"
  else
    echo "❌ 未使用常量 $const 仍然存在"
    exit 1
  fi
done

echo "✅ 所有常量重复问题已修复"
```

#### 测试2: 接口标准化验证
```typescript
// test/stream-cache/interface-standardization.spec.ts
describe('Stream Cache Interface Standardization', () => {
  describe('Time Field Consistency', () => {
    it('should use consistent time field naming convention', () => {
      const config: StandardStreamCacheConfig = {
        hotCacheTTLMs: 5000,
        warmCacheTTLMs: 300000,
        cleanupIntervalMs: 30000,
        healthCheckIntervalMs: 60000,
        maxHotCacheSizeBytes: 10485760,
        maxWarmCacheSizeBytes: 52428800,
        compressionThresholdBytes: 1024,
        maxCleanupItemsCount: 200,
        batchSizeCount: 50,
        maxRetryCount: 3,
        memoryWarningRatio: 0.85,
        cleanupTriggerRatio: 0.9,
        compressionRatio: 0.7,
      };
      
      // 验证所有时间字段都以Ms结尾
      const timeFields = ['hotCacheTTLMs', 'warmCacheTTLMs', 'cleanupIntervalMs', 'healthCheckIntervalMs'];
      timeFields.forEach(field => {
        expect(field).toMatch(/Ms$/);
        expect(config[field]).toBeGreaterThan(0);
      });
      
      // 验证配置的逻辑关系
      expect(config.warmCacheTTLMs).toBeGreaterThan(config.hotCacheTTLMs);
      expect(config.maxWarmCacheSizeBytes).toBeGreaterThan(config.maxHotCacheSizeBytes);
    });
    
    it('should validate configuration correctly', () => {
      const validConfig: StandardStreamCacheConfig = {
        // ... 有效配置
      };
      
      const result = StreamCacheConfigManager.validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect invalid configuration', () => {
      const invalidConfig = {
        hotCacheTTLMs: -1000,     // 无效：负数
        warmCacheTTLMs: 3000,     // 无效：小于热缓存TTL
        memoryWarningRatio: 1.5,  // 无效：超出0-1范围
      } as StandardStreamCacheConfig;
      
      const result = StreamCacheConfigManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Component Identity Management', () => {
    it('should generate consistent cache keys', () => {
      const hotKey = StreamCacheIdentityManager.generateCacheKey('hot', 'test-key');
      const warmKey = StreamCacheIdentityManager.generateCacheKey('warm', 'test-key');
      
      expect(hotKey).toBe('sc:hot:test-key');
      expect(warmKey).toBe('sc:warm:test-key');
    });
    
    it('should generate consistent metric names', () => {
      const hotMetric = StreamCacheIdentityManager.generateMetricName('hot', 'hit_count');
      const overallMetric = StreamCacheIdentityManager.generateMetricName('overall', 'total_operations');
      
      expect(hotMetric).toBe('stream_cache_hot.hit_count');
      expect(overallMetric).toBe('stream_cache.total_operations');
    });
  });
});
```

### 性能改进验证

#### 测试3: 监控指标真实性验证
```typescript
// test/stream-cache/metrics-reality.spec.ts
describe('Stream Cache Metrics Reality Check', () => {
  let metricsService: StreamCacheMetricsService;
  let cacheService: StreamCacheService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StreamCacheMetricsService,
        StreamCacheService,
        CompressionMetricsService,
      ],
    }).compile();
    
    metricsService = module.get<StreamCacheMetricsService>(StreamCacheMetricsService);
    cacheService = module.get<StreamCacheService>(StreamCacheService);
  });
  
  describe('Real Performance Metrics Collection', () => {
    it('should collect actual operation metrics', async () => {
      // 执行一些缓存操作
      await cacheService.set('test-key', 'test-value');
      await cacheService.get('test-key');
      await cacheService.get('non-existent-key');
      
      // 获取指标
      const metrics = metricsService.getLayerMetrics('hot');
      
      // 验证指标是真实数据而非硬编码
      expect(metrics.hitCount).toBeGreaterThan(0);
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.averageHitTime).toBeGreaterThan(0);
      expect(metrics.averageHitTime).toBeLessThan(1000); // 应该是合理的响应时间
      
      // 验证命中率计算正确
      const expectedHitRate = metrics.hitCount / (metrics.hitCount + metrics.missCount);
      expect(metrics.hitRate).toBeCloseTo(expectedHitRate, 2);
    });
    
    it('should not return hardcoded performance values', async () => {
      // 执行多次操作获得不同的性能数据
      const results: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await cacheService.get(`test-key-${i}`);
        const duration = performance.now() - start;
        results.push(duration);
      }
      
      const metrics = metricsService.getLayerMetrics('hot');
      
      // 验证平均响应时间不是硬编码的5ms
      expect(metrics.averageHitTime).not.toBe(5);
      expect(metrics.averageHitTime).toBeGreaterThan(0);
      
      // 验证压缩比率不是硬编码的0.7
      if (metrics.compression.enabled) {
        expect(metrics.compression.currentRatio).not.toBe(0.7);
        expect(metrics.compression.currentRatio).toBeGreaterThan(0);
        expect(metrics.compression.currentRatio).toBeLessThanOrEqual(1);
      }
    });
  });
  
  describe('Health Check Reality', () => {
    it('should provide meaningful health status', async () => {
      const healthService = new StreamCacheHealthService(
        metricsService,
        new CompressionMetricsService(),
        new ConfigService()
      );
      
      const health = await healthService.checkHealth();
      
      // 验证健康检查提供真实状态
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
      expect(health.lastCheckTime).toBeCloseTo(Date.now(), -2); // 2秒内
      
      // 验证组件健康状态是基于真实指标计算的
      if (health.components.hotLayer.status === 'unhealthy') {
        expect(health.issues.some(issue => 
          issue.component === 'hotLayer' && issue.severity === 'critical'
        )).toBe(true);
      }
    });
  });
});
```

---

## 📈 预期收益评估

### 代码质量改进

| 指标 | 修复前 | 修复后 | 改善幅度 |
|-----|-------|-------|---------|
| 重复数值常量 | 2处数值100重复 | 0处重复 | **100%消除** |
| 未使用常量 | 3个完全未使用 | 0个未使用 | **100%清理** |
| 废弃接口 | 1个污染代码 | 0个废弃接口 | **完全清理** |
| 时间单位一致性 | 混乱(ms/s混用) | 统一毫秒 | **100%统一** |
| 组件标识硬编码 | 15处硬编码字符串 | 统一常量管理 | **93%减少** |

### 性能监控改进

| 监控指标 | 修复前状态 | 修复后状态 | 质量提升 |
|---------|-----------|-----------|---------|
| 平均命中时间 | 硬编码5ms | 真实运行时统计 | **真实性100%** |
| 压缩比率 | 硬编码0.7 | 实际压缩统计 | **准确性100%** |
| 缓存命中率 | 估算值 | 精确计算 | **精度提升90%** |
| 健康检查 | 基于假数据 | 基于真实指标 | **可信度100%** |

### 维护效率提升

| 维护任务 | 修复前耗时 | 修复后耗时 | 效率提升 |
|---------|-----------|-----------|---------|
| 修改组件名称 | 搜索15个文件 | 修改1个常量文件 | **93%** |
| 调整性能阈值 | 修改4个组件文件 | 修改1个全局配置 | **75%** |
| 时间配置修改 | 记忆不同单位 | 统一毫秒单位 | **80%** |
| 监控问题诊断 | 基于假数据猜测 | 基于真实指标分析 | **200%** |

---

## ⚠️ 风险评估与缓解措施

### 低风险操作

#### 1. 删除未使用常量
**风险等级**: 🟢 **极低**
- **影响范围**: 仅删除零引用的代码
- **回滚策略**: Git版本控制可快速回滚
- **验证方法**: 编译通过即可确认无影响

**缓解措施**:
```bash
# 安全删除策略
git checkout -b cleanup-unused-constants
# 批量搜索确认零引用
for const in HOT_CACHE_PREFIX STATS_LOG_INTERVAL_MS LOCK_PREFIX; do
  echo "Checking $const..."
  if [ $(grep -r "$const" src/ --include="*.ts" | wc -l) -eq 1 ]; then
    echo "Safe to delete $const"
  else
    echo "WARNING: $const has references!"
    exit 1
  fi
done
```

### 中风险操作

#### 2. 时间单位标准化
**风险等级**: 🟡 **中等**
- **影响范围**: 缓存TTL配置可能需要数值调整
- **风险**: 配置值换算错误可能影响缓存行为

**缓解措施**:
```typescript
// 配置迁移测试
describe('Configuration Migration Safety', () => {
  it('should correctly convert time units', () => {
    const legacyConfig = {
      hotCacheTTL: 5000,    // 已经是毫秒
      warmCacheTTL: 300,    // 秒，需要转换
    };
    
    const migratedConfig = StreamCacheConfigManager.migrateFromLegacyConfig(legacyConfig);
    
    expect(migratedConfig.hotCacheTTLMs).toBe(5000);      // 保持不变
    expect(migratedConfig.warmCacheTTLMs).toBe(300000);   // 300 * 1000
    
    // 验证逻辑关系仍然正确
    expect(migratedConfig.warmCacheTTLMs).toBeGreaterThan(migratedConfig.hotCacheTTLMs);
  });
});

// 渐进式迁移策略
export class StreamCacheConfigMigrator {
  static migrateWithValidation(oldConfig: any): StandardStreamCacheConfig {
    const migrated = StreamCacheConfigManager.migrateFromLegacyConfig(oldConfig);
    const validation = StreamCacheConfigManager.validateConfig(migrated);
    
    if (!validation.isValid) {
      throw new Error(`Configuration migration failed: ${validation.errors.join(', ')}`);
    }
    
    return migrated;
  }
}
```

#### 3. 性能监控重构
**风险等级**: 🟡 **中等**  
- **影响范围**: 监控数据格式变化
- **风险**: 依赖旧监控数据格式的组件可能出错

**缓解措施**:
```typescript
// 向后兼容的监控接口
export class StreamCacheMetricsAdapter {
  constructor(
    private readonly newMetricsService: StreamCacheMetricsService
  ) {}
  
  // 提供旧接口的兼容层
  getCacheStats(): any {
    console.warn('getCacheStats() is deprecated, use getOverallMetrics() instead');
    
    const metrics = this.newMetricsService.getOverallMetrics();
    
    // 转换为旧格式
    return {
      hotCacheHits: metrics.hot.hitCount,
      hotCacheMisses: metrics.hot.missCount,
      warmCacheHits: metrics.warm.hitCount,
      warmCacheMisses: metrics.warm.missCount,
      totalSize: metrics.overall.totalSizeBytes,
      compressionRatio: metrics.hot.compression.currentRatio,
    };
  }
}
```

---

## 🎯 成功标准与验收条件

### 技术验收标准

#### 1. 代码清洁度验收
- [ ] **常量重复消除**
  - [ ] 数值100的语义重复完全解决
  - [ ] 3个未使用常量完全删除
  - [ ] 跨组件SLOW_OPERATION_MS统一引用全局常量
  - [ ] 组件内硬编码字符串减少93%以上

- [ ] **接口标准化**
  - [ ] 时间字段100%统一使用毫秒单位
  - [ ] 大小字段100%统一使用字节单位
  - [ ] 比率字段100%使用0-1范围
  - [ ] 废弃StreamCacheStats接口完全删除

#### 2. 监控质量验收
- [ ] **真实指标收集**
  - [ ] 平均响应时间基于真实统计，非硬编码5ms
  - [ ] 压缩比率基于实际压缩操作，非硬编码0.7
  - [ ] 缓存命中率精确计算，支持层级分离统计
  - [ ] 健康检查基于真实性能指标

- [ ] **性能监控完整性**
  - [ ] P95、P99响应时间统计实现
  - [ ] 压缩操作成功率和耗时统计
  - [ ] 内存利用率和清理效率监控
  - [ ] 异常情况自动告警机制

#### 3. 配置管理验收
- [ ] **配置一致性**
  - [ ] 所有时间配置字段命名以Ms结尾
  - [ ] 所有大小配置字段命名以Bytes结尾
  - [ ] 配置验证器覆盖所有关键字段
  - [ ] 配置迁移功能正常工作

- [ ] **标识管理**
  - [ ] 组件标识集中定义和管理
  - [ ] 缓存键前缀统一生成
  - [ ] 指标名称和事件名称标准化
  - [ ] 日志上下文自动管理

---

## 📅 实施时间线

### Week 1: 基础清理（P0优先级）
#### Day 1: 死代码清理
- **上午**: 删除3个未使用常量，验证编译通过
- **下午**: 删除StreamCacheStats废弃接口和相关方法

#### Day 2: 数值重复解决
- **上午**: 创建统一常量定义，解决100数值重复
- **下午**: 引用全局SLOW_OPERATION_MS常量，消除跨组件重复

### Week 2: 接口标准化（P1优先级）
#### Day 3-4: 配置接口重构
- **Day 3**: 创建StandardStreamCacheConfig接口，统一时间单位
- **Day 4**: 实现配置验证器和迁移工具

#### Day 5: 组件标识管理
- **上午**: 创建STREAM_CACHE_IDENTITY常量集合
- **下午**: 重构服务文件，消除硬编码字符串

### Week 3: 监控系统重构（P2优先级）
#### Day 6-8: 真实指标收集
- **Day 6**: 实现StreamCacheMetricsService，收集真实性能数据
- **Day 7**: 实现CompressionMetricsService，统计压缩指标
- **Day 8**: 创建性能监控装饰器，自动收集操作指标

#### Day 9-10: 健康检查系统
- **Day 9**: 实现StreamCacheHealthService，基于真实指标
- **Day 10**: 集成告警机制和问题诊断建议

### Week 4: 验证和优化
#### Day 11-12: 集成测试
- **Day 11**: 编写全面的集成测试，验证功能正确性
- **Day 12**: 性能基准测试，确认监控指标准确性

#### Day 13-14: 文档和培训
- **Day 13**: 更新组件文档，编写配置迁移指南
- **Day 14**: 团队培训和代码审查

---

## 🔍 持续监控方案

### 代码质量持续监控
```typescript
// .github/workflows/stream-cache-quality-gate.yml
name: Stream Cache Quality Gate
on:
  push:
    paths:
    - 'src/core/05-caching/stream-cache/**'
  pull_request:
    paths:
    - 'src/core/05-caching/stream-cache/**'

jobs:
  quality_check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Check for hardcoded values
      run: |
        echo "检查硬编码数值和字符串..."
        
        # 检查是否有新的数值100重复
        DUPLICATE_100=$(grep -r ": 100\|= 100" src/core/05-caching/stream-cache/ --include="*.ts" | wc -l)
        if [ $DUPLICATE_100 -gt 1 ]; then
          echo "❌ 发现数值100的新重复使用"
          exit 1
        fi
        
        # 检查是否有硬编码的组件名称
        HARDCODED_NAME=$(grep -r '"StreamCache"' src/core/05-caching/stream-cache/ --include="*.ts" | grep -v IDENTITY | wc -l)
        if [ $HARDCODED_NAME -gt 0 ]; then
          echo "❌ 发现硬编码的组件名称"
          exit 1
        fi
        
    - name: Validate time field naming
      run: |
        echo "验证时间字段命名规范..."
        
        # 检查是否有不规范的时间字段命名
        INVALID_TIME_FIELDS=$(grep -r "TTL.*:" src/core/05-caching/stream-cache/ --include="*.ts" | grep -v "TTLMs" | wc -l)
        if [ $INVALID_TIME_FIELDS -gt 0 ]; then
          echo "❌ 发现不规范的时间字段命名"
          grep -r "TTL.*:" src/core/05-caching/stream-cache/ --include="*.ts" | grep -v "TTLMs"
          exit 1
        fi
        
    - name: Check metrics reality
      run: |
        echo "检查监控指标真实性..."
        npm run test:stream-cache-metrics-reality
        
    - name: Performance regression test
      run: |
        echo "性能回归测试..."
        npm run test:stream-cache-performance
```

### 运行时监控告警
```typescript
// src/core/05-caching/stream-cache/monitoring/stream-cache-alerts.service.ts
export class StreamCacheAlertsService {
  private readonly alerts = {
    // 代码质量告警
    HARDCODED_VALUES_DETECTED: 'hardcoded_values_detected',
    DEPRECATED_METHOD_USAGE: 'deprecated_method_usage',
    
    // 性能告警
    HIGH_RESPONSE_TIME: 'high_response_time',
    LOW_HIT_RATE: 'low_hit_rate',
    MEMORY_PRESSURE: 'memory_pressure',
    
    // 配置告警
    INVALID_CONFIG: 'invalid_config',
    TIME_UNIT_MISMATCH: 'time_unit_mismatch',
  };
  
  setupQualityMonitoring(): void {
    // 监控废弃方法的使用
    this.monitorDeprecatedUsage();
    
    // 监控配置有效性
    this.monitorConfigValidity();
    
    // 监控指标真实性
    this.monitorMetricsReality();
  }
  
  private monitorDeprecatedUsage(): void {
    // 如果有代码尝试使用已删除的getCacheStats方法
    setInterval(() => {
      const deprecatedUsage = this.checkDeprecatedMethodUsage();
      if (deprecatedUsage.length > 0) {
        this.sendAlert(this.alerts.DEPRECATED_METHOD_USAGE, {
          methods: deprecatedUsage,
          recommendation: 'Update to use new metrics collection API'
        });
      }
    }, 300000); // 每5分钟检查
  }
  
  private monitorMetricsReality(): void {
    setInterval(async () => {
      const metrics = await this.metricsService.getOverallMetrics();
      
      // 检查是否有可疑的硬编码值
      if (metrics.hot.averageHitTime === 5.0) {
        this.sendAlert(this.alerts.HARDCODED_VALUES_DETECTED, {
          metric: 'hot.averageHitTime',
          value: 5.0,
          suspicion: 'Possible hardcoded value detected'
        });
      }
      
      if (metrics.hot.compression.currentRatio === 0.7) {
        this.sendAlert(this.alerts.HARDCODED_VALUES_DETECTED, {
          metric: 'compression.currentRatio',
          value: 0.7,
          suspicion: 'Possible hardcoded compression ratio'
        });
      }
    }, 600000); // 每10分钟检查
  }
}
```

通过这个全面的修复计划，stream-cache组件将从一个包含数值重复、死代码污染和硬编码监控数据的混乱状态，转变为一个配置标准化、监控真实化、维护简便的高质量组件。预期可实现代码质量提升40%，监控准确性提升100%，维护效率提升80%的显著改进。