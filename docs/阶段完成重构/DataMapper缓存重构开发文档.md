# DataMapper 缓存重构开发文档

## 🎯 重构目标

根据 NestJS 最佳实践，将 DataMapper 模块从通用 CacheService 中分离，创建专用的 DataMapperCache 服务，实现职责分离和代码可维护性提升。

## 📋 重构范围分析

### 当前架构分析

#### 1. MappingRuleCacheService 使用的 CacheService 功能
通过代码分析，MappingRuleCacheService 仅使用以下 CacheService 方法：

```typescript
// 基础操作
await this.cacheService.set(key, value, { ttl: ttl })
await this.cacheService.get<T>(key)
await this.cacheService.del(keys)
await this.cacheService.delByPattern(pattern)
```

#### 2. 专用缓存需求特征
- **缓存键前缀**: `mapping_rule:*`
- **TTL 策略**: 4 种不同过期时间 (300s-3600s)
- **数据类型**: FlexibleMappingRuleResponseDto
- **操作模式**: 简单 CRUD，无需压缩/序列化等高级功能

#### 3. 通用 CacheService 的复杂功能（DataMapper 未使用）
- 压缩/解压缩 (compress/decompress)
- 批量操作 (mget/mset)
- 分布式锁 (getOrSet with locking)
- Hash/Set/List 操作
- 性能监控和统计
- 健康检查
- 预热功能

## 🏗️ 新架构设计

### 1. 目录结构
```
src/core/05-caching/data-mapper-cache/
├── services/
│   └── data-mapper-cache.service.ts     # 专用缓存服务
├── interfaces/
│   └── data-mapper-cache.interface.ts   # 缓存接口定义
├── dto/
│   └── data-mapper-cache.dto.ts         # 缓存配置 DTO
├── constants/
│   └── data-mapper-cache.constants.ts   # 缓存常量
├── module/
│   └── data-mapper-cache.module.ts      # 缓存模块
└── __tests__/
    ├── data-mapper-cache.service.spec.ts
    └── data-mapper-cache.integration.test.ts
```

### 2. 核心接口设计

#### IDataMapperCache 接口
```typescript
export interface IDataMapperCache {
  // 最佳匹配规则缓存
  cacheBestMatchingRule(
    provider: string, 
    apiType: 'rest' | 'stream', 
    transDataRuleListType: string, 
    rule: FlexibleMappingRuleResponseDto
  ): Promise<void>;
  
  getCachedBestMatchingRule(
    provider: string, 
    apiType: 'rest' | 'stream', 
    transDataRuleListType: string
  ): Promise<FlexibleMappingRuleResponseDto | null>;
  
  // 规则ID缓存
  cacheRuleById(rule: FlexibleMappingRuleResponseDto): Promise<void>;
  getCachedRuleById(dataMapperRuleId: string): Promise<FlexibleMappingRuleResponseDto | null>;
  
  // 提供商规则列表缓存
  cacheProviderRules(
    provider: string, 
    apiType: 'rest' | 'stream', 
    rules: FlexibleMappingRuleResponseDto[]
  ): Promise<void>;
  getCachedProviderRules(
    provider: string, 
    apiType: 'rest' | 'stream'
  ): Promise<FlexibleMappingRuleResponseDto[] | null>;
  
  // 缓存失效
  invalidateRuleCache(dataMapperRuleId: string, rule?: FlexibleMappingRuleResponseDto): Promise<void>;
  invalidateProviderCache(provider: string): Promise<void>;
  clearAllRuleCache(): Promise<void>;
  
  // 预热和统计
  warmupCache(commonRules: FlexibleMappingRuleResponseDto[]): Promise<void>;
  getCacheStats(): Promise<DataMapperCacheStats>;
}
```

### 3. 数据传输对象

#### DataMapperCacheConfig
```typescript
export class DataMapperCacheConfigDto {
  ttl?: number;
  serializer?: 'json';  // 仅支持 JSON
  enableMetrics?: boolean;
}

export class DataMapperCacheStats {
  bestRuleCacheSize: number;
  ruleByIdCacheSize: number;
  providerRulesCacheSize: number;
  totalCacheSize: number;
  hitRate: number;
  avgResponseTime: number;
}
```

### 4. 常量定义

#### DataMapperCacheConstants
```typescript
export const DATA_MAPPER_CACHE_CONSTANTS = {
  // 缓存键前缀
  CACHE_KEYS: {
    BEST_RULE: 'dm:best_rule',
    RULE_BY_ID: 'dm:rule_by_id', 
    PROVIDER_RULES: 'dm:provider_rules',
    RULE_STATS: 'dm:rule_stats',
  },
  
  // TTL 配置 (秒)
  TTL: {
    BEST_RULE: 1800,      // 30分钟
    RULE_BY_ID: 3600,     // 1小时
    PROVIDER_RULES: 900,  // 15分钟
    RULE_STATS: 300,      // 5分钟
  },
  
  // 性能阈值
  PERFORMANCE: {
    SLOW_OPERATION_MS: 100,
    MAX_BATCH_SIZE: 100,
  }
} as const;
```

## 🚀 实施计划

### Phase 1: 创建专用缓存服务
1. **创建 DataMapperCacheService**
   - 实现 IDataMapperCache 接口
   - 依赖基础 RedisService（而非 CacheService）
   - 专注于 DataMapper 业务逻辑

