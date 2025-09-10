# Monitoring常量文件重构设计文档

## 📋 概述

### 重构目标
- **单一真实来源**：消除重复定义，避免多处修改同一配置
- **配置追踪简化**：统一配置源，便于维护和调试
- **业务语义清晰**：每个数字都有明确业务含义
- **高可读性**：语义化命名替代魔法数字

### 设计原则
- 无兼容层包袱：全新项目，直接重构
- 基于现有代码：以business.ts为主要参考标准
- 单一配置多处复用：一处定义，全局使用
- 渐进式迁移：保证系统稳定运行

## 🔍 现状问题分析

### 1. 重复定义冲突
```typescript
// ❌ CPU阈值冲突 - 同一概念，不同数值
// business.ts
CPU_USAGE_HIGH: 80,           // 80%高负载
CPU_USAGE_CRITICAL: 95,       // 95%临界

// monitoring-metrics.constants.ts  
CPU_USAGE: {
  warning: 70,                // 70%警告 ≠ 80%高负载
  critical: 90                // 90%严重 ≠ 95%临界  
}
```

### 2. 响应时间阈值混乱
```typescript
// ❌ 多处定义，标准不一
// business.ts - 4个级别
RESPONSE_TIME_EXCELLENT: 100,
RESPONSE_TIME_GOOD: 300, 
RESPONSE_TIME_FAIR: 1000,
RESPONSE_TIME_POOR: 3000,

// monitoring-metrics.constants.ts - 2个级别
RESPONSE_TIME: {
  warning: 1000,              // 与 FAIR 重复
  critical: 5000              // 新的数值
},

// monitoring-system.constants.ts - 又一个定义
SLOW_REQUEST_THRESHOLD_MS: 1000,  // 再次重复1000
```

### 3. 错误率标准不统一
```typescript
// ❌ 格式和数值都不统一
// business.ts - 小数格式
ACCEPTABLE_RATE: 0.05,         // 5%
WARNING_RATE: 0.1,             // 10%
CRITICAL_RATE: 0.2,            // 20%

// monitoring-metrics.constants.ts - 整数格式
ERROR_RATE: {
  warning: 1,                  // 1% ≠ 10%
  critical: 5                  // 5% ≠ 20%  
}
```

### 4. 语义模糊的数字
```typescript
// ❌ 数字含义不明
MIN_DATA_POINTS: 5,           // 最小需要5个什么？
RECENT_METRICS_COUNT: 5,      // 最近5个什么？
// 这两个5是否表示同一概念？
```

## 🏗️ 新架构设计

### 文件结构
```
src/monitoring/constants/
├── core/                              # 核心常量定义
│   ├── base-thresholds.constants.ts   # 基础阈值 - 单一真实来源
│   ├── time-constants.ts              # 时间常量整合
│   └── index.ts                       # 核心常量导出
├── scenarios/                         # 场景化配置
│   ├── monitoring-scenarios.constants.ts # 基于核心阈值的场景组合
│   └── index.ts                       # 场景常量导出
└── index.ts                           # 总导出入口
```

### 核心设计理念

#### 1. 单一真实来源
每个业务概念的阈值只在一个地方定义，所有其他地方通过引用使用。

#### 2. 分层架构
- **核心层**：基础阈值定义，不依赖任何其他常量
- **场景层**：基于核心阈值的业务场景组合
- **应用层**：具体业务逻辑中的使用

#### 3. 语义化命名
数字不再孤立存在，每个都有明确的业务含义和上下文。

## 📁 具体实现

### 1. 核心阈值定义 (base-thresholds.constants.ts)

