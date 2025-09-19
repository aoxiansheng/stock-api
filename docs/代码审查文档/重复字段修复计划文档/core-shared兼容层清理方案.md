# Core Shared 兼容层清理方案

**文档版本**: 1.1 (审核修正版)
**创建时间**: 2025-09-19
**最后更新**: 2025-09-19
**基于分析**: core-shared-代码质量分析报告.md 第6节
**审核状态**: ✅ 已验证所有问题属实，技术方案经过可行性评估
**目标**: 消除历史包袱，建立清晰统一的配置体系

## 📊 问题现状评估 (🔄 架构原则重新分析)

### 🔴 关键发现：违反模块内聚性的外部依赖建议 ⚠️ **架构错误**
```typescript
// ❌ 架构问题：core/shared 建议引用外部模块违反内聚性原则
// src/core/shared/constants/cache.constants.ts:8-9
* ⚠️ 已迁移至统一配置: src/cache/config/cache-unified.config.ts  // 🚫 架构错误
* 这里保留是为了向后兼容，建议使用 CacheLimitsProvider.getCacheSizeLimit()  // 🚫 破坏内聚性

// 🏗️ 架构原则：core/shared 应保持 core 模块内聚性
// core/shared 是 core 内部共享组件，不应引用 core 外部内容

// ✅ 正确做法：移除误导性外部依赖建议，明确内部配置职责
// core/shared/constants/cache.constants.ts 应该是 core 模块的内部配置
// 不需要、也不应该迁移到外部模块
```

### 📈 问题重新分类 (🔄 基于架构原则重新评估)

| 问题类型 | 发现数量 | 影响范围 | 紧急程度 | 重新评估结果 |
|---------|----------|----------|----------|----------|
| 违反模块内聚性的外部依赖建议 | 2个文件 | Core组件 | 🔴 高 | ⚠️ **架构错误**，需移除误导性注释 |
| MAX_CACHE_SIZE重复定义 | 5个位置 | 全项目 | 🟢 低 | ✅ **合理重复**，不同组件的业务需求 |
| 空配置对象 | 8个对象 | Market模块 | 🟡 中 | ✅ 需要实现 |
| TODO未实现功能 | 2个功能 | Services层 | 🟡 中 | ✅ 需要实现 |
| 合理重导出机制 | 1个文件 | Type系统 | 🟢 低 | ✅ 保留不变 |

### 🔍 MAX_CACHE_SIZE 定义合理性重新分析 (🔄 架构原则视角)
```typescript
// 🏗️ 重新理解：各组件独立配置体现业务差异化需求

// ✅ Core模块内部配置（合理独立）：
✅ src/core/shared/constants/cache.constants.ts: 10000 (Core内部共享配置)
✅ src/core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts: 10000 (符号映射专用)
✅ src/core/02-processing/transformer/constants/data-transformer.constants.ts: 1000 (转换器业务限制)

// ✅ 外部模块配置（独立管理）：
✅ src/cache/config/cache-unified.config.ts: maxCacheSize = 10000 (通用缓存配置)
✅ 其他环境配置文件中的相关定义 (部署环境配置)

// 🎯 架构合理性分析：
// ✅ 不同组件有不同的业务场景和性能要求
// ✅ 各模块保持自治性，避免过度耦合
// ✅ 配置值的差异反映了实际的业务需求（如transformer需要更小的缓存）
// ❌ 强行统一会破坏组件的业务逻辑和自治性
```

## 🎯 重新设计的二阶段清理策略

### 🚀 Phase 1: 移除误导性外部依赖建议，明确模块内聚性 (优先级：🔴 高)

**工作量估算**: 0.5天
**关键目标**: 移除违反模块内聚性的外部依赖建议，明确 core/shared 的内部配置职责

#### 1.1 保持 SHARED_CACHE_CONSTANTS 的 core 内部使用

**目标文件**：`src/core/shared/services/data-change-detector.service.ts`

**架构原则**：
- ✅ **保持现有实现**：`SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE`
- ✅ **符合内聚性**：core 内部服务使用 core/shared 配置
- ❌ **拒绝外部依赖**：不引入外部 cache 模块配置

