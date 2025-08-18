# Symbol Mapper 拆分方案

## 📊 实施状态

- ❌ **当前阶段**：方案设计完成，代码实施待启动
- 🔄 **现状**：代码仍为重构前状态，缓存层仍包含业务逻辑
- 🎯 **下一步**：按阶段0-1开始落地基础组件

**重要说明**：本文档描述的是**目标架构设计方案**，当前代码实际状态与文档描述的目标状态存在差异，需要按计划逐步实施。

### 📋 当前状态 vs 目标状态对比

| 组件 | 当前状态 | 目标状态 | 实施优先级 |
|-----|---------|---------|-----------|
| **Symbol Mapper** | ✅ 规则管理 + ❌ 混合转换逻辑 | ✅ 纯规则管理 + 只读服务实现 | 🔶 中等（增加事件机制）|
| **Symbol Transformer** | ❌ **不存在** | ✅ 专职符号转换执行 | 🔴 **最高（从零创建）** |
| **Symbol Mapper Cache** | ❌ mapSymbols + executeUncachedQuery | ✅ 纯缓存API + 事件订阅 | 🔶 中等（移除业务逻辑）|
| **只读规则接口** | ❌ **不存在** | ✅ ISymbolMappingReadService | 🔴 **最高（基础设施）** |
| **事件失效机制** | ❌ **不存在** | ✅ 规则变更事件发布订阅 | 🔴 **最高（基础设施）** |
| **调用方集成** | ✅ 直接调用 SymbolMapper | ✅ 灰度切换到 SymbolTransformer | 🔶 中等（最后阶段）|

## 📋 概述

基于对现有代码架构的深入分析，当前Symbol Mapper组件存在职责混合的问题，将规则制定和规则执行混合在一个组件中，与Data Mapper + Transformer的优秀设计模式不一致。本文档制定了详细的拆分方案，将Symbol Mapper重构为符合架构原则的双组件设计。

## 🎯 拆分目标

### 目标架构
```
00-prepare/symbol-mapper/          # 📋 纯规则制定器
└── 职责：符号映射规则的增删改查

02-processing/symbol-transformer/  # ⚙️ 符号转换执行器
└── 职责：符号映射规则的执行和转换
```

### 设计原则
- **职责分离**：规则制定 vs 规则执行完全分离
- **架构一致性**：与Data Mapper + Transformer模式保持一致
- **缓存优化**：Symbol Mapper Cache专注缓存，移除业务逻辑
- **接口统一**：统一符号转换的参数和返回格式

## 🔍 现状分析

### 当前代码实际状态（截至最新检查）

**⚠️ 代码实施状态**：
- ✅ `SymbolMapperCacheService.mapSymbols()` - **仍存在**，承担完整业务逻辑和符号转换
- ✅ `SymbolMapperCacheService.executeUncachedQuery()` - **仍存在**，执行数据库查询操作
- ❌ `02-processing/symbol-transformer/` - **未创建**，目标组件不存在
- ❌ `ISymbolMappingReadService` - **未实现**，只读规则接口缺失
- ❌ 事件失效机制 - **未部署**，EventEmitter2未集成
- ❌ 缓存层纯化 - **未开始**，缓存层仍包含业务逻辑

### 目标状态vs当前问题对比

#### 1. **SymbolMapperService职责混合** ❌
当前包含46个方法，职责严重混合：

**规则管理方法**（应保留在Symbol Mapper）：
- `createDataSourceMapping()` - 创建数据源映射
- `saveMapping()` - 保存映射
- `updateSymbolMapping()` - 更新符号映射
- `deleteSymbolMapping()` - 删除符号映射
- `getSymbolMappingRule()` - 获取映射规则
- `addSymbolMappingRule()` - 添加映射规则
- `updateSymbolMappingRule()` - 更新映射规则
- `removeSymbolMappingRule()` - 移除映射规则

**符号转换执行方法**（应迁移到Symbol Transformer）：
- `mapSymbol()` - 单符号映射 ⚠️
- `mapSymbols()` - 批量符号映射 ⚠️
- `transformSymbols()` - 符号转换 ⚠️
- `transformSymbolsById()` - 按ID转换符号 ⚠️
- `transformSymbolsForProvider()` - 提供商符号转换 ⚠️
- `_executeSymbolTransformation()` - 执行符号转换 ⚠️
- `applySymbolMappingRule()` - 应用映射规则 ⚠️

**缓存管理方法**（应保留但简化）：
- `clearCache()` - 清除缓存
- `clearProviderCache()` - 清除提供商缓存
- `getCacheStats()` - 获取缓存统计

#### 2. **SymbolMapperCacheService职责污染** ❌ **（当前代码实际）**
缓存服务**现在仍然**承担了业务逻辑：
```typescript
// 🔴 当前代码实际：src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts
async mapSymbols(provider: string, symbols: string | string[], direction: 'to_standard' | 'from_standard', requestId?: string) {
  // ... 包含完整的符号转换业务逻辑
  const results = await this.executeUncachedQuery(provider, symbolArray, direction);
  // ... 
}

private async executeUncachedQuery(provider: string, symbols: string[], direction: 'to_standard' | 'from_standard') {
  // ... 直接执行数据库查询
}
```
- `mapSymbols()` - **仍在运行**，业务逻辑方法 ⚠️ 目标：移到Symbol Transformer
- `executeUncachedQuery()` - **仍在运行**，数据库查询逻辑 ⚠️ 目标：移到只读规则服务

#### 3. **接口不统一** ❌
不同组件的符号转换接口参数和返回格式不一致。

## 📐 拆分设计（目标架构）

**⚠️ 说明**：以下描述的是**重构后的目标架构**，当前代码需要按实施计划逐步达到此状态。

### 组件职责重新定义

#### **Symbol Mapper** (00-prepare/symbol-mapper/) 【目标状态】
**职责**：符号映射规则的生命周期管理

**保留的方法**：
```typescript
// 规则CRUD操作
- createDataSourceMapping()
- saveMapping() 
- getSymbolMappingRule()
- updateSymbolMapping()
- deleteSymbolMapping()

// 规则管理
- addSymbolMappingRule()
- updateSymbolMappingRule() 
- removeSymbolMappingRule()
- replaceSymbolMappingRule()

// 查询和分页
- getSymbolMappingsPaginated()
- getSymbolMappingByDataSource()
- getAllSymbolMappingRule()

// 元数据查询
- getDataSources()
- getMarkets()
- getSymbolTypes()

// 缓存管理（简化）
- clearProviderCache()
- invalidateCacheForChangedRule()
```

#### **Symbol Transformer** (02-processing/symbol-transformer/) 【目标状态】
**职责**：符号映射规则的执行和转换

**🔴 当前状态**：此组件尚未创建，需要从零开始实施

