# Alert Constants 架构重构迁移指南

## 📋 概述

本指南帮助开发人员从原有的扁平化常量结构迁移到新的三层分层架构。新架构解决了常量重复定义、依赖混乱、维护困难等问题。

## 🏗️ 新架构概览

```
src/alert/constants/
├── core/                    # 核心基础层
│   ├── values.constants.ts     # 纯数值常量
│   ├── patterns.constants.ts   # 正则表达式模式  
│   ├── limits.constants.ts     # 边界值和限制
│   └── timeouts.constants.ts   # 超时和时间配置
├── domain/                  # 领域专用层
│   ├── alert-rules.constants.ts    # 告警规则专用
│   ├── notifications.constants.ts  # 通知系统专用
│   ├── alert-history.constants.ts  # 历史记录专用
│   └── validation.constants.ts     # 验证规则专用  
├── composite/               # 复合应用层
│   ├── defaults.constants.ts       # 默认值配置
│   ├── operations.constants.ts     # 操作配置
│   └── templates.constants.ts      # 模板配置
└── index.ts                # 统一导出入口
```

## 🔄 文件迁移对照表

| 原文件 | 新位置 | 说明 |
|--------|--------|------|
| `alert.constants.ts` | `domain/alert-rules.constants.ts` | 告警规则相关常量 |
| `shared.constants.ts` | `core/limits.constants.ts` + `domain/validation.constants.ts` | 拆分为核心限制和验证规则 |
| `defaults.constants.ts` | `composite/defaults.constants.ts` | 升级为复合配置 |
| `timing.constants.ts` | `core/timeouts.constants.ts` | 重构为核心时间配置 |
| `retry.constants.ts` | 集成到各领域常量中 | 分散到具体业务领域 |
| `notification.constants.ts` | `domain/notifications.constants.ts` | 通知系统专用 |
| `alerting.constants.ts` | 拆分到多个文件 | 按功能分散到不同层级 |
| `alert-history.constants.ts` | `domain/alert-history.constants.ts` | 历史记录专用 |
| `business-rules.constants.ts` | 集成到 `domain/alert-rules.constants.ts` | 合并到告警规则 |
| `validation.constants.ts` | `domain/validation.constants.ts` | 扩展验证功能 |

## 📝 导入语句迁移

### 1. 基础常量迁移

```typescript
// ❌ 旧方式
import { VALID_OPERATORS } from '../constants/alert.constants';
import { SHARED_BATCH_LIMITS } from '../constants/shared.constants';

// ✅ 新方式
import { VALID_OPERATORS } from '../constants';
import { CORE_LIMITS } from '../constants/core';
// 或者向后兼容方式
import { SHARED_BATCH_LIMITS } from '../constants';
```

### 2. 时间相关常量迁移

```typescript
// ❌ 旧方式
import { TIMING_CONSTANTS } from '../constants/timing.constants';

// ✅ 新方式
import { CORE_TIMEOUTS } from '../constants/core';
// 或者向后兼容方式
import { TIMING_CONSTANTS } from '../constants';
```

### 3. 默认值常量迁移

```typescript
// ❌ 旧方式
import { ALERT_DEFAULTS } from '../constants/defaults.constants';

// ✅ 新方式
import { ALERT_DEFAULTS } from '../constants/composite';
// 或者直接从主入口
import { ALERT_DEFAULTS } from '../constants';
```

### 4. 通知相关常量迁移

```typescript
// ❌ 旧方式  
import { NOTIFICATION_OPERATIONS } from '../constants/notification.constants';

// ✅ 新方式
import { NOTIFICATION_OPERATIONS } from '../constants/domain';
// 或者直接从主入口
import { NOTIFICATION_OPERATIONS } from '../constants';
```

## 🎯 按使用场景的迁移指南

### 场景1: DTO验证装饰器