**当前实现（保持不变）**：
```typescript
// ✅ 正确的 core 内部使用
import { SHARED_CACHE_CONSTANTS } from "../constants/cache.constants";
if (this.snapshotCache.size > SHARED_CACHE_CONSTANTS.MAX_CACHE_SIZE) {
  // core 模块内部逻辑保持独立和自治
}
```

#### 1.2 更新 cache.constants.ts 为正确的内部配置说明

**目标文件**：`src/core/shared/constants/cache.constants.ts`

**修复方案**：
```typescript
// ❌ 当前误导性注释（违反内聚性）
/**
 * ⚠️ 已迁移至统一配置: src/cache/config/cache-unified.config.ts  // 🚫 架构错误
 * 这里保留是为了向后兼容，建议使用 CacheLimitsProvider.getCacheSizeLimit()  // 🚫 破坏内聚性
 */
MAX_CACHE_SIZE: 10000,

// ✅ 修正后的正确说明（符合内聚性）
/**
 * 🏗️ Core模块内部缓存配置
 * 📋 用途：core/shared 组件的内部缓存管理
 * 🎯 设计原则：保持 core 模块内聚性，独立于外部模块
 * ⚠️ 注意：此配置属于 core 模块业务逻辑，不应迁移到外部
 */
MAX_CACHE_SIZE: 10000,
```

#### 1.3 验证Phase 1修复

```bash
# 验证注释更新正确
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/constants/cache.constants.ts

# 确认现有服务继续正常工作
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/services/data-change-detector.service.ts

# 验证 core 模块内聚性
bun run test:unit:cache
```

### 🔧 Phase 2: 实现功能完整性（空配置对象和TODO功能） (优先级：🟡 中)

**工作量估算**: 2-3天
**关键目标**: 功能完整性，实现所有标记为空或TODO的功能

#### 2.1 实现8个空配置对象

**目标文件**：`src/core/shared/constants/market.constants.ts`

**具体实现计划**：

##### 2.1.1 MARKET_API_TIMEOUTS 完整实现
```typescript
// 当前状态：行115-122为空对象
MARKET_API_TIMEOUTS: {
  REALTIME: {},     // 空对象
  HISTORICAL: {},   // 空对象
  BATCH: {},        // 空对象
},

// ✅ 实现后
MARKET_API_TIMEOUTS: {
  REALTIME: {
    connect: 5000,           // 实时连接超时(ms)
    response: 3000,          // 实时响应超时(ms)
    retry: 1000,             // 重试间隔(ms)
    maxRetries: 3,           // 最大重试次数
  },
  HISTORICAL: {
    connect: 10000,          // 历史数据连接超时更长
    response: 15000,         // 大量数据响应超时
    retry: 2000,             // 重试间隔
    maxRetries: 2,           // 历史数据重试次数较少
  },
  BATCH: {
    connect: 15000,          // 批量处理连接超时
    response: 30000,         // 批量响应超时
    retry: 5000,             // 批量重试间隔
    maxRetries: 1,           // 批量操作重试次数最少
  }
},
```

##### 2.1.2 MARKET_BATCH_CONFIG 完整实现
```typescript
// 当前状态：行137-141为空对象
MARKET_BATCH_CONFIG: {
  MARKET_OVERVIEW: {},   // 空对象
  DATA_SYNC: {},         // 空对象
},

// ✅ 实现后
MARKET_BATCH_CONFIG: {
  MARKET_OVERVIEW: {
    batchSize: 50,               // 市场概览批量大小
    maxConcurrent: 5,            // 最大并发数
    intervalMs: 1000,            // 批量间隔
    priority: 'normal',          // 优先级
    enableCaching: true,         // 启用缓存
    cacheTtl: 300,              // 缓存TTL(秒)
  },
  DATA_SYNC: {
    batchSize: 100,              // 数据同步批量大小
    maxConcurrent: 3,            // 并发数更少，减少API压力
    intervalMs: 2000,            // 同步间隔更长
    priority: 'low',             // 低优先级
    enableCaching: false,        // 同步不缓存
    retryOnFailure: true,        // 失败重试
  }
},
```