**✅ 架构位置说明**：
Symbol Transformer放置在02-processing，理由：
1. **语义正确**：作为执行层，负责规则的应用和处理，属于processing阶段
2. **架构一致性**：与Data Mapper + Transformer模式保持一致
3. **职责分离**：00-prepare负责规则准备，02-processing负责规则执行

**核心原则**：
- 仅依赖只读规则接口，不直接访问仓储
- 通过规则只读服务获取映射规则
- 不直接管理缓存失效，仅执行转换逻辑

**迁移的方法**：
```typescript
// 核心转换接口
+ transformSymbols(request: SymbolTransformRequestDto) 
+ transformBatch(requests: SymbolTransformRequestDto[], options?)

// 单符号处理  
+ transformSingleSymbol(sourceProvider, targetProvider, symbol, options?)

// 内部执行方法
+ _executeSymbolTransformation()
+ applySymbolMappingRule()

// 性能统计
+ recordTransformationPerformance()
```

#### **Symbol Mapper** - 增加只读服务接口
**新增职责**：为执行层提供只读规则服务

**新增接口**（放在shared/types避免循环依赖）：
```typescript
// src/shared/types/symbol-mapping-read.interface.ts
export interface ISymbolMappingReadService {
  // 核心规则查询（含DB回源逻辑）
  findMappingRulesForProvider(provider: string): Promise<SymbolMappingRule[]>;
  findMatchingRule(sourceProvider: string, targetProvider: string): Promise<SymbolMappingRule | null>;
  getRulesByPattern(pattern: string): Promise<SymbolMappingRule[]>;
  
  // DB回源职责（由只读服务承担，而非缓存层或执行层）
  queryRulesFromDatabase(criteria: MappingRuleCriteria): Promise<SymbolMappingRule[]>;
}

// 在Symbol Mapper中实现
+ createReadOnlyService(): ISymbolMappingReadService
```

**依赖关系**：
- `symbol-mapper` 提供 ISymbolMappingReadService 实现
- `symbol-transformer` 与 `symbol-mapper-cache` 仅依赖该接口
- 避免直接依赖仓储和循环依赖

#### **Symbol Mapper Cache** (05-caching/symbol-mapper-cache/) 【目标状态】
**职责**：纯缓存层，不包含业务逻辑和数据库访问

**🔴 当前状态**：仍包含业务逻辑，需要按计划重构

**架构调整**：
```typescript
// 移除的方法（违反缓存层职责）
- executeUncachedQuery() ❌  // 由只读规则服务承接DB回源
- repository.findByDataSource() ❌  // 通过只读服务获取
- repository.watchChanges() ❌  // 改为订阅Symbol Mapper事件

// 保留的方法（纯缓存功能）
+ getCached(key): Promise<T | null>
+ setCached(key, value, ttl): Promise<boolean>
+ invalidateCacheByPattern(pattern): Promise<number>
+ subscribeToRuleChangeEvents(): void  // 订阅规则变更事件
+ getCacheStats(): Promise<CacheStatsDto>
```

### 新组件结构设计

#### **Symbol Transformer 组件结构**
```
src/core/02-processing/symbol-transformer/
├── constants/
│   └── symbol-transformer.constants.ts       # 转换配置常量
├── dto/
│   ├── symbol-transform-request.dto.ts       # 转换请求DTO
│   ├── symbol-transform-response.dto.ts      # 转换响应DTO  
│   ├── symbol-transform-options.dto.ts       # 转换选项DTO
│   └── batch-transform-options.dto.ts        # 批量转换选项DTO
├── interfaces/
│   ├── symbol-transformer.interface.ts       # 转换器接口
│   └── symbol-transform-result.interface.ts  # 转换结果接口
├── services/
│   └── symbol-transformer.service.ts         # 核心转换服务
├── module/
│   └── symbol-transformer.module.ts          # 模块定义
└── controller/
    └── symbol-transformer.controller.ts      # 转换接口（仅内网调试，生产禁用）
```

### 接口设计

#### **统一的符号转换接口**
```typescript
// Symbol Transformer Service 核心接口
interface ISymbolTransformer {
  // 主要转换方法
  transformSymbols(request: SymbolTransformRequestDto): Promise<SymbolTransformResponseDto>;
  
  // 批量转换
  transformBatch(requests: SymbolTransformRequestDto[], options?: BatchTransformOptionsDto): Promise<SymbolTransformResponseDto[]>;
  
  // 单符号转换（便捷方法）
  transformSingleSymbol(sourceProvider: string, targetProvider: string, symbol: string, options?: SymbolTransformOptionsDto): Promise<string>;
}

// 标准化请求DTO - 强化源/目标Provider语义
class SymbolTransformRequestDto {
  sourceProvider: string;                             // 源数据提供商（符号当前格式）
  targetProvider: string;                             // 目标数据提供商（符号目标格式）
  symbols: string | string[];                         // 待转换符号
  
  // 向后兼容的direction字段（内部推导sourceProvider/targetProvider）
  @IsOptional()
  direction?: 'to_standard' | 'from_standard';       
  
  // 向后兼容的provider字段（配合direction使用）
  @IsOptional()
  provider?: string;                                  
  
  options?: SymbolTransformOptionsDto;                // 转换选项
  
  // 构造器支持多种初始化方式，增强校验逻辑
  static fromLegacy(provider: string, direction: 'to_standard' | 'from_standard' = 'to_standard'): SymbolTransformRequestDto {
    return {
      sourceProvider: direction === 'to_standard' ? provider : 'standard',
      targetProvider: direction === 'to_standard' ? 'standard' : provider,
      symbols: [],
      direction,  // 保留用于兼容性
      provider    // 保留用于兼容性
    };
  }
  
  // 校验优先级：sourceProvider/targetProvider 优先，direction仅用于兼容
  validate(): void {
    if (this.sourceProvider && this.targetProvider) {
      // 以source/target为准，direction仅用于迁移期校验告警
      if (this.direction || this.provider) {
        console.warn('SymbolTransformRequest: 同时传入source/target和direction/provider，以source/target为准', {
          sourceProvider: this.sourceProvider,
          targetProvider: this.targetProvider,
          legacyProvider: this.provider,
          legacyDirection: this.direction
        });
        
        // 记录legacy输入指标
        if (typeof window === 'undefined' && global.metricsRegistry) {
          global.metricsRegistry.inc('legacy_input_detected_total', {
            input_type: 'mixed_source_target_and_direction'
          });
        }
      }
    } else if (this.provider && this.direction) {
      // 兼容模式：使用direction推导source/target
      this.sourceProvider = this.direction === 'to_standard' ? this.provider : 'standard';
      this.targetProvider = this.direction === 'to_standard' ? 'standard' : this.provider;
    } else {
      throw new Error('必须提供sourceProvider/targetProvider或provider/direction');
    }
  }
}

// 标准化响应DTO  
class SymbolTransformResponseDto {
  success: boolean;                                   // 转换是否成功
  transformedSymbols: string[];                       // 转换后的符号列表
  mappingDetails: Record<string, string>;             // 映射详情 {原符号: 目标符号}
  failedSymbols: string[];                           // 转换失败的符号
  metadata: {
    provider: string;
    totalSymbols: number;
    successCount: number; 
    failedCount: number;
    processingTimeMs: number;
    cacheHits?: number;                              // 本次转换命中的缓存条数（L2/L3合计）
    ruleVersion?: string;                            // 规则版本（来源：规则表updatedAt的ISO字符串或递增版本号）
  };
}
```