```typescript
/**
 * 基础阈值常量 - 单一真实来源
 * 🎯 合并现有business.ts和monitoring-metrics.constants.ts中的重复定义
 */

// ======================= CPU使用率阈值统一 =======================
export const CPU_THRESHOLDS = {
  /** 轻负载：30%以下 - 来源于business.ts */
  LIGHT: 30,
  
  /** 中等负载：60%以下 - 来源于business.ts */
  MODERATE: 60,
  
  /** 高负载：80%以下 - business.ts (80) vs monitoring-metrics (70)，采用business标准 */
  HIGH: 80,
  
  /** 临界负载：95%以下 - business.ts (95) vs monitoring-metrics (90)，采用business标准 */
  CRITICAL: 95
} as const;

// ======================= 响应时间阈值统一 =======================  
export const RESPONSE_TIME_THRESHOLDS = {
  /** 优秀响应：100ms - 保留business.ts定义 */
  EXCELLENT: 100,
  
  /** 良好响应：300ms - 保留business.ts定义 */
  GOOD: 300,
  
  /** 可接受响应：1000ms - business.ts FAIR = monitoring-metrics warning = system SLOW */
  ACCEPTABLE: 1000,
  
  /** 较差响应：3000ms - 保留business.ts定义 */
  POOR: 3000,
  
  /** 严重响应：5000ms - 来源于monitoring-metrics critical */
  CRITICAL: 5000
} as const;

// ======================= 错误率阈值统一 =======================
export const ERROR_RATE_THRESHOLDS = {
  /** 可接受错误率：5% - 统一为小数格式，基于business.ts */
  ACCEPTABLE: 0.05,
  
  /** 警告错误率：10% - 基于business.ts */  
  WARNING: 0.10,
  
  /** 严重错误率：20% - 基于business.ts */
  CRITICAL: 0.20,
  
  /** 紧急错误率：30% - 基于business.ts */
  EMERGENCY: 0.30
} as const;

// ======================= 内存使用率阈值统一 =======================
export const MEMORY_THRESHOLDS = {
  /** 低使用率：40% - 来源于business.ts */
  LOW: 40,
  
  /** 中等使用率：70% - 来源于business.ts */
  MODERATE: 70,
  
  /** 高使用率：85% - business.ts (85) vs monitoring-metrics (80)，采用business标准 */
  HIGH: 85,
  
  /** 临界使用率：95% - business.ts和monitoring-metrics一致 */
  CRITICAL: 95
} as const;

// ======================= 缓存性能阈值统一 =======================
export const CACHE_THRESHOLDS = {
  /** 优秀命中率：90% - 来源于business.ts */
  HIT_RATE_EXCELLENT: 0.90,
  
  /** 良好命中率：80% - business.ts (80%) = monitoring-metrics warning (80%)，一致 */
  HIT_RATE_GOOD: 0.80,
  
  /** 可接受命中率：60% - business.ts (60%) = monitoring-metrics critical (60%)，一致 */
  HIT_RATE_ACCEPTABLE: 0.60,
  
  /** 较差命中率：40% - 来源于business.ts */
  HIT_RATE_POOR: 0.40,
  
  /** 缓存响应时间限制：100ms - 来源于monitoring-system.ts */
  RESPONSE_TIME_LIMIT: 100
} as const;

// ======================= 数据采样统一 =======================
export const DATA_SAMPLING = {
  /** 统计最小数据点：5个 - 合并business.ts中的MIN_DATA_POINTS和RECENT_METRICS_COUNT */
  MIN_REQUIRED_POINTS: 5,
  
  /** 小样本：10个 - 来源于business.ts */
  SAMPLE_SMALL: 10,
  
  /** 中样本：50个 - 来源于business.ts */
  SAMPLE_MEDIUM: 50,
  
  /** 大样本：100个 - 来源于business.ts */
  SAMPLE_LARGE: 100,
  
  /** 最大样本：1000个 - 来源于business.ts和monitoring-system.ts */
  SAMPLE_MAX: 1000
} as const;
```

### 2. 时间常量整合 (time-constants.ts)