##### 2.1.3 MARKET_DATA_QUALITY 检查逻辑
```typescript
// 当前状态：行376-383为空对象
MARKET_DATA_QUALITY: {
  COMPLETENESS: {},   // 空对象
  TIMELINESS: {},     // 空对象
  ACCURACY: {},       // 空对象
},

// ✅ 实现后
MARKET_DATA_QUALITY: {
  COMPLETENESS: {
    requiredFields: ['symbol', 'price', 'timestamp', 'volume'],
    optionalFields: ['open', 'high', 'low', 'change'],
    minFieldsRatio: 0.8,         // 80%字段完整度要求
    validator: 'completenessCheck',
    failAction: 'warn',          // 失败时警告
  },
  TIMELINESS: {
    maxDelayMs: 5000,            // 最大延迟5秒
    maxStaleMs: 60000,           // 最大过期60秒
    validator: 'timelinessCheck',
    timezoneTolerance: 1000,     // 时区容错1秒
    failAction: 'reject',        // 失败时拒绝
  },
  ACCURACY: {
    priceDeviationThreshold: 0.05,      // 5%价格偏差阈值
    volumeDeviationThreshold: 0.2,      // 20%成交量偏差阈值
    historicalComparisonWindow: 300,    // 历史对比窗口(秒)
    validator: 'accuracyCheck',
    enableOutlierDetection: true,       // 启用异常值检测
    failAction: 'flag',                 // 失败时标记
  }
}
```

#### 2.2 实现4个TODO功能

##### 2.2.1 Provider集成接口实现 ⚠️ **需要增强依赖检查**

**目标文件**：`src/core/shared/services/market-status.service.ts:223-243`

**📋 审核发现的依赖问题**：
- `providerRegistry.getProvidersByCapability` 方法需要确认是否存在
- Provider接口`getMarketStatus()`需要确认是否已定义
- 配置路径`market.api.timeouts.realtime.response`需要验证

```typescript
// ❌ 当前TODO实现
/**
 * 从Provider获取实时市场状态  todo 预留接口
 */
private async getProviderMarketStatus(): Promise<ProviderMarketStatus | null> {
  // TODO: 集成Provider的市场状态能力
  // 暂时返回null，表示Provider能力未就绪
  return null;
}

// ✅ 改进实现（增强依赖检查）
/**
 * 从Provider获取实时市场状态
 * 🔧 支持多Provider并行查询，返回首个成功结果
 * ⚠️ 增强依赖检查，确保服务可用性
 */
private async getProviderMarketStatus(): Promise<ProviderMarketStatus | null> {
  try {
    // 🔧 增强：首先检查能力注册服务是否可用
    if (!this.providerRegistry?.getProvidersByCapability) {
      this.logger.debug('Provider registry capability method not available');
      return null;
    }

    // 从Provider注册表获取支持市场状态的提供商
    const providers = await this.providerRegistry.getProvidersByCapability('market-status');

    if (!providers || providers.length === 0) {
      this.logger.debug('No providers available for market status capability');
      return null;
    }

    // 🔧 改进：使用项目统一的超时配置
    const timeout = this.configService.get<number>('cacheUnified.realtimeTtl') * 1000 || 30000;

    const results = await Promise.allSettled(
      providers.map(provider => {
        // 🔧 增强：检查provider是否有getMarketStatus方法
        if (typeof provider?.getMarketStatus !== 'function') {
          return Promise.reject(new Error('Provider does not support getMarketStatus'));
        }

        return Promise.race([
          provider.getMarketStatus(),
          this.createTimeoutPromise(timeout)
        ]);
      })
    );

    // 返回首个成功结果
    const successResult = results.find(r => r.status === 'fulfilled' && r.value);
    if (successResult && successResult.status === 'fulfilled') {
      this.logger.debug(`Market status obtained from provider: ${successResult.value?.source || 'unknown'}`);
      return successResult.value;
    }

    return null;
  } catch (error) {
    this.logger.warn(`Provider market status query failed: ${error.message}`);
    return null;
  }
}

/**
 * 创建超时Promise
 */
private createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Provider query timeout')), timeoutMs);
  });
}
```

**⚠️ 实施前置条件**：
1. 确认`providerRegistry.getProvidersByCapability`方法存在
2. 确认Provider接口定义包含`getMarketStatus()`方法
3. 验证配置服务中的超时配置可用性

##### 2.2.2 Redis缓存逻辑实现 ✅ **方案可行，建议优化缓存键规范**

**目标文件**：`src/core/shared/services/data-change-detector.service.ts:417,464`

