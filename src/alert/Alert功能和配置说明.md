# Alert模块功能和配置说明

## 📋 模块概览

Alert模块是一个专业化的告警管理系统，采用v2.0架构，包含7个专业化服务、2个支持组件和2个数据仓储，提供完整的告警规则管理、评估、生命周期管理和通知功能。

---

## 🚀 已实现的核心功能

### 1. 告警规则管理
- ✅ **创建告警规则** - 支持多种指标监控（CPU、内存、响应时间、错误率等）
- ✅ **更新告警规则** - 动态修改规则配置
- ✅ **删除告警规则** - 安全删除并清理相关缓存
- ✅ **启用/禁用规则** - 快速切换规则状态
- ✅ **获取规则列表** - 支持分页和筛选
- ✅ **获取规则详情** - 查看单个规则的完整信息

### 2. 告警评估系统
- ✅ **自动评估** - 定期评估所有启用的规则
- ✅ **手动触发评估** - 支持手动触发特定规则或所有规则的评估
- ✅ **批量指标处理** - 处理多个指标数据并触发相应告警
- ✅ **冷却期管理** - 防止告警频繁触发（cooldown机制）
- ✅ **操作符支持** - 支持多种比较操作符（>, <, >=, <=, ==, !=）

### 3. 告警生命周期管理
- ✅ **告警触发** - 根据规则自动触发告警
- ✅ **告警确认** - 用户确认已收到告警（acknowledge）
- ✅ **告警解决** - 标记告警已解决（resolve）
- ✅ **批量确认** - 批量确认多个告警
- ✅ **批量解决** - 批量解决多个告警
- ✅ **状态流转** - fired → acknowledged → resolved

### 4. 告警查询和统计
- ✅ **获取活跃告警** - 查看当前所有未解决的告警
- ✅ **告警历史查询** - 支持按时间范围、严重程度、状态等条件查询
- ✅ **告警统计** - 获取告警系统的统计信息
- ✅ **性能指标** - 触发率、平均响应时间等性能指标

### 5. 告警缓存管理
- ✅ **活跃告警缓存** - Redis缓存活跃告警，提高查询性能
- ✅ **冷却期缓存** - 管理规则的冷却状态
- ✅ **缓存同步** - 自动同步缓存与数据库
- ✅ **缓存清理** - 规则删除或禁用时自动清理相关缓存

### 6. 告警事件系统
- ✅ **事件发布** - 发布告警相关事件（fired, resolved, acknowledged等）
- ✅ **事件订阅** - 其他模块可订阅告警事件
- ✅ **事件类型**:
  - `alert.fired` - 告警触发
  - `alert.resolved` - 告警解决
  - `alert.acknowledged` - 告警确认
  - `alert.suppressed` - 告警抑制（冷却期内）
  - `alert.escalated` - 告警升级

### 7. 通知渠道支持
- ✅ **多渠道通知** - 支持5种通知渠道：
  - Email - 邮件通知
  - SMS - 短信通知
  - Webhook - Webhook调用
  - Push - 推送通知
  - In-App - 应用内通知

---

## 🔧 配置项说明

### 环境变量配置

```bash
# 告警评估间隔（秒）
ALERT_EVALUATION_INTERVAL=60    # 默认: 60秒

# Node环境（影响缓存和性能配置）
NODE_ENV=production             # development | test | production
```

### 核心配置参数（alert.config.ts）

```typescript
{
  // 评估间隔配置
  evaluationInterval: 60,        // 默认60秒，可通过环境变量覆盖

  // 规则验证配置
  validation: {
    duration: {
      min: 30,                   // 最小持续时间: 30秒
      max: 600,                  // 最大持续时间: 600秒（10分钟）
    },
    cooldown: {
      min: 300,                  // 最小冷却期: 300秒（5分钟）
      max: 3000,                 // 最大冷却期: 3000秒（50分钟）
    },
  },

  // 缓存配置
  cache: {
    cooldownPrefix: "alert:cooldown:",     // 冷却期缓存键前缀
    activeAlertPrefix: "active-alert",     // 活跃告警缓存键前缀
    activeAlertTtlSeconds: 1800,          // 缓存TTL: 30分钟
  },
}
```

