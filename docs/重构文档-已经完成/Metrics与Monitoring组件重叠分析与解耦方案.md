# Metrics与Monitoring组件重叠分析与精简解耦方案

## 问题分析：职责重叠导致的维护困难

### 1. 核心重叠问题识别

通过代码审查发现以下**职责重叠**问题：

#### **重叠1: 健康评分计算重复**

**Metrics组件**(`MetricsPerformanceService`):
```typescript
private calculateHealthScore(
  endpointMetrics: EndpointMetricsDto[],
  dbMetrics: DatabaseMetricsDto,
  systemMetrics: SystemMetricsDto,
): number {
  let score = PERFORMANCE_DEFAULTS.HEALTH_SCORE;
  // 使用HEALTH_SCORE_CONFIG进行分层扣分
  return Math.max(0, score);
}
```

**Monitoring组件**(`MonitoringController`):
```typescript
private determineHealthStatus(score: number): string {
  if (score >= 90) return "healthy";     // 🔴 硬编码阈值
  if (score >= 70) return "warning";     
  if (score >= 50) return "degraded";
  return "unhealthy";
}

private identifyIssues(summary: any): string[] {
  // 🔴 重复的健康状态判断逻辑
}

private generateRecommendations(summary: any): string[] {
  // 🔴 重复的问题分析逻辑  
}
```

#### **重叠2: 数据验证和处理重复**

**Monitoring组件中的重复处理:**
```typescript
// MonitoringController
async getPerformanceMetrics() {
  const metrics = await this.performanceMonitor.getPerformanceSummary();
  
  // 🔴 重复的数据验证
  if (typeof metrics.healthScore === "undefined") {
    metrics.healthScore = 0;
  }
  if (!metrics.endpoints) {
    metrics.endpoints = [];
  }
  
  // 🔴 重复的单位转换
  return {
    ...metrics,
    memoryUsageGB: metrics.system.memoryUsage / 1024 / 1024 / 1024,
    uptimeHours: metrics.system.uptime / 3600,
  };
}
```

### 2. 重叠导致的问题

1. **维护困难**: 健康状态阈值硬编码在Controller中，难以统一管理
2. **重复计算**: 健康评分在每个API调用时都重新计算，浪费CPU
3. **代码分散**: 业务逻辑散布在Controller中，违反单一职责原则
4. **测试复杂**: Controller混合了API逻辑和业务逻辑，难以单元测试

## 精简解耦方案

### 方案概述：轻量级职责分离

```
现状（重叠）:
┌─────────────────┐    ┌──────────────────┐
│   Metrics       │◄──►│   Monitoring     │
│ - 数据收集       │    │ - API接口         │
│ - 指标计算       │    │ - 业务逻辑 (重复) │
│ - 健康评分       │    │ - 健康评分 (重复) │
└─────────────────┘    └──────────────────┘

目标（清晰）:
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│   Metrics   │  │  Analytics   │  │ Monitoring  │
│ 数据收集     │  │  协调层       │  │  纯API层    │
│ 原始计算     │  │  健康评分     │  │  权限控制    │
│ 存储管理     │  │  简单缓存     │  │  参数验证    │
└─────────────┘  └──────────────┘  └─────────────┘
       │                 ▲                ▲
       └─────────────────┴────────────────┘
```

### 方案: 创建轻量级Analytics组件

#### **1.1 Analytics组件设计原则**

**设计原则:**
- **轻量级**: 作为协调层，不重复实现现有功能
- **简单缓存**: 只缓存健康评分等高频计算结果
- **直接委托**: 大部分功能委托给现有Metrics组件
- **统一入口**: 为Monitoring提供统一的业务逻辑入口

**目录结构:**
```typescript
// src/analytics/
├── services/
│   ├── performance-analytics.service.ts  // 性能分析服务
│   ├── health-analytics.service.ts       // 健康分析服务
│   └── analytics-cache.service.ts        // 缓存管理服务
├── constants/
│   └── analytics.constants.ts            // 统一常量（必须对齐@common/constants/unified）
├── interfaces/
│   ├── performance-analytics.interface.ts // 性能分析接口
│   └── health-analytics.interface.ts      // 健康分析接口
└── module/
    └── analytics.module.ts               // 模块定义
```

