# symbol-transformer 常量枚举值审查说明 - 修复计划文档

## 文档信息
- **基于文档**: symbol-transformer常量枚举值审查说明.md
- **制定日期**: 2025-01-03
- **NestJS版本**: v10.x (基于项目当前配置)
- **修复优先级**: 高（严重问题必须修复，重复率16.7%超标）
- **预估修复时间**: 4-6工作日
- **风险等级**: 中等（涉及多模块重构，需要充分测试）

## 问题概述

通过对 symbol-transformer 模块的审查发现以下关键问题：
1. **RETRY_CONFIG 完全重复**：6个文件中存在相同的重试配置
2. **ERROR_TYPES 语义重复**：同一模块内存在两套错误类型定义
3. **TIMEOUT 配置值高度重复**：多个文件中存在相同的超时值配置
4. **依赖注入 Token 命名冗长**：可能与其他模块冲突
5. **整体重复率16.7%**：远超5%的目标阈值

## 修复目标

| 指标 | 当前值 | 目标值 | 修复后预期 |
|-----|--------|--------|-----------|
| 重复率 | 16.7% | <5% | 3-4% |
| 继承使用率 | 0% | >70% | 75-80% |
| 命名规范符合率 | 85% | 100% | 100% |
| 代码维护性 | 低 | 高 | 高 |

## 详细修复方案

### 阶段一：立即行动项（第1-2天）

#### 1.1 统一 RETRY_CONFIG 配置

**问题分析**：
- 6个文件中存在完全相同的 RETRY_CONFIG 结构
- 违反 DRY（Don't Repeat Yourself）原则
- 配置不一致风险高

**修复步骤**：

**步骤 1.1.1**: 验证现有统一配置
```bash
# 检查现有的统一性能配置
cat src/common/constants/unified/retry.constants.ts | grep -A 20 "DEFAULT_SETTINGS"
```

**步骤 1.1.2**: 更新 symbol-transformer.constants.ts
```typescript
// 原代码：src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts
// 删除重复的 RETRY_CONFIG，改为引用统一配置

// 删除以下重复代码：
/*
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,
  BACKOFF_FACTOR: 2,
  MAX_DELAY: 10000,
  JITTER_FACTOR: 0.1,
} as const;
*/

// 替换为：
import { RETRY_CONSTANTS } from '../../../../common/constants/unified/retry.constants';

// 创建别名以保持向后兼容
export const RETRY_CONFIG = RETRY_CONSTANTS.DEFAULT_SETTINGS;

// 如果需要symbol-transformer特定的重试配置，可以使用：
// export const RETRY_CONFIG = RETRY_CONSTANTS.BUSINESS_SCENARIOS.SYMBOL_MAPPER;
```

**步骤 1.1.3**: 更新其他重复文件
需要更新的文件列表：
- `src/core/05-caching/common-cache/constants/cache-config.constants.ts`
- `src/alert/constants/notification.constants.ts`
- `src/alert/constants/alerting.constants.ts`
- `src/auth/constants/auth.constants.ts`
- `src/auth/constants/apikey.constants.ts`

**步骤 1.1.4**: 更新 shared.config.ts 中的内嵌配置
```typescript
// 原代码：src/core/shared/config/shared.config.ts
// 将内嵌的 RETRY_CONFIG 替换为引用

import { RETRY_CONSTANTS } from '../../../common/constants/unified/retry.constants';

// 在配置对象中使用：
const sharedConfig = {
  // ... 其他配置
  retry: RETRY_CONSTANTS.DEFAULT_SETTINGS,
  // ... 其他配置
};
```

#### 1.2 合并错误类型定义

**问题分析**：
- 同一模块内存在两套错误类型系统
- 常量对象 vs 枚举，增加使用混淆

