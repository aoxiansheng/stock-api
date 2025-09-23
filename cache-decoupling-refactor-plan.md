# Cache组件解耦重构计划

## 项目概述

**目标**: 解决 `src/core/05-caching/` 目录下五个缓存子组件间的耦合问题，消除常量文件/DTO/枚举值等的交叉引用，实现组件间的清晰边界。

**当前组件结构**:
- `common-cache` - 基础设施层
- `smart-cache` - 编排器层（依赖common-cache）
- `stream-cache` - 专用缓存层
- `data-mapper-cache` - 专用缓存层
- `symbol-mapper-cache` - 专用缓存层

## 问题分析

### 1. 常量重复问题

#### TTL配置重复
```typescript
// common-cache
CACHE_DEFAULTS.MIN_TTL_SECONDS: 30

// smart-cache
TTL_SECONDS.ADAPTIVE_MIN_S: 30

// stream-cache
TTL.WARM_CACHE_SECONDS: 300

// 问题：同样的语义（最小TTL、默认TTL）在不同组件中重复定义
```

#### 间隔时间重复
```typescript
// smart-cache
INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS: 30000

// stream-cache
CLEANUP.INTERVAL_MS: 30000

// 问题：30秒间隔在多个组件中硬编码
```

#### 批处理大小重复
```typescript
// smart-cache
CONCURRENCY_LIMITS.DEFAULT_BATCH_SIZE_COUNT: 10

// data-mapper-cache
PERFORMANCE.MAX_BATCH_SIZE: 100

// 问题：批处理配置分散，缺乏统一标准
```

### 2. 组件间依赖关系

#### 合理的依赖（保留）
```typescript
// smart-cache → common-cache （编排器模式）
import { CommonCacheModule } from "../../common-cache/module/common-cache.module";
import { CommonCacheService } from "../../common-cache/services/common-cache.service";

// stream-cache → common-cache （接口复用）
import { BaseCacheConfig } from "../../common-cache/interfaces/base-cache-config.interface";
```

#### 正常的架构依赖（非问题）
```typescript
// 所有组件对monitoring的依赖 - 这是正常的架构设计
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";

// 各组件对shared常量的依赖 - 这是正常的架构设计
import { Market } from "../../../shared/constants/market.constants";
```

## 解决方案

### 阶段1: 创建共享常量模块

#### 1.1 模块结构设计
```
src/core/05-caching/shared-cache-constants/
├── index.ts                    # 统一导出
├── ttl-constants.ts           # TTL相关常量
├── interval-constants.ts      # 时间间隔常量
├── batch-constants.ts         # 批处理大小常量
├── threshold-constants.ts     # 阈值常量
└── cache-key-patterns.ts      # 缓存键模式
```

#### 1.2 TTL常量统一
```typescript
// ttl-constants.ts
export const SHARED_CACHE_TTL = {
  // 基础TTL配置
  MIN_TTL_SECONDS: 30,           // 统一最小TTL（替换common-cache和smart-cache中的重复）
  DEFAULT_TTL_SECONDS: 300,      // 统一默认TTL（替换多个组件中的300）
  MAX_TTL_SECONDS: 86400,        // 统一最大TTL

  // 业务场景TTL
  REAL_TIME_TTL_SECONDS: 5,      // 实时数据TTL（strong timeliness）
  BATCH_QUERY_TTL_SECONDS: 300,  // 批量查询TTL（weak timeliness）
  MARKET_OPEN_TTL_SECONDS: 30,   // 市场开盘时TTL
  MARKET_CLOSED_TTL_SECONDS: 1800, // 市场闭盘时TTL

  // 自适应TTL
  ADAPTIVE_MIN_SECONDS: 30,
  ADAPTIVE_MAX_SECONDS: 3600,
  ADAPTIVE_BASE_SECONDS: 180,
} as const;
```