#### **1.2 核心实现：分离的Analytics服务**

```typescript
// src/analytics/services/performance-analytics.service.ts
@Injectable()
export class PerformanceAnalyticsService implements IPerformanceAnalytics {
  private performanceCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30秒缓存

  constructor(
    private readonly performanceMonitor: MetricsPerformanceService,
    private readonly cacheService: AnalyticsCacheService
  ) {}

  async getPerformanceSummary(startDate?: string, endDate?: string): Promise<PerformanceSummaryDto> {
    const cacheKey = `performance:${startDate || 'latest'}:${endDate || 'latest'}`;
    
    // 两级缓存检查
    const cached = await this.cacheService.get<PerformanceSummaryDto>(cacheKey);
    if (cached) return cached;

    // 直接委托给现有服务，避免重复实现
    const summary = await this.performanceMonitor.getPerformanceSummary(startDate, endDate);
    
    // 缓存结果
    await this.cacheService.set(cacheKey, summary, this.CACHE_TTL);
    return summary;
  }

  async invalidateCache(pattern?: string): Promise<void> {
    // 清除匹配模式的缓存
    if (pattern) {
      await this.cacheService.invalidatePattern(pattern);
    } else {
      await this.cacheService.invalidatePattern('performance:*');
    }
    this.performanceCache.clear();
  }
}

// src/analytics/services/health-analytics.service.ts
@Injectable()
export class HealthAnalyticsService implements IHealthAnalytics {
  private healthScoreCache: { value: number; timestamp: number } | null = null;
  private readonly CACHE_TTL = 15000; // 15秒缓存

  constructor(
    private readonly performanceMonitor: MetricsPerformanceService,
    private readonly cacheService: AnalyticsCacheService
  ) {}

  getHealthScore(): number {
    // 简单缓存避免重复计算
    const now = Date.now();
    if (this.healthScoreCache && (now - this.healthScoreCache.timestamp) < this.CACHE_TTL) {
      return this.healthScoreCache.value;
    }

    // 获取现有数据，避免重复查询
    const summary = this.performanceMonitor.getPerformanceSummary();
    const score = this.calculateHealthScore(summary);
    
    this.healthScoreCache = { value: score, timestamp: now };
    return score;
  }

  getHealthStatus(score?: number): HealthStatus {
    const healthScore = score ?? this.getHealthScore();
    // 使用常量映射而非硬编码
    return HEALTH_THRESHOLDS.getStatus(healthScore);
  }

  async getDetailedHealthReport(): Promise<DetailedHealthReportDto> {
    const score = this.getHealthScore();
    const status = this.getHealthStatus(score);
    const issues = this.identifyIssues(score);
    const recommendations = this.generateRecommendations(issues);

    return {
      score,
      status,
      issues,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  private identifyIssues(score: number): string[] {
    // 基于分数和阈值识别问题（可选实现）
    const issues: string[] = [];
    if (score < HEALTH_THRESHOLDS.WARNING.score) {
      issues.push('系统健康度低于警告阈值');
    }
    return issues;
  }

  private generateRecommendations(issues: string[]): string[] {
    // 基于问题生成建议（可选实现）
    return issues.map(issue => `建议检查: ${issue}`);
  }

  private calculateHealthScore(summary: any): number {
    // 复用现有的计算逻辑
    return this.performanceMonitor.calculateHealthScore(
      summary.endpoints || [],
      summary.database || {},
      summary.system || {}
    );
  }
}
```

#### **1.3 健康状态常量定义（对齐统一常量）**

