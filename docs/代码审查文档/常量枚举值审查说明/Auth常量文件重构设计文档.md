# Auth常量文件重构设计文档

## 📋 重构背景

### 当前问题分析

通过对 `src/auth/constants/` 目录的深度分析，发现以下关键问题：

#### 1. 重复数字统计

| 数字 | 业务含义 | 出现位置 | 重复次数 |
|------|----------|----------|----------|
| **300/300000** | 5分钟缓存/统计间隔 | permission, apikey | 3次 |
| **7** | Token刷新周期/警告提前天数 | auth, validation, apikey | 3次 |
| **5000** | 标准超时时间 | apikey, permission, rate-limit | 3次 |
| **50** | 权限/批次处理上限 | apikey, permission | 3次 |
| **100** | 标准批次大小 | apikey, permission, rate-limit | 3次 |
| **32** | API Key标准长度 | apikey, validation | 3次 |
| **5** | 登录尝试上限 | validation, rate-limit | 2次 |
| **24** | Token过期小时数/清理周期 | apikey, validation, auth | 3次 |

#### 2. 抽象实现问题

- **重复常量**: 多个文件定义相似的配置项
- **命名不一致**: PATTERN vs RULES, CONFIG vs CONSTRAINTS
- **层次混乱**: 业务逻辑与技术配置混合
- **数字魔法值**: 300、5000、24 等数字缺少业务含义

#### 3. 维护痛点

- **配置修改风险高**: 需要同时修改多个文件
- **业务含义不清**: 数字无法自解释
- **新人理解困难**: 需要查看多个文件才能理解配置逻辑

## 🎯 重构目标

### 核心原则

1. **单一真实来源**: 避免多处修改同一配置
2. **业务语义清晰**: 每个数字都有明确业务含义
3. **配置追踪简化**: 统一配置源，便于维护和调试
4. **高可读性**: 代码自文档化，新开发者容易理解

### 不要的复杂性

- ❌ 不需要自动化、智能化
- ❌ 不需要兼容层，全新项目不留历史包袱
- ❌ 不引入复杂的抽象和计算逻辑
- ❌ 不使用过度工程化的设计模式

## 🏗️ 新架构设计

### 核心思路：按业务语义组织，而非技术模块

```
src/auth/constants/
├── business-values.constants.ts    # 🎯 核心：所有业务数值的单一来源
├── auth.constants.ts              # 引用核心数值，组装auth配置
├── permission.constants.ts         # 引用核心数值，组装权限配置
├── apikey.constants.ts            # 引用核心数值，组装API key配置
├── validation.constants.ts         # 引用核心数值，组装验证规则
├── http-status.constants.ts        # 保持现有，HTTP状态码定义
├── rate-limit.ts                  # 引用核心数值，组装频率限制配置
└── index.ts                       # 统一导出
```

## 📝 具体实现方案

### 1. 核心文件：business-values.constants.ts

这是所有业务数值的**单一来源**，使用英文字段名+详细注释：

