# Alert常量文件重构设计文档

## 📋 项目背景

### 当前问题分析
基于对 `/src/alert/constants` 文件夹的深度分析，发现以下核心问题：

1. **数字魔法值泛滥** ⚠️
   - `TIMEOUT_DEFAULT: 30` - 30秒，但为什么是30？
   - `MAX_RETRIES: 5` - 5次，基于什么标准？
   - `BATCH_SIZE: 1000` - 1000，这个数字的业务含义？

2. **常量重复定义** 🔄
   - 同一个数值在多个文件中重复出现
   - 修改时需要找到所有位置，容易遗漏

3. **缺乏业务语义** 📝
   - `MAX_VALUE: 9007199254740991` - 这是什么业务概念？
   - 数字没有明确的业务含义

4. **文件结构过于复杂** 🗂️
   - 16个常量文件，4层嵌套结构
   - 职责边界模糊，存在循环依赖风险

## 🔍 重复数值深度分析

### 高频重复数值统计
```typescript
// 这些数字在多个文件中重复定义：

5:   MAX_ACTIONS_PER_RULE, MAX_RETRY_ATTEMPTS, NOTIFICATION_MAX_RETRIES
10:  MAX_CONDITIONS_PER_RULE, TINY_BATCH_SIZE, MAX_TAGS_COUNT  
30:  DEFAULT_TIMEOUT, TIMEOUT_DEFAULT (在3个文件中重复)
60:  DURATION_DEFAULT, EVALUATION_CYCLE (转换为毫秒后重复)
100: NAME_MAX, MAX_RULES_PER_USER, MAX_QUERY_LIMIT (在4个文件中重复)
300: COOLDOWN_DEFAULT, STATS_TTL, CLEANUP_CYCLE (在3个文件中重复) 
1000: DEFAULT_BATCH_SIZE, MESSAGE_MAX, MAX_ALERTS_PER_RULE (在5个文件中重复)
3600: JWT_EXPIRES, ALERT_TTL, CACHE_TTL (在4个文件中重复)
```

### 隐蔽的间接重复
```typescript
// defaults.constants.ts 中的间接重复：
duration: ALERT_RULE_CONSTANTS.TIME_CONFIG.DURATION_DEFAULT,  // 60
cooldown: ALERT_RULE_CONSTANTS.TIME_CONFIG.COOLDOWN_DEFAULT,  // 300  
timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_SECONDS, // 30

// 这些值在基础层已经定义了，造成多层引用混乱
```

## 🎯 新架构设计：三层架构

### 核心设计思路
```
基础数值层 -> 语义映射层 -> 业务配置层
   ↓            ↓            ↓
  纯数字     业务含义      组合配置
```

### 新文件结构
```
src/alert/constants/
├── base-values.constants.ts        # 基础数值层：所有数字的唯一定义
├── semantic-mapping.constants.ts   # 语义映射层：数值的业务含义
├── business-config.constants.ts    # 业务配置层：组合配置
├── enums.ts                        # 枚举定义（保持现有）
├── messages.ts                     # 消息模板（保持现有）
└── index.ts                        # 统一导出和快捷访问
```

## 📁 详细文件设计

### 第一层：基础数值（单一真实来源）

**文件：`base-values.constants.ts`**

```typescript
/**
 * 所有数值的唯一定义处
 * 🎯 每个数字在整个系统中只在这里定义一次
 */
export const BASE_VALUES = Object.freeze({
  
  // 时间相关基础值（秒）
  SECONDS: {
    INSTANT: 1,           // 1秒 - 即时响应基准
    QUICK: 5,            // 5秒 - 快速响应基准  
    SHORT: 30,           // 30秒 - 短时间基准
    MINUTE: 60,          // 1分钟 - 分钟基准
    MEDIUM: 300,         // 5分钟 - 中等时间基准
    HALF_HOUR: 1800,     // 30分钟 - 半小时基准
    HOUR: 3600,          // 1小时 - 小时基准
    HALF_DAY: 43200,     // 12小时 - 半天基准
    DAY: 86400,          // 24小时 - 天基准
  },

  // 数量相关基础值
  QUANTITIES: {
    MINIMAL: 1,          // 最小数量
    FEW: 5,              // 少量
    SMALL: 10,           // 小数量
    NORMAL: 20,          // 正常数量
    MEDIUM: 50,          // 中等数量
    LARGE: 100,          // 大数量
    HUGE: 1000,          // 巨大数量
    MAXIMUM: 10000,      // 最大数量
  },

  // 特殊业务值（基于当前系统已有的特定数值）
  SPECIAL: {
    RETENTION_DAYS_90: 90,      // 90天保留期（从现有的7776000秒推算）
    RETENTION_DAYS_30: 30,      // 30天保留期（从现有的2592000秒推算）
    RETENTION_DAYS_365: 365,    // 1年保留期
    ID_RANDOM_LENGTH: 6,        // ID随机部分长度
    TAG_LENGTH_LIMIT: 50,       // 标签长度限制
    NAME_LENGTH_LIMIT: 100,     // 名称长度限制
    MESSAGE_LENGTH_LIMIT: 1000, // 消息长度限制
    TEMPLATE_LENGTH_LIMIT: 10000, // 模板长度限制
  },
});
```