```typescript
// src/analytics/constants/analytics.constants.ts

/**
 * ⚠️ 重要：所有常量必须优先引用或对齐 @common/constants/unified
 * 避免创建常量孤岛，确保全系统度量衡一致性
 * 
 * 如需新增常量，请先检查 @common/constants/unified 是否已有定义
 * 若确需新增，请在此处显式注释其与统一常量的关系
 */

import { PERFORMANCE_THRESHOLDS as UNIFIED_THRESHOLDS } from '@common/constants/unified/performance.constants';

export const HEALTH_THRESHOLDS = {
  HEALTHY: { score: 90, label: 'healthy', description: '系统运行健康' },
  WARNING: { score: 70, label: 'warning', description: '系统出现警告' },
  DEGRADED: { score: 50, label: 'degraded', description: '系统性能下降' },
  UNHEALTHY: { score: 0, label: 'unhealthy', description: '系统状态异常' },

  getStatus(score: number): string {
    if (score >= this.HEALTHY.score) return this.HEALTHY.label;
    if (score >= this.WARNING.score) return this.WARNING.label;
    if (score >= this.DEGRADED.score) return this.DEGRADED.label;
    return this.UNHEALTHY.label;
  },

  getDescription(score: number): string {
    if (score >= this.HEALTHY.score) return this.HEALTHY.description;
    if (score >= this.WARNING.score) return this.WARNING.description;
    if (score >= this.DEGRADED.score) return this.DEGRADED.description;
    return this.UNHEALTHY.description;
  }
} as const;

// 复用统一常量，避免重复定义
export const PERFORMANCE_THRESHOLDS = {
  ...UNIFIED_THRESHOLDS,
  // 若需Analytics特有阈值，在此添加并注释原因
  // ANALYTICS_SPECIFIC_THRESHOLD: 100, // Analytics组件专用，用于XXX场景
};
```

#### **1.4 接口定义**

```typescript
// src/analytics/interfaces/performance-analytics.interface.ts
export interface IPerformanceAnalytics {
  getPerformanceSummary(startDate?: string, endDate?: string): Promise<PerformanceSummaryDto>;
  invalidateCache(pattern?: string): Promise<void>;
}

// src/analytics/interfaces/health-analytics.interface.ts
export interface IHealthAnalytics {
  getHealthScore(): number;
  getHealthStatus(score?: number): HealthStatus;
  getDetailedHealthReport(): Promise<DetailedHealthReportDto>;
}
```

#### **1.5 精简的Monitoring控制器**

```typescript
// src/monitoring/controller/monitoring.controller.ts
@Controller("monitoring")
export class MonitoringController {
  constructor(
    // ✅ 注入接口而非具体类
    @Inject('IPerformanceAnalytics')
    private readonly performanceAnalytics: IPerformanceAnalytics,
    @Inject('IHealthAnalytics')
    private readonly healthAnalytics: IHealthAnalytics,
  ) {}

  @Auth([UserRole.ADMIN])
  @Get("performance")
  async getPerformanceMetrics(@Query() query: GetDbPerformanceQueryDto): Promise<PerformanceMetricsDto> {
    // 🔸 职责1: 参数验证（通过DTO自动完成）
    // 🔸 职责2: 调用分析服务
    // 🔸 职责3: 返回数据（由全局Interceptor包装）
    return this.performanceAnalytics.getPerformanceSummary(query.startDate, query.endDate);
  }

  @Auth([UserRole.ADMIN])
  @Get("health/detailed")
  async getDetailedHealthStatus() {
    // 直接委托给健康分析服务
    return this.healthAnalytics.getDetailedHealthReport();
  }

  @Public()
  @Get("health")
  async getHealthStatus() {
    return {
      status: "operational",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "系统运行正常"
    };
  }

  // ✅ 已删除所有业务逻辑私有方法
  // - determineHealthStatus() → 移到HealthAnalyticsService
  // - identifyIssues() → 移到HealthAnalyticsService
  // - generateRecommendations() → 移到HealthAnalyticsService
  // - calculateTrends() → 移到PerformanceAnalyticsService
  // - categorizePriority() → 移到HealthAnalyticsService
  
  // 💡 单位转换和默认值处理保持在DTO层/拦截器层
}
```

#### **1.6 依赖关系重构**

