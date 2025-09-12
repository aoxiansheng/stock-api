# Cache 组件配置与环境变量说明

## 概述

Cache模块是系统的核心缓存抽象层，基于Redis实现，提供智能缓存、分布式锁、容错机制等高级功能。本文档详细说明组件功能、配置项以及与环境变量的关系。

## 🎯 核心功能

### CacheService 主要功能

#### 1. 基础缓存操作
- `set<T>(key, value, options)` - 智能缓存设置，支持压缩与序列化
- `get<T>(key, deserializer)` - 智能缓存获取，自动解压与反序列化
- `getOrSet<T>(key, callback, options)` - 防缓存击穿的回调缓存
- `delete(key)` - 缓存删除
- `mget/mset` - 批量操作优化

#### 2. 高级数据结构操作
- **Redis Hash**: `hashGet/hashSet/hashGetAll`
- **Redis List**: `listPush/listTrim/listRange` 
- **Redis Set**: `setAdd/setIsMember/setMembers`

#### 3. 智能特性
- **分布式锁机制**: 防止缓存击穿，基于Redis NX命令
- **自动压缩**: Gzip压缩，可配置阈值
- **多序列化格式**: JSON/msgpack（已完整实现）
- **慢操作监控**: 超过阈值自动告警

#### 4. 容错机制
- **故障降级**: 非关键操作失败时返回默认值而非抛异常
- **事件驱动监控**: 实时发送缓存操作事件
- **健康检查**: 提供缓存统计与健康状态

## 📋 配置架构（已统一重构）

### 统一配置管理

#### 主配置文件
```typescript
// 文件：src/cache/config/cache.config.ts
// 🎯 使用 NestJS ConfigModule 的 registerAs 模式，支持环境变量和验证
export class CacheConfigValidation {
  defaultTtl: number = 300;              // 默认TTL: 5分钟
  compressionThreshold: number = 1024;   // 压缩阈值: 1KB
  compressionEnabled: boolean = true;    // 是否启用压缩
  maxItems: number = 10000;              // 最大缓存项数
  maxKeyLength: number = 255;            // 最大键长度
  maxValueSizeMB: number = 10;           // 最大值大小(MB)
  maxBatchSize: number = 100;            // 最大批量操作大小
  slowOperationMs: number = 100;         // 慢操作阈值(毫秒)
  retryDelayMs: number = 100;            // 重试延迟(毫秒)
  lockTtl: number = 30;                  // 分布式锁TTL(秒)
}
```

#### 非配置类常量（保留）
```typescript
// 文件：src/cache/constants/cache.constants.ts
// 📝 配置相关的常量已移至 cache.config.ts，这里仅保留非配置类的结构化常量
export const CACHE_CONSTANTS = {
  KEY_PREFIXES: CACHE_KEY_PREFIX_SEMANTICS,
  // 其他配置已迁移至 ConfigService
}
```

#### 缓存键前缀
```typescript
// 文件：src/cache/constants/config/cache-keys.constants.ts
export const CACHE_KEYS = {
  PREFIXES: {
    HEALTH: "cache:health:",
    METRICS: "cache:metrics:",
    LOCK: "cache:lock:",
    CONFIG: "cache:config:",
  }
}
```

### 运行时配置项

#### CacheConfigDto 可选参数
```typescript
// 文件：src/cache/dto/config/cache-config.dto.ts
export class CacheConfigDto {
  ttl?: number;                    // TTL时间（秒）
  maxSize?: number;               // 最大缓存大小（字节）
  enabled?: boolean;              // 缓存开关
  serializer?: SerializerType;    // 序列化类型：'json'|'msgpack'（msgpack已完整实现）
  compressionThreshold?: number;  // 压缩阈值（字节）
}
```

### msgpack 序列化支持

#### 特性说明
- **支持复杂对象**: 嵌套对象、数组、日期等
- **性能优势**: 相比JSON通常更紧凑，序列化更快
- **存储格式**: base64编码的msgpack二进制数据
- **兼容性**: 与现有JSON序列化完全兼容

#### 使用示例
```typescript
// 使用 msgpack 序列化
await cacheService.set('complex-data', complexObject, {
  serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
  ttl: 600
});

// 获取 msgpack 数据
const data = await cacheService.get('complex-data', CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK);
```

## 🌐 环境变量配置