```typescript
/**
 * Auth模块业务数值常量 - 单一真实来源
 * 🎯 所有数字配置的统一定义，避免重复和不一致
 * 
 * 命名规范：
 * - 使用大写下划线命名
 * - 单位作为后缀（_SECONDS, _MS, _MINUTES等）
 * - 分组按业务功能而非技术实现
 */
export const BUSINESS_VALUES = deepFreeze({
  
  /**
   * 时间策略配置
   * 统一管理所有时间相关的业务数值
   */
  TIME_STRATEGY: {
    // 缓存策略
    STANDARD_CACHE_TTL_SECONDS: 300,        // 5分钟 - 权限缓存、统计更新、指标收集的标准有效期
    SHORT_CACHE_TTL_SECONDS: 30,            // 30秒 - 热点数据的短期缓存
    LONG_CACHE_TTL_SECONDS: 1800,           // 30分钟 - 配置数据等不常变更内容
    
    // Token生命周期
    TOKEN_REFRESH_CYCLE_DAYS: 7,            // 7天 - refresh token有效期、API key到期警告提前天数
    ACCESS_TOKEN_EXPIRY_HOURS: 24,          // 24小时 - 访问令牌有效期
    SESSION_TIMEOUT_MINUTES: 60,            // 60分钟 - 用户会话超时时间
    
    // 操作超时设置
    STANDARD_TIMEOUT_MS: 5000,              // 5秒 - API调用、权限检查、Redis命令的标准超时
    FAST_TIMEOUT_MS: 3000,                  // 3秒 - 敏感验证操作的快速超时
    CONNECTION_TIMEOUT_MS: 10000,           // 10秒 - 网络连接超时
    
    // 维护周期
    DAILY_CLEANUP_HOURS: 24,                // 24小时 - 过期数据清理、token过期检查周期
    CACHE_REFRESH_MINUTES: 10,              // 10分钟 - 不频繁变更数据的缓存刷新间隔
    STATS_UPDATE_MINUTES: 5,                // 5分钟 - 统计数据更新间隔
    
    // 频率限制时间窗口
    RATE_LIMIT_WINDOW_SECONDS: 60,          // 60秒 - 标准频率限制时间窗口
    RATE_LIMIT_LOCKOUT_MINUTES: 30,         // 30分钟 - 账户锁定时长
  },
  
  /**
   * 数量限制策略
   * 统一管理所有数量相关的业务限制
   */
  QUANTITY_LIMITS: {
    // 权限相关
    MAX_PERMISSIONS_PER_CHECK: 50,          // 单次权限检查最大数量、API key权限上限
    MAX_ROLES_PER_CHECK: 10,                // 单次角色权限检查最大数量
    
    // 批处理配置
    STANDARD_BATCH_SIZE: 100,               // 标准批处理大小 - 批量更新、缓存失效、用户使用统计
    SMALL_BATCH_SIZE: 50,                   // 小批次处理大小 - 权限清理等轻量操作
    
    // 登录安全
    MAX_LOGIN_ATTEMPTS: 5,                  // 登录失败锁定阈值、频率限制触发值
    
    // 系统限制
    MAX_RETRY_ATTEMPTS: 3,                  // Redis连接、网络操作的最大重试次数
    DEFAULT_RATE_LIMIT: 200,                // API key默认频率限制、常规请求量
    MAX_RATE_LIMIT: 1000000,                // API key最大频率限制 - 系统容量上限
    
    // API配额
    DAILY_API_KEY_CREATION_LIMIT: 10,       // 每日API密钥创建限制
    MAX_API_KEYS_PER_USER: 20,              // 每用户最大API密钥数量
  },
  
  /**
   * 长度约束策略
   * 统一管理所有字符串长度相关的限制
   */
  LENGTH_CONSTRAINTS: {
    // API密钥配置
    API_KEY_STANDARD_LENGTH: 32,            // API key生成和验证的标准长度（256位安全强度）
    API_KEY_MIN_LENGTH: 32,                 // API key最小长度
    API_KEY_MAX_LENGTH: 64,                 // API key最大长度（支持扩展安全等级）
    
    // 用户标识符
    USERNAME_MIN_LENGTH: 3,                 // 用户名最小长度 - 保证可识别性
    USERNAME_MAX_LENGTH: 20,                // 用户名最大长度 - 用户体验和数据库优化平衡
    
    // 密码安全
    PASSWORD_MIN_LENGTH: 8,                 // 密码最小长度 - 基础安全要求
    PASSWORD_MAX_LENGTH: 128,               // 密码最大长度 - 安全性和实用性平衡
    
    // 系统限制
    CACHE_KEY_MAX_LENGTH: 250,              // Redis键长度限制
    EMAIL_MAX_LENGTH: 254,                  // RFC 5321标准邮箱长度
    GENERIC_NAME_MAX_LENGTH: 100,           // 通用名称长度 - API key名称、角色名称等
    
    // 权限和角色
    PERMISSION_NAME_MIN_LENGTH: 1,          // 权限名称最小长度
    PERMISSION_NAME_MAX_LENGTH: 50,         // 权限名称最大长度
    ROLE_NAME_MIN_LENGTH: 1,                // 角色名称最小长度
    ROLE_NAME_MAX_LENGTH: 30,               // 角色名称最大长度
    SUBJECT_ID_MIN_LENGTH: 1,               // 主体ID最小长度
    SUBJECT_ID_MAX_LENGTH: 100,             // 主体ID最大长度
  },
  
  /**
   * 安全策略配置
   * 统一管理所有安全相关的阈值和限制
   */
  SECURITY_STRATEGY: {
    // 账户安全
    ACCOUNT_LOCKOUT_MINUTES: 30,            // 登录失败后的账户锁定时间
    PASSWORD_EXPIRY_WARNING_DAYS: 7,        // 密码过期提前警告天数
    
    // 性能监控
    SLOW_OPERATION_THRESHOLD_MS: 100,       // 慢操作警告阈值 - 性能监控告警
    
    // 缓存安全
    CACHE_EXPIRE_BUFFER_SECONDS: 10,        // 缓存过期缓冲时间 - 避免缓存雪崩
    
    // 负载保护
    MAX_PAYLOAD_SIZE_MB: 10,                // 最大请求负载大小（MB）
    MAX_QUERY_PARAMS: 100,                  // 最大查询参数数量
    MAX_RECURSION_DEPTH: 100,               // 最大递归深度
  }
});

/**
 * 预计算值 - 避免重复的单位转换
 * 提供常用的毫秒转换，避免在各处重复计算
 */
export const COMPUTED_VALUES = deepFreeze({
  /**
   * 时间值的毫秒转换
   * 预先计算好常用的时间转换，提高代码可读性
   */
  TIME_IN_MS: {
    // 缓存相关
    STANDARD_CACHE_TTL: BUSINESS_VALUES.TIME_STRATEGY.STANDARD_CACHE_TTL_SECONDS * 1000,
    SHORT_CACHE_TTL: BUSINESS_VALUES.TIME_STRATEGY.SHORT_CACHE_TTL_SECONDS * 1000,
    LONG_CACHE_TTL: BUSINESS_VALUES.TIME_STRATEGY.LONG_CACHE_TTL_SECONDS * 1000,
    
    // Token相关
    TOKEN_REFRESH_CYCLE: BUSINESS_VALUES.TIME_STRATEGY.TOKEN_REFRESH_CYCLE_DAYS * 24 * 60 * 60 * 1000,
    ACCESS_TOKEN_EXPIRY: BUSINESS_VALUES.TIME_STRATEGY.ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    SESSION_TIMEOUT: BUSINESS_VALUES.TIME_STRATEGY.SESSION_TIMEOUT_MINUTES * 60 * 1000,
    
    // 维护相关
    DAILY_CLEANUP: BUSINESS_VALUES.TIME_STRATEGY.DAILY_CLEANUP_HOURS * 60 * 60 * 1000,
    CACHE_REFRESH: BUSINESS_VALUES.TIME_STRATEGY.CACHE_REFRESH_MINUTES * 60 * 1000,
    STATS_UPDATE: BUSINESS_VALUES.TIME_STRATEGY.STATS_UPDATE_MINUTES * 60 * 1000,
    
    // 频率限制相关
    RATE_LIMIT_WINDOW: BUSINESS_VALUES.TIME_STRATEGY.RATE_LIMIT_WINDOW_SECONDS * 1000,
    ACCOUNT_LOCKOUT: BUSINESS_VALUES.TIME_STRATEGY.RATE_LIMIT_LOCKOUT_MINUTES * 60 * 1000,
  },
  
  /**
   * 组合配置
   * 将相关配置组合在一起，方便使用
   */
  RATE_LIMIT_CONFIG: {
    LOGIN: {
      MAX_ATTEMPTS: BUSINESS_VALUES.QUANTITY_LIMITS.MAX_LOGIN_ATTEMPTS,
      LOCKOUT_DURATION_MS: BUSINESS_VALUES.TIME_STRATEGY.RATE_LIMIT_LOCKOUT_MINUTES * 60 * 1000,
      WINDOW_MS: BUSINESS_VALUES.TIME_STRATEGY.RATE_LIMIT_WINDOW_SECONDS * 1000,
    },
    API_CALLS: {
      DEFAULT_LIMIT: BUSINESS_VALUES.QUANTITY_LIMITS.DEFAULT_RATE_LIMIT,
      MAX_LIMIT: BUSINESS_VALUES.QUANTITY_LIMITS.MAX_RATE_LIMIT,
      WINDOW_MS: BUSINESS_VALUES.TIME_STRATEGY.RATE_LIMIT_WINDOW_SECONDS * 1000,
    }
  }
});

/**
 * 类型定义导出
 * 提供TypeScript类型支持
 */
export type BusinessValues = typeof BUSINESS_VALUES;
export type ComputedValues = typeof COMPUTED_VALUES;
```