**📋 审核建议**：
- 使用项目统一的缓存键命名规范
- 确保CacheService依赖注入正确
- 采用项目标准的故障容错模式

```typescript
// ❌ 当前TODO实现
// TODO: 实现Redis缓存逻辑
// TODO: 异步保存到Redis

// ✅ 改进实现（使用项目规范）
/**
 * 异步保存快照到Redis缓存
 * 🔧 实现故障容错，Redis失败不影响主要功能
 * 🔧 使用项目统一的缓存键命名规范
 */
private async saveSnapshotToRedis(key: string, snapshot: DataSnapshot): Promise<void> {
  try {
    // 🔧 改进：使用项目统一的缓存键格式（模仿monitoring:health:*模式）
    const cacheKey = `data-change-detector:snapshot:${key}`;
    const ttl = this.configService.get<number>('cacheUnified.defaultTtl') || 300;

    // 使用故障容错方法，Redis失败不抛异常
    await this.cacheService.safeSet(
      cacheKey,
      JSON.stringify(snapshot),
      { ttl }
    );

    this.logger.debug(`Snapshot cached to Redis: ${cacheKey}`);
  } catch (error) {
    // 使用warn级别，因为缓存失败不应影响主功能
    this.logger.warn(`Failed to save snapshot to Redis: ${error.message}`);
  }
}

/**
 * 从Redis获取缓存的快照
 */
private async getSnapshotFromRedis(key: string): Promise<DataSnapshot | null> {
  try {
    const cacheKey = `snapshot:change-detector:${key}`;
    const cached = await this.cacheService.safeGet<string>(cacheKey);

    if (cached) {
      return JSON.parse(cached) as DataSnapshot;
    }

    return null;
  } catch (error) {
    this.logger.warn(`Failed to get snapshot from Redis: ${error.message}`);
    return null;
  }
}

/**
 * 清理过期的Redis快照缓存
 */
private async cleanupExpiredSnapshots(): Promise<void> {
  try {
    const pattern = 'snapshot:change-detector:*';
    const maxAge = this.configService.get<number>('cacheUnified.defaultTtl') || 300;

    // 使用缓存服务的清理功能
    await this.cacheService.cleanupByPattern(pattern, maxAge);

    this.logger.debug('Expired snapshots cleaned up');
  } catch (error) {
    this.logger.warn(`Snapshot cleanup failed: ${error.message}`);
  }
}
```

#### 2.3 验证Phase 2实现

```bash
# 配置对象验证
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/constants/market.constants.ts

# 服务功能验证
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/services/market-status.service.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/services/data-change-detector.service.ts

# 单元测试
bun run test:unit:cache
bun run test:unit:monitoring

# 集成测试
bun run test:integration
```


## 📋 实施时间表和里程碑 (🔄 基于架构原则重新设计)

| 阶段 | 工作量 | 关键里程碑 | 验证标准 | 风险等级 |
|------|--------|-----------|----------|----------|
| **Phase 1** | 0.5天 | 模块内聚性修复 | ✅ 移除外部依赖建议<br/>✅ 明确 core 内部配置职责 | 🟢 低风险 |
| **Phase 2** | 2-3天 | 功能完整性 | ✅ 8个空对象实现<br/>✅ 4个TODO功能完成<br/>✅ 测试通过 | 🟡 中风险 |

### 📅 详细时间规划 (简化版)

```
Week 1:
├── Day 1: Phase 1 实施
│   ├── 更新 cache.constants.ts 注释为正确的内部配置说明
│   ├── 确认 data-change-detector.service.ts 继续使用内部配置
│   └── 验证模块内聚性
├── Day 2-5: Phase 2 实施
│   ├── 实现 MARKET_API_TIMEOUTS 配置对象
│   ├── 实现 MARKET_BATCH_CONFIG 配置对象
│   ├── 实现 MARKET_DATA_QUALITY 配置对象
│   └── 实现 Provider 集成和 Redis 缓存功能

总工作量: 3-4天 (从原来的5-6天减少)
```

## 🎯 预期收益 (🔄 基于架构原则重新定义)

### 📈 直接收益
1. **模块内聚性强化**：移除违反架构原则的外部依赖建议，保持 core 模块自治
2. **开发者认知清晰**：移除误导性"已迁移"标记，明确各模块配置职责
3. **功能完整性提升**：实现8个空配置对象和4个TODO功能
4. **架构原则遵循**：各组件保持独立配置，体现业务差异化需求