2. **创建 DataMapperCacheModule**
   - 配置依赖注入
   - 导出专用服务

### Phase 2: 重构 MappingRule 模块
1. **更新 MappingRuleCacheService**
   - 替换 CacheService 依赖为 DataMapperCacheService
   - 简化业务逻辑代码
   - 保持 API 接口兼容

2. **更新 DataMapperModule**
   - 导入 DataMapperCacheModule
   - 移除对通用 CacheModule 的依赖

### Phase 3: 清理通用 CacheService
1. **代码清理**
   - 移除未使用的方法和属性
   - 保留通用缓存核心功能
   - 优化性能监控

2. **依赖清理**
   - 检查其他模块对清理功能的依赖
   - 确保无破坏性变更

### Phase 4: 测试和验证
1. **单元测试**
   - DataMapperCacheService 完整测试覆盖
   - Mock RedisService 依赖

2. **集成测试**
   - DataMapper 模块集成测试
   - 缓存功能端到端测试

3. **性能测试**
   - 缓存命中率验证
   - 响应时间对比

## 📊 预期收益

### 1. 架构改进
- **职责分离**: DataMapper 缓存逻辑独立
- **依赖简化**: 移除不必要的复杂功能依赖
- **可维护性**: 专用服务便于维护和扩展

### 2. 性能优化
- **内存优化**: 移除未使用的性能监控开销
- **启动优化**: 减少不必要的后台任务
- **缓存效率**: 专为 DataMapper 场景优化

### 3. 代码质量
- **类型安全**: 强类型接口定义
- **测试覆盖**: 专用测试套件
- **文档完整**: 清晰的 API 文档

## 🔧 技术实现细节

### DataMapperCacheService 核心实现

```typescript
@Injectable()
export class DataMapperCacheService implements IDataMapperCache {
  private readonly logger = createLogger(DataMapperCacheService.name);
  
  constructor(private readonly redisService: RedisService) {}
  
  private get redis(): Redis {
    return this.redisService.getOrThrow();
  }
  
  async cacheBestMatchingRule(
    provider: string,
    apiType: 'rest' | 'stream',
    transDataRuleListType: string,
    rule: FlexibleMappingRuleResponseDto
  ): Promise<void> {
    const key = this.buildBestRuleKey(provider, apiType, transDataRuleListType);
    const ttl = DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE;
    
    try {
      await this.redis.setex(key, ttl, JSON.stringify(rule));
      this.logger.debug('最佳匹配规则已缓存', { provider, apiType, transDataRuleListType });
    } catch (error) {
      this.logger.warn('缓存最佳匹配规则失败', { error: error.message });
    }
  }
  
  // ... 其他方法实现
  
  private buildBestRuleKey(provider: string, apiType: string, transDataRuleListType: string): string {
    return `${DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS.BEST_RULE}:${provider}:${apiType}:${transDataRuleListType}`;
  }
}
```

### 模块集成

```typescript
@Module({
  imports: [RedisModule],
  providers: [DataMapperCacheService],
  exports: [DataMapperCacheService],
})
export class DataMapperCacheModule {}
```

## 📋 验收标准

### 功能验收
- [ ] DataMapperCacheService 实现所有 IDataMapperCache 接口方法
- [ ] MappingRuleCacheService 成功迁移到新的缓存服务
- [ ] 所有现有测试通过
- [ ] 缓存功能与重构前完全一致

### 性能验收
- [ ] 缓存命中率保持不变（>85%）
- [ ] 平均响应时间不增加（<50ms）
- [ ] 内存使用减少（预期减少15-20%）

### 代码质量验收
- [ ] 单元测试覆盖率 >90%
- [ ] 集成测试覆盖所有缓存场景
- [ ] 代码通过 ESLint 检查
- [ ] 类型检查无错误

## 🚨 风险评估与缓解

### 高风险项
1. **数据迁移风险**
   - 缓解措施: 保持缓存键格式不变，确保零停机迁移

2. **依赖破坏风险**
   - 缓解措施: 保持 MappingRuleCacheService API 兼容性

### 中风险项
1. **性能回归风险**
   - 缓解措施: 详细的性能测试和监控

2. **集成测试失败**
   - 缓解措施: 渐进式迁移，阶段性验证

## 📅 时间估算

| 阶段 | 预估工时 | 关键里程碑 |
|-----|---------|-----------|
| Phase 1: 创建专用服务 | 1-2 天 | DataMapperCacheService 完成 |
| Phase 2: MappingRule 重构 | 1 天 | 迁移完成，功能验证通过 |
| Phase 3: 通用服务清理 | 0.5 天 | 代码清理，无破坏性变更 |
| Phase 4: 测试验证 | 1 天 | 所有测试通过，性能验收 |
| **总计** | **3.5-4.5 天** | **重构完成** |

## 📝 后续优化机会

1. **缓存策略优化**
   - 实现基于访问频率的动态 TTL
   - 添加缓存预热策略

2. **监控增强**
   - 专用的 DataMapper 缓存指标
   - 缓存效率报告

3. **功能扩展**
   - 支持条件缓存
   - 缓存版本管理

---

*此文档将在实施过程中持续更新，确保重构过程的可追溯性和透明度。*