### 事件失效链路设计

#### **规则变更事件流**
```typescript
// Symbol Mapper发出规则变更事件（支持全量发布）
interface SymbolRuleChangeEvent {
  eventType: 'RULE_CREATED' | 'RULE_UPDATED' | 'RULE_DELETED' | 'RULES_BATCH_PUBLISHED';
  ruleId?: string;              // 单规则变更时的规则ID
  provider: string;             // Provider维度（粗粒度失效）
  affectedSymbols?: string[];   // 受影响的符号列表（精准失效）
  isFullRefresh?: boolean;      // 是否全量规则发布
  timestamp: Date;
}

// 事件发布（Symbol Mapper职责）
class SymbolMapperService {
  async updateSymbolMapping(id: string, updateDto: UpdateSymbolMappingDto) {
    const updatedRule = await this.repository.update(id, updateDto);
    
    // 发布规则变更事件
    this.eventEmitter.emit('symbol.rule.updated', {
      eventType: 'RULE_UPDATED',
      ruleId: id,
      provider: updatedRule.dataSource,
      affectedSymbols: this.extractAffectedSymbols(updatedRule),
      timestamp: new Date()
    });
  }
}

// 事件订阅（Symbol Mapper Cache职责，Symbol Transformer不监听事件）
class SymbolMapperCacheService {
  @OnEvent('symbol.rule.updated')
  @OnEvent('symbol.rule.created')
  @OnEvent('symbol.rule.deleted')
  @OnEvent('symbol.rules.batch.published')
  async handleRuleChange(event: SymbolRuleChangeEvent) {
    if (event.isFullRefresh) {
      // 全量发布：清空该provider的所有缓存
      await this.invalidateProviderCache(event.provider);
    } else {
      // 增量更新：组合处理
      // 1. Provider粗粒度失效（L1规则缓存）
      await this.invalidateProviderRuleCache(event.provider);
      
      // 2. 精准符号失效（L2单符号缓存）
      if (event.affectedSymbols?.length > 0) {
        await this.invalidateSymbolsCache(event.provider, event.affectedSymbols);
      }
      
      // 3. 批量结果失效（L3批量缓存，可执行策略）
      if (event.affectedSymbols?.length > 0) {
        // 策略：维护 provider→batchKey 轻量索引，或符号集合哈希+布隆过滤器
        await this.invalidateBatchCachesBySymbols(event.provider, event.affectedSymbols);
      }
    }
  }
  
  // L3批量缓存精准失效实现
  private async invalidateBatchCachesBySymbols(provider: string, symbols: string[]): Promise<void> {
    // 方案1：维护索引映射
    const batchKeys = await this.getBatchKeysByProvider(provider);
    for (const batchKey of batchKeys) {
      // 检查批量键是否包含受影响符号
      const batchSymbols = await this.extractSymbolsFromBatchKey(batchKey);
      if (symbols.some(symbol => batchSymbols.includes(symbol))) {
        await this.invalidateCache(batchKey);
      }
    }
    
    // 方案2：符号集合哈希判定（推荐用于大批量）
    const symbolSet = new Set(symbols);
    const batchPattern = `symbol:batch:${provider}:*`;
    await this.invalidateCacheByMembership(batchPattern, symbolSet);
  }
    }
  }
}
```

### 兼容性和渐进迁移方案

#### **兼容层设计**
```typescript
// 在Symbol Mapper中保留兼容接口
class SymbolMapperService {
  constructor(
    private readonly symbolTransformer?: SymbolTransformerService, // 可选注入
    private readonly featureFlags?: FeatureFlags
  ) {}

  // 兼容接口 - 内部委托给Symbol Transformer
  async mapSymbols(provider: string, symbols: string[], requestId?: string) {
    // 灰度开关控制
    if (this.featureFlags?.enableSymbolTransformer && this.symbolTransformer) {
      // 使用新的Symbol Transformer
      const request = SymbolTransformRequestDto.fromLegacy(provider, 'to_standard');
      request.symbols = symbols;
      
      const result = await this.symbolTransformer.transformSymbols(request);
      
      // 转换为旧格式返回
      return this.convertToLegacyFormat(result);
    } else {
      // 使用现有逻辑（逐步废弃）
      return this.legacyMapSymbols(provider, symbols, requestId);
    }
  }
  
  // 保留现有实现作为fallback
  private async legacyMapSymbols(provider: string, symbols: string[], requestId?: string) {
    // 现有的mapSymbols实现...
  }
}
```

#### **ReceiverService渐进迁移**
```typescript
// 第一阶段：通过兼容层调用
class ReceiverService {
  // 现有调用保持不变，内部通过兼容层路由
  const mappingResult = await this.SymbolMapperService.mapSymbols(provider, symbols, requestId);
}

// 第二阶段：直接调用新服务（迁移完成后）  
class ReceiverService {
  constructor(
    private readonly symbolTransformer: SymbolTransformerService
  ) {}

  private async transformSymbols(provider: string, symbols: string[]) {
    const request = new SymbolTransformRequestDto();
    request.sourceProvider = provider;
    request.targetProvider = 'standard';
    request.symbols = symbols;
    
    return await this.symbolTransformer.transformSymbols(request);
  }
}
```

## 🔄 迁移实施方案

**🎯 实施优先级**：基于当前代码状态，需要从基础设施开始逐步建设

### 阶段0：基础设施准备 【当前急需 - 第一优先级】

**🔴 现状确认**：这些基础设施在当前代码中完全缺失，必须优先创建

#### 0.1 创建只读规则接口 【必须先行】
```bash
# 创建接口目录
mkdir -p src/shared/types

# 创建接口定义
touch src/shared/types/symbol-mapping-read.interface.ts
```

```typescript
// src/shared/types/symbol-mapping-read.interface.ts
export interface ISymbolMappingReadService {
  // 核心规则查询（含DB回源逻辑）
  findMappingRulesForProvider(provider: string): Promise<SymbolMappingRule[]>;
  findMatchingRule(sourceProvider: string, targetProvider: string): Promise<SymbolMappingRule | null>;
  getRulesByPattern(pattern: string): Promise<SymbolMappingRule[]>;
  
  // DB回源职责（由只读服务承担，而非缓存层或执行层）
  queryRulesFromDatabase(criteria: MappingRuleCriteria): Promise<SymbolMappingRule[]>;
}
```