### 第二层：语义映射（业务含义）

**文件：`semantic-mapping.constants.ts`**

```typescript
import { BASE_VALUES } from './base-values.constants';

/**
 * 将基础数值映射到具体业务语义
 * 🎯 每个业务场景使用什么数值，在这里明确定义
 */
export const SEMANTIC_VALUES = Object.freeze({

  // 响应时间语义映射
  RESPONSE_TIME: {
    CRITICAL_ALERT_RESPONSE: BASE_VALUES.SECONDS.QUICK,      // 5秒 - 严重告警响应
    NORMAL_ALERT_RESPONSE: BASE_VALUES.SECONDS.SHORT,       // 30秒 - 普通告警响应
    BATCH_PROCESSING_CYCLE: BASE_VALUES.SECONDS.MINUTE,     // 60秒 - 批处理周期
    COOLDOWN_PERIOD: BASE_VALUES.SECONDS.MEDIUM,            // 300秒 - 冷却周期
  },

  // 容量限制语义映射  
  CAPACITY_LIMITS: {
    MAX_ACTIONS_PER_RULE: BASE_VALUES.QUANTITIES.FEW,       // 5个 - 单规则最大动作数
    MAX_CONDITIONS_PER_RULE: BASE_VALUES.QUANTITIES.SMALL,  // 10个 - 单规则最大条件数
    DEFAULT_PAGE_SIZE: BASE_VALUES.QUANTITIES.NORMAL,       // 20个 - 默认分页大小
    MAX_RULES_PER_USER: BASE_VALUES.QUANTITIES.LARGE,       // 100个 - 单用户最大规则数
    BATCH_PROCESSING_SIZE: BASE_VALUES.QUANTITIES.HUGE,     // 1000个 - 批处理大小
  },

  // 缓存时间语义映射
  CACHE_DURATION: {
    ACTIVE_DATA_TTL: BASE_VALUES.SECONDS.MEDIUM,            // 300秒 - 活跃数据缓存
    RULE_CONFIG_TTL: BASE_VALUES.SECONDS.HALF_HOUR,         // 1800秒 - 规则配置缓存  
    STATISTICAL_DATA_TTL: BASE_VALUES.SECONDS.HOUR,         // 3600秒 - 统计数据缓存
    HISTORICAL_DATA_TTL: BASE_VALUES.SECONDS.HALF_DAY,      // 43200秒 - 历史数据缓存
  },

  // 安全相关语义映射
  SECURITY_TIMEOUTS: {
    JWT_TOKEN_LIFETIME: BASE_VALUES.SECONDS.HOUR,           // 3600秒 - JWT生命周期
    REFRESH_TOKEN_LIFETIME: BASE_VALUES.SECONDS.DAY,        // 86400秒 - 刷新令牌生命周期
    ACCOUNT_LOCKOUT_DURATION: BASE_VALUES.SECONDS.HALF_HOUR, // 1800秒 - 账户锁定时长
    SESSION_TIMEOUT: BASE_VALUES.SECONDS.SHORT,             // 30秒 - 会话超时
  },

  // 重试机制语义映射
  RETRY_POLICIES: {
    MAX_NOTIFICATION_RETRIES: BASE_VALUES.QUANTITIES.FEW,   // 5次 - 通知最大重试
    MAX_DATABASE_RETRIES: BASE_VALUES.QUANTITIES.MINIMAL,   // 1次 - 数据库最大重试  
    MAX_API_RETRIES: BASE_VALUES.QUANTITIES.MINIMAL,        // 1次 - API最大重试
  },

  // 字符串长度语义映射
  STRING_LENGTHS: {
    TAG_MAX_LENGTH: BASE_VALUES.SPECIAL.TAG_LENGTH_LIMIT,         // 50 - 标签最大长度
    NAME_MAX_LENGTH: BASE_VALUES.SPECIAL.NAME_LENGTH_LIMIT,       // 100 - 名称最大长度
    MESSAGE_MAX_LENGTH: BASE_VALUES.SPECIAL.MESSAGE_LENGTH_LIMIT, // 1000 - 消息最大长度
  },

  // 数据保留语义映射
  DATA_RETENTION: {
    ALERT_HISTORY_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_90,  // 90天 - 告警历史保留
    LOG_RETENTION_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30,  // 30天 - 日志保留
    ARCHIVE_RETENTION_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_365, // 365天 - 归档保留
  },
});
```