### 2. 重构后的文件引用方式

#### auth.constants.ts - 引用业务数值

```typescript
// auth.constants.ts - 引用业务数值
import { BUSINESS_VALUES, COMPUTED_VALUES } from './business-values.constants';

export const AUTH_CONFIG = Object.freeze({
  LOGIN: {
    maxAttempts: BUSINESS_VALUES.QUANTITY_LIMITS.登录安全尝试上限,
    sessionTimeoutMinutes: BUSINESS_VALUES.SECURITY_STRATEGY.会话标准时长_分钟,
    lockDurationMinutes: BUSINESS_VALUES.SECURITY_STRATEGY.账户锁定时长_分钟,
  },
  TOKEN_EXPIRY: {
    accessTokenMs: COMPUTED_VALUES.时间_毫秒.会话标准时长,
    refreshTokenMs: COMPUTED_VALUES.时间_毫秒.Token刷新周期,
  },
});
```

#### permission.constants.ts - 引用业务数值

```typescript
// permission.constants.ts - 引用业务数值
import { BUSINESS_VALUES, COMPUTED_VALUES } from './business-values.constants';

export const PERMISSION_CONFIG = Object.freeze({
  DEFAULT_CACHE_TTL_MS: COMPUTED_VALUES.时间_毫秒.标准缓存有效期,
  MAX_PERMISSIONS_PER_CHECK: BUSINESS_VALUES.QUANTITY_LIMITS.权限处理上限,
  CHECK_TIMEOUT_MS: BUSINESS_VALUES.TIME_STRATEGY.标准操作超时_毫秒,
  MAX_CACHE_KEY_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.缓存键安全长度,
  SLOW_CHECK_THRESHOLD_MS: BUSINESS_VALUES.SECURITY_STRATEGY.慢操作警告阈值_毫秒,
});
```