```typescript
/**
 * 时间常量统一定义
 * 🎯 整合business.ts中分散的时间相关常量
 */

// ======================= 基础时间单位 =======================
export const TIME_UNITS = {
  SECOND: 1000,     // 1秒 = 1000毫秒
  MINUTE: 60000,    // 1分钟 = 60000毫秒  
  HOUR: 3600000,    // 1小时 = 3600000毫秒
  DAY: 86400000     // 1天 = 86400000毫秒
} as const;

// ======================= 数据收集频率 - 来源于business.ts =======================
export const COLLECTION_INTERVALS = {
  /** 实时数据：1秒 - 来源于business.ts REALTIME_INTERVAL */
  REALTIME: 1 * TIME_UNITS.SECOND,
  
  /** 高频数据：5秒 - 来源于business.ts HIGH_FREQUENCY_INTERVAL */
  HIGH_FREQUENCY: 5 * TIME_UNITS.SECOND,
  
  /** 普通数据：30秒 - 来源于business.ts NORMAL_INTERVAL */
  NORMAL: 30 * TIME_UNITS.SECOND,
  
  /** 低频数据：300秒 - 来源于business.ts LOW_FREQUENCY_INTERVAL */
  LOW_FREQUENCY: 5 * TIME_UNITS.MINUTE
} as const;

// ======================= 告警冷却时间 - 来源于business.ts =======================
export const ALERT_COOLDOWNS = {
  /** 紧急告警：60秒 - 来源于business.ts COOLDOWN_EMERGENCY */
  EMERGENCY: 60 * TIME_UNITS.SECOND,
  
  /** 严重告警：300秒 - 来源于business.ts COOLDOWN_CRITICAL */
  CRITICAL: 300 * TIME_UNITS.SECOND,
  
  /** 警告告警：900秒 - 来源于business.ts COOLDOWN_WARNING */
  WARNING: 900 * TIME_UNITS.SECOND,
  
  /** 信息告警：1800秒 - 来源于business.ts COOLDOWN_INFO */
  INFO: 1800 * TIME_UNITS.SECOND
} as const;
```

### 3. 场景化配置 (monitoring-scenarios.constants.ts)

```typescript
import { CPU_THRESHOLDS, RESPONSE_TIME_THRESHOLDS, ERROR_RATE_THRESHOLDS } from '../core/base-thresholds.constants';

/**
 * 场景化监控配置 - 基于核心阈值的组合应用
 * 🎯 不同业务场景的阈值组合，但所有数值来源于统一的base-thresholds
 */

// ======================= 性能监控场景 =======================
export const PERFORMANCE_MONITORING = {
  // 响应时间评估 - 复用统一阈值
  responseTime: {
    excellent: RESPONSE_TIME_THRESHOLDS.EXCELLENT,    // 100ms
    good: RESPONSE_TIME_THRESHOLDS.GOOD,              // 300ms  
    acceptable: RESPONSE_TIME_THRESHOLDS.ACCEPTABLE,  // 1000ms
    poor: RESPONSE_TIME_THRESHOLDS.POOR               // 3000ms
  },
  
  // 系统资源评估 - 复用统一阈值
  systemResource: {
    cpu: {
      warning: CPU_THRESHOLDS.HIGH,        // 80%
      critical: CPU_THRESHOLDS.CRITICAL    // 95%
    },
    memory: {
      warning: MEMORY_THRESHOLDS.HIGH,     // 85%
      critical: MEMORY_THRESHOLDS.CRITICAL // 95%
    }
  }
} as const;

// ======================= 错误监控场景 =======================
export const ERROR_MONITORING = {
  // 错误率评估 - 复用统一阈值
  errorRate: {
    acceptable: ERROR_RATE_THRESHOLDS.ACCEPTABLE,  // 5%
    warning: ERROR_RATE_THRESHOLDS.WARNING,        // 10%
    critical: ERROR_RATE_THRESHOLDS.CRITICAL,      // 20%
    emergency: ERROR_RATE_THRESHOLDS.EMERGENCY     // 30%
  }
} as const;

// ======================= 缓存监控场景 =======================
export const CACHE_MONITORING = {
  // 命中率评估 - 复用统一阈值
  hitRate: {
    excellent: CACHE_THRESHOLDS.HIT_RATE_EXCELLENT,    // 90%
    good: CACHE_THRESHOLDS.HIT_RATE_GOOD,              // 80%
    acceptable: CACHE_THRESHOLDS.HIT_RATE_ACCEPTABLE,  // 60%
    poor: CACHE_THRESHOLDS.HIT_RATE_POOR               // 40%
  },
  
  // 响应时间限制
  responseTimeLimit: CACHE_THRESHOLDS.RESPONSE_TIME_LIMIT // 100ms
} as const;
```

