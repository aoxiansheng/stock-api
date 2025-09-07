# Alert Constants 分层架构

## 🏗️ 架构概览

Alert模块采用三层分层架构来组织常量，解决了原有扁平结构中的重复定义、依赖混乱等问题。

```
src/alert/constants/
├── 📁 core/          # 🏛️ 核心基础层 - 系统底层配置
├── 📁 domain/        # 🎯 领域专用层 - 业务专用常量  
├── 📁 composite/     # 🔧 复合应用层 - 应用级配置
└── 📄 index.ts       # 📋 统一导出入口
```

## 🎯 设计原则

### 1. 单一真实来源 (Single Source of Truth)
- 每个数值只在一个地方定义
- 通过引用而非复制来共享常量
- 消除了重复定义和不一致问题

### 2. 清晰的依赖层次
```
Composite Layer (应用层)
    ↓ 依赖
Domain Layer (领域层)
    ↓ 依赖  
Core Layer (核心层)
```

### 3. 按职责分离
- **Core**: 纯技术配置，无业务语义
- **Domain**: 特定业务领域的常量
- **Composite**: 跨领域的复合配置

## 📚 层级详解

### 🏛️ Core Layer - 核心基础层

提供系统底层的基础配置，被其他层引用但不依赖任何业务逻辑。

```typescript
// 📄 values.constants.ts - 纯数值常量
export const CORE_VALUES = {
  QUANTITIES: { ZERO: 0, ONE: 1, HUNDRED: 100, THOUSAND: 1000 },
  TIME_SECONDS: { ONE_SECOND: 1, ONE_MINUTE: 60, ONE_HOUR: 3600 },
  SIZES: { SMALL: 50, MEDIUM: 100, LARGE: 500, HUGE: 1000 },
};

// 📄 patterns.constants.ts - 正则表达式模式
export const CORE_PATTERNS = {
  TEXT: {
    GENERAL_NAME: /^[\u4e00-\u9fff\w\s\-_\.]+$/,
    IDENTIFIER: /^[a-zA-Z0-9_\.]+$/,
    TAG: /^[a-zA-Z0-9_-]+$/,
  },
  ID_FORMATS: {
    ALERT_RULE: /^rule_[a-z0-9]+_[a-z0-9]{6}$/,
    ALERT_HISTORY: /^alrt_[a-z0-9]+_[a-z0-9]{6}$/,
  },
};

// 📄 limits.constants.ts - 边界值和限制
export const CORE_LIMITS = {
  STRING_LENGTH: { NAME_MAX: 100, MESSAGE_MAX: 1000 },
  NUMERIC_RANGE: { THRESHOLD_MIN: 0, THRESHOLD_MAX: MAX_SAFE_INTEGER },
  BATCH_LIMITS: { DEFAULT_BATCH_SIZE: 1000, CLEANUP_BATCH_SIZE: 1000 },
};

// 📄 timeouts.constants.ts - 超时和时间配置
export const CORE_TIMEOUTS = {
  BASIC_SECONDS: { DEFAULT: 30, DURATION_DEFAULT: 60, COOLDOWN_DEFAULT: 300 },
  CACHE_TTL_SECONDS: { ALERT: 3600, STATS: 300, RULE: 1800 },
  OPERATION_TIMEOUTS_MS: { DB_QUERY_TIMEOUT: 5000, NOTIFICATION_SEND: 30000 },
};
```

### 🎯 Domain Layer - 领域专用层

基于核心层构建，包含特定业务领域的常量和逻辑。