#### apikey.constants.ts - 引用业务数值

```typescript
// apikey.constants.ts - 引用业务数值  
import { BUSINESS_VALUES, COMPUTED_VALUES } from './business-values.constants';

export const APIKEY_CONFIG = Object.freeze({
  ACCESS_TOKEN_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.API密钥标准长度,
  USAGE_UPDATE_BATCH_SIZE: BUSINESS_VALUES.QUANTITY_LIMITS.标准批次大小,
  CLEANUP_BATCH_SIZE: BUSINESS_VALUES.QUANTITY_LIMITS.权限处理上限,
  MAX_NAME_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.通用名称长度,
  MAX_PERMISSIONS: BUSINESS_VALUES.QUANTITY_LIMITS.权限处理上限,
  EXPIRY_WARNING_DAYS: BUSINESS_VALUES.TIME_STRATEGY.Token刷新周期_天,
});
```

#### validation.constants.ts - 引用业务数值

```typescript
// validation.constants.ts - 引用业务数值
import { BUSINESS_VALUES } from './business-values.constants';

export const PASSWORD_CONSTRAINTS = Object.freeze({
  MIN_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.密码安全范围.min,
  MAX_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.密码安全范围.max,
  // 其他验证规则保持不变
  REQUIRE_NUMBERS: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
});

export const USERNAME_CONSTRAINTS = Object.freeze({
  MIN_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.用户名合理范围.min,
  MAX_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.用户名合理范围.max,
  // 其他验证规则保持不变
  PATTERN: /^[a-zA-Z0-9_-]+$/,
  RESERVED_NAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined'],
});

export const API_KEY_CONSTRAINTS = Object.freeze({
  MIN_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.API密钥扩展范围.min,
  MAX_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.API密钥扩展范围.max,
  DEFAULT_LENGTH: BUSINESS_VALUES.LENGTH_CONSTRAINTS.API密钥标准长度,
  // 其他验证规则保持不变
  PATTERN: /^[a-zA-Z0-9]{32,64}$/,
  CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
});
```