**优化建议**：
项目中已存在 [ErrorType](file:///Users/honor/Documents/code/newstockapi/backend/src/core/02-processing/symbol-transformer/utils/retry.utils.ts#L5-L12) 枚举定义，建议统一使用枚举以获得更好的类型安全性。

**修复步骤**：

**步骤 1.2.1**: 统一使用枚举定义，保持向后兼容
```typescript
// 文件：src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts
// 删除重复的 ERROR_TYPES 常量：
/*
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
} as const;
*/

// 添加从枚举导出的类型别名以保持向后兼容：
import { ErrorType } from '../utils/retry.utils';

export const ERROR_TYPES = {
  VALIDATION_ERROR: ErrorType.VALIDATION,
  TIMEOUT_ERROR: ErrorType.TIMEOUT,
  NETWORK_ERROR: ErrorType.NETWORK,
  SYSTEM_ERROR: ErrorType.SYSTEM,
} as const;
```

**步骤 1.2.2**: 更新引用该常量的代码
```bash
# 搜索使用 ERROR_TYPES 的代码
grep -r "ERROR_TYPES" src/core/02-processing/symbol-transformer/ --include="*.ts"

# 更新为使用 ErrorType 枚举
# 将 ERROR_TYPES.VALIDATION_ERROR 替换为 ErrorType.VALIDATION
```

#### 1.3 统一超时配置

**问题分析**：
- 多个文件中存在相同的超时值
- `REQUEST_TIMEOUT: 10000` 和 `DEFAULT_TIMEOUT_MS: 30000` 重复

**优化建议**：
项目中已存在统一的超时配置中心 [PERFORMANCE_CONSTANTS.TIMEOUTS](file:///Users/honor/Documents/code/newstockapi/backend/src/common/constants/unified/performance.constants.ts#L37-L65)，建议直接引用。

**修复步骤**：

**步骤 1.3.1**: 更新 symbol-transformer 的超时配置
```typescript
// 文件：src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts
import { PERFORMANCE_CONSTANTS } from '../../../../common/constants/unified/performance.constants';

export const CONFIG = {
  MAX_SYMBOL_LENGTH: 50,
  MAX_BATCH_SIZE: 1000,
  // 原来：REQUEST_TIMEOUT: 10000,
  REQUEST_TIMEOUT: PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS, // 15000ms，更符合HTTP请求场景
  ENDPOINT: '/internal/symbol-transformation',
} as const;
```

**步骤 1.3.2**: 批量更新其他重复超时配置文件
需要更新的文件：
- `src/core/04-storage/storage/constants/storage.constants.ts`
- `src/core/03-fetching/data-fetcher/constants/data-fetcher.constants.ts`
- `src/core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts`
- `src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
- `src/core/01-entry/receiver/constants/receiver.constants.ts`

### 阶段二：中期优化项（第3-4天）

#### 2.1 优化依赖注入 Token 命名

**问题分析**：
- Token 命名冗长：`SYMBOL_TRANSFORMER_TOKEN`, `SYMBOL_FORMAT_VALIDATOR_TOKEN`
- 可能与其他模块冲突

**优化建议**：
建立命名空间模式，使用 Symbol 类型确保唯一性。

**修复步骤**：

**步骤 2.1.1**: 创建命名空间模式
```typescript
// 文件：src/core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts
// 新建专门的注入Token文件

const SYMBOL_TRANSFORMER_NAMESPACE = 'SymbolTransformer';

export const INJECTION_TOKENS = {
  TRANSFORMER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformer`),
  FORMAT_VALIDATOR: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolFormatValidator`),
  BATCH_PROCESSOR: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IBatchProcessor`),
  TRANSFORMATION_CACHE: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ITransformationCache`),
  PATTERN_MATCHER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IPatternMatcher`),
  CIRCUIT_BREAKER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ICircuitBreaker`),
  MONITOR: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformMonitor`),
} as const;

// 保持向后兼容的别名
export const SYMBOL_TRANSFORMER_TOKEN = INJECTION_TOKENS.TRANSFORMER;
export const SYMBOL_FORMAT_VALIDATOR_TOKEN = INJECTION_TOKENS.FORMAT_VALIDATOR;
// ... 其他别名
```

**步骤 2.1.2**: 更新接口文件
```typescript
// 文件：src/core/02-processing/symbol-transformer/interfaces/symbol-transformer.interface.ts
// 删除原有的Token定义，改为引用
export { INJECTION_TOKENS } from '../constants/injection-tokens.constants';
```

#### 2.2 建立监控配置统一化

