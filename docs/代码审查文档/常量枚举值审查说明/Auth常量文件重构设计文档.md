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

这是所有业务数值的**单一来源**，按业务语义分组：

```typescript
// business-values.constants.ts - 🎯 核心业务数值，单一来源
export const BUSINESS_VALUES = deepFreeze({
  
  // ⏰ 时间策略 - 所有时间相关配置的单一来源
  TIME_STRATEGY: {
    标准缓存有效期_秒: 300,         // 5分钟：权限缓存、统计更新、指标收集
    Token刷新周期_天: 7,           // 7天：refresh token、API key到期警告
    标准操作超时_毫秒: 5000,       // 5秒：API调用、权限检查、Redis命令
    日常清理周期_小时: 24,         // 24小时：过期数据清理、token过期检查
    快速超时_毫秒: 3000,          // 3秒：敏感验证操作，快速失败
    长期缓存刷新_分钟: 10,         // 10分钟：不频繁变更的数据缓存
    短期频率窗口_秒: 60,          // 1分钟：频率限制时间窗口
  },
  
  // 📊 数量限制策略 - 所有数量相关配置的单一来源  
  QUANTITY_LIMITS: {
    权限处理上限: 50,              // 单次权限检查数量、API key权限上限、清理批次
    标准批次大小: 100,             // 批量更新、缓存失效、用户使用统计
    登录安全尝试上限: 5,           // 登录失败锁定阈值、频率限制
    标准重试次数: 3,               // Redis连接、网络操作重试
    日常操作限制: 200,             // API key默认频率限制、常规请求量
    大数据处理上限: 1000000,       // API key最大频率限制
    角色检查上限: 10,              // 单次角色权限检查数量
  },
  
  // 📏 长度约束策略 - 所有长度相关配置的单一来源
  LENGTH_CONSTRAINTS: {
    API密钥标准长度: 32,           // API key生成和验证的统一长度
    用户名合理范围: { min: 3, max: 20 },      // 用户体验和数据库优化平衡
    密码安全范围: { min: 8, max: 128 },       // 安全性和实用性平衡  
    API密钥扩展范围: { min: 32, max: 64 },    // 支持不同安全等级
    缓存键安全长度: 250,                      // Redis键长度限制
    邮箱标准长度: 254,                        // RFC标准邮箱长度
    通用名称长度: 100,                        // API key名称、角色名称等
  },
  
  // 🔒 安全策略 - 所有安全相关配置的单一来源
  SECURITY_STRATEGY: {
    账户锁定时长_分钟: 30,         // 登录失败后锁定时间
    会话标准时长_分钟: 60,         // 用户会话有效期
    Token访问时长_小时: 24,        // 访问token有效期
    慢操作警告阈值_毫秒: 100,      // 性能监控告警
    缓存过期缓冲_秒: 10,          // 避免缓存雪崩的安全时间
  }
});

// 🔧 便捷计算工具 - 避免重复计算
export const COMPUTED_VALUES = deepFreeze({
  // 毫秒换算
  时间_毫秒: {
    标准缓存有效期: BUSINESS_VALUES.TIME_STRATEGY.标准缓存有效期_秒 * 1000,
    Token刷新周期: BUSINESS_VALUES.TIME_STRATEGY.Token刷新周期_天 * 24 * 60 * 60 * 1000,
    日常清理周期: BUSINESS_VALUES.TIME_STRATEGY.日常清理周期_小时 * 60 * 60 * 1000,
    长期缓存刷新: BUSINESS_VALUES.TIME_STRATEGY.长期缓存刷新_分钟 * 60 * 1000,
    短期频率窗口: BUSINESS_VALUES.TIME_STRATEGY.短期频率窗口_秒 * 1000,
    会话标准时长: BUSINESS_VALUES.SECURITY_STRATEGY.会话标准时长_分钟 * 60 * 1000,
    账户锁定时长: BUSINESS_VALUES.SECURITY_STRATEGY.账户锁定时长_分钟 * 60 * 1000,
  },
  
  // 频率限制配置
  频率限制配置: {
    登录限制: {
      每分钟最大次数: BUSINESS_VALUES.QUANTITY_LIMITS.登录安全尝试上限,
      锁定时长_毫秒: BUSINESS_VALUES.SECURITY_STRATEGY.账户锁定时长_分钟 * 60 * 1000,
    },
    API调用限制: {
      标准限制: BUSINESS_VALUES.QUANTITY_LIMITS.标准批次大小,
      时间窗口_毫秒: BUSINESS_VALUES.TIME_STRATEGY.短期频率窗口_秒 * 1000,
    }
  }
});
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