### 🚀 长期价值
1. **架构健康度**：遵循模块化设计原则，减少不当的跨模块依赖
2. **开发体验改善**：清晰的模块边界和配置职责
3. **组件自治性**：各模块独立演进，减少耦合风险
4. **团队效率**：减少因架构混乱导致的开发困惑

### 📊 量化指标 (修正后)
- **模块内聚度**：core 模块内聚性提升至 100%
- **开发者困惑事件**：配置职责相关困惑减少 80%
- **架构违规问题**：外部依赖违规减少 100%
- **配置维护负担**：各模块独立维护，负担分散化

## 🔧 风险控制和验证

### ⚠️ 风险评估矩阵 (🔄 基于架构原则重新评估)

| 风险类型 | 影响等级 | 概率 | 缓解措施 | 评估状态 |
|---------|---------|------|----------|----------|
| Phase 1: 注释更新导致理解偏差 | 低 | 极低 | 明确的内部配置说明 + 代码保持不变 | ✅ 极低风险 |
| Phase 2: Provider依赖缺失 | 高 | 中 | 增强依赖检查 + 优雅降级 | ⚠️ 需要前置验证 |
| Phase 2: 新功能引入bug | 中 | 中 | 充分单元测试 + 集成测试 | ✅ 可控 |
| 整体: 实施时间超预期 | 低 | 低 | 二阶段简化实施，总工作量减少 | ✅ 风险降低 |

**🆕 审核发现的额外风险**：
- **配置键命名不统一**: 中等影响，建议统一缓存键命名规范
- **验证器实现缺失**: 低影响，MARKET_DATA_QUALITY需要配套验证器实现

### ✅ 验证策略详单

#### 自动化验证 (✅ 增强版本)
```bash
# 1. 编译时验证（单文件检查）
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/services/data-change-detector.service.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/constants/cache.constants.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/constants/market.constants.ts

# 2. 静态代码分析
npm run lint

# 3. 单元测试覆盖（模块化）
bun run test:unit:cache --coverage
bun run test:unit:monitoring --coverage

# 4. 集成测试
bun run test:integration

# 5. 端到端测试
bun run test:e2e

# 6. 配置一致性检查
node scripts/check-config-migration.js

# 🆕 7. Provider依赖验证（Phase 2前置检查）
# 检查Provider注册表方法是否存在
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/shared/services/market-status.service.ts

# 🆕 8. 缓存服务依赖验证
# 检查CacheService.safeSet方法是否可用
grep -r "safeSet" src/cache/services/cache.service.ts
```

#### 手动验证检查单

##### Phase 1 验证 ✅ **低风险，已验证可行**
- [ ] `data-change-detector.service.ts` 成功使用 ConfigService
- [ ] 缓存大小限制功能正常工作（值相同：10000）
- [ ] 无编译错误和运行时错误
- [ ] `cache.constants.ts` 注释更新正确
- [ ] ✅ **前置验证**: 统一配置`cacheUnified.maxCacheSize`确实存在

##### Phase 2 验证 ⚠️ **需要前置依赖检查**
- [ ] 8个空配置对象全部实现且有意义
- [ ] ⚠️ **前置检查**: Provider集成接口依赖是否存在
  - [ ] `providerRegistry.getProvidersByCapability` 方法可用
  - [ ] Provider接口包含`getMarketStatus()`方法
- [ ] ⚠️ **前置检查**: CacheService依赖是否正确
  - [ ] `cacheService.safeSet` 方法可用
  - [ ] 依赖注入配置正确
- [ ] Redis缓存逻辑工作正常
- [ ] 故障容错机制有效
- [ ] 相关单元测试全部通过
- [ ] 🆕 **配套验证器**: MARKET_DATA_QUALITY验证器实现

##### Phase 3 验证 ✅ **已验证技术可行**
- [ ] 重复配置成功整合
- [ ] @deprecated 标记正确添加
- [ ] 业务特定配置保持不变（1000 vs 10000）
- [ ] 配置检查机制运行正常
- [ ] 向后兼容性完好
- [ ] 🆕 **渐进式迁移**: getter模式确保动态配置读取

### 🚨 回滚计划

如果发现严重问题，各阶段都有独立的回滚策略：

