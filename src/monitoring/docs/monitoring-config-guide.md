# 监控组件配置使用指南

## 📋 概述

本指南详细说明如何正确使用监控组件的配置系统，包括两种配置方式的使用场景、注意事项和最佳实践。

## 🏗️ 配置架构

### 配置职责边界

监控组件有两套独立的配置系统，各司其职：

| 配置文件 | 职责 | 特点 | 使用场景 |
|---------|------|------|----------|
| `monitoring.config.ts` | 监控业务数据缓存 | 可配置、环境差异化 | 健康检查、趋势分析、性能监控 |
| `cache-ttl.constants.ts` | 缓存统计替换功能 | 固定常量、算法导向 | 缓存命中率统计、替换策略 |

### 为什么要分离？

- **不同的设计目标**：业务缓存注重实时性，统计替换注重算法效率
- **不同的变更频率**：业务配置需要环境调优，算法常量相对固定
- **不同的影响范围**：业务配置影响用户体验，算法常量影响内存管理

## 📚 配置使用方式

### 方式一：传统接口配置（兼容性）

```typescript
import { DEFAULT_MONITORING_CONFIG, validateMonitoringConfig } from './monitoring.config';

// 基本使用
const config = DEFAULT_MONITORING_CONFIG;

// 带验证的使用
const validatedConfig = validateMonitoringConfig({
  cache: {
    ttl: {
      health: 600, // 覆盖健康检查TTL为10分钟
    }
  }
});

// 环境特定配置
import { getMonitoringConfigForEnvironment } from './monitoring.config';
const envConfig = getMonitoringConfigForEnvironment();
```

### 方式二：类型安全配置（推荐）

```typescript
import { MonitoringConfigValidated, monitoringConfigValidated } from './monitoring.config';

// 1. 在模块中注册配置
@Module({
  imports: [
    ConfigModule.forFeature(monitoringConfigValidated)
  ],
  // ...
})
export class MonitoringModule {}

// 2. 在服务中注入配置
@Injectable()
export class MonitoringService {
  constructor(
    @Inject('monitoringValidated') 
    private readonly config: MonitoringConfigValidated
  ) {}

  getHealthTTL(): number {
    // 类型安全访问，编译时检查
    return this.config.cache.ttl.health;
  }

  isAutoAnalysisEnabled(): boolean {
    return this.config.events.enableAutoAnalysis;
  }
}
```

## 🛡️ 类型安全特性

### 自动类型转换

```typescript
// 环境变量字符串自动转换为数字
MONITORING_TTL_HEALTH=300 // string -> number

// 布尔值智能解析
MONITORING_AUTO_ANALYSIS=false // string -> boolean
```

### 运行时验证

```typescript
// 数值范围验证
@Min(1) @Max(3600)
health: number = 300; // TTL必须在1-3600秒之间

// 百分比验证
@Min(0.1) @Max(1.0) 
hitRateThreshold: number = 0.8; // 命中率必须在10%-100%之间
```

### 错误提示

```typescript
// 配置错误时会收到清晰的错误信息
Error: 监控配置验证失败: health must not be less than 1, hitRateThreshold must not be greater than 1
```

## 🌍 环境变量配置

### 支持的环境变量

| 环境变量 | 类型 | 默认值 | 描述 |
|---------|------|--------|------|
| `MONITORING_CACHE_NAMESPACE` | string | "monitoring" | Redis命名空间 |
| `MONITORING_TTL_HEALTH` | number | 300 | 健康数据TTL（秒） |
| `MONITORING_TTL_TREND` | number | 600 | 趋势数据TTL（秒） |
| `MONITORING_TTL_PERFORMANCE` | number | 180 | 性能数据TTL（秒） |
| `MONITORING_TTL_ALERT` | number | 60 | 告警数据TTL（秒） |
| `MONITORING_TTL_CACHE_STATS` | number | 120 | 缓存统计TTL（秒） |
| `MONITORING_BATCH_SIZE` | number | 10 | 批处理大小 |
| `MONITORING_AUTO_ANALYSIS` | boolean | true | 是否启用自动分析 |
| `MONITORING_EVENT_RETRY` | number | 3 | 事件重试次数 |
| `MONITORING_P95_WARNING` | number | 200 | P95延迟告警阈值（ms） |
| `MONITORING_P99_CRITICAL` | number | 500 | P99延迟严重阈值（ms） |
| `MONITORING_HIT_RATE_THRESHOLD` | number | 0.8 | 缓存命中率阈值 |
| `MONITORING_ERROR_RATE_THRESHOLD` | number | 0.1 | 错误率阈值 |

### .env.development 示例

```bash
# 监控组件配置 - 开发环境
MONITORING_CACHE_NAMESPACE=monitoring_dev
MONITORING_TTL_HEALTH=150
MONITORING_AUTO_ANALYSIS=true
MONITORING_P95_WARNING=300
MONITORING_ERROR_RATE_THRESHOLD=0.15
```

## 🎯 使用场景示例

### 场景1：调整缓存策略