### 默认值配置（defaults.constants.ts）

#### 基础默认值
```typescript
{
  operator: '>',                 // 默认操作符
  duration: 60,                  // 默认持续时间: 60秒
  severity: 'medium',            // 默认严重程度
  enabled: true,                 // 默认启用
  cooldown: 300,                 // 默认冷却期: 300秒
  
  // 容量限制
  MAX_CONDITIONS: 10,            // 最大条件数
  MAX_ACTIONS: 5,                // 最大动作数
  BATCH_SIZE: 100,              // 批量操作大小
  
  // 字符串长度限制
  NAME_MAX_LENGTH: 100,          // 名称最大长度
  DESCRIPTION_MAX_LENGTH: 500,   // 描述最大长度
  
  // 超时配置
  TIMEOUT_DEFAULT: 5000,         // 默认超时: 5秒
  RETRY_COUNT: 3,                // 默认重试次数
}
```

#### 配置预设组合

**规则配置预设**:
- **QUICK** - 快速规则（30秒持续，300秒冷却）
- **STANDARD** - 标准规则（60秒持续，300秒冷却）
- **COMPLEX** - 复杂规则（120秒持续，600秒冷却）

**通知配置预设**:
- **INSTANT** - 即时通知（5秒超时，5次重试）
- **STANDARD** - 标准通知（30秒超时，3次重试）
- **BATCH** - 批量通知（60秒超时，1次重试）

**性能配置预设**:
- **HIGH_PERFORMANCE** - 高性能（20并发，1000批量）
- **BALANCED** - 平衡模式（5并发，100批量）
- **CONSERVATIVE** - 资源节约（3并发，50批量）

#### 环境特定配置

```typescript
// 开发环境
DEVELOPMENT: {
  cacheEnabled: false,          // 不启用缓存
  batchSize: 20,                // 小批量
  timeout: 1000,                // 1秒超时
  retentionDays: 7,             // 保留7天
  logLevel: 'debug',
}

// 生产环境
PRODUCTION: {
  cacheEnabled: true,           // 启用缓存
  batchSize: 1000,              // 大批量
  timeout: 60000,               // 60秒超时
  retentionDays: 90,            // 保留90天
  logLevel: 'warn',
}
```

---

## 🎯 API接口列表

### 规则管理接口
| 方法 | 路径 | 功能 | 权限要求 |
|------|------|------|----------|
| POST | `/alerts/rules` | 创建告警规则 | Admin |
| GET | `/alerts/rules` | 获取规则列表 | Admin |
| GET | `/alerts/rules/:ruleId` | 获取规则详情 | Admin |
| PUT | `/alerts/rules/:ruleId` | 更新规则 | Admin |
| DELETE | `/alerts/rules/:ruleId` | 删除规则 | Admin |
| POST | `/alerts/rules/:ruleId/toggle` | 启用/禁用规则 | Admin |

### 告警管理接口
| 方法 | 路径 | 功能 | 权限要求 |
|------|------|------|----------|
| GET | `/alerts/active` | 获取活跃告警 | Admin |
| GET | `/alerts/history` | 查询告警历史 | Admin |
| GET | `/alerts/stats` | 获取统计信息 | Admin |
| GET | `/alerts/:alertId` | 获取告警详情 | Admin |
| POST | `/alerts/:alertId/acknowledge` | 确认告警 | Admin |
| POST | `/alerts/:alertId/resolve` | 解决告警 | Admin |
| POST | `/alerts/trigger` | 手动触发评估 | Admin |
| POST | `/alerts/batch/acknowledge` | 批量确认 | Admin |
| POST | `/alerts/batch/resolve` | 批量解决 | Admin |