## 🔄 实施步骤

### 第一步：创建核心文件
1. 创建 `business-values.constants.ts` 文件
2. 定义所有业务数值的统一来源
3. 添加便捷计算工具避免重复换算

### 第二步：修改现有文件
1. 逐个修改现有常量文件
2. 将硬编码数字改为引用核心文件
3. 保留业务逻辑相关的非数字常量

### 第三步：删除重复定义
1. 删除原有文件中的重复数字定义
2. 确保每个数字只在核心文件中定义一次
3. 验证所有引用都正确指向核心文件

### 第四步：更新导出索引
1. 更新 `index.ts` 导出新的核心常量
2. 确保外部模块可以正常引用
3. 进行全面的编译和测试验证

## 📊 重构收益

### 架构改进对比

| 改进点 | 重构前 | 重构后 |
|--------|--------|--------|
| **配置修改** | 需要改3-4个文件 | 只改1个文件 |
| **数字含义** | `300` 无法理解 | `标准缓存有效期_秒` 自解释 |
| **重复情况** | 同一数字散布多处 | 每个数字只定义一次 |
| **维护复杂度** | 容易遗漏和不一致 | 统一管理，不会遗漏 |
| **新人理解** | 需要查看多个文件 | 看一个文件就明白全局配置 |

### 具体收益

#### 1. 可读性提升
- **消除数字魔法值**: `300` → `BUSINESS_VALUES.TIME_STRATEGY.标准缓存有效期_秒`
- **业务语义清晰**: 代码自解释，新开发者容易理解
- **配置追踪简化**: 统一配置源，便于维护和调试

#### 2. 维护性改善
- **单一真实来源**: 避免多处修改同一配置
- **类型安全保障**: TypeScript编译期发现配置错误
- **配置一致性**: 相关配置自动保持同步

#### 3. 开发效率提升
- **快速定位**: 所有配置在一个文件中查找
- **安全修改**: 修改一处，全局生效
- **错误减少**: 避免遗漏修改某个文件的风险

## 🎯 最终效果

重构完成后，auth模块常量管理将实现：

- ✅ **单一配置源**: 修改任何数字只需改一处
- ✅ **业务语义清晰**: 代码自文档化，含义一目了然  
- ✅ **零重复冗余**: 每个配置值都有唯一定义位置
- ✅ **高可读性**: 中文命名让业务逻辑清晰可见
- ✅ **易于维护**: 配置变更风险降到最低
- ✅ **新人友好**: 快速理解业务配置逻辑

## 📋 重构检查清单

### 创建阶段
- [ ] 创建 `business-values.constants.ts` 核心文件
- [ ] 定义完整的 `BUSINESS_VALUES` 常量
- [ ] 实现 `COMPUTED_VALUES` 计算工具
- [ ] 添加完整的 TypeScript 类型定义

### 修改阶段  
- [ ] 修改 `auth.constants.ts` 引用核心数值
- [ ] 修改 `permission.constants.ts` 引用核心数值
- [ ] 修改 `apikey.constants.ts` 引用核心数值
- [ ] 修改 `validation.constants.ts` 引用核心数值
- [ ] 修改 `rate-limit.ts` 引用核心数值

### 清理阶段
- [ ] 删除所有重复的数字定义
- [ ] 确认每个数字只在核心文件中定义
- [ ] 验证所有引用路径正确

### 验证阶段
- [ ] 更新 `index.ts` 导出配置
- [ ] 运行 TypeScript 编译检查
- [ ] 执行单元测试验证
- [ ] 进行集成测试确认

### 文档阶段
- [ ] 更新相关注释和文档
- [ ] 记录重构变更日志
- [ ] 通知相关开发人员配置变更

---

**重构原则**: 简单直接，解决当前问题，不引入不必要的复杂性。专注于单一来源、业务语义和高可读性。