```typescript
// 生产环境需要更长的缓存时间
export const productionConfig = {
  cache: {
    ttl: {
      health: 600,  // 10分钟，减少健康检查频率
      trend: 1200,  // 20分钟，趋势数据变化慢
    }
  }
};
```

### 场景2：性能监控调优

```typescript
// 高流量环境需要更严格的性能要求
export const highTrafficConfig = {
  performance: {
    latencyThresholds: {
      p95Warning: 150,    // 更严格的延迟要求
      p99Critical: 300,   // 更低的严重阈值
    },
    hitRateThreshold: 0.95, // 更高的缓存命中率要求
    errorRateThreshold: 0.02, // 更低的错误率容忍度
  }
};
```

### 场景3：测试环境配置

```typescript
// 测试环境需要快速反馈
export const testConfig = {
  cache: {
    ttl: {
      health: 10,      // 10秒，快速验证
      performance: 5,  // 5秒，即时反馈
    },
    batchSize: 3,      // 小批次，减少资源占用
  },
  events: {
    enableAutoAnalysis: false, // 禁用自动分析，避免干扰测试
  }
};
```

## ⚠️ 注意事项

### 配置选择指南

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| 新项目开发 | 类型安全配置 | 更好的开发体验和安全性 |
| 现有项目迁移 | 传统接口配置 | 保持兼容性，逐步迁移 |
| 配置频繁变更 | 类型安全配置 | 运行时验证，减少错误 |
| 简单配置需求 | 传统接口配置 | 更直接，学习成本低 |

### 常见问题

#### 1. 配置不生效？
```typescript
// ❌ 错误：直接修改配置对象
config.cache.ttl.health = 600;

// ✅ 正确：通过环境变量覆盖
process.env.MONITORING_TTL_HEALTH = '600';
const config = monitoringConfigValidated();
```

#### 2. 验证失败？
```typescript
// ❌ 错误：值超出范围
MONITORING_TTL_HEALTH=0 // 小于最小值1

// ✅ 正确：检查范围限制
MONITORING_TTL_HEALTH=300 // 1-3600之间的有效值
```

#### 3. 类型不匹配？
```typescript
// ❌ 错误：类型不匹配
const ttl: string = config.cache.ttl.health;

// ✅ 正确：使用正确的类型
const ttl: number = config.cache.ttl.health;
```

## 🚀 最佳实践

### 1. 配置分层管理
```typescript
// 基础配置
const baseConfig = {
  cache: {
    ttl: {
      health: 300,
      trend: 600,
    }
  }
};

// 环境特定覆盖
const productionOverrides = {
  cache: {
    ttl: {
      health: 600, // 生产环境延长TTL
    }
  }
};

// 合并配置
const finalConfig = { ...baseConfig, ...productionOverrides };
```

### 2. 配置验证
```typescript
// 启动时验证所有配置
try {
  const config = monitoringConfigValidated();
  console.log('监控配置验证通过');
} catch (error) {
  console.error('监控配置验证失败:', error.message);
  process.exit(1); // 配置错误时终止启动
}
```

### 3. 配置文档化
```typescript
export class MonitoringService {
  constructor(
    @Inject('monitoringValidated') 
    private readonly config: MonitoringConfigValidated
  ) {
    // 记录关键配置信息
    console.log(`监控配置已加载: health TTL=${this.config.cache.ttl.health}秒`);
  }
}
```

### 4. 配置测试
```typescript
describe('MonitoringConfig', () => {
  it('应该使用正确的默认值', () => {
    const config = new MonitoringConfigValidated();
    expect(config.cache.ttl.health).toBe(300);
    expect(config.events.enableAutoAnalysis).toBe(true);
  });

  it('应该正确验证配置范围', () => {
    expect(() => {
      const config = plainToClass(MonitoringConfigValidated, {
        cache: { ttl: { health: 0 } } // 无效值
      });
      validateSync(config);
    }).toThrow();
  });
});
```

## 📈 迁移指南

### 从传统配置迁移到类型安全配置

```typescript
// 旧代码
import { DEFAULT_MONITORING_CONFIG } from './monitoring.config';
const ttl = DEFAULT_MONITORING_CONFIG.cache.ttl.health;

// 新代码
@Injectable()
export class NewService {
  constructor(
    @Inject('monitoringValidated') 
    private readonly config: MonitoringConfigValidated
  ) {}

  getTTL() {
    return this.config.cache.ttl.health; // 类型安全，编译时检查
  }
}
```

### 渐进式迁移策略

1. **第一阶段**：保持现有代码不变，并行引入类型安全配置
2. **第二阶段**：新功能使用类型安全配置
3. **第三阶段**：逐步迁移现有代码
4. **第四阶段**：移除传统接口配置（可选）

---

## 🔗 相关文档

- [四层配置体系标准规则](/docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md)
- [Monitor配置项合规优化计划](/docs/代码审查文档/配置文件标准/monitor配置项合规优化计划.md)
- [NestJS配置管理官方文档](https://docs.nestjs.com/techniques/configuration)

---

**版本**: v1.0  
**更新日期**: 2025-09-15  
**维护者**: Smart Stock Data API Team