```typescript
// 📄 alert-rules.constants.ts - 告警规则专用
export const ALERT_RULE_CONSTANTS = {
  IDENTIFIERS: {
    ID_PREFIX: "rule_",
    ID_PATTERN: CORE_PATTERNS.ID_FORMATS.ALERT_RULE, // 引用核心层
  },
  VALIDATION: {
    NAME_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.NAME_MAX, // 引用核心层
    THRESHOLD_MIN: CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN,
  },
  TIME_CONFIG: {
    DURATION_DEFAULT: CORE_TIMEOUTS.BASIC_SECONDS.DURATION_DEFAULT,
    COOLDOWN_DEFAULT: CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_DEFAULT,
  },
};

// 📄 notifications.constants.ts - 通知系统专用
export const NOTIFICATION_CONSTANTS = {
  VALIDATION: {
    TEMPLATE_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.TEMPLATE_MAX,
    EMAIL_PATTERN: CORE_PATTERNS.NETWORK.EMAIL,
  },
  RETRY: {
    MAX_RETRIES: 5, // 领域特定值
    INITIAL_DELAY_MS: CORE_TIMEOUTS.RETRY_TIMING.INITIAL_DELAY_MS,
  },
};

// 📄 alert-history.constants.ts - 历史记录专用
export const ALERT_HISTORY_CONSTANTS = {
  IDENTIFIERS: {
    ID_PREFIX: "alrt_",
    ID_PATTERN: CORE_PATTERNS.ID_FORMATS.ALERT_HISTORY,
  },
  BUSINESS_LIMITS: {
    BATCH_SIZE_LIMIT: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,
    CLEANUP_BATCH_SIZE: CORE_LIMITS.BATCH_LIMITS.CLEANUP_BATCH_SIZE,
  },
};

// 📄 validation.constants.ts - 验证规则专用  
export const VALIDATION_LIMITS = {
  TIME_SECONDS: {
    DURATION_MIN: CORE_LIMITS.TIME_SECONDS.DURATION_MIN,
    DURATION_MAX: CORE_LIMITS.TIME_SECONDS.DURATION_MAX,
  },
  STRING_LENGTH: {
    NAME_MAX: CORE_LIMITS.STRING_LENGTH.NAME_MAX,
    MESSAGE_MAX: CORE_LIMITS.STRING_LENGTH.MESSAGE_MAX,
  },
};
```

### 🔧 Composite Layer - 复合应用层

整合各领域层的常量，提供应用级的配置和功能。

```typescript
// 📄 defaults.constants.ts - 默认值配置
export const ALERT_DEFAULTS = {
  RULE: {
    duration: ALERT_RULE_CONSTANTS.TIME_CONFIG.DURATION_DEFAULT,
    cooldown: ALERT_RULE_CONSTANTS.TIME_CONFIG.COOLDOWN_DEFAULT,
    enabled: true,
    severity: AlertSeverity.WARNING,
  },
  PAGINATION: { page: 1, limit: 20, maxLimit: 100 },
  NOTIFICATION: {
    enabled: true,
    retryCount: NOTIFICATION_CONSTANTS.RETRY.MAX_RETRIES,
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_SECONDS,
  },
};

// 📄 operations.constants.ts - 操作配置
export const ALERT_OPERATIONS = {
  RULES: ALERT_RULE_OPERATIONS,        // 整合领域层操作
  NOTIFICATIONS: NOTIFICATION_OPERATIONS,
  HISTORY: ALERT_HISTORY_OPERATIONS,
  SYSTEM: { /* 系统级操作 */ },
};

// 📄 templates.constants.ts - 模板配置
export const TEMPLATE_CONFIG = {
  VARIABLES: { /* 模板变量定义 */ },
  FORMATS: { /* 格式化规则 */ },
  VALIDATION: { /* 模板验证规则 */ },
};
```

## 🎨 使用方式

### 1. 按层导入 (推荐)

```typescript
// 导入核心层
import { CORE_VALUES, CORE_PATTERNS } from '@alert/constants/core';

// 导入领域层
import { ALERT_RULE_CONSTANTS, NotificationUtil } from '@alert/constants/domain';

// 导入应用层
import { ALERT_DEFAULTS, TemplateUtil } from '@alert/constants/composite';
```

### 2. 统一导入

```typescript
// 从主入口导入
import { 
  ALERT_DEFAULTS,           // 应用层
  ALERT_RULE_CONSTANTS,     // 领域层  
  CORE_VALUES,              // 核心层
  ValidationUtil,           // 工具类
} from '@alert/constants';
```

### 3. 向后兼容导入