#### 1.3 间隔时间常量统一
```typescript
// interval-constants.ts
export const SHARED_CACHE_INTERVALS = {
  // 标准间隔
  STANDARD_INTERVAL_MS: 30000,     // 30秒标准间隔（替换多处硬编码）
  CLEANUP_INTERVAL_MS: 30000,      // 清理间隔
  HEALTH_CHECK_INTERVAL_MS: 10000, // 健康检查间隔
  METRICS_INTERVAL_MS: 15000,      // 指标收集间隔

  // 超时配置
  OPERATION_TIMEOUT_MS: 5000,      // 通用操作超时
  GRACEFUL_SHUTDOWN_MS: 30000,     // 优雅关闭超时

  // 心跳和监控
  HEARTBEAT_INTERVAL_MS: 30000,    // WebSocket心跳间隔
  MONITORING_INTERVAL_MS: 60000,   // 监控数据收集间隔
} as const;
```

#### 1.4 批处理常量统一
```typescript
// batch-constants.ts
export const SHARED_CACHE_BATCH = {
  // 基础批处理配置
  DEFAULT_BATCH_SIZE: 10,          // 默认批次大小
  MIN_BATCH_SIZE: 5,               // 最小批次大小
  MAX_BATCH_SIZE: 100,             // 最大批次大小

  // 特殊场景批处理
  STREAM_BATCH_SIZE: 200,          // 流数据批次大小
  SYMBOL_MAPPING_BATCH_SIZE: 50,   // 符号映射批次大小
  DATA_MAPPING_BATCH_SIZE: 100,    // 数据映射批次大小

  // 并发控制
  MIN_CONCURRENT_OPERATIONS: 2,    // 最小并发操作数
  MAX_CONCURRENT_OPERATIONS: 16,   // 最大并发操作数

  // Redis操作
  REDIS_SCAN_COUNT: 100,           // Redis SCAN操作批次
  REDIS_DELETE_BATCH: 100,         // Redis批量删除大小
} as const;
```

### 阶段2: 各组件重构策略

#### 2.1 common-cache重构
**目标**: 移除重复常量，引用共享常量

**重构内容**:
```typescript
// 替换前
export const CACHE_DEFAULTS = {
  MIN_TTL_SECONDS: 30,
  MAX_TTL_SECONDS: 86400,
  // ...
};

// 替换后
import { SHARED_CACHE_TTL } from '../shared-cache-constants';

export const CACHE_DEFAULTS = {
  MIN_TTL_SECONDS: SHARED_CACHE_TTL.MIN_TTL_SECONDS,
  MAX_TTL_SECONDS: SHARED_CACHE_TTL.MAX_TTL_SECONDS,
  // 保留组件特有的常量
  COMPRESSION_THRESHOLD: 10240,
};
```

#### 2.2 smart-cache重构
**目标**: 使用共享常量，保留编排器特有逻辑

**重构策略**:
- 基础TTL和间隔使用共享常量
- 保留智能缓存特有的策略常量
- 维持对common-cache的合理依赖

#### 2.3 stream-cache重构
**目标**: 使用共享常量，保留流缓存特有配置

**重构策略**:
- 标准TTL和间隔使用共享常量
- 保留流缓存特有的热缓存、预热缓存配置
- 保留WebSocket相关的特殊配置

#### 2.4 data-mapper-cache重构
**目标**: 减少外部依赖，使用共享批处理常量

**重构策略**:
- 批处理大小使用共享常量
- 保留数据映射特有的业务常量
- 维持对data-mapper模块的合理依赖

#### 2.5 symbol-mapper-cache重构
**目标**: 使用共享常量，保留三层LRU特有配置

**重构策略**:
- 基础配置使用共享常量
- 保留L1/L2/L3缓存层特有配置
- 保留符号映射业务逻辑相关常量

### 阶段3: 配置架构优化

#### 3.1 三层配置架构建立
**目标**: 建立清晰的配置抽象层次