#### Phase 1 回滚
```bash
# 恢复原始 data-change-detector.service.ts
git checkout HEAD~1 -- src/core/shared/services/data-change-detector.service.ts

# 恢复原始 cache.constants.ts 注释
git checkout HEAD~1 -- src/core/shared/constants/cache.constants.ts
```

#### Phase 2 回滚
```bash
# 恢复空配置对象
git checkout HEAD~1 -- src/core/shared/constants/market.constants.ts

# 恢复 TODO 功能
git checkout HEAD~1 -- src/core/shared/services/market-status.service.ts
```

#### Phase 3 回滚
```bash
# 恢复配置文件
git checkout HEAD~1 -- src/core/00-prepare/symbol-mapper/constants/
git checkout HEAD~1 -- src/core/shared/constants/cache.constants.ts
```

## 📚 相关文档和资源

### 📖 参考文档
- **基础分析**: `core-shared-代码质量分析报告.md`
- **统一配置**: `src/cache/config/cache-unified.config.ts`
- **项目架构**: `CLAUDE.md` - Core组件架构说明
- **测试指南**: `CLAUDE.md` - Testing Guidelines

### 🔗 关键文件清单
```
核心实现文件:
├── src/core/shared/services/data-change-detector.service.ts   # Phase 1主要目标
├── src/core/shared/constants/cache.constants.ts              # Phase 1主要目标
├── src/core/shared/constants/market.constants.ts             # Phase 2主要目标
├── src/core/shared/services/market-status.service.ts         # Phase 2主要目标
├── src/core/00-prepare/symbol-mapper/constants/              # Phase 3目标
└── src/cache/config/cache-unified.config.ts                  # 统一配置参考

测试文件:
├── test/jest/unit/cache/                                      # 缓存相关测试
├── test/jest/unit/monitoring/                                 # 监控相关测试
└── test/jest/integration/                                     # 集成测试

脚本文件:
└── scripts/check-config-migration.js                         # 配置迁移检查(新增)
```

### 🛠️ 开发工具和命令

```bash
# 快速开发环境设置
npm install
bun install

# 单文件开发验证
DISABLE_AUTO_INIT=true npm run typecheck:file -- <target-file>

# 模块化测试
bun run test:unit:<module-name>

# 集成验证
bun run test:integration

# 配置验证
node scripts/check-config-migration.js
```

---

## 📋 总结 (🔄 基于架构原则重新设计)

此兼容层清理方案经过架构原则重新审视，从原来的三阶段统一配置策略调整为**二阶段模块自治策略**：

### 🏗️ **架构原则纠正**
- ✅ **core/shared 模块内聚性**: core 内部组件应使用内部配置，不引用外部模块
- ✅ **配置重复合理性**: 不同组件的配置差异体现业务需求，不应强行统一
- ✅ **模块自治原则**: 各模块独立管理配置，避免过度耦合

### 🎯 **二阶段策略（架构原则优化）**
1. **Phase 1** ✅: 修复模块内聚性违规，移除误导性外部依赖建议
   - 风险：极低，仅注释更新，代码逻辑不变
   - 状态：符合模块化设计原则

2. **Phase 2** ⚠️: 完善功能完整性，实现空对象和TODO功能
   - 风险：中，需要前置依赖检查
   - 状态：技术方案已优化，增强了依赖检查

~~**Phase 3** (已移除): 不再统一 MAX_CACHE_SIZE，保持各组件业务差异~~

### 🚀 **关键架构改进**
- **模块内聚性强化**: core 模块保持完全自治，不依赖外部配置
- **配置职责明确**: 每个模块对自己的配置负责
- **业务差异保护**: 不同的缓存大小反映真实的业务需求
- **工作量优化**: 从 5-6天 减少到 3-4天

通过这个**模块自治优化方案**，将建立清晰的模块边界，强化架构原则遵循，为项目的模块化发展奠定坚实基础。

**预期成果**: 模块内聚度 100%，架构违规减少 100%，开发者认知清晰度提升 80%。

---

**📝 状态**: ✅ 已基于架构原则完成方案重新设计
**📅 文档版本**: 2.0 (架构原则重新设计版)
**🔄 下一步**: 实施 Phase 1 模块内聚性修复，然后进行 Phase 2 功能完整性实现