### 第三层：业务配置（组合使用）

**文件：`business-config.constants.ts`**

```typescript
import { SEMANTIC_VALUES } from './semantic-mapping.constants';
import { AlertSeverity, AlertStatus, NotificationChannel } from '../enums';

/**
 * 业务配置 - 组合语义数值形成完整业务配置
 * 🎯 各个业务模块的完整配置
 */
export const ALERT_BUSINESS_CONFIG = Object.freeze({

  // 告警规则配置
  RULE_CONFIG: {
    defaults: {
      enabled: true,
      severity: AlertSeverity.MEDIUM,
      duration: SEMANTIC_VALUES.RESPONSE_TIME.BATCH_PROCESSING_CYCLE,      // 60秒
      cooldown: SEMANTIC_VALUES.RESPONSE_TIME.COOLDOWN_PERIOD,             // 300秒
    },
    limits: {
      maxConditions: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_CONDITIONS_PER_RULE,  // 10个
      maxActions: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_ACTIONS_PER_RULE,        // 5个
      maxPerUser: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_RULES_PER_USER,          // 100个
    },
    cache: {
      configTTL: SEMANTIC_VALUES.CACHE_DURATION.RULE_CONFIG_TTL,           // 1800秒
      statsTTL: SEMANTIC_VALUES.CACHE_DURATION.STATISTICAL_DATA_TTL,       // 3600秒
    },
  },

  // 通知系统配置
  NOTIFICATION_CONFIG: {
    timeouts: {
      normalResponse: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE, // 30秒
      criticalResponse: SEMANTIC_VALUES.RESPONSE_TIME.CRITICAL_ALERT_RESPONSE, // 5秒
    },
    retries: {
      maxAttempts: SEMANTIC_VALUES.RETRY_POLICIES.MAX_NOTIFICATION_RETRIES, // 5次
    },
    channels: {
      default: NotificationChannel.EMAIL,
      priority: [NotificationChannel.SMS, NotificationChannel.EMAIL],
    },
  },

  // 性能配置
  PERFORMANCE_CONFIG: {
    batching: {
      defaultSize: SEMANTIC_VALUES.CAPACITY_LIMITS.BATCH_PROCESSING_SIZE,  // 1000个
      pageSize: SEMANTIC_VALUES.CAPACITY_LIMITS.DEFAULT_PAGE_SIZE,         // 20个
    },
    evaluation: {
      cycle: SEMANTIC_VALUES.RESPONSE_TIME.BATCH_PROCESSING_CYCLE,         // 60秒
    },
  },

  // 安全配置
  SECURITY_CONFIG: {
    authentication: {
      jwtLifetime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.JWT_TOKEN_LIFETIME,       // 3600秒
      refreshLifetime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.REFRESH_TOKEN_LIFETIME, // 86400秒
      sessionTimeout: SEMANTIC_VALUES.SECURITY_TIMEOUTS.SESSION_TIMEOUT,       // 30秒
    },
    rateLimit: {
      lockoutDuration: SEMANTIC_VALUES.SECURITY_TIMEOUTS.ACCOUNT_LOCKOUT_DURATION, // 1800秒
    },
  },

  // 数据管理配置
  DATA_MANAGEMENT_CONFIG: {
    retention: {
      alertHistory: SEMANTIC_VALUES.DATA_RETENTION.ALERT_HISTORY_DAYS,     // 90天
      systemLogs: SEMANTIC_VALUES.DATA_RETENTION.LOG_RETENTION_DAYS,       // 30天
      archives: SEMANTIC_VALUES.DATA_RETENTION.ARCHIVE_RETENTION_DAYS,     // 365天
    },
    cache: {
      activeTTL: SEMANTIC_VALUES.CACHE_DURATION.ACTIVE_DATA_TTL,           // 300秒
      historicalTTL: SEMANTIC_VALUES.CACHE_DURATION.HISTORICAL_DATA_TTL,   // 43200秒
    },
  },

  // 验证配置
  VALIDATION_CONFIG: {
    stringLengths: {
      tagMax: SEMANTIC_VALUES.STRING_LENGTHS.TAG_MAX_LENGTH,               // 50
      nameMax: SEMANTIC_VALUES.STRING_LENGTHS.NAME_MAX_LENGTH,             // 100
      messageMax: SEMANTIC_VALUES.STRING_LENGTHS.MESSAGE_MAX_LENGTH,       // 1000
    },
  },
});
```