## 📋 迁移实施计划

### 第1阶段：创建新的常量架构 (1天)
1. 创建核心常量文件结构
2. 定义基础阈值常量
3. 建立导出入口

**验证标准**：文件结构建立，常量定义完成

### 第2阶段：迁移现有使用 (2天)
1. 更新business.ts中的工具类使用统一常量
2. 更新monitoring-metrics.constants.ts使用统一阈值
3. 逐步替换其他文件中的直接数字使用

**验证标准**：重复定义消除，引用更新完成

### 第3阶段：更新导出入口 (1天)
1. 修改constants/index.ts统一导出
2. 建立向后兼容的别名
3. 更新所有导入路径

**验证标准**：导入路径统一，向后兼容性保持

### 第4阶段：验证和清理 (1天)
1. 运行常量验证脚本
2. 删除重复的常量定义
3. 完成文档更新

**验证标准**：验证脚本通过，旧文件清理完成

## 🔄 迁移示例

### 业务逻辑迁移
```typescript
// ❌ 迁移前：business.ts中的工具类
export class MonitoringBusinessUtil {
  static getErrorRateLevel(errorRate: number): 'normal' | 'warning' | 'critical' | 'emergency' {
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.EMERGENCY_RATE) return 'emergency';    // 0.30
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.CRITICAL_RATE) return 'critical';      // 0.20  
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.WARNING_RATE) return 'warning';        // 0.10
    return 'normal';
  }
}

// ✅ 迁移后：使用统一常量
import { ERROR_RATE_THRESHOLDS } from '../core/base-thresholds.constants';

export class MonitoringBusinessUtil {
  static getErrorRateLevel(errorRate: number): 'normal' | 'warning' | 'critical' | 'emergency' {
    if (errorRate >= ERROR_RATE_THRESHOLDS.EMERGENCY) return 'emergency';      // 0.30 - 单一来源
    if (errorRate >= ERROR_RATE_THRESHOLDS.CRITICAL) return 'critical';        // 0.20 - 单一来源
    if (errorRate >= ERROR_RATE_THRESHOLDS.WARNING) return 'warning';          // 0.10 - 单一来源  
    return 'normal';
  }
}
```

### 监控指标迁移
```typescript
// ❌ 迁移前：重复的阈值定义
export const MONITORING_METRIC_THRESHOLDS = Object.freeze({
  [MONITORING_METRICS.CPU_USAGE]: {
    warning: 70,    // ≠ business.ts中的80
    critical: 90    // ≠ business.ts中的95
  },
  [MONITORING_METRICS.ERROR_RATE]: {
    warning: 1,     // 1% ≠ business.ts中的10%
    critical: 5     // 5% ≠ business.ts中的20%
  }
} as const);

// ✅ 迁移后：引用统一阈值
import { CPU_THRESHOLDS, ERROR_RATE_THRESHOLDS } from '../core/base-thresholds.constants';

export const MONITORING_METRIC_THRESHOLDS = Object.freeze({
  [MONITORING_METRICS.CPU_USAGE]: {
    warning: CPU_THRESHOLDS.HIGH,                   // 80 - 统一标准
    critical: CPU_THRESHOLDS.CRITICAL              // 95 - 统一标准
  },
  [MONITORING_METRICS.ERROR_RATE]: {
    warning: ERROR_RATE_THRESHOLDS.WARNING * 100,  // 10 - 转换为百分比格式但来源统一
    critical: ERROR_RATE_THRESHOLDS.CRITICAL * 100 // 20 - 转换为百分比格式但来源统一
  }
} as const);
```

## 🎯 验证机制