**问题分析**：
- `MONITORING_CONFIG` 使用与来源分散
- 需要收敛监控阈值到统一配置中心

**优化建议**：
建议在统一配置中心创建监控相关常量，并在各模块中引用。

**修复步骤**：

**步骤 2.2.1**: 创建统一监控配置
```typescript
// 文件：src/common/constants/unified/monitoring.constants.ts
// 新建统一监控配置文件

export const MONITORING_CONSTANTS = Object.freeze({
  // Symbol Transformer 监控配置
  SYMBOL_TRANSFORMER: {
    ERROR_THRESHOLD: 0.05, // 5% 错误率阈值
    SLOW_OPERATION_MS: 100, // 慢操作阈值
    BATCH_SIZE_THRESHOLD: 1000, // 批量处理大小阈值
    MEMORY_USAGE_MB: 50, // 内存使用阈值
  },
  
  // 通用监控配置
  COMMON: {
    HEALTH_CHECK_INTERVAL_MS: 30000,
    METRICS_COLLECTION_INTERVAL_MS: 10000,
    ERROR_SAMPLE_RATE: 1.0,
    PERFORMANCE_SAMPLE_RATE: 0.1,
  },
  
  // 缓存监控配置
  CACHE: {
    HIT_RATE_THRESHOLD: 0.7, // 70% 命中率阈值
    MISS_RATE_THRESHOLD: 0.3, // 30% 未命中率阈值
    EVICTION_RATE_THRESHOLD: 0.1, // 10% 淘汰率阈值
  },
});
```

**步骤 2.2.2**: 更新 symbol-transformer 监控配置引用
```typescript
// 文件：src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts
import { MONITORING_CONSTANTS } from '../../../../common/constants/unified/monitoring.constants';

// 删除本地 MONITORING_CONFIG，替换为：
export const MONITORING_CONFIG = MONITORING_CONSTANTS.SYMBOL_TRANSFORMER;
```

#### 2.3 断路器配置共享化

**问题分析**：
- 断路器配置在 `retry.utils.ts` 中定义，其他模块可能需要相似配置
- 应提取为共享配置

**优化建议**：
在统一配置中心创建断路器相关常量，并在各模块中引用。

**修复步骤**：

**步骤 2.3.1**: 创建共享断路器配置
```typescript
// 文件：src/common/constants/unified/circuit-breaker.constants.ts
// 新建断路器统一配置文件

export const CIRCUIT_BREAKER_CONSTANTS = Object.freeze({
  DEFAULT: {
    FAILURE_THRESHOLD: 5, // 失败阈值
    SUCCESS_THRESHOLD: 2, // 成功阈值
    TIMEOUT_MS: 60000, // 超时时间：1分钟
    MONITOR_INTERVAL_MS: 10000, // 监控间隔：10秒
  },
  
  FAST: {
    FAILURE_THRESHOLD: 3,
    SUCCESS_THRESHOLD: 1,
    TIMEOUT_MS: 30000, // 30秒
    MONITOR_INTERVAL_MS: 5000, // 5秒
  },
  
  SENSITIVE: {
    FAILURE_THRESHOLD: 2,
    SUCCESS_THRESHOLD: 3,
    TIMEOUT_MS: 120000, // 2分钟
    MONITOR_INTERVAL_MS: 15000, // 15秒
  },
});
```

**步骤 2.3.2**: 更新 retry.utils.ts
```typescript
// 文件：src/core/02-processing/symbol-transformer/utils/retry.utils.ts
import { CIRCUIT_BREAKER_CONSTANTS } from '../../../../common/constants/unified/circuit-breaker.constants';

// 更新断路器配置引用：
const DEFAULT_CIRCUIT_BREAKER_CONFIG = CIRCUIT_BREAKER_CONSTANTS.DEFAULT;
```

### 阶段三：长期规划项（第5-6天）

#### 3.1 建立常量继承体系