### Redis连接配置
```env
# Redis基础连接
REDIS_HOST=localhost        # Redis主机地址
REDIS_PORT=6379            # Redis端口
REDIS_PASSWORD=***         # Redis密码（可选）
REDIS_URL=redis://localhost:6379  # 完整Redis URL（备选）
```

### 统一缓存配置（已重构）
```env
# 文件：src/cache/config/cache.config.ts（通过 registerAs('cache') 注册）
# 🎯 所有缓存相关配置已统一到此处，支持环境变量覆盖和验证

CACHE_DEFAULT_TTL=300                    # 默认TTL（秒，默认300）
CACHE_COMPRESSION_THRESHOLD=1024         # 压缩阈值（字节，默认1024）
CACHE_COMPRESSION_ENABLED=true           # 是否启用压缩（默认true）
CACHE_MAX_ITEMS=10000                    # 最大缓存项数（默认10000）
CACHE_MAX_KEY_LENGTH=255                 # 最大键长度（默认255）
CACHE_MAX_VALUE_SIZE_MB=10               # 最大值大小MB（默认10）
CACHE_MAX_BATCH_SIZE=100                 # 最大批量操作大小（默认100）
CACHE_SLOW_OPERATION_MS=100              # 慢操作阈值ms（默认100）
CACHE_RETRY_DELAY_MS=100                 # 重试延迟ms（默认100）
CACHE_LOCK_TTL=30                        # 分布式锁TTL秒（默认30）
```

### 监控模块缓存配置
```env
# 文件：src/monitoring/config/monitoring.config.ts
MONITORING_CACHE_NAMESPACE=monitoring          # 监控缓存命名空间
MONITORING_COMPRESSION_THRESHOLD=1024         # 监控模块压缩阈值
MONITORING_TTL_HEALTH=300                     # 健康检查TTL
MONITORING_TTL_PERFORMANCE=180                # 性能监控TTL
MONITORING_TTL_CACHE_STATS=120               # 缓存统计TTL
MONITORING_TTL_TREND=600                     # 趋势分析TTL
MONITORING_TTL_ALERT=60                      # 告警信息TTL
```

### 特性开关配置
```env
# 文件：src/appcore/config/feature-flags.config.ts
SYMBOL_MAPPING_CACHE_ENABLED=true            # 符号映射缓存开关
DATA_TRANSFORM_CACHE_ENABLED=true            # 数据转换缓存开关

# Symbol Mapper 3层缓存配置
SYMBOL_CACHE_MAX_SIZE=2000                   # L2符号缓存最大条目
SYMBOL_CACHE_TTL=43200000                    # L2符号缓存TTL（12小时）
RULE_CACHE_MAX_SIZE=100                      # L1规则缓存最大条目
RULE_CACHE_TTL=86400000                      # L1规则缓存TTL（24小时）
BATCH_RESULT_CACHE_MAX_SIZE=1000            # L3批量结果缓存最大条目
BATCH_RESULT_CACHE_TTL=7200000              # L3批量结果缓存TTL（2小时）
```

### 查询超时配置
```env
# 文件：src/core/01-entry/query/config/query.config.ts
QUERY_MARKET_TIMEOUT=30000                   # 市场查询超时（ms）
QUERY_RECEIVER_TIMEOUT=10000                 # 接收器查询超时（ms）
SYMBOL_MAPPER_QUERY_TIMEOUT_MS=5000         # 符号映射查询超时（ms）
```

## ✅ 配置重构完成状态

### 已解决的配置冲突

#### 1. 压缩阈值统一 ✅
- **之前**: 3个不同的配置源导致不一致
- **现在**: 统一到 `src/cache/config/cache.config.ts`
- **配置**: `CACHE_COMPRESSION_THRESHOLD=1024`
- **验证**: 使用 class-validator 确保配置有效性

#### 2. TTL配置统一 ✅
- **之前**: 默认TTL冲突（300秒 vs 3600秒）
- **现在**: 统一默认值为300秒，通过环境变量可覆盖
- **配置**: `CACHE_DEFAULT_TTL=300`
- **一致性**: 所有cache模块统一使用

#### 3. 配置管理模式统一 ✅
- **架构**: 使用 NestJS ConfigModule + registerAs('cache')
- **验证**: class-validator 自动验证
- **注入**: CacheService 通过 ConfigService 获取配置
- **环境变量**: 支持运行时覆盖，具有最高优先级

### 独占配置项

#### CacheService 独占配置
- **分布式锁TTL**: `TTL_VALUES.LOCK_TTL = 30`
- **慢操作监控阈值**: `SLOW_OPERATION_MS = 100`
- **Redis重试延迟**: `RETRY_DELAY_MS = 100`