```typescript
// ❌ 旧方式
import { TIME_VALIDATION_LIMITS } from '../constants/validation.constants';

@Min(TIME_VALIDATION_LIMITS.DURATION.MIN)
@Max(TIME_VALIDATION_LIMITS.DURATION.MAX)
duration: number;

// ✅ 新方式
import { VALIDATION_LIMITS } from '../constants';

@Min(VALIDATION_LIMITS.TIME_SECONDS.DURATION_MIN)
@Max(VALIDATION_LIMITS.TIME_SECONDS.DURATION_MAX)
duration: number;
```

### 场景2: 业务逻辑中使用常量

```typescript
// ❌ 旧方式
import { ALERT_BUSINESS_RULES } from '../constants/business-rules.constants';

if (userRules.length >= ALERT_BUSINESS_RULES.LIMITS.MAX_RULES_PER_USER) {
  throw new Error('规则数量超限');
}

// ✅ 新方式
import { ALERT_RULE_CONSTANTS } from '../constants';

if (userRules.length >= ALERT_RULE_CONSTANTS.BUSINESS_LIMITS.MAX_RULES_PER_USER) {
  throw new Error('规则数量超限');
}
```

### 场景3: 缓存键生成

```typescript
// ❌ 旧方式
import { ALERTING_CACHE_PATTERNS } from '../constants/alerting.constants';

const cacheKey = ALERTING_CACHE_PATTERNS.RULE_COOLDOWN.replace('{ruleId}', ruleId);

// ✅ 新方式
import { AlertRuleUtil } from '../constants';

const cacheKey = AlertRuleUtil.generateCooldownCacheKey(ruleId);
```

### 场景4: 默认值应用

```typescript
// ❌ 旧方式
import { ALERT_DEFAULTS } from '../constants/defaults.constants';

const rule = {
  ...ALERT_DEFAULTS.RULE,
  name: 'Custom Rule'
};

// ✅ 新方式
import { AlertDefaultsUtil } from '../constants';

const rule = AlertDefaultsUtil.createRuleWithDefaults({ 
  name: 'Custom Rule' 
});
```

## 🔧 工具类使用迁移

### 1. 验证工具迁移

```typescript
// ❌ 旧方式
import { SHARED_VALIDATION_RULES } from '../constants/shared.constants';

const isValid = SHARED_VALIDATION_RULES.VALIDATORS.isValidMessage(message);

// ✅ 新方式
import { ValidationUtil } from '../constants';

const isValid = ValidationUtil.isValidMessageLength(message);
```

### 2. 时间工具迁移

```typescript
// ❌ 旧方式
import { TimingUtil } from '../constants/timing.constants';

const ms = TimingUtil.secondsToMs(30);

// ✅ 新方式
import { TimeConverter } from '../constants';

const ms = TimeConverter.secondsToMs(30);
```

### 3. 模板工具使用

```typescript
// ✅ 新功能 - 以前没有的功能
import { TemplateUtil } from '../constants';

const rendered = TemplateUtil.renderTemplate(
  { title: '告警: {{ruleName}}', content: '详情: {{message}}' },
  { ruleName: 'CPU告警', message: 'CPU使用率过高' }
);
```

## 🎨 新功能亮点

### 1. 统一的架构访问接口

```typescript
import { ALERT_CONSTANTS_ARCHITECTURE } from '../constants';

// 按层访问
const coreValues = ALERT_CONSTANTS_ARCHITECTURE.CORE.VALUES;
const domainRules = ALERT_CONSTANTS_ARCHITECTURE.DOMAIN.ALERT_RULES;
const appDefaults = ALERT_CONSTANTS_ARCHITECTURE.COMPOSITE.DEFAULTS;
```

### 2. 强化的类型安全

```typescript
import type { AlertDefaults, OperatorType } from '../constants';

function createRule(operator: OperatorType, defaults: AlertDefaults) {
  // 完整的类型检查支持
}
```

### 3. 环境相关配置

