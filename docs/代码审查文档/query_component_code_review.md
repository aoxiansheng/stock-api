# Query 代码审核说明

## 概述
本文档记录 Query 组件存在的问题和需要改进的地方。

## 发现的问题





### 1. 内存泄漏风险 ❌

**潜在问题：**
- ❌ **事件监听器清理**：`EventEmitter2` 监听器没有在模块销毁时清理
- ❌ **大对象处理**：批量数据处理时缺乏流式处理

**具体风险：**
- 4个服务类都使用`EventEmitter2`但都没有清理逻辑：
  - `QueryService.onModuleDestroy()` 只记录日志，未清理事件监听器
  - `QueryStatisticsService`、`QueryExecutionEngine`、`QueryMemoryMonitorService` 缺少清理机制
- 大批量查询可能导致内存占用过高

**改进建议：**
```typescript
// 🔧 全面的清理策略
async onModuleDestroy(): Promise<void> {
  try {
    // 1. 清理事件监听器（原建议）
    this.eventBus.removeAllListeners(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED);

    // 2. 清理定时器（新增）
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    // 3. 清理缓存引用（新增）
    this.pendingQueries?.clear();

    this.logger.log("QueryService模块资源清理完成");
  } catch (error) {
    this.logger.error("QueryService模块清理失败", error.stack);
  }
}
```

### 2. 系统指标获取未实现 ❌

**问题：**
- ❌ **使用硬编码值**：`QueryMemoryMonitorService` 中使用固定值 `memoryPercentage = 0.5`
- ❌ **未获取真实系统指标**：注释显示 "TODO: 实现从事件驱动监控系统获取系统指标的方法"

**问题位置：**
`query-memory-monitor.service.ts:61`

**正确的事件驱动集成方案：**
```typescript
// 🔧 遵循事件驱动架构，直接使用Node.js API获取指标
export class QueryMemoryMonitorService {
  constructor(
    private readonly eventBus: EventEmitter2,  // 仅注入事件总线
  ) {}

  private async checkMemoryUsage(): Promise<void> {
    // 1. 直接使用Node.js API获取真实系统指标
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const cpus = os.cpus();

    const memoryPercentage = memUsage.rss / heapStats.heap_size_limit;
    const cpuUsage = cpus.length > 0 ? Math.min(os.loadavg()[0] / cpus.length, 1) : 0;

    // 2. 通过事件总线发送监控指标（解耦设计）
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: 'query_memory_monitor',
        metricType: 'system',
        metricName: 'memory_pressure',
        metricValue: memoryPercentage,
        tags: {
          component: 'query',
          operation: 'memory_check',
          cpu_usage: cpuUsage,
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          threshold_exceeded: memoryPercentage > 0.8
        }
      });
    });

    // 3. 内存压力判断和处理
    if (memoryPercentage > 0.8) {
      this.logger.warn('内存使用率过高，触发降级策略', {
        memoryPercentage,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024)
      });
      // 执行内存压力处理逻辑...
    }
  }
}
```

**注意事项：**
- ✅ 保持事件驱动架构，不直接依赖 `MonitoringService`
- ✅ 使用 Node.js 原生 API 获取系统指标（与 `CollectorService` 实现一致）
- ✅ 通过 `SYSTEM_STATUS_EVENTS.METRIC_COLLECTED` 事件上报指标

## 改进优先级与实施建议

### 🎯 立即执行（本月内 - 技术可行性: ✅ 高）
1. **内存泄漏修复** - 影响系统稳定性，必须立即解决
   - 所有服务类实现完整的`onModuleDestroy`清理逻辑
   - 清理EventEmitter2监听器、定时器、缓存引用

2. **系统指标获取实现** - 替换硬编码值，提供真实监控数据
   - 使用 Node.js 原生 API (`process.memoryUsage()`, `v8.getHeapStatistics()`)
   - 通过事件总线上报指标，保持架构解耦
   - 实现内存压力检测和响应机制


## 修正总结

### 📋 文档评价与修正
- **问题识别**: ✅ 内存泄漏问题准确
- **架构理解**: ❌→✅ 原方案违背事件驱动架构，已修正为符合现有架构的方案
- **解决方案**: 已更新为遵循事件驱动模式的正确实现

### 🔧 主要修正内容
1. **移除错误的服务依赖方案**: 删除了直接注入 `MonitoringService` 的建议
2. **采用事件驱动方案**: 通过 `EventEmitter2` 和 `SYSTEM_STATUS_EVENTS` 上报指标
3. **使用原生 API**: 直接使用 Node.js API 获取系统指标，与 `CollectorService` 保持一致

### ✅ 架构原则确认
- **保持解耦**: 业务组件不直接依赖监控服务
- **事件驱动**: 通过事件总线进行组件间通信
- **性能优先**: 使用 `setImmediate()` 异步发送事件，不影响主流程

建议立即着手解决内存泄漏问题和实现真实系统指标获取，这两个问题对系统稳定性影响最大且实施难度最低。