```typescript
// 原有依赖（循环和重叠）
Monitoring → Metrics ← 各业务模块
    ↑         ↓
    └─── 重叠逻辑 ────┘

// 新的依赖关系（清晰分层）
各业务模块 → Metrics (数据收集)
              ↓
           Analytics (数据分析)
              ↓
           Monitoring (API接口)
```


## 推荐方案：Analytics组件方案（含优化建议）

### 核心优化建议

#### **优化1: 统一健康状态定义**

将分散在Metrics和Monitoring组件中的健康状态定义统一到Analytics组件，确保健康评分的权威性和一致性。

**优化后统一定义:**
```typescript
// src/analytics/constants/analytics.constants.ts
export const HEALTH_THRESHOLDS = {
  HEALTHY: { 
    score: 90, 
    label: 'healthy', 
    description: '系统运行健康',
    color: '#10B981', // 绿色
    priority: 'low'
  },
  WARNING: { 
    score: 70, 
    label: 'warning', 
    description: '系统出现警告',
    color: '#F59E0B', // 黄色
    priority: 'medium'
  },
  DEGRADED: { 
    score: 50, 
    label: 'degraded', 
    description: '系统性能下降',
    color: '#EF4444', // 橙色
    priority: 'high'
  },
  UNHEALTHY: { 
    score: 0, 
    label: 'unhealthy', 
    description: '系统状态异常',
    color: '#DC2626', // 红色
    priority: 'critical'
  },
} as const;

export const HEALTH_SCORE_WEIGHTS = {
  ERROR_RATE: 30,        // 错误率权重
  RESPONSE_TIME: 25,     // 响应时间权重
  CPU_USAGE: 20,         // CPU使用率权重
  MEMORY_USAGE: 15,      // 内存使用率权重
  DB_PERFORMANCE: 10,    // 数据库性能权重
} as const;

export const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_MS: 1000,
  SLOW_QUERY_MS: 500,
  HIGH_ERROR_RATE: 0.05,
  HIGH_CPU_USAGE: 0.8,
  HIGH_MEMORY_USAGE: 0.9,
  LOW_CACHE_HIT_RATE: 0.7,
} as const;
```
> **常量归一化说明**: `analytics.constants.ts` 中新增的阈值（如 `SLOW_REQUEST_MS`）应优先引用或对齐全局统一常量库 `@common/constants/unified/performance.constants.ts` 中的定义。此举旨在避免形成新的常量孤岛，确保全系统度量衡一致。

#### **优化2: 增加智能缓存层**

Analytics组件是引入缓存的最佳位置，因为计算成本高且结果可以短期复用。

```typescript
// src/analytics/services/performance-analytics.service.ts
@Injectable()
export class PerformanceAnalyticsService implements IPerformanceAnalytics {
  private readonly CACHE_TTL = { PERFORMANCE_SUMMARY: 30 }; // 30秒缓存

  constructor(
    // ...
    @Inject('CACHE_SERVICE') private readonly cache: CacheService
  ) {}

  async getPerformanceSummary(startDate?: string, endDate?: string): Promise<PerformanceSummaryDto> {
    const cacheKey = `analytics:performance_summary:${startDate || 'now'}:${endDate || 'now'}`;
    
    // 🚀 缓存优先策略
    const cached = await this.cache.get<PerformanceSummaryDto>(cacheKey);
    if (cached) return cached;

    // ... 计算新数据
    const summary = await this.metricsCalculator.calculatePerformanceSummary(/*...*/);

    // 🗄️ 缓存结果
    await this.cache.setex(cacheKey, this.CACHE_TTL.PERFORMANCE_SUMMARY, summary);
    return summary;
  }

  // 🧹 缓存失效管理
  async invalidateCache(pattern?: string): Promise<void> {
    const keyPattern = pattern || 'analytics:*';
    await this.cache.del(keyPattern);
    this.logger.info('Analytics cache invalidated', { pattern: keyPattern });
  }
}
```
> **缓存一致性提示**: 对健康状态与性能摘要的缓存，需在发生重要相关事件（如告警状态变更、阈值配置变更）时主动调用 `invalidateCache` 使其失效。建议 `Analytics` 服务监听配置变更等事件，以自动触发缓存清理。