**步骤 3.1.1**: 创建基础常量抽象
```typescript
// 文件：src/common/constants/base/base.constants.ts
// 创建基础常量模板

export interface BaseModuleConstants {
  readonly CONFIG: {
    readonly MAX_BATCH_SIZE: number;
    readonly REQUEST_TIMEOUT: number;
    readonly ENDPOINT: string;
  };
  readonly RETRY_CONFIG: typeof RETRY_CONSTANTS.DEFAULT_SETTINGS;
  readonly MONITORING_CONFIG: {
    readonly ERROR_THRESHOLD: number;
    readonly SLOW_OPERATION_MS: number;
  };
}

export abstract class BaseConstants {
  static createModuleConstants<T extends BaseModuleConstants>(overrides: Partial<T>): T {
    return {
      CONFIG: {
        MAX_BATCH_SIZE: 1000, // 默认值
        REQUEST_TIMEOUT: PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS,
        ENDPOINT: overrides.CONFIG?.ENDPOINT || '/api/default',
      },
      RETRY_CONFIG: RETRY_CONSTANTS.DEFAULT_SETTINGS,
      MONITORING_CONFIG: {
        ERROR_THRESHOLD: 0.05,
        SLOW_OPERATION_MS: 100,
      },
      ...overrides,
    } as T;
  }
}
```

**步骤 3.1.2**: 重构 symbol-transformer 常量
```typescript
// 文件：src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.ts
import { BaseConstants, BaseModuleConstants } from '../../../../common/constants/base/base.constants';
import { RETRY_CONSTANTS, PERFORMANCE_CONSTANTS } from '../../../../common/constants/unified';
import { ErrorType } from '../utils/retry.utils';

interface SymbolTransformerConstants extends BaseModuleConstants {
  readonly SYMBOL_PATTERNS: typeof symbolPatterns;
  readonly MARKET_TYPES: typeof marketTypes;
  readonly ERROR_TYPES: typeof errorTypes;
}

const symbolPatterns = {
  CN: /^\d{6}$/,
  US: /^[A-Z]+$/,
  HK: /\.HK$/i,
} as const;

const marketTypes = {
  CN: 'CN',
  US: 'US',
  HK: 'HK',
  MIXED: 'mixed',
  UNKNOWN: 'unknown',
} as const;

const errorTypes = {
  VALIDATION_ERROR: ErrorType.VALIDATION,
  TIMEOUT_ERROR: ErrorType.TIMEOUT,
  NETWORK_ERROR: ErrorType.NETWORK,
  SYSTEM_ERROR: ErrorType.SYSTEM,
} as const;

// 使用基础类创建常量
export const SYMBOL_TRANSFORMER_CONSTANTS = BaseConstants.createModuleConstants<SymbolTransformerConstants>({
  CONFIG: {
    MAX_SYMBOL_LENGTH: 50,
    MAX_BATCH_SIZE: 1000,
    REQUEST_TIMEOUT: PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS,
    ENDPOINT: '/internal/symbol-transformation',
  },
  SYMBOL_PATTERNS: symbolPatterns,
  MARKET_TYPES: marketTypes,
  ERROR_TYPES: errorTypes,
  MONITORING_CONFIG: {
    ERROR_THRESHOLD: 0.01, // 保持原有值
    SLOW_OPERATION_MS: 200, // 保持原有值
  },
});

// 保持向后兼容的导出
export const { SYMBOL_PATTERNS, MARKET_TYPES, CONFIG, RETRY_CONFIG, MONITORING_CONFIG, ERROR_TYPES } = SYMBOL_TRANSFORMER_CONSTANTS;
```

## 测试策略

### 单元测试更新