---

## 🏗️ 服务架构

### 核心服务（7个）
1. **AlertOrchestratorService** - 编排服务（主入口）
2. **AlertRuleService** - 规则管理服务
3. **AlertEvaluationService** - 规则评估服务
4. **AlertLifecycleService** - 生命周期管理服务
5. **AlertQueryService** - 查询统计服务
6. **AlertCacheService** - 缓存管理服务
7. **AlertEventPublisher** - 事件发布服务

### 支持组件（2个）
1. **AlertRuleValidator** - 规则验证器
2. **RuleEvaluator** - 评估引擎

### 数据仓储（2个）
1. **AlertRuleRepository** - 规则数据仓储
2. **AlertHistoryRepository** - 历史数据仓储

---

## 📊 数据模型

### AlertRule Schema
```typescript
{
  name: string;              // 规则名称
  description?: string;      // 规则描述
  metric: string;           // 监控指标
  operator: string;         // 操作符 (>, <, >=, <=, ==, !=)
  threshold: number;        // 阈值
  duration: number;         // 持续时间（秒）
  severity: string;         // 严重程度 (critical, warning, info)
  enabled: boolean;         // 是否启用
  channels: string[];       // 通知渠道
  cooldown: number;         // 冷却时间（秒）
  tags?: object;           // 标签
  createdBy?: string;      // 创建者
}
```

### AlertHistory Schema
```typescript
{
  ruleId: string;           // 关联规则ID
  ruleName: string;         // 规则名称
  metric: string;           // 指标名称
  value: number;            // 实际值
  threshold: number;        // 阈值
  severity: string;         // 严重程度
  status: string;           // 状态 (fired, acknowledged, resolved)
  message: string;          // 告警消息
  triggeredAt: Date;        // 触发时间
  acknowledgedBy?: string;  // 确认人
  acknowledgedAt?: Date;    // 确认时间
  resolvedBy?: string;      // 解决人
  resolvedAt?: Date;        // 解决时间
  duration?: number;        // 持续时间
  context?: object;         // 上下文信息
}
```

---

## 🔐 安全特性

1. **权限控制** - 所有接口需要Admin权限
2. **速率限制** - 手动触发评估限制：5次/分钟
3. **输入验证** - 严格的DTO验证
4. **审计日志** - 记录所有操作
5. **防重复触发** - 冷却期机制防止告警风暴

---

## 📈 性能优化

1. **Redis缓存** - 活跃告警和冷却状态缓存
2. **批量操作** - 支持批量确认和解决
3. **异步处理** - 事件发布采用异步机制
4. **连接池** - MongoDB和Redis连接池优化
5. **查询优化** - 索引优化和分页查询

---

## 🚧 待实现功能

详见 [alert待办清单.md](./alert待办清单.md)

主要包括：
- 统计追踪功能（6处TODO）
- 数据库高级查询方法（3处TODO）
- 告警准确率计算（1处TODO）
- 其他增强功能（9处TODO）

---

## 📝 使用示例

### 创建告警规则
```bash
POST /alerts/rules
{
  "name": "高CPU使用率告警",
  "metric": "cpu_usage",
  "operator": ">",
  "threshold": 80,
  "duration": 60,
  "severity": "warning",
  "channels": ["email", "sms"],
  "cooldown": 300
}
```

### 手动触发评估
```bash
POST /alerts/trigger
{
  "metrics": [
    {
      "name": "cpu_usage",
      "value": 85,
      "timestamp": "2025-01-11T10:00:00Z"
    }
  ]
}
```

### 确认告警
```bash
POST /alerts/{alertId}/acknowledge
{
  "acknowledgedBy": "admin@example.com",
  "comment": "正在处理"
}
```

---

*最后更新时间: 2025-01-11*
*版本: v2.0*