### 常量一致性验证脚本
```typescript
// scripts/validate-constants.ts
import { 
  CPU_THRESHOLDS, 
  RESPONSE_TIME_THRESHOLDS, 
  ERROR_RATE_THRESHOLDS 
} from '../src/monitoring/constants';

/**
 * 常量一致性验证
 * 🎯 确保重构后常量值正确，无重复定义
 */
export function validateConstants(): boolean {
  const issues: string[] = [];
  
  // 验证阈值递增关系
  if (CPU_THRESHOLDS.LIGHT >= CPU_THRESHOLDS.MODERATE) {
    issues.push('CPU阈值: LIGHT应该 < MODERATE');
  }
  
  if (RESPONSE_TIME_THRESHOLDS.EXCELLENT >= RESPONSE_TIME_THRESHOLDS.GOOD) {
    issues.push('响应时间阈值: EXCELLENT应该 < GOOD');
  }
  
  if (ERROR_RATE_THRESHOLDS.ACCEPTABLE >= ERROR_RATE_THRESHOLDS.WARNING) {
    issues.push('错误率阈值: ACCEPTABLE应该 < WARNING');
  }
  
  // 验证数值合理性
  if (CPU_THRESHOLDS.CRITICAL > 100) {
    issues.push('CPU阈值: CRITICAL不应超过100%');
  }
  
  if (ERROR_RATE_THRESHOLDS.EMERGENCY > 1) {
    issues.push('错误率阈值: EMERGENCY不应超过100%');
  }
  
  if (issues.length > 0) {
    console.error('常量验证失败:', issues);
    return false;
  }
  
  console.log('✅ 常量验证通过');
  return true;
}
```

## 📊 重构收益

### ✅ 单一真实来源实现
```typescript
// 🎯 重复定义消除对比

// ❌ 重构前：CPU阈值3处不同定义
business.ts:           CPU_USAGE_HIGH: 80, CPU_USAGE_CRITICAL: 95
monitoring-metrics.ts: warning: 70, critical: 90  
// 导致混乱：到底是70%还是80%警告？

// ✅ 重构后：CPU阈值单一来源  
base-thresholds.ts:    CPU_THRESHOLDS.HIGH: 80, CPU_THRESHOLDS.CRITICAL: 95
// 全项目统一：只有一个标准，无歧义
```

### ✅ 单一配置多处复用
```typescript
// 🎯 配置复用示例

// 核心定义一次
export const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 100,
  GOOD: 300,
  ACCEPTABLE: 1000
};

// 多场景复用
PERFORMANCE_MONITORING.responseTime.excellent = RESPONSE_TIME_THRESHOLDS.EXCELLENT;
MONITORING_METRIC_THRESHOLDS[RESPONSE_TIME].warning = RESPONSE_TIME_THRESHOLDS.ACCEPTABLE;
MonitoringBusinessUtil使用 = RESPONSE_TIME_THRESHOLDS.EXCELLENT;
```

### ✅ 高可读性达成  
```typescript
// 🎯 语义化对比

// ❌ 重构前：数字无含义
if (responseTime > 1000) { ... }           // 1000代表什么？
if (errorRate > 0.05) { ... }             // 0.05是严格还是宽松？
if (cpuUsage > 95) { ... }                // 95%是警告还是严重？

// ✅ 重构后：语义清晰
if (responseTime > RESPONSE_TIME_THRESHOLDS.ACCEPTABLE) { ... }     // 超过可接受响应时间
if (errorRate > ERROR_RATE_THRESHOLDS.ACCEPTABLE) { ... }          // 错误率超标
if (cpuUsage > CPU_THRESHOLDS.CRITICAL) { ... }                    // CPU达到临界状态
```

## 🎯 核心改进成果

1. **消除冲突**：解决了业务阈值和监控阈值不一致的问题
2. **统一标准**：基于business.ts建立的统一数值标准  
3. **维护简化**：修改一处阈值，影响所有使用场景
4. **语义清晰**：每个数字都有明确的业务含义和使用上下文

## 📝 注意事项

### 迁移风险控制
- 保持向后兼容性，通过别名过渡
- 分阶段实施，确保系统稳定
- 充分测试验证，确保数值正确性

### 团队协作
- 更新开发文档，说明新的常量使用方式
- 代码审查时重点关注常量使用规范
- 建立常量修改的审批流程

---

*此文档记录了Monitoring常量文件的完整重构设计，旨在建立单一真实来源、高可读性的常量管理体系。*