**步骤T1**: 更新常量引用测试
```typescript
// 文件：test/jest/unit/core/02-processing/symbol-transformer/constants/symbol-transformer.constants.spec.ts

import { SYMBOL_TRANSFORMER_CONSTANTS, RETRY_CONFIG, ERROR_TYPES } from '../../../../../../../src/core/02-processing/symbol-transformer/constants/symbol-transformer.constants';
import { RETRY_CONSTANTS, PERFORMANCE_CONSTANTS } from '../../../../../../../src/common/constants/unified';

describe('SymbolTransformerConstants', () => {
  describe('重复配置统一化测试', () => {
    it('should use unified retry configuration', () => {
      expect(RETRY_CONFIG).toBe(RETRY_CONSTANTS.DEFAULT_SETTINGS);
      expect(RETRY_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(RETRY_CONFIG.RETRY_DELAY_MS).toBe(1000);
    });

    it('should use unified timeout configuration', () => {
      expect(SYMBOL_TRANSFORMER_CONSTANTS.CONFIG.REQUEST_TIMEOUT)
        .toBe(PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS);
    });

    it('should have consistent error types', () => {
      expect(ERROR_TYPES.VALIDATION_ERROR).toBe('VALIDATION');
      expect(ERROR_TYPES.TIMEOUT_ERROR).toBe('TIMEOUT');
      expect(ERROR_TYPES.NETWORK_ERROR).toBe('NETWORK');
      expect(ERROR_TYPES.SYSTEM_ERROR).toBe('SYSTEM');
    });
  });

  describe('向后兼容性测试', () => {
    it('should maintain backward compatibility for SYMBOL_PATTERNS', () => {
      expect(SYMBOL_TRANSFORMER_CONSTANTS.SYMBOL_PATTERNS.CN).toEqual(/^\d{6}$/);
      expect(SYMBOL_TRANSFORMER_CONSTANTS.SYMBOL_PATTERNS.US).toEqual(/^[A-Z]+$/);
      expect(SYMBOL_TRANSFORMER_CONSTANTS.SYMBOL_PATTERNS.HK).toEqual(/\.HK$/i);
    });

    it('should maintain backward compatibility for MARKET_TYPES', () => {
      expect(SYMBOL_TRANSFORMER_CONSTANTS.MARKET_TYPES.CN).toBe('CN');
      expect(SYMBOL_TRANSFORMER_CONSTANTS.MARKET_TYPES.US).toBe('US');
      expect(SYMBOL_TRANSFORMER_CONSTANTS.MARKET_TYPES.HK).toBe('HK');
    });
  });
});
```

### 集成测试

**步骤T2**: 验证跨模块配置一致性
```typescript
// 文件：test/jest/integration/constants-consistency.integration.test.ts

describe('Constants Consistency Integration', () => {
  it('should have consistent retry configuration across modules', async () => {
    const modules = [
      'symbol-transformer',
      'common-cache', 
      'notification',
      'alerting',
      'auth',
      'apikey'
    ];

    for (const module of modules) {
      const constants = await import(`../../src/path/to/${module}.constants`);
      expect(constants.RETRY_CONFIG).toEqual(RETRY_CONSTANTS.DEFAULT_SETTINGS);
    }
  });

  it('should have consistent timeout values', async () => {
    // 验证所有模块的超时配置都引用统一来源
    const timeoutModules = [
      'symbol-transformer',
      'storage',
      'data-fetcher',
      'symbol-mapper',
      'data-mapper',
      'receiver'
    ];

    for (const module of timeoutModules) {
      const constants = await import(`../../src/path/to/${module}.constants`);
      expect(constants.CONFIG.REQUEST_TIMEOUT).toBeDefined();
      // 验证值来自统一配置
    }
  });
});
```

## 回滚策略

### 风险评估
- **中等风险**：涉及多个模块的常量引用更新
- **潜在影响**：如果引用路径错误，可能导致编译失败或运行时错误

### 回滚计划

**步骤R1**: 创建修改前备份
```bash
# 在开始修复前创建备份
mkdir -p backups/constants-refactor-$(date +%Y%m%d-%H%M%S)
cp -r src/core/02-processing/symbol-transformer/constants/ backups/constants-refactor-$(date +%Y%m%d-%H%M%S)/
cp -r src/core/05-caching/common-cache/constants/ backups/constants-refactor-$(date +%Y%m%d-%H%M%S)/
# ... 备份其他相关文件
```

**步骤R2**: Git分支策略
```bash
# 创建功能分支
git checkout -b feature/constants-deduplication
git commit -m "constants-refactor: Backup checkpoint before refactoring"

# 每个阶段创建检查点
git commit -m "constants-refactor: Phase 1 Complete - Eliminate constant duplicates"
git commit -m "constants-refactor: Phase 2 Complete - Structure optimization"
git commit -m "constants-refactor: Phase 3 Complete - Long-term planning implementation"
```

