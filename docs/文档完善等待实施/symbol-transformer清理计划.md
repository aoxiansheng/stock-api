# Symbol-Transformer 组件废弃和兼容代码清理计划

## 概述
本文档记录了 `src/core/02-processing/symbol-transformer` 组件中需要清理的废弃代码和兼容层代码，以实现代码纯净化，不留历史包袱。

## 一、废弃（@deprecated）标记的代码

### 1.1 监控相关Token
**文件路径**: `src/core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts`
- **位置**: 第52-55行
- **废弃内容**: `INJECTION_TOKENS.MONITOR` Token
- **废弃原因**: `@deprecated 监控功能已由事件驱动模式替代`
- **相关代码**:
```typescript
/**
 * 监控器Token
 * @deprecated 监控功能已由事件驱动模式替代
 */
MONITOR: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformMonitor`)
```

### 1.2 监控接口定义
**文件路径**: `src/core/02-processing/symbol-transformer/interfaces/symbol-transformer.interface.ts`
- **位置**: 第96-104行
- **废弃内容**: `ISymbolTransformMonitor` 接口
- **废弃原因**: `@deprecated 监控功能已由事件驱动模式替代，该接口将在下个版本移除`
- **替代方案**: 使用 `EventEmitter2` 和 `SYSTEM_STATUS_EVENTS.METRIC_COLLECTED` 事件

## 二、兼容层代码

### 2.1 注入Token的向后兼容设计
**文件路径**: `src/core/02-processing/symbol-transformer/constants/injection-tokens.constants.ts`
- **位置**: 第8行
- **兼容说明**: `保留向后兼容的别名导出`
- **影响范围**: 整个Token定义文件

### 2.2 增强常量的兼容性设计
**文件路径**: `src/core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants.ts`

#### 2.2.1 整体兼容性声明
- **位置**: 第7行
- **兼容说明**: `保持与原有constants的完全兼容性`

#### 2.2.2 重试常量兼容层
- **位置**: 第15行
- **兼容代码**:
```typescript
// Extract constants for backward compatibility
const RETRY_CONSTANTS = CONSTANTS.SEMANTIC.RETRY;
```
- **说明**: 从统一常量中提取以保持兼容

#### 2.2.3 错误类型常量兼容
- **位置**: 第77行
- **兼容说明**: `错误类型常量 - 统一使用枚举定义，保持向后兼容`
- **实现方式**: ERROR_TYPES对象引用新的ErrorType枚举，保持旧的访问方式
```typescript
export const ERROR_TYPES = deepFreeze({
  VALIDATION_ERROR: ErrorType.VALIDATION,
  TIMEOUT_ERROR: ErrorType.TIMEOUT,
  // ...
} as const);
```

#### 2.2.4 重试配置兼容
- **位置**: 第94行
- **兼容说明**: `重试配置 - 引用统一配置，保持向后兼容`
- **实现方式**: RETRY_CONFIG维持旧结构，内部引用新的统一配置
```typescript
export const RETRY_CONFIG = {
  MAX_RETRY_ATTEMPTS: RETRY_CONSTANTS.COUNTS.BASIC.DEFAULT,
  RETRY_DELAY_MS: RETRY_CONSTANTS.DELAYS.BASIC.INITIAL_MS,
  // ...
};
```

## 三、清理实施计划

### 第一阶段：移除废弃的监控功能（优先级：高）
**预计工作量**: 2小时

1. **删除废弃接口**
   - 删除 `ISymbolTransformMonitor` 接口定义
   - 删除 `INJECTION_TOKENS.MONITOR` Token
   - 更新 `TOKEN_DESCRIPTIONS` 对象，移除MONITOR相关描述

2. **清理引用**
   - 搜索所有实现 `ISymbolTransformMonitor` 接口的类
   - 移除相关的依赖注入配置
   - 确认事件驱动监控已完全替代

3. **验证测试**
   - 运行相关单元测试
   - 确认监控功能通过事件系统正常工作

### 第二阶段：简化兼容层常量（优先级：中）
**预计工作量**: 3小时

1. **移除中间层包装**
   - 直接导出 `ErrorType` 枚举，移除 `ERROR_TYPES` 对象包装
   - 直接使用 `CONSTANTS.SEMANTIC.RETRY`，移除本地 `RETRY_CONFIG`
   - 更新所有引用点

2. **更新导入语句**
   - 批量更新所有使用旧常量的文件
   - 使用直接的枚举和统一配置引用

3. **代码简化**
   - 移除 `getScenarioConfig` 等兼容性辅助函数（如果未使用）
   - 简化常量导出结构

### 第三阶段：优化注入令牌系统（优先级：低）
**预计工作量**: 4小时

1. **使用情况审计**
   - 统计每个Token的实际使用情况
   - 识别未使用的Token

2. **清理未使用的Token**
   - 删除以下可能未使用的Token（需确认）：
     - FORMAT_VALIDATOR
     - PATTERN_MATCHER
     - CIRCUIT_BREAKER
     - PERFORMANCE_OPTIMIZER
     - RULE_ENGINE

3. **重构Token结构**
   - 考虑使用字符串常量替代Symbol（如果合适）
   - 简化命名空间结构

## 四、风险评估

### 4.1 高风险项
- 监控功能移除可能影响现有的指标收集
- 需要确保所有监控已迁移到事件驱动模式

### 4.2 中风险项
- 常量重构可能影响多个模块
- 需要全面的回归测试

### 4.3 低风险项
- Token清理主要是代码整洁性改进
- 不影响核心功能

## 五、测试验证清单

- [ ] 单元测试全部通过
- [ ] 集成测试验证符号转换功能正常
- [ ] 监控指标通过事件系统正常收集
- [ ] 性能测试无退化
- [ ] 代码覆盖率保持或提升

## 六、预期收益

1. **代码减少**: 预计减少约200-300行兼容性代码
2. **维护性提升**: 移除废弃接口，降低理解成本
3. **性能优化**: 减少不必要的抽象层，轻微性能提升
4. **架构清晰**: 完全采用事件驱动的监控模式，架构更统一

## 七、执行时间表

| 阶段 | 预计开始 | 预计完成 | 负责人 |
|-----|---------|---------|--------|
| 第一阶段 | Day 1 | Day 1 | TBD |
| 第二阶段 | Day 2 | Day 3 | TBD |
| 第三阶段 | Day 4 | Day 5 | TBD |
| 测试验证 | Day 6 | Day 7 | TBD |

## 八、回滚计划

如果清理过程中发现严重问题：
1. 通过Git revert回滚相关提交
2. 恢复兼容层代码
3. 重新评估清理策略
4. 制定更细粒度的迁移计划

---

*文档创建日期: 2025-01-20*
*最后更新: 2025-01-20*