```typescript
import { AlertDefaultsUtil } from '../constants';

// 获取环境特定的默认值
const defaults = AlertDefaultsUtil.getEnvironmentDefaults('production');
```

### 4. 预定义模板系统

```typescript
import { TemplateUtil, PREDEFINED_TEMPLATES } from '../constants';

// 使用预定义模板
const template = TemplateUtil.getPredefinedTemplate('ALERT_NOTIFICATIONS', 'CRITICAL_ALERT');
```

## ⚠️ 注意事项

### 1. 向后兼容性

新架构提供了完整的向后兼容性支持，但建议逐步迁移到新的导入方式：

```typescript
// 这些导入仍然有效，但建议替换
import { TIMING_CONSTANTS } from '../constants'; // ✅ 兼容
import { SHARED_BATCH_LIMITS } from '../constants'; // ✅ 兼容  
import { ALERT_BUSINESS_RULES } from '../constants'; // ✅ 兼容
```

### 2. 性能优化

新架构通过按需导入减少了打包大小：

```typescript
// ❌ 导入整个模块
import * as AlertConstants from '../constants';

// ✅ 按需导入
import { ALERT_DEFAULTS, ValidationUtil } from '../constants';
```

### 3. 测试更新

更新单元测试中的导入和断言：

```typescript
// ❌ 旧测试
import { TIMING_CONSTANTS } from '../constants/timing.constants';
expect(config.timeout).toBe(TIMING_CONSTANTS.TIMEOUT.DEFAULT_SECONDS);

// ✅ 新测试
import { CORE_TIMEOUTS } from '../constants';
expect(config.timeout).toBe(CORE_TIMEOUTS.BASIC_SECONDS.DEFAULT);
```

## 📊 迁移检查清单

### 阶段1: 准备工作
- [ ] 了解新的三层架构概念
- [ ] 查看文件迁移对照表
- [ ] 识别项目中使用常量的文件

### 阶段2: 导入语句更新  
- [ ] 更新基础常量导入
- [ ] 更新时间相关导入
- [ ] 更新默认值导入
- [ ] 更新通知系统导入
- [ ] 更新验证相关导入

### 阶段3: 代码逻辑更新
- [ ] 替换DTO验证装饰器中的常量引用
- [ ] 更新业务逻辑中的常量使用
- [ ] 迁移缓存键生成逻辑
- [ ] 更新默认值应用方式

### 阶段4: 工具类迁移
- [ ] 迁移验证工具使用
- [ ] 迁移时间转换工具
- [ ] 采用新的模板工具

### 阶段5: 测试和验证
- [ ] 更新单元测试
- [ ] 更新集成测试
- [ ] 验证功能完整性
- [ ] 检查类型安全性

### 阶段6: 优化和清理
- [ ] 移除未使用的旧导入
- [ ] 优化按需导入
- [ ] 添加新功能使用
- [ ] 文档更新

## 🚀 迁移最佳实践

1. **渐进式迁移**: 不要一次性替换所有导入，按模块逐步迁移
2. **保持测试**: 每次迁移后立即运行相关测试
3. **利用新功能**: 在迁移过程中积极使用新的工具类和功能
4. **类型检查**: 充分利用新架构提供的类型安全性
5. **代码审查**: 让团队成员审查迁移后的代码

## 💡 常见问题解答

### Q: 旧的导入方式还能用吗？
A: 是的，新架构提供了完整的向后兼容性支持。但建议逐步迁移到新方式。

### Q: 新架构的性能如何？
A: 新架构通过消除重复定义和优化导入结构，实际上提升了性能。

### Q: 如何处理自定义的常量？
A: 可以按照相同的分层原则添加到对应的层级中，或创建新的领域专用文件。

### Q: 迁移会影响现有功能吗？
A: 不会。新架构在功能上完全兼容，并提供了额外的增强功能。

### Q: 如何确保团队成员都了解新架构？
A: 建议进行代码审查和知识分享会，逐步推广新的使用方式。