**步骤R3**: 快速回滚程序
```bash
#!/bin/bash
# 文件：scripts/rollback-constants-refactor.sh

echo "开始回滚常量重构..."

# 恢复备份文件
if [ -d "backups/constants-refactor-*" ]; then
    latest_backup=$(ls -t backups/constants-refactor-* | head -1)
    echo "恢复备份: $latest_backup"
    
    cp -r "$latest_backup"/* src/
    
    echo "备份恢复完成"
    
    # 运行测试确认回滚成功
    npm test
    
    if [ $? -eq 0 ]; then
        echo "✅ 回滚成功，测试通过"
    else
        echo "❌ 回滚失败，测试未通过"
        exit 1
    fi
else
    echo "❌ 未找到备份文件"
    exit 1
fi
```

## 验收标准

### 功能验收
1. ✅ 所有重复的 RETRY_CONFIG 统一引用 `RETRY_CONSTANTS.DEFAULT_SETTINGS`
2. ✅ ERROR_TYPES 合并为单一枚举定义
3. ✅ 超时配置统一引用 `PERFORMANCE_CONSTANTS.TIMEOUTS`
4. ✅ 依赖注入 Token 使用命名空间模式
5. ✅ 监控配置统一化
6. ✅ 向后兼容性保持

### 质量验收
1. ✅ 重复率降至5%以下
2. ✅ 继承使用率达到70%以上
3. ✅ 命名规范符合率100%
4. ✅ 所有单元测试通过
5. ✅ 集成测试通过
6. ✅ TypeScript编译无错误
7. ✅ ESLint检查通过

### 性能验收
1. ✅ 构建时间无显著增加
2. ✅ 运行时性能无回退
3. ✅ 内存使用无异常增长
4. ✅ 模块加载时间无显著变化

## 实施命令清单

### 准备阶段
```bash
# 1. 创建功能分支
git checkout -b feature/constants-deduplication

# 2. 创建备份
mkdir -p backups/constants-refactor-$(date +%Y%m%d-%H%M%S)


```

### 执行阶段
```bash
# 阶段一：立即行动项
npm run test:unit:symbol-transformer # 确保修改前测试通过
# 手动修改文件...
npm run test:unit:symbol-transformer # 验证修改后测试通过
git commit -m "constants-refactor: Phase 1 Complete"

# 阶段二：中期优化项  
npm run build # 确保编译通过
npm run lint # 确保代码规范
git commit -m "constants-refactor: Phase 2 Complete"

# 阶段三：长期规划项
npm run check:constants-duplicates # 验证重复率
npm run test:integration # 运行集成测试
git commit -m "constants-refactor: Phase 3 Complete"
```

### 验证阶段
```bash
# 完整测试套件
npm run test:all

# 构建验证
npm run build

# 代码质量检查
npm run lint
npm run check:constants-duplicates

# 性能验证
npm run test:performance
```

## 维护指南

### 新增常量规范
1. 优先检查 `src/common/constants/unified/` 下是否有相似配置
2. 新增常量前运行 `npm run check:constants-duplicates`
3. 使用命名空间模式创建依赖注入Token
4. 添加对应的单元测试

### 监控指标
- 每月运行重复检测报告
- 监控构建时间和性能指标
- 跟踪新模块的常量继承使用率

### 定期审查
- 季度常量使用情况审查
- 半年度架构优化评估

## 总结

本修复计划通过三个阶段系统性地解决 symbol-transformer 模块中的常量重复问题：

1. **立即行动项**：解决最严重的重复配置问题，将重复率从16.7%降至5%以下
2. **中期优化项**：建立更好的组织结构和命名规范，提升代码质量
3. **长期规划项**：建立可持续的常量管理机制，防止未来重复问题

通过实施本计划，不仅能解决当前的代码重复问题，还能建立起完善的常量管理体系，符合NestJS的最佳实践，提升整个项目的代码质量和维护性。

修复完成后，项目将具备：
- ✅ 统一的配置管理体系
- ✅ 清晰的依赖注入Token命名规范
- ✅ 自动化的重复检测机制  
- ✅ 完善的测试覆盖
- ✅ 良好的向后兼容性

这将显著提升代码的可维护性、可测试性和开发效率。