#### 0.2 增加事件发布机制 【Symbol Mapper修改】
```typescript
// 修改现有的Symbol Mapper：src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISymbolMappingReadService } from '../../../shared/types/symbol-mapping-read.interface';

@Injectable()
export class SymbolMapperService implements ISymbolMappingReadService {
  constructor(
    // 只读服务 = 仓储只读 + 事件发布（保持纯净，不引入缓存）
    private readonly repository: SymbolMappingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  // 实现ISymbolMappingReadService接口
  async findMappingRulesForProvider(provider: string): Promise<SymbolMappingRule[]> {
    return await this.repository.findByDataSource(provider);
  }
  
  async findMatchingRule(sourceProvider: string, targetProvider: string): Promise<SymbolMappingRule | null> {
    // 明确匹配算法与索引策略
    // 优先级：exact provider match > market wildcard > regex pattern
    // 必要索引：{ dataSource: 1, targetProvider: 1, isEnabled: 1 }
    // 可选索引：provider+market联合索引 { "dataSource": 1, "market": 1, "isEnabled": 1 }
    
    // 1. 精确匹配：provider → provider
    let rule = await this.repository.findOne({
      dataSource: sourceProvider,
      targetProvider: targetProvider,
      isEnabled: true
    });
    
    if (rule) return rule;
    
    // 2. 标准化匹配：provider → 'standard'
    if (targetProvider === 'standard') {
      rule = await this.repository.findOne({
        dataSource: sourceProvider,
        $or: [
          { targetProvider: 'standard' },
          { targetProvider: { $exists: false } } // 默认目标
        ],
        isEnabled: true
      });
    }
    
    // 3. 市场级通配符匹配
    const market = this.extractMarket(sourceProvider);
    rule = await this.repository.findOne({
      dataSource: `*.${market}`,
      targetProvider: targetProvider,
      isEnabled: true
    });
    
    return rule;
  }
  
  // 现有方法增加事件发布
  async updateSymbolMapping(id: string, updateDto: UpdateSymbolMappingDto) {
    const updatedRule = await this.repository.update(id, updateDto);
    
    // 🆕 发布规则变更事件
    this.eventEmitter.emit('symbol.rule.updated', {
      eventType: 'RULE_UPDATED',
      ruleId: id,
      provider: updatedRule.dataSource,
      affectedSymbols: this.extractAffectedSymbols(updatedRule),
      timestamp: new Date()
    });
    
    return updatedRule;
  }
}
```

### 阶段1：创建Symbol Transformer组件 【核心实施阶段】

**🔴 当前状态**：此组件完全不存在，需要从零创建

#### 1.1 创建目录结构
```bash
mkdir -p src/core/02-processing/symbol-transformer/{constants,dto,interfaces,services,module,controller}
```

#### 1.2 实现核心服务
```typescript
// src/core/02-processing/symbol-transformer/services/symbol-transformer.service.ts
@Injectable()
export class SymbolTransformerService implements ISymbolTransformer {
  constructor(
    private readonly symbolMappingReadService: ISymbolMappingReadService,  // 只读规则接口
    private readonly cacheService: SymbolMapperCacheService,                // 缓存层
    private readonly metricsRegistry: MetricsRegistryService,               // 性能监控
    private readonly featureFlags: FeatureFlags                            // 特性开关
  ) {}

  // 核心转换方法 - 统一入口
  async transformSymbols(request: SymbolTransformRequestDto): Promise<SymbolTransformResponseDto> {
    // 优先从缓存获取
    const cacheKey = this.buildCacheKey(request.sourceProvider, request.targetProvider, request.symbols);
    const cached = await this.cacheService.getCached<SymbolTransformResponseDto>(cacheKey);
    if (cached) {
      this.recordCacheHit(request.sourceProvider);
      return cached;
    }
    
    // 缓存未命中，执行转换
    const rules = await this.symbolMappingReadService.findMatchingRule(request.sourceProvider, request.targetProvider);
    const result = await this.executeTransformation(request, rules);
    
    // 写入缓存
    const ttl = this.calculateTTL(request.sourceProvider, request.targetProvider);
    await this.cacheService.setCached(cacheKey, result, ttl);
    
    return result;
  }
  
  // 缓存键设计 - 统一标准化与哈希
  private buildCacheKey(sourceProvider: string, targetProvider: string, symbols: string | string[]): string {
    // 符号标准化：trim + toUpperCase
    const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();
    
    if (Array.isArray(symbols)) {
      const normalizedSymbols = symbols.map(normalizeSymbol).sort(); // 稳定排序
      const hash = crypto.createHash('sha1').update(normalizedSymbols.join(',')).digest('hex').substring(0, 16); // 前16位哈希
      return `symbol:batch:${sourceProvider}:${targetProvider}:hash:${hash}`;
    } else {
      const normalizedSymbol = normalizeSymbol(symbols);
      return `symbol:${sourceProvider}:${targetProvider}:${normalizedSymbol}`;
    }
  }
  
  // 并发去重机制（防止雪崩 + 写入一致性保护）
  private pendingTransformations = new Map<string, Promise<SymbolTransformResponseDto>>();
  
  private async executeWithCoalescing(cacheKey: string, transformFn: () => Promise<SymbolTransformResponseDto>): Promise<SymbolTransformResponseDto> {
    // 检查是否有相同请求正在进行
    const existing = this.pendingTransformations.get(cacheKey);
    if (existing) {
      return await existing; // 直接等待现有请求结果
    }
    
    // 执行新请求并缓存Promise
    const promise = transformFn();
    this.pendingTransformations.set(cacheKey, promise);
    
    try {
      const result = await promise;
      
      // 写入一致性保护：最后写入胜出 + ruleVersion校验
      await this.setCachedWithVersionCheck(cacheKey, result);
      
      return result;
    } finally {
      // 清理完成的请求
      this.pendingTransformations.delete(cacheKey);
    }
  }
  
  // 写入版本校验：避免较老规则覆盖较新结果
  private async setCachedWithVersionCheck(cacheKey: string, result: SymbolTransformResponseDto): Promise<void> {
    const currentCached = await this.cacheService.getCached<SymbolTransformResponseDto>(cacheKey);
    
    // 版本校验：如果缓存中已有更新的结果（基于ruleVersion），跳过写入
    if (currentCached?.metadata?.ruleVersion && result.metadata?.ruleVersion) {
      if (currentCached.metadata.ruleVersion >= result.metadata.ruleVersion) {
        this.logger.debug('跳过写入：缓存中已有更新版本', {
          cacheKey,
          currentVersion: currentCached.metadata.ruleVersion,
          newVersion: result.metadata.ruleVersion
        });
        return;
      }
    } else if (!currentCached?.metadata?.ruleVersion && result.metadata?.ruleVersion) {
      // 如果旧结果无版本，新结果有版本，允许覆盖
      this.logger.debug('允许覆盖：新结果有版本，旧结果无版本', { cacheKey });
    }
    
    // 写入缓存
    const ttl = this.calculateTTL(result.metadata.provider, 'standard');
    await this.cacheService.setCached(cacheKey, result, ttl);
  }
  
  // 动态TTL计算与热键续期
  private calculateTTL(sourceProvider: string, targetProvider: string, isHotKey?: boolean): number {
    const config = this.featureFlags;
    
    // L1规则长TTL（规则相对稳定）
    if (sourceProvider === 'standard' || targetProvider === 'standard') {
      const baseTtl = config.ruleCacheTtl || 3600; // 1小时
      return Math.min(baseTtl, config.maxRuleCacheTtl || 7200); // 最大2小时上限
    }
    
    // L2/L3中TTL，命中热键时续期
    let ttl = config.symbolCacheTtl || 1800; // 30分钟
    
    if (isHotKey && config.enableHotKeyRenewal) {
      // 热键续期策略：updateAgeOnGet等效语义，最大TTL上限生效
      ttl = Math.min(ttl * 1.5, config.maxSymbolCacheTtl || 3600); // 最大1小时上限，避免无限续期
      
      // 记录热键续期指标
      this.metricsRegistry.inc('symbol_transformer_hotkey_renewals_total', { 
        provider: sourceProvider,
        renewal_multiplier: '1.5x'
      });
    }
    
    return ttl;
  }
  
  // 热键检测逻辑
  private isHotKey(provider: string, symbols: string[]): boolean {
    // 基于访问频次判断是否为热键
    const accessCount = this.cacheService.getAccessCount(`${provider}:${symbols.join(',')}`);
    const isHot = accessCount > (this.featureFlags.hotKeyThreshold || 10); // 10次以上视为热键
    
    if (isHot) {
      // 记录热键识别指标
      this.metricsRegistry.inc('symbol_transformer_hotkey_detected_total', {
        provider,
        access_count_bucket: this.getAccessCountBucket(accessCount)
      });
    }
    
    return isHot;
  }
}
```