### 统一导出和快捷访问

**文件：`index.ts`**

```typescript
/**
 * Alert常量统一导出
 * 🎯 提供清晰的访问路径和快捷方式
 */

// 基础导出
export { BASE_VALUES } from './base-values.constants';
export { SEMANTIC_VALUES } from './semantic-mapping.constants'; 
export { ALERT_BUSINESS_CONFIG } from './business-config.constants';

// 枚举
export { AlertSeverity, AlertStatus, AlertType, NotificationChannel } from '../enums';

// 消息（保持现有）
export { ALERT_MESSAGES, AlertMessageUtil } from '../messages';

// 快捷访问 - 最常用的值
export const ALERT_QUICK_ACCESS = Object.freeze({
  // 时间快捷访问
  TIME: {
    QUICK_RESPONSE: SEMANTIC_VALUES.RESPONSE_TIME.CRITICAL_ALERT_RESPONSE,     // 5秒
    NORMAL_RESPONSE: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE,      // 30秒  
    EVALUATION_CYCLE: SEMANTIC_VALUES.RESPONSE_TIME.BATCH_PROCESSING_CYCLE,    // 60秒
    COOLDOWN_PERIOD: SEMANTIC_VALUES.RESPONSE_TIME.COOLDOWN_PERIOD,            // 300秒
  },
  
  // 容量快捷访问
  LIMITS: {
    ACTIONS_PER_RULE: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_ACTIONS_PER_RULE,    // 5个
    CONDITIONS_PER_RULE: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_CONDITIONS_PER_RULE, // 10个
    RULES_PER_USER: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_RULES_PER_USER,        // 100个
    BATCH_SIZE: SEMANTIC_VALUES.CAPACITY_LIMITS.BATCH_PROCESSING_SIZE,         // 1000个
  },

  // 缓存快捷访问
  CACHE: {
    ACTIVE_TTL: SEMANTIC_VALUES.CACHE_DURATION.ACTIVE_DATA_TTL,                // 300秒
    CONFIG_TTL: SEMANTIC_VALUES.CACHE_DURATION.RULE_CONFIG_TTL,                // 1800秒
    STATS_TTL: SEMANTIC_VALUES.CACHE_DURATION.STATISTICAL_DATA_TTL,            // 3600秒
  },
});
```

## ✅ 架构优势

### 1. 🎯 单一真实来源
```typescript
// ✅ 现在：每个数值只在一个地方定义
BASE_VALUES.SECONDS.SHORT: 30,  // 唯一定义

// ✅ 所有地方都是引用，不是重定义
NORMAL_ALERT_RESPONSE: BASE_VALUES.SECONDS.SHORT,     // 引用
SESSION_TIMEOUT: BASE_VALUES.SECONDS.SHORT,           // 引用  
DEFAULT_TIMEOUT: BASE_VALUES.SECONDS.SHORT,           // 引用
```

### 2. 🔍 配置追踪简化
```typescript
// 需要修改30秒超时？只需要改一个地方：
BASE_VALUES.SECONDS.SHORT: 30 -> 25

// 自动影响到：
// - 告警响应时间
// - 会话超时  
// - 默认超时
// - 所有其他使用SHORT的地方
```