```typescript
// 兼容原有导入方式
import { TIMING_CONSTANTS, SHARED_BATCH_LIMITS } from '@alert/constants';
```

### 4. 架构化访问

```typescript
import { ALERT_CONSTANTS_ARCHITECTURE } from '@alert/constants';

// 按架构层次访问
const coreValues = ALERT_CONSTANTS_ARCHITECTURE.CORE.VALUES;
const ruleConstants = ALERT_CONSTANTS_ARCHITECTURE.DOMAIN.ALERT_RULES;  
const appDefaults = ALERT_CONSTANTS_ARCHITECTURE.COMPOSITE.DEFAULTS;
```

## 🛠️ 工具类使用

每层都提供了对应的工具类来简化常见操作：

```typescript
import { 
  PatternValidator,    // 核心层 - 模式验证
  LimitValidator,      // 核心层 - 限制验证  
  TimeConverter,       // 核心层 - 时间转换
  AlertRuleUtil,       // 领域层 - 告警规则工具
  NotificationUtil,    // 领域层 - 通知工具
  ValidationUtil,      // 领域层 - 验证工具
  AlertDefaultsUtil,   // 应用层 - 默认值工具
  TemplateUtil,        // 应用层 - 模板工具
} from '@alert/constants';

// 使用示例
const isValidName = PatternValidator.isValidGeneralName(name);
const ruleId = AlertRuleUtil.generateRuleId();
const defaultRule = AlertDefaultsUtil.createRuleWithDefaults({ name: 'Custom' });
const rendered = TemplateUtil.renderTemplate(template, context);
```

## 📊 架构优势

### ✅ 解决的问题

1. **消除重复定义**: 数值1000在旧架构中出现在7个文件中，新架构只定义一次
2. **清理依赖混乱**: 明确的层次依赖，避免循环引用  
3. **提升可维护性**: 修改一个值只需要在一个地方进行
4. **增强类型安全**: 完整的TypeScript类型定义和推导
5. **简化测试**: 每层职责清晰，易于单元测试

### 📈 性能提升

- **按需导入**: 减少打包大小，提升加载性能
- **预计算值**: 数据库TTL等值预先计算，避免运行时计算
- **工具类缓存**: 常用操作提供高效的工具方法

### 🎯 开发体验

- **智能提示**: 完整的类型定义支持IDE智能提示
- **一致性**: 统一的命名规范和结构模式
- **可发现性**: 清晰的分层结构便于查找所需常量
- **扩展性**: 新的业务领域可以轻松添加到对应层级

## 📝 最佳实践

### 1. 导入原则
- 优先使用按层导入，提高代码可读性
- 避免导入整个模块，使用按需导入
- 使用工具类替代直接的常量操作

### 2. 扩展原则  
- 新的纯数值常量添加到核心层
- 业务相关常量添加到对应的领域层
- 跨领域配置添加到应用层

### 3. 命名原则
- 核心层使用CORE_前缀
- 领域层使用业务领域前缀  
- 应用层使用功能前缀

### 4. 依赖原则
- 上层可以依赖下层，反之不可
- 同层之间避免相互依赖
- 通过应用层进行领域间的集成

## 🔄 迁移支持

新架构提供完整的向后兼容性：

```typescript
// ✅ 这些导入仍然有效
import { TIMING_CONSTANTS } from '@alert/constants';
import { SHARED_BATCH_LIMITS } from '@alert/constants';  
import { ALERT_BUSINESS_RULES } from '@alert/constants';

// 🎯 但建议迁移到新方式
import { CORE_TIMEOUTS } from '@alert/constants/core';
import { CORE_LIMITS } from '@alert/constants/core';
import { ALERT_RULE_CONSTANTS } from '@alert/constants/domain';
```

详细迁移指南请参考 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

## 🚀 未来规划

- **配置中心集成**: 支持运行时配置更新
- **国际化支持**: 多语言常量支持  
- **动态类型生成**: 基于配置自动生成类型定义
- **配置验证**: 启动时配置一致性检查
- **性能监控**: 常量使用情况监控和优化建议