#### 1.3 定义接口和DTO
按照设计创建完整的接口和DTO定义。

### 阶段2：迁移转换逻辑

#### 2.1 从SymbolMapperService迁移方法
将以下方法及其逻辑迁移到SymbolTransformerService：
- `mapSymbol()` → `transformSingleSymbol()`
- `mapSymbols()` → `transformSymbols()`  
- `transformSymbolsForProvider()` → 集成到`transformSymbols()`
- `_executeSymbolTransformation()` → 私有方法保持
- `applySymbolMappingRule()` → 私有方法保持

#### 2.2 重构缓存集成
```typescript
// 新的缓存集成方式（仅依赖只读规则服务 + 纯缓存API，并发合并防雪崩）
class SymbolTransformerService {
  private async transformWithCache(request: SymbolTransformRequestDto): Promise<SymbolTransformResponseDto> {
    request.validate();
    const cacheKey = this.buildCacheKey(request.sourceProvider, request.targetProvider, request.symbols);

    // 1) 并发合并 + 先查缓存
    return await this.executeWithCoalescing(cacheKey, async () => {
      const cacheResult = await this.cacheService.getCached<SymbolTransformResponseDto>(cacheKey);
      if (cacheResult) return cacheResult;

      // 2) 缓存未命中：只读规则服务回源
      const rule = await this.symbolMappingReadService.findMatchingRule(
        request.sourceProvider,
        request.targetProvider
      );
      const result = await this.executeTransformation(request, rule);

      // 3) 写缓存
      const ttl = this.calculateTTL(request.sourceProvider, request.targetProvider, /* isHotKey */ false);
      await this.cacheService.setCached(cacheKey, result, ttl);
      return result;
    });
  }
}
```

### 阶段3：重构Symbol Mapper Cache 【缓存层纯化】

**🔴 当前状态**：缓存层仍包含mapSymbols和executeUncachedQuery业务逻辑，需要移除

#### 3.1 移除业务逻辑，简化缓存服务职责
```typescript
// 简化后的 SymbolMapperCacheService
@Injectable() 
export class SymbolMapperCacheService {
  // 🔴 移除当前存在的业务逻辑方法
  // - mapSymbols() ❌ 当前仍存在，需要删除并移到 SymbolTransformerService
  // - executeUncachedQuery() ❌ 当前仍存在，需要删除，DB查询移到只读规则服务
  
  // 保留纯缓存方法
  async getCached<T>(key: string): Promise<T | null> { /* 缓存获取 */ }
  async setCached<T>(key: string, value: T, ttl?: number): Promise<boolean> { /* 缓存设置 */ }
  async invalidateCache(pattern: string): Promise<number> { /* 缓存失效 */ }
  async getCacheStats(): Promise<CacheStatsDto> { /* 缓存统计 */ }
}
```

### 阶段4：清理Symbol Mapper

#### 4.1 移除转换相关方法
从SymbolMapperService移除：
- `mapSymbol()`
- `mapSymbols()`
- `transformSymbols()`
- `transformSymbolsById()`
- `transformSymbolsForProvider()`  
- `_executeSymbolTransformation()`
- `applySymbolMappingRule()`

#### 4.2 保留规则管理方法
确保以下规则管理方法保持完整：
- 所有CRUD操作方法
- 缓存失效通知机制
- 规则查询和分页方法

### 阶段5：更新依赖调用

#### 5.1 更新Receiver服务
```typescript
// 原来的调用
const result = await this.symbolMapperService.mapSymbols(provider, symbols);

// 更新为新的调用
const transformRequest = new SymbolTransformRequestDto();
transformRequest.provider = provider;
transformRequest.symbols = symbols;
transformRequest.direction = 'to_standard';

const result = await this.symbolTransformerService.transformSymbols(transformRequest);
```

#### 5.2 更新其他组件调用
识别并更新所有对Symbol Mapper转换方法的调用。

### 阶段5.5：控制器安全设计