### 3. 📖 业务语义清晰
```typescript
// ❌ 之前：看不懂数字含义  
timeout: 30

// ✅ 现在：业务含义清晰
timeout: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE  // 30秒普通告警响应时间
```

## 🔄 迁移实施计划

### 第一步：创建新架构（不影响现有代码）
```bash
# 创建3个新文件
mkdir -p src/alert/constants
touch src/alert/constants/base-values.constants.ts
touch src/alert/constants/semantic-mapping.constants.ts  
touch src/alert/constants/business-config.constants.ts
```

### 第二步：验证数值映射正确性
```typescript
// 创建验证脚本，确保新旧值一致
const validation = {
  // 验证：新的语义值 === 旧的直接值
  'NORMAL_RESPONSE': SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE === 30,
  'COOLDOWN': SEMANTIC_VALUES.RESPONSE_TIME.COOLDOWN_PERIOD === 300,
  'MAX_RULES': SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_RULES_PER_USER === 100,
  // ...更多验证
};
```

### 第三步：逐步替换使用
```typescript
// 在新代码中使用新架构
import { ALERT_QUICK_ACCESS } from '@/alert/constants';

class AlertService {
  private readonly responseTime = ALERT_QUICK_ACCESS.TIME.NORMAL_RESPONSE; // 30秒，语义清晰
  private readonly maxRules = ALERT_QUICK_ACCESS.LIMITS.RULES_PER_USER;    // 100个，一目了然
}
```

### 第四步：清理旧文件
```bash
# 确认无引用后删除
rm -rf src/alert/constants/core/
rm -rf src/alert/constants/composite/  
rm -rf src/alert/constants/domain/
```

## 🎉 实际使用示例

### 配置服务使用
```typescript
class AlertConfigService {
  getRuleDefaults() {
    return {
      // 语义清晰，一看就懂
      duration: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE,    // 60秒评估周期
      cooldown: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,     // 300秒冷却期
      maxConditions: ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE, // 10个条件上限
    };
  }
}
```

### 缓存配置使用  
```typescript
class CacheService {
  private readonly ttlConfig = {
    // 从业务语义直接理解缓存策略
    active: ALERT_QUICK_ACCESS.CACHE.ACTIVE_TTL,     // 300秒 - 活跃数据
    config: ALERT_QUICK_ACCESS.CACHE.CONFIG_TTL,     // 1800秒 - 配置数据  
    stats: ALERT_QUICK_ACCESS.CACHE.STATS_TTL,       // 3600秒 - 统计数据
  };
}
```

## 📊 重构效果对比

| 方面 | 重构前 | 重构后 |
|------|--------|--------|
| **文件数量** | 16个文件，4层嵌套 | 3个文件，清晰分层 |
| **数值重复** | 同一数值在5+处重复定义 | 每个数值唯一定义 |
| **语义理解** | `timeout: 30` 不知道含义 | `NORMAL_ALERT_RESPONSE` 含义清晰 |
| **修改影响** | 需要找到所有重复处修改 | 修改一处自动生效 |
| **维护复杂度** | 高，容易遗漏和不一致 | 低，统一管理 |

## 🎯 核心收益

### 📈 代码可读性提升
```typescript
// 改进前
if (retryCount < MAX_RETRIES) { ... }

// 改进后  
if (retryCount < ALERT_QUICK_ACCESS.LIMITS.MAX_NOTIFICATION_RETRIES) { ... }
```

### 🔧 维护性提升
- **单一真实来源**：消除重复定义
- **业务语义清晰**：每个数字都有明确业务含义  
- **修改影响可控**：语义化分组便于批量调整

### 🚀 开发效率提升
- **降低认知负担**：不需要猜测数字含义
- **减少错误**：类型安全和语义约束
- **提高可测试性**：清晰的常量边界

## 📝 总结

这个重构方案彻底解决了Alert常量系统的三个核心问题：

1. **单一真实来源** - 每个数值只在一个地方定义
2. **配置追踪简化** - 统一配置源，便于维护和调试  
3. **业务语义清晰** - 每个数字都有明确业务含义

通过三层架构设计（基础数值层 → 语义映射层 → 业务配置层），实现了从抽象数字到具体业务配置的清晰映射，大幅提升了代码的可读性、可维护性和开发效率。

重构完成后，开发者可以通过语义化的常量名称直接理解业务含义，无需再猜测数字背后的业务逻辑，真正实现了"代码即文档"的效果。