**解决方案**:
```typescript
// 业务配置层
export const BUSINESS_CACHE_CONFIG = {
  STRATEGIES: {
    REAL_TIME_TTL_S: 5,      // 实时数据
    BATCH_QUERY_TTL_S: 300,  // 批量查询
  }
};

// 技术配置层
export const TECHNICAL_CACHE_CONFIG = {
  PERFORMANCE: {
    BATCH_SIZE: 10,
    MEMORY_THRESHOLD: 0.85,
  }
};

// 基础设施配置层
export const INFRASTRUCTURE_CACHE_CONFIG = {
  TIMEOUTS: {
    OPERATION_MS: 5000,
    CLEANUP_MS: 30000,
  }
};
```

#### 3.2 语义分层策略
**策略**:
- 业务层：基于业务场景的配置（交易时段、数据时效性）
- 技术层：基于性能考虑的配置（批次大小、阈值）
- 基础设施层：基于系统运维的配置（超时、间隔）

### 阶段4: 验证和测试

#### 4.1 类型检查验证
```bash
# 逐个组件验证
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/05-caching/shared-cache-constants/index.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/05-caching/common-cache/constants/cache.constants.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/05-caching/smart-cache/constants/smart-cache.constants.ts
# ... 其他组件
```

#### 4.2 功能测试验证
```bash
# 缓存模块单元测试
DISABLE_AUTO_INIT=true npx jest test/jest/unit/cache/ --testTimeout=30000

# 集成测试验证
DISABLE_AUTO_INIT=true bun run test:integration:cache
```

#### 4.3 性能影响评估
- 缓存命中率监控
- 响应时间对比
- 内存使用情况
- 组件启动时间

## 实施时间安排

### 第1周: 基础建设
- **Day 1-2**: 创建shared-cache-constants模块
- **Day 3-4**: 实现TTL和间隔常量统一
- **Day 5**: 实现批处理和阈值常量统一

### 第2周: 组件重构
- **Day 1**: common-cache重构
- **Day 2**: smart-cache重构
- **Day 3**: stream-cache重构
- **Day 4**: data-mapper-cache和symbol-mapper-cache重构
- **Day 5**: 整体验证和测试

### 第3周: 优化和验证
- **Day 1-2**: 监控依赖优化
- **Day 3-4**: 全面测试和性能验证
- **Day 5**: 文档更新和代码审查

## 风险评估

### 高风险项
1. **smart-cache编排器功能**: 重构时需确保编排逻辑不受影响
2. **运行时常量引用**: 确保所有运行时引用都正确更新
3. **第三方依赖**: monitoring模块的依赖变更可能影响其他模块

### 中风险项
1. **测试覆盖**: 需要大量的回归测试确保功能完整性
2. **性能影响**: 常量引用层级增加可能轻微影响性能
3. **开发团队适应**: 新的常量组织方式需要团队学习

### 低风险项
1. **向后兼容**: 大部分重构不影响对外接口
2. **配置管理**: 配置值本身不变，仅改变组织方式

## 成功标准

### 功能指标
- ✅ 所有缓存功能正常运行
- ✅ 缓存命中率保持在原有水平（Smart Cache >90%, Symbol Cache >70%）
- ✅ 响应时间无明显增加（P95 < 200ms, P99 < 500ms）

### 架构指标
- ✅ 常量重复消除率 >90%
- ✅ 组件间直接依赖减少 >50%
- ✅ 代码可维护性显著提升

### 质量指标
- ✅ 所有TypeScript类型检查通过
- ✅ 单元测试覆盖率保持 >85%
- ✅ 集成测试全部通过

## 后续优化方向

1. **配置中心化**: 将更多配置项移至ConfigService管理
2. **事件驱动优化**: 实现更松耦合的事件通信机制
3. **监控解耦**: 完全解耦monitoring模块依赖
4. **接口标准化**: 建立更完整的缓存组件接口规范

---

**编制日期**: 2024-09-23
**预计完成日期**: 2024-10-14
**负责人**: Claude Code
**审核状态**: 待审核