#### **调试控制器安全配置**
```typescript
// src/core/02-processing/symbol-transformer/controller/symbol-transformer.controller.ts
@Controller('internal/symbol-transformer')  // 内网路径
@UseGuards(InternalNetworkGuard)           // 仅内网访问
@UseGuards(ThrottlerGuard)                 // 速率限制：10 req/min
export class SymbolTransformerController {
  constructor(
    private readonly symbolTransformerService: SymbolTransformerService,
    private readonly featureFlags: FeatureFlags
  ) {}

  @Post('transform')
  @Auth([UserRole.ADMIN])  // 仅管理员
  @FeatureFlag('enableSymbolTransformerDebugApi')  // 特性开关控制
  @Throttle(10, 60)        // 10 req/min 防误用
  async debugTransform(@Body() request: SymbolTransformRequestDto) {
    if (!this.featureFlags.enableSymbolTransformerDebugApi) {
      throw new ForbiddenException('调试接口已禁用');
    }
    return await this.symbolTransformerService.transformSymbols(request);
  }
}

// 模块条件导入：生产构建默认不注册调试控制器
@Module({
  imports: [
    SymbolMapperModule, // 只读规则服务依赖
    SymbolMapperCacheModule, // 缓存服务依赖
  ],
  providers: [SymbolTransformerService],
  controllers: process.env.NODE_ENV !== 'production' ? [SymbolTransformerController] : [], // 生产环境不暴露
  exports: [SymbolTransformerService], // 供01-entry模块注入使用
})
export class SymbolTransformerModule {}

**生产安全保障**：
- 调试控制器仅在非生产环境注册  
- 通过FeatureFlag + Module条件导入双重保护
- 避免误暴露到生产环境

**模块装配提醒**：
- `SymbolTransformerModule` 需在 `ReceiverModule` 与 `StreamReceiverModule` 中可注入
- 通过 `exports: [SymbolTransformerService]` 暴露服务

**路径别名与DI配置**：
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@core/02-processing/symbol-transformer": ["src/core/02-processing/symbol-transformer"],
      "@shared/types": ["src/shared/types"]
    }
  }
}
```

```typescript
// ReceiverModule 导入示例
@Module({
  imports: [
    SymbolTransformerModule, // 新增：符号转换执行器
    SymbolMapperModule,      // 现有：规则管理器
    // ... 其他现有模块
  ],
  // ...
})
export class ReceiverModule {}
```