#### **优化3: 严格依赖注入接口**

使用接口而非具体类，最大化利用依赖倒置原则。

```typescript
// src/analytics/interfaces/analytics.interface.ts
export interface IPerformanceAnalytics {
  getPerformanceSummary(startDate?: string, endDate?: string): Promise<PerformanceSummaryDto>;
  invalidateCache(pattern?: string): Promise<void>;
}

export interface IHealthAnalytics {
  getDetailedHealthReport(): Promise<DetailedHealthReportDto>;
}

// src/monitoring/controller/monitoring.controller.ts
@Controller("monitoring")
export class MonitoringController {
  constructor(
    // ✅ 注入接口而非具体类
    @Inject('IPerformanceAnalytics')
    private readonly performanceAnalytics: IPerformanceAnalytics,
    @Inject('IHealthAnalytics')
    private readonly healthAnalytics: IHealthAnalytics,
  ) {}
}
```

#### **优化4: 极简MonitoringController**

重构后的控制器应该极其轻量，只负责HTTP层面的职责。

```typescript
// src/monitoring/controller/monitoring.controller.ts
@Controller("monitoring")
export class MonitoringController {
  constructor(/*...依赖注入...*/) {}

  @Get("performance")
  async getPerformanceMetrics(@Query() query: GetDbPerformanceQueryDto): Promise<PerformanceMetricsDto> {
    // 🔸 职责1: 参数验证（通过DTO自动完成）
    // 🔸 职责2: 调用分析服务
    // 🔸 职责3: 返回数据（由全局Interceptor包装）
    return this.performanceAnalytics.getPerformanceSummary(query.startDate, query.endDate);
  }

  // ❌ 删除所有业务逻辑方法
}
```

#### **优化5: Analytics组件内置可观测性**

Analytics组件作为核心计算层，需要内置完善的可观测性机制，确保计算过程透明且可调试。

```typescript
// src/analytics/services/performance-analytics.service.ts
@Injectable()
export class PerformanceAnalyticsService {
  private readonly logger = createLogger('PerformanceAnalytics');
  private readonly metricsEmitter = new EventEmitter2();

  async calculateHealthScore(
    endpointMetrics: EndpointMetricsDto[],
    dbMetrics: DatabaseMetricsDto,
    systemMetrics: SystemMetricsDto,
  ): Promise<number> {
    const startTime = performance.now();
    const calculationId = `health_calc_${Date.now()}`;

    try {
      // 🎯 记录计算输入
      const inputMetrics = {
        calculationId,
        inputs: {
          endpointCount: endpointMetrics.length,
          avgResponseTime: this.calculateOverallAverageResponseTime(endpointMetrics),
          errorRate: this.calculateOverallErrorRate(endpointMetrics),
          cpuUsage: systemMetrics.cpuUsage,
          memoryUsage: systemMetrics.memoryUsage / systemMetrics.heapTotal,
          dbQueryTime: dbMetrics.averageQueryTime,
        }
      };

      this.logger.debug('健康评分计算开始', inputMetrics);

      // 🧮 执行分步计算并记录每步扣分
      const scoreBreakdown = this.calculateScoreWithBreakdown(inputMetrics.inputs);
      
      const result = {
        calculationId,
        finalScore: scoreBreakdown.finalScore,
        breakdown: scoreBreakdown.breakdown,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // 📊 发射性能指标事件
      this.metricsEmitter.emit('analytics.health_score.calculated', {
        score: result.finalScore,
        duration: result.duration,
        deductionCount: scoreBreakdown.breakdown.length
      });

      this.logger.info('健康评分计算完成', result);
      return result.finalScore;

    } catch (error) {
      const errorDetails = {
        calculationId,
        error: error.message,
        duration: performance.now() - startTime
      };

      this.metricsEmitter.emit('analytics.health_score.failed', errorDetails);
      this.logger.error('健康评分计算失败', errorDetails);
      throw error;
    }
  }

  private calculateScoreWithBreakdown(inputs: any): { finalScore: number; breakdown: any[] } {
    let score = PERFORMANCE_DEFAULTS.HEALTH_SCORE;
    const breakdown = [];

    // 错误率扣分
    if (inputs.errorRate > 0.05) {
      const deduction = Math.min(inputs.errorRate * 300, 30);
      score -= deduction;
      breakdown.push({
        metric: 'errorRate',
        value: inputs.errorRate,
        threshold: 0.05,
        deduction,
        reason: '错误率超过5%阈值'
      });
    }

    // 响应时间扣分
    if (inputs.avgResponseTime > 1000) {
      const deduction = Math.min((inputs.avgResponseTime - 1000) / 100, 25);
      score -= deduction;
      breakdown.push({
        metric: 'responseTime',
        value: inputs.avgResponseTime,
        threshold: 1000,
        deduction,
        reason: '平均响应时间超过1秒'
      });
    }

    // CPU使用率扣分
    if (inputs.cpuUsage > 0.8) {
      const deduction = (inputs.cpuUsage - 0.8) * 100;
      score -= deduction;
      breakdown.push({
        metric: 'cpuUsage',
        value: inputs.cpuUsage,
        threshold: 0.8,
        deduction,
        reason: 'CPU使用率超过80%'
      });
    }

    return {
      finalScore: Math.max(0, Math.round(score)),
      breakdown
    };
  }

  // 🔍 提供调试接口
  async getCalculationHistory(limit = 10): Promise<any[]> {
    // 返回最近的计算历史，用于调试和审计
    return this.calculationHistory.slice(-limit);
  }
}
```