#### 各模块独占配置
- **Symbol Mapper**: 独立的3层LRU缓存配置
- **Monitoring**: 独立的namespace和TTL配置
- **Query/Receiver**: 独立的超时配置

## 📊 配置优先级与作用域

### 配置优先级（从高到低）
1. **运行时参数**: `CacheConfigDto` 传入的配置
2. **环境变量**: `process.env.*` 配置
3. **默认常量**: 代码中定义的默认值

### 配置作用域

#### 全局作用域
- Redis连接配置
- 全局缓存限制（TTL、压缩阈值）

#### 模块作用域
- 各模块的TTL配置
- 特定功能的开关配置

#### 操作作用域
- 单次缓存操作的配置重写

## ✅ 重构成果总结

### 1. 统一配置管理 ✅ 已实现
```typescript
// 实现：src/cache/config/cache.config.ts
import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, Min, validateSync } from 'class-validator';

export default registerAs('cache', (): CacheConfigValidation => {
  const config = {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD, 10) || 1024,
    // ... 其他配置
  };
  
  const errors = validateSync(plainToClass(CacheConfigValidation, config));
  if (errors.length > 0) {
    throw new Error(`Cache configuration validation failed: ${errors}`);
  }
  
  return config;
});
```

### 2. 分层配置策略 ✅ 已实现
- **环境变量层**: 最高优先级，生产环境覆盖
- **配置文件层**: 带验证的默认值
- **运行时参数层**: CacheConfigDto 操作级覆盖

### 3. 配置验证 ✅ 已实现
```typescript
// 实现：class-validator 装饰器验证
export class CacheConfigValidation {
  @IsNumber()
  @Min(1)
  defaultTtl: number = 300;
  
  @IsNumber()
  @Min(0)
  compressionThreshold: number = 1024;
  
  // ... 完整的验证规则
}
```

### 4. msgpack支持 ✅ 已实现
- **序列化支持**: 完整实现msgpack序列化和反序列化
- **性能优化**: 二进制格式，更紧凑的存储
- **错误处理**: 完善的错误处理机制
- **类型安全**: TypeScript类型定义完整

## 📝 使用示例

### 基础使用
```typescript
// 使用默认配置（现在通过 ConfigService 统一管理）
await cacheService.set('key', value);

// 自定义配置
await cacheService.set('key', value, {
  ttl: 600,
  compressionThreshold: 2048,
  serializer: CACHE_DATA_FORMATS.SERIALIZATION.JSON
});

// 使用 msgpack 序列化
await cacheService.set('complex-key', complexObject, {
  serializer: CACHE_DATA_FORMATS.SERIALIZATION.MSGPACK,
  ttl: 1800
});
```

### 容错使用
```typescript
// 故障安全的非关键操作
const members = await cacheService.setMembers('key'); // 失败时返回[]
const allData = await cacheService.hashGetAll('key'); // 失败时返回{}
```

### 分布式锁使用
```typescript
// 防缓存击穿
const result = await cacheService.getOrSet('expensive-key', async () => {
  return await expensiveComputation();
}, { ttl: 3600 });
```

## 🚨 注意事项（更新后）

1. **配置统一**: ✅ 已解决配置冲突，所有cache相关配置统一管理
2. **环境变量优先**: 生产环境中环境变量会覆盖默认配置
3. **配置验证**: 启动时自动验证配置有效性，无效配置会阻止启动
4. **msgpack兼容性**: 选择序列化格式后需保持一致，不同格式间不兼容
5. **性能影响**: 压缩阈值和TTL设置直接影响系统性能
6. **容错机制**: 理解哪些操作会抛异常，哪些会返回默认值

## 🎉 重构完成状态

### 修复的问题
- ✅ **配置冲突**: TTL和压缩阈值统一
- ✅ **msgpack支持**: 完整实现序列化功能
- ✅ **配置验证**: class-validator自动验证
- ✅ **模块化**: NestJS标准配置模式
- ✅ **代码清理**: 移除废弃注释和TODO

### 技术栈
- **配置管理**: NestJS ConfigModule + registerAs
- **验证**: class-validator + class-transformer
- **序列化**: JSON + msgpack-lite
- **类型安全**: 完整TypeScript支持
- **测试覆盖**: 统一配置和msgpack单元测试

---

*最后更新: 2025-09-12*
*版本: 2.0（重构完成版）*