// 内网访问守卫
@Injectable()
export class InternalNetworkGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;
    
    // 仅允许内网IP访问
    return this.isInternalNetwork(clientIp);
  }
  
  private isInternalNetwork(ip: string): boolean {
    return ip.startsWith('127.') || 
           ip.startsWith('10.') || 
           ip.startsWith('192.168.') ||
           ip === '::1';
  }
}
```

### 阶段6：测试和验证

#### **测试清单（最小集）**

#### 6.1 等价性测试
```typescript
describe('Symbol Transformer Equivalence', () => {
  it('新旧实现对同一规则集的转换结果完全一致', async () => {
    const testCases = [
      { provider: 'longport', symbols: ['700.HK'], expected: ['00700'] },
      { provider: 'longport', symbols: ['AAPL.US'], expected: ['AAPL'] },
      { provider: 'longport', symbols: ['invalid-symbol'], expected: [] }, // 边界情况
      { provider: 'longport', symbols: ['AApl.Us'], expected: ['AAPL'] }, // 大小写
    ];
    
    for (const testCase of testCases) {
      // 旧实现结果
      const oldResult = await oldSymbolMapperService.mapSymbols(testCase.provider, testCase.symbols);
      
      // 新实现结果
      const newRequest = SymbolTransformRequestDto.fromLegacy(testCase.provider, 'to_standard');
      newRequest.symbols = testCase.symbols;
      const newResult = await symbolTransformerService.transformSymbols(newRequest);
      
      // 结果必须完全一致
      expect(newResult.transformedSymbols).toEqual(oldResult.mappedSymbols);
      expect(newResult.mappingDetails).toEqual(oldResult.mappingDetails);
      expect(newResult.failedSymbols).toEqual(oldResult.failedSymbols);
    }
  });
});
```

#### 6.2 一致性快照测试
```typescript
describe('Symbol Normalization Consistency', () => {
  const testCases = [
    // 大小写差异
    { input: '700.hk', expected: '700.HK' },
    { input: 'aapl.us', expected: 'AAPL.US' },
    
    // 地域后缀标准化
    { input: ' 700.HK ', expected: '700.HK' },  // trim处理
    { input: 'BABA.US', expected: 'BABA.US' },
    
    // 纯数字A股符号
    { input: '000001', expected: '000001' },    // 深交所
    { input: '600000', expected: '600000' },    // 上交所
    { input: '688001', expected: '688001' },    // 科创板
  ];
  
  testCases.forEach(({ input, expected }) => {
    it(`符号归一化策略保持一致: ${input} -> ${expected}`, async () => {
      const oldResult = await oldSymbolMapperService.normalizeSymbol(input);
      const newResult = await symbolTransformerService.normalizeSymbol(input);
      
      expect(newResult).toBe(expected);
      expect(newResult).toBe(oldResult); // 确保归一策略不变
    });
  });
});
```

#### 6.3 性能测试
```typescript
describe('Symbol Transformer Performance', () => {
  const performanceTests = [
    { name: '单符号', symbols: ['700.HK'] },
    { name: '小批量', symbols: ['700.HK', 'AAPL.US', 'BABA.US', 'JD.US', 'NTES.US'] },
    { name: '中批量', symbols: generateTestSymbols(50) },
    { name: '大批量', symbols: generateTestSymbols(500) }
  ];
  
  performanceTests.forEach(({ name, symbols }) => {
    it(`${name}转换性能不回退`, async () => {
      const iterations = 10;
      const oldTimes = [];
      const newTimes = [];
      
      // 测试旧实现性能
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await oldSymbolMapperService.mapSymbols('longport', symbols);
        oldTimes.push(Date.now() - start);
      }
      
      // 测试新实现性能
      for (let i = 0; i < iterations; i++) {
        const request = SymbolTransformRequestDto.fromLegacy('longport', 'to_standard');
        request.symbols = symbols;
        
        const start = Date.now();
        await symbolTransformerService.transformSymbols(request);
        newTimes.push(Date.now() - start);
      }
      
      const oldP95 = percentile(oldTimes, 0.95);
      const oldP99 = percentile(oldTimes, 0.99);
      const newP95 = percentile(newTimes, 0.95);
      const newP99 = percentile(newTimes, 0.99);
      
      // P95、P99不回退超过20%
      expect(newP95).toBeLessThanOrEqual(oldP95 * 1.2);
      expect(newP99).toBeLessThanOrEqual(oldP99 * 1.2);
    });
  });
});
```

#### 6.3 缓存失效测试
```typescript
describe('Cache Invalidation', () => {
  it('规则更新后缓存精准清理与即时生效', async () => {
    // 1. 执行转换并缓存
    const request = SymbolTransformRequestDto.fromLegacy('longport', 'to_standard');
    request.symbols = ['TEST.HK'];
    const result1 = await symbolTransformerService.transformSymbols(request);
    
    // 2. 更新规则
    await symbolMapperService.updateSymbolMapping(testRuleId, { 
      standardSymbol: 'NEWTEST' 
    });
    
    // 3. 验证缓存已失效，转换结果已更新
    const result2 = await symbolTransformerService.transformSymbols(request);
    expect(result2.transformedSymbols[0]).toBe('NEWTEST');
    expect(result2.transformedSymbols[0]).not.toBe(result1.transformedSymbols[0]);
  });
});
```

#### 6.4 降级策略测试
```typescript
describe('Fallback Strategy', () => {
  it('只读规则服务不可用时的降级策略', async () => {
    // Mock规则服务超时
    jest.spyOn(symbolMappingReadService, 'findMatchingRule')
        .mockRejectedValue(new Error('Service timeout'));
    
    const request = SymbolTransformRequestDto.fromLegacy('longport', 'to_standard');
    request.symbols = ['700.HK'];
    
    const result = await symbolTransformerService.transformSymbols(request);
    
    // 应该返回原符号或明确错误，而不是崩溃
    expect(result.success).toBe(false);
    expect(result.failedSymbols).toContain('700.HK');
  });
});
```

#### 6.5 集成测试
验证新架构下的完整数据流：
```
Receiver → Symbol Transformer → Symbol Mapping Read Service → Symbol Mapper Cache → 返回结果
```

## 🔄 数据流兼容性验证

### 与现有数据流的兼容性分析

基于`docs/完整的数据流场景实景说明.md`的分析，新架构完全兼容现有数据流：

#### **当前数据流**
```
Receiver → Smart Cache检查(❌) → executeOriginalDataFlow() 
→ Symbol Mapper (三层缓存处理，返回映射结果{700.HK→00700})
→ Data Fetcher → Transformer → Storage → 返回数据
```

#### **拆分后数据流**  
```
Receiver → Smart Cache检查(❌) → executeOriginalDataFlow()
→ Symbol Mapper (规则查询和管理) 
→ Symbol Transformer (三层缓存处理，返回映射结果{700.HK→00700})
→ Data Fetcher → Transformer → Storage → 返回数据
```

#### **兼容性保障**
1. **缓存层完全保持**：L1规则 + L2符号 + L3批量三层缓存架构不变
2. **性能特征一致**：响应时间和缓存命中率保持现有水平
3. **接口向后兼容**：通过兼容层保持现有调用方式
4. **数据流位置不变**：符号处理仍在Data Fetcher之前执行
5. **Smart Cache集成**：与Smart Cache + Common Cache的协同工作不受影响

#### **架构优势**
- **职责清晰**：规则管理(00-prepare) vs 规则执行(02-processing)分离  
- **与Transformer一致**：Symbol Transformer与Data Transformer都在02-processing
- **最小化影响**：核心数据流程序不变，仅内部实现重构

## ✅ 实施检查清单

### 阶段0完成标准
- [ ] `src/shared/types/symbol-mapping-read.interface.ts` 已创建
- [ ] `SymbolMapperService` 已实现 `ISymbolMappingReadService` 接口
- [ ] `SymbolMapperService` 已注入 `EventEmitter2`
- [ ] 现有CRUD方法已增加事件发布逻辑
- [ ] 事件枚举和负载结构（`SymbolRuleChangeEvent`）已在 `@shared/types/events` 定义
- [ ] 事件名采用点分式：`symbol.rule.created/updated/deleted`、`symbol.rules.batch.published`

### 阶段1完成标准
- [ ] `src/core/02-processing/symbol-transformer/` 目录结构已创建
- [ ] `SymbolTransformRequestDto` 和 `SymbolTransformResponseDto` 已定义
- [ ] `SymbolTransformerService` 基础框架已实现
- [ ] 缓存键标准化和并发去重机制已集成
- [ ] 只读规则服务依赖已建立

### 阶段3完成标准
- [ ] `SymbolMapperCacheService.mapSymbols()` 已移除
- [ ] `SymbolMapperCacheService.executeUncachedQuery()` 已移除
- [ ] 缓存服务仅暴露纯缓存API (getCached/setCached/invalidate)
- [ ] 事件订阅机制已实现（监听规则变更事件）
- [ ] L3批量精准失效策略已选型并落地单元测试（索引映射 或 集合哈希+布隆过滤器）
- [ ] 代码库中不存在 `mapSymbols|executeUncachedQuery` 的引用（CI grep检查通过）

### 验证测试清单
- [ ] 等价性测试：新旧实现结果完全一致
- [ ] 性能测试：P95/P99不回退超过20%
- [ ] 缓存失效测试：规则变更后缓存精准清理
- [ ] 降级测试：异常时成功回退到旧实现
- [ ] 路由分布一致性测试：采样1万次，灰度分布与设定接近（±5%）
- [ ] Dashboard更新完成后通过FeatureFlag关闭旧指标
- [ ] 生产构建验证：调试控制器 `controllers=[]` 实际生效（e2e smoke测试）
- [ ] tsconfig paths同步到测试环境（jest-tsconfig配置）

### 重点验收清单
- [ ] 代码库不再出现 `symbol-mapper-cache.service.ts` 中的 `mapSymbols|executeUncachedQuery`
- [ ] Receiver/StreamReceiver 在灰度开启时能稳定走新执行器（P95/P99不回退>20%）
- [ ] 规则更新后200ms内触发缓存精准失效（事件链路验证）
- [ ] 指标双写生效且Dashboard无空窗

## 📊 预期收益

### 架构收益
1. **职责清晰**：规则制定 vs 规则执行完全分离
2. **架构一致**：与Data Mapper + Transformer保持一致  
3. **缓存纯化**：缓存层专注缓存，不包含业务逻辑
4. **接口统一**：标准化的转换接口和数据结构

### 性能收益
1. **缓存优化**：专门的缓存层，性能更好
2. **并发处理**：转换服务可独立扩展
3. **监控改进**：更精确的性能监控和指标

### 维护收益  
1. **测试简化**：组件职责单一，测试更容易
2. **扩展性**：新的转换算法可独立开发
3. **调试友好**：问题定位更精确

### 观测性和兼容性保障

#### **指标命名与映射关系**
```typescript
// 保持现有指标语义不变，新增指标建立映射关系
class SymbolTransformerService {
  private recordMetrics(provider: string, result: SymbolTransformResponseDto) {
    // 沿用旧指标口径（避免Dashboard失联）
    const hitRate = result.metadata.cacheHits / result.metadata.totalSymbols;
    this.metricsRegistry.setGauge('symbol_cache_hit_rate', hitRate, { provider }); // 保持原名
    
    // 转换耗时（与旧系统保持相同口径）
    this.metricsRegistry.histogram('symbol_processing_time', 
      result.metadata.processingTimeMs, { provider, type: 'transform' }); // 保持原名
    
    // 失败率
    const failureRate = result.metadata.failedCount / result.metadata.totalSymbols;
    this.metricsRegistry.setGauge('symbol_failure_rate', failureRate, { provider }); // 保持原名
    
    // 新增指标（与监控文档建立映射关系）
    this.metricsRegistry.inc('symbol_transformer_requests_total', { provider, status: 'success' });
    this.metricsRegistry.inc('symbol_transformer_cache_operations', { provider, operation: 'hit' }, result.metadata.cacheHits);
  }
  