#### **优化6: 多层级智能缓存设计**

基于Analytics组件的计算特点，设计多层级缓存策略以最大化性能。

```typescript
// src/analytics/services/analytics-cache.service.ts
@Injectable()
export class AnalyticsCacheService {
  private readonly logger = createLogger('AnalyticsCache');
  
  // L1: 内存LRU缓存（最快，小容量）
  private readonly memoryCache = new LRU<string, any>({
    max: 100,
    ttl: 30 * 1000 // 30秒
  });

  constructor(
    @Inject('CACHE_SERVICE') private readonly redisCache: CacheService,
    private readonly configService: ConfigService
  ) {}

  async get<T>(key: string, options?: { skipMemory?: boolean }): Promise<T | null> {
    const fullKey = `analytics:${key}`;

    try {
      // L1: 内存缓存检查
      if (!options?.skipMemory && this.memoryCache.has(fullKey)) {
        this.logger.debug('L1缓存命中', { key: fullKey });
        return this.memoryCache.get(fullKey);
      }

      // L2: Redis缓存检查  
      const redisValue = await this.redisCache.get<T>(fullKey);
      if (redisValue) {
        this.logger.debug('L2缓存命中', { key: fullKey });
        // 回填L1缓存
        this.memoryCache.set(fullKey, redisValue);
        return redisValue;
      }

      this.logger.debug('缓存未命中', { key: fullKey });
      return null;

    } catch (error) {
      this.logger.warn('缓存获取失败，降级到计算模式', { 
        key: fullKey, 
        error: error.message 
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `analytics:${key}`;
    const cacheTTL = ttl || this.getDefaultTTL(key);

    try {
      // 同时写入L1和L2缓存
      this.memoryCache.set(fullKey, value);
      await this.redisCache.setex(fullKey, cacheTTL, value);
      
      this.logger.debug('缓存写入成功', { 
        key: fullKey, 
        ttl: cacheTTL,
        size: JSON.stringify(value).length 
      });

    } catch (error) {
      this.logger.error('缓存写入失败', { 
        key: fullKey, 
        error: error.message 
      });
      // 缓存失败不影响主流程
    }
  }

  // 🎯 智能TTL计算
  private getDefaultTTL(key: string): number {
    const baseConfig = {
      'performance_summary': 30,    // 性能摘要：30秒
      'health_score': 15,          // 健康评分：15秒  
      'endpoint_metrics': 10,      // 端点指标：10秒
      'optimization_advice': 300,  // 优化建议：5分钟
    };

    // 根据市场状态动态调整TTL
    const marketStatus = this.getMarketStatus();
    const multiplier = marketStatus === 'open' ? 0.5 : 2.0; // 开市期间缓存时间减半

    const baseTTL = baseConfig[key] || 60;
    return Math.round(baseTTL * multiplier);
  }

  private getMarketStatus(): 'open' | 'closed' {
    const now = new Date();
    const hour = now.getHours();
    
    // 简化的市场时间判断（实际应考虑多个市场和节假日）
    return (hour >= 9 && hour <= 16) ? 'open' : 'closed';
  }

  // 🧹 缓存管理和统计
  async getStats(): Promise<any> {
    return {
      memory: {
        size: this.memoryCache.size,
        maxSize: this.memoryCache.max,
        hitRate: this.memoryCache.calculatedSize / (this.memoryCache.calculatedSize || 1)
      },
      redis: await this.redisCache.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // 清除匹配模式的缓存
    const keys = Array.from(this.memoryCache.keys()).filter(key => 
      key.includes(pattern)
    );
    
    keys.forEach(key => this.memoryCache.delete(key));
    await this.redisCache.del(`analytics:*${pattern}*`);
    
    this.logger.info('缓存模式失效', { pattern, affectedKeys: keys.length });
  }
}
```

#### **优化7: 性能计算优化与批处理**

针对Analytics组件的计算密集特点，优化计算性能和支持批处理。

```typescript
// src/analytics/services/metrics-calculator.service.ts
@Injectable()
export class MetricsCalculatorService {
  private readonly logger = createLogger('MetricsCalculator');
  
  // 🚀 批量端点指标计算（向量化优化）
  calculateEndpointMetrics(rawData: RawEndpointData[]): EndpointMetricsDto[] {
    if (!rawData?.length) return [];

    // 按端点分组以便批量处理
    const groupedData = this.groupByEndpoint(rawData);
    
    return Object.entries(groupedData).map(([endpoint, data]) => {
      const responseTimes = data.map(d => d.responseTime).sort((a, b) => a - b);
      const totalRequests = data.length;
      const failedRequests = data.filter(d => !d.success).length;

      // 🧮 优化的百分位数计算
      const percentiles = this.calculatePercentilesOptimized(responseTimes);

      return {
        endpoint: endpoint.split(':')[2],
        method: endpoint.split(':')[1],
        totalRequests,
        successfulRequests: totalRequests - failedRequests,
        failedRequests,
        averageResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0,
        p95ResponseTime: percentiles.p95,
        p99ResponseTime: percentiles.p99,
        lastMinuteRequests: responseTimes.length,
        errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      };
    }).sort((a, b) => b.totalRequests - a.totalRequests);
  }

  // 🎯 优化的百分位数计算（避免重复排序）
  private calculatePercentilesOptimized(sortedTimes: number[]): { p95: number; p99: number } {
    if (sortedTimes.length === 0) return { p95: 0, p99: 0 };
    
    const p95Index = Math.max(0, Math.floor(sortedTimes.length * 0.95) - 1);
    const p99Index = Math.max(0, Math.floor(sortedTimes.length * 0.99) - 1);
    
    return {
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0
    };
  }

  // 📊 流式计算支持（大数据集优化）
  async calculatePerformanceSummaryStream(
    dataStream: AsyncIterable<any>
  ): Promise<PerformanceSummaryDto> {
    const accumulator = {
      totalRequests: 0,
      totalErrors: 0,
      responseTimeSum: 0,
      systemMetrics: null as SystemMetricsDto | null
    };

    // 流式处理避免内存溢出
    for await (const batch of dataStream) {
      this.updateAccumulator(accumulator, batch);
    }

    return this.finalizePerformanceSummary(accumulator);
  }

  private groupByEndpoint(data: RawEndpointData[]): Record<string, RawEndpointData[]> {
    return data.reduce((groups, item) => {
      const key = `${item.method}:${item.endpoint}`;
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, RawEndpointData[]>);
  }
}

### 迁移映射表

为确保迁移过程清晰无遗漏，特制定以下边界清单：

| 迁移来源 | 迁移内容 (移走) | 保留内容 (不动) | 目标位置 |
| :--- | :--- | :--- | :--- |
| **`metrics/services/metrics-performance.service.ts`** | `getPerformanceSummary` (封装调用)<br>`calculateHealthScore` (封装调用) | `record*` 系列数据采集方法<br>`getEndpointMetrics`<br>`getDatabaseMetrics`<br>`getSystemMetrics`<br>原始数据获取方法<br>定时数据采集任务<br>事件发射逻辑 | `PerformanceAnalyticsService`<br>`HealthAnalyticsService` |
| **`monitoring/controller/monitoring.controller.ts`** | `determineHealthStatus`<br>`identifyIssues`<br>`generateRecommendations`<br>`calculateTrends`<br>`categorizePriority` | 参数校验逻辑<br>权限控制<br>路由定义 | `HealthAnalyticsService` |
| **单位转换逻辑** | 数据单位转换<br>默认值处理 | - | DTO层或全局拦截器 |

### 实施步骤

#### **阶段1: 创建Analytics组件（1-2天）**
1. 创建`src/analytics/`目录结构
2. 实现核心服务：
   - `PerformanceAnalyticsService` - 性能数据分析与缓存
   - `HealthAnalyticsService` - 健康状态评估与报告
   - `AnalyticsCacheService` - 两级缓存管理
   - `MetricsCalculatorService` - 指标计算优化
3. 定义接口：
   - `IPerformanceAnalytics` - 性能分析接口契约
   - `IHealthAnalytics` - 健康分析接口契约
4. 配置常量（确保与`@common/constants/unified`对齐）

#### **阶段2: 迁移计算逻辑（2-3天）**
1. 迁移业务逻辑：
   - Monitoring控制器方法 → `HealthAnalyticsService`
   - 性能计算封装 → `PerformanceAnalyticsService`
2. 实现缓存失效机制：
   - 配置变更事件监听
   - 主动失效策略
3. 更新测试用例，确保功能等价

#### **阶段3: 重构依赖关系（1-2天）**
1. 更新MonitoringController：
   - 注入`IPerformanceAnalytics`和`IHealthAnalytics`接口
   - 删除所有业务逻辑方法
2. 配置依赖注入providers：
   ```typescript
   providers: [
     { provide: 'IPerformanceAnalytics', useClass: PerformanceAnalyticsService },
     { provide: 'IHealthAnalytics', useClass: HealthAnalyticsService },
   ]
   ```
3. 运行集成测试验证

#### **阶段4: 清理和优化（1天）**
1. 删除MonitoringController中的冗余方法
2. 迁移单位转换逻辑到DTO/拦截器
3. 更新API文档和Swagger注解
4. 性能基准测试对比

### 风险与回滚策略

- **依赖注入切换风险**: 模块的导入/导出链路调整期间，可能存在短暂的服务不可用。
  - **应对策略**: 建议采用“灰度发布”策略。先引入 `AnalyticsModule`，在 `MonitoringController` 中通过配置开关控制调用新服务还是旧服务。确认新服务行为与旧服务完全等价后，再移除旧逻辑和开关。
- **测试回归风险**: 分析逻辑的迁移可能引入计算偏差。
  - **应对策略**:
    1. **表格化单元测试**: 为 `HealthAnalyticsService` 编写覆盖边界阈值和极端场景的表格驱动测试（输入一组指标 -> 断言各项扣分 -> 断言最终状态）。
    2. **缓存专项测试**: 为 `PerformanceAnalyticsService` 的缓存命中（hit）和未命中（miss）分支编写专门的测试用例。

### 预期收益

1. **代码减少**: 消除约30%的重复代码
2. **维护效率**: 修改分析逻辑时间减少50%
3. **测试覆盖**: 独立组件测试覆盖率提升
4. **系统稳定性**: 清晰的职责边界减少bug
5. **开发效率**: 新功能开发更快更可靠