  // 降级指标记录
  private recordFallbackMetrics(provider: string, error: Error, symbolCount: number) {
    this.metricsRegistry.inc('symbol_transformer_fallback_total', { 
      provider, 
      error_type: error.constructor.name,
      symbol_count_bucket: this.getSymbolCountBucket(symbolCount)
    });
  }
}
```

**指标映射文档**（需添加到监控文档）：
- `symbol_cache_hit_rate` ← 原 `symbol_mapper_cache_hit_rate`
- `symbol_processing_time` ← 原 `symbol_mapper_processing_time` 
- `symbol_failure_rate` ← 原 `symbol_mapper_failure_rate`
- `symbol_transformer_*` ← 新增指标，用于Symbol Transformer专用监控

**新旧指标重叠期双写策略**：
```typescript
// 指标双写：同时上报新旧指标名，避免监控空窗
private recordMetrics(provider: string, result: SymbolTransformResponseDto) {
  const hitRate = result.metadata.cacheHits / result.metadata.totalSymbols;
  
  // 双写：保持旧指标名 + 新指标名
  this.metricsRegistry.setGauge('symbol_cache_hit_rate', hitRate, { provider }); // 旧指标保持
  this.metricsRegistry.setGauge('symbol_transformer_cache_hit_rate', hitRate, { provider }); // 新指标名
  
  // Dashboard切换完成后，通过FeatureFlag控制下线旧指标
  if (!this.featureFlags.enableLegacyMetrics) {
    // 停止上报旧指标名
  }
}
```

#### **灰度放量控制**
```typescript
// Feature Flags配置
interface SymbolTransformerFeatureFlags {
  enableSymbolTransformer: boolean;           // 主开关
  symbolTransformerTrafficPercentage: number; // 流量百分比 0-100
  enableSymbolTransformerDebugApi: boolean;   // 调试API开关
  symbolTransformerFallbackEnabled: boolean;  // 降级开关
}

// 流量分配逻辑
class SymbolMapperService {
  async mapSymbols(provider: string, symbols: string[], requestId?: string) {
    const shouldUseNewService = this.featureFlags.enableSymbolTransformer &&
      this.shouldRouteToNewService(requestId);
    
    if (shouldUseNewService) {
      try {
        return await this.routeToSymbolTransformer(provider, symbols, requestId);
      } catch (error) {
        if (this.featureFlags.symbolTransformerFallbackEnabled) {
          // 记录降级指标
          this.recordFallbackMetrics(provider, error, symbols.length);
          this.logger.warn('Symbol Transformer failed, fallback to legacy', { 
            error: error.message, 
            provider, 
            symbolsCount: symbols.length,
            requestId 
          });
          return await this.legacyMapSymbols(provider, symbols, requestId);
        }
        throw error;
      }
    } else {
      return await this.legacyMapSymbols(provider, symbols, requestId);
    }
  }
  
  // 多维路由策略开关（明确优先级）
  private shouldRouteToNewService(requestId: string, userId?: string, symbols?: string[]): boolean {
    const flags = this.featureFlags;
    let routingDecision = { method: 'none', enabled: false };
    
    // 优先级1：用户白名单 > 其他策略
    if (flags.symbolTransformerUserWhitelist && userId) {
      const inWhitelist = flags.symbolTransformerUserWhitelist.includes(userId);
      routingDecision = { method: 'user_whitelist', enabled: inWhitelist };
      this.recordRoutingMetrics('user_whitelist', inWhitelist, { userId, requestId });
      return inWhitelist;
    }
    
    // 优先级2：市场路由 > 百分比路由
    if (flags.symbolTransformerMarketRouting && symbols?.length) {
      const markets = this.extractMarkets(symbols);
      const hasEnabledMarket = flags.symbolTransformerEnabledMarkets && 
        markets.some(market => flags.symbolTransformerEnabledMarkets.includes(market));
      
      if (!hasEnabledMarket) {
        routingDecision = { method: 'market_routing', enabled: false };
        this.recordRoutingMetrics('market_routing', false, { markets, requestId });
        return false; // 市场未开放，直接拒绝
      }
    }
    
    // 优先级3：按百分比路由（最后兜底）
    const percentage = flags.symbolTransformerTrafficPercentage || 0;
    const hash = crypto.createHash('md5').update(requestId || Date.now().toString()).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);
    const enabled = (hashNum % 100) < percentage;
    
    routingDecision = { method: 'percentage', enabled };
    this.recordRoutingMetrics('percentage', enabled, { percentage, hashNum: hashNum % 100, requestId });
    
    return enabled;
  }
  
  // 路由决策指标记录（分布可观测）
  private recordRoutingMetrics(method: string, enabled: boolean, context: any): void {
    this.metricsRegistry.inc('symbol_transformer_routing_decisions_total', {
      method,
      decision: enabled ? 'enabled' : 'disabled',
      percentage_bucket: method === 'percentage' ? this.getPercentageBucket(context.percentage) : 'n/a'
    });
  }
  
  private extractMarkets(symbols: string[]): string[] {
    return symbols.map(symbol => {
      if (symbol.endsWith('.HK')) return 'HK';
      if (symbol.endsWith('.US')) return 'US';
      if (symbol.startsWith('00') || symbol.startsWith('30')) return 'SZ';
      if (symbol.startsWith('60') || symbol.startsWith('68')) return 'SH';
      return 'UNKNOWN';
    });
  }
}
```

## ⚠️ 风险控制

### 迁移风险
1. **接口兼容**：新接口必须向下兼容，保持现有调用方式不变
2. **性能回归**：P95/P99响应时间不能回退超过20%
3. **数据一致**：转换结果必须与现有实现完全一致
4. **缓存失效**：规则变更后缓存必须精准失效并即时生效
5. **依赖边界**：执行层不能直接访问数据库，必须通过只读服务

### 风险缓解
1. **分阶段迁移**：6个阶段逐步实施，每阶段都有回滚点
2. **灰度放量**：通过流量百分比控制，从5% → 20% → 50% → 100%
3. **A/B对比验证**：迁移期间新老系统并行运行，实时对比结果
4. **降级机制**：新服务异常时自动降级到旧实现
5. **监控告警**：关键指标实时监控，异常立即告警
6. **回滚预案**：每个阶段都保留完整的回滚方案

## 🗓️ 实施时间线

- **Week 1**：阶段1-2，创建组件并迁移核心逻辑
- **Week 2**：阶段3-4，重构缓存和清理Symbol Mapper  
- **Week 3**：阶段5，更新所有依赖调用
- **Week 4**：阶段6，测试验证和性能对比

## 📝 总结

通过这个拆分方案，我们将实现：
- **规则制定器**：Symbol Mapper专注映射规则管理
- **规则执行器**：Symbol Transformer专门处理符号转换
- **缓存层**：Symbol Mapper Cache回归纯缓存职责

这样的架构设计不仅保持了与Data Mapper + Transformer的一致性，还提供了更好的可维护性、可测试性和扩展性。