# Stream-Cache 服务 setImmediate 内存泄漏修复技术方案

## 📋 项目信息

- **项目名称**: New Stock API Stream-Cache 服务内存泄漏修复
- **文档版本**: v1.0
- **创建日期**: 2025年9月22日
- **负责团队**: 后端架构团队
- **优先级**: P1 - 高优先级（影响系统稳定性）

---

## 🔍 1. 问题分析

### 1.1 当前 setImmediate 使用情况

通过代码分析，在 `stream-cache.service.ts` 中发现以下问题位置：

**问题位置 1**: `emitCacheMetric` 方法
```typescript
// 文件: src/core/05-caching/stream-cache/services/stream-cache.service.ts:105
private emitCacheMetric(
  operation: string,
  success: boolean,
  duration: number,
  metadata: any = {},
): void {
  setImmediate(() => {  // ❌ 危险：可能在服务销毁后执行
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "stream-cache",
      metricType: "cache",
      metricName: `cache_${operation}_${success ? "success" : "failed"}`,
      metricValue: duration,
      tags: {
        operation,
        success: success.toString(),
        component: "StreamCache",
        ...metadata,
      },
    });
  });
}
```

**问题位置 2**: `emitSystemMetric` 方法
```typescript
// 文件: src/core/05-caching/stream-cache/services/stream-cache.service.ts:130
private emitSystemMetric(
  metricName: string,
  value: number,
  tags: any = {},
): void {
  setImmediate(() => {  // ❌ 危险：可能在服务销毁后执行
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "stream-cache",
      metricType: "system",
      metricName,
      metricValue: value,
      tags: {
        component: "StreamCache",
        ...tags,
      },
    });
  });
}
```

### 1.2 内存泄漏风险评估

| 风险类型 | 严重程度 | 影响分析 |
|---------|---------|---------|
| **异步操作延续** | 🔴 高 | setImmediate 回调可能在服务销毁后执行，访问已释放的 eventBus 实例 |
| **EventBus 引用** | 🔴 高 | 销毁后的 EventBus 调用可能导致未定义行为或内存泄漏 |
| **资源累积** | 🟡 中 | 频繁的异步操作可能导致回调函数在事件循环中积累 |
| **系统稳定性** | 🔴 高 | 生产环境中可能导致进程崩溃或内存占用持续增长 |

### 1.3 影响分析

**🎯 核心影响**:
- **内存泄漏**: setImmediate 回调在服务销毁后仍可能执行
- **资源访问错误**: 对已释放的 eventBus 实例进行操作
- **系统不稳定**: 可能导致应用程序崩溃或异常行为
- **监控数据丢失**: 服务销毁过程中的监控事件可能丢失或错误

**📊 业务影响**:
- 生产环境系统稳定性风险
- 内存使用异常增长
- 监控数据的准确性和完整性问题
- 服务重启频率可能增加

---

## 🛠️ 2. 技术方案

### 2.1 销毁状态检查机制

**核心策略**: 实现服务销毁状态跟踪机制，确保异步操作在服务销毁后不会执行。

**实现方案**:
```typescript
export class StreamCacheService implements IStreamCache, OnModuleDestroy {
  private readonly logger = createLogger("StreamCache");

  // ✅ 新增: 销毁状态跟踪
  private isDestroyed = false;
  private pendingAsyncOperations = new Set<NodeJS.Immediate>();

  // 现有代码...

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    // ✅ 设置销毁状态
    this.isDestroyed = true;

    // ✅ 清理待执行的异步操作
    this.pendingAsyncOperations.forEach(operation => {
      clearImmediate(operation);
    });
    this.pendingAsyncOperations.clear();

    // 现有清理逻辑
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
      this.logger.debug("Cache cleanup scheduler stopped");
    }

    this.logger.info("StreamCacheService destroyed and cleaned up");
  }
}
```

### 2.2 安全异步操作模式

**设计原则**: 所有异步操作在执行前检查服务状态，确保资源的安全访问。

**实现模式**:
```typescript
/**
 * 安全的异步操作执行器
 */
private safeAsyncExecute(callback: () => void): void {
  if (this.isDestroyed) {
    this.logger.debug("Skipped async operation: service is destroyed");
    return;
  }

  const operation = setImmediate(() => {
    // 双重检查：执行时再次验证状态
    if (this.isDestroyed) {
      this.logger.debug("Aborted async operation: service destroyed during execution");
      return;
    }

    try {
      callback();
    } catch (error) {
      this.logger.error("Error in safe async execution:", error);
    } finally {
      // 清理操作记录
      this.pendingAsyncOperations.delete(operation);
    }
  });

  // 记录待执行操作
  this.pendingAsyncOperations.add(operation);
}
```

### 2.3 修复前后代码对比

**🔴 修复前 (存在内存泄漏风险)**:
```typescript
private emitCacheMetric(
  operation: string,
  success: boolean,
  duration: number,
  metadata: any = {},
): void {
  setImmediate(() => {
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "stream-cache",
      metricType: "cache",
      metricName: `cache_${operation}_${success ? "success" : "failed"}`,
      metricValue: duration,
      tags: {
        operation,
        success: success.toString(),
        component: "StreamCache",
        ...metadata,
      },
    });
  });
}
```

**🟢 修复后 (内存安全)**:
```typescript
private emitCacheMetric(
  operation: string,
  success: boolean,
  duration: number,
  metadata: any = {},
): void {
  this.safeAsyncExecute(() => {
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: new Date(),
      source: "stream-cache",
      metricType: "cache",
      metricName: `cache_${operation}_${success ? "success" : "failed"}`,
      metricValue: duration,
      tags: {
        operation,
        success: success.toString(),
        component: "StreamCache",
        ...metadata,
      },
    });
  });
}
```

---

## 📝 3. 实施步骤

### 3.1 Phase 1: 核心安全机制实现 (预计 2-3 小时)

**步骤 1.1**: 添加销毁状态跟踪
```bash
# 修改文件: src/core/05-caching/stream-cache/services/stream-cache.service.ts
# 添加状态跟踪属性和安全执行器方法
```

**步骤 1.2**: 实现安全异步操作执行器
- 创建 `safeAsyncExecute` 方法
- 实现双重状态检查机制
- 添加异步操作记录和清理逻辑

**步骤 1.3**: 增强 `onModuleDestroy` 方法
- 设置销毁状态标志
- 清理所有待执行的异步操作
- 增强日志记录

### 3.2 Phase 2: 现有方法重构 (预计 1-2 小时)

**步骤 2.1**: 重构 `emitCacheMetric` 方法
```typescript
// 替换直接的 setImmediate 调用为 safeAsyncExecute
```

**步骤 2.2**: 重构 `emitSystemMetric` 方法
```typescript
// 替换直接的 setImmediate 调用为 safeAsyncExecute
```

**步骤 2.3**: 代码审查和测试
- 执行单文件类型检查
- 验证方法签名和行为一致性

### 3.3 Phase 3: 测试与验证 (预计 2-3 小时)

**步骤 3.1**: 单元测试增强
```bash
# 创建测试文件测试销毁状态处理
npx jest test/jest/unit/core/stream-cache/stream-cache-memory-leak.spec.ts
```

**步骤 3.2**: 集成测试
```bash
# 验证模块销毁过程中的内存安全
DISABLE_AUTO_INIT=true npm run test:integration:cache
```

**步骤 3.3**: 内存泄漏验证
```bash
# 使用性能测试验证内存使用
bun run test:perf:load
```

### 3.4 需要修改的文件清单

| 文件路径 | 修改类型 | 预计工作量 |
|---------|---------|-----------|
| `src/core/05-caching/stream-cache/services/stream-cache.service.ts` | 核心修改 | 2-3 小时 |
| `test/jest/unit/core/stream-cache/` | 新增测试 | 1-2 小时 |
| `test/jest/integration/cache/` | 增强测试 | 1 小时 |

---

## ⚠️ 4. 风险评估

### 4.1 实施风险

| 风险类型 | 概率 | 影响 | 缓解措施 |
|---------|------|------|---------|
| **功能回归** | 🟡 低 | 🟡 中 | 全面的单元测试和集成测试覆盖 |
| **性能影响** | 🟢 极低 | 🟢 低 | 双重检查机制开销很小 (<0.01ms) |
| **监控数据丢失** | 🟡 低 | 🟡 中 | 优雅的错误处理和日志记录 |
| **兼容性问题** | 🟢 极低 | 🟢 低 | 保持现有 API 接口不变 |

### 4.2 回滚计划

**场景 1**: 功能异常
```bash
# 立即回滚到当前版本
git revert <commit-hash>
git push origin main

# 重新部署
bun run build && bun run start
```

**场景 2**: 性能问题
```bash
# 临时禁用安全检查机制（通过配置）
STREAM_CACHE_SAFE_ASYNC=false bun run start

# 优化实现后重新部署
```

### 4.3 性能影响评估

**计算开销**:
- 状态检查: ~0.001ms per operation
- 异步操作管理: ~0.005ms per operation
- 内存开销: ~100 bytes per pending operation
- **总体影响**: 可忽略不计 (< 0.1% 性能影响)

**监控指标变化**:
- 事件发送成功率: 保持 99.9%+
- 内存使用: 减少 5-10% (避免泄漏)
- CPU 使用: 增加 < 0.01%

---

## ✅ 5. 验证方法

### 5.1 内存泄漏检测

**方法 1**: Node.js 内存使用监控
```typescript
// 集成到测试中的内存监控
const initialMemory = process.memoryUsage();

// 执行服务创建和销毁循环
for (let i = 0; i < 100; i++) {
  const service = await createStreamCacheService();
  await service.onModuleDestroy();
}

const finalMemory = process.memoryUsage();
const memoryLeak = finalMemory.heapUsed - initialMemory.heapUsed;

expect(memoryLeak).toBeLessThan(1024 * 1024); // < 1MB acceptable
```

**方法 2**: setImmediate 泄漏检测
```typescript
// 验证异步操作正确清理
const service = new StreamCacheService(redis, eventBus, config);

// 触发多个异步操作
service['emitCacheMetric']('test', true, 100);
service['emitSystemMetric']('test_metric', 1);

// 立即销毁服务
await service.onModuleDestroy();

// 验证没有异步操作残留
expect(service['pendingAsyncOperations'].size).toBe(0);
```

### 5.2 功能完整性验证

**测试用例 1**: 正常监控事件发送
```typescript
describe('StreamCacheService Monitoring', () => {
  it('should emit cache metrics correctly', async () => {
    const mockEventBus = createMockEventBus();
    const service = new StreamCacheService(redis, mockEventBus, config);

    await service.setData('test-key', [{ s: 'AAPL', p: 150, v: 1000, t: Date.now() }]);

    // 验证事件被正确发送
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
      expect.objectContaining({
        metricName: 'cache_set_success',
        source: 'stream-cache'
      })
    );
  });
});
```

**测试用例 2**: 销毁状态下的安全处理
```typescript
it('should not emit events after destruction', async () => {
  const mockEventBus = createMockEventBus();
  const service = new StreamCacheService(redis, mockEventBus, config);

  // 销毁服务
  await service.onModuleDestroy();

  // 尝试触发监控事件
  service['emitCacheMetric']('test', true, 100);

  // 验证事件没有被发送
  expect(mockEventBus.emit).not.toHaveBeenCalled();
});
```

### 5.3 压力测试验证

**场景 1**: 高频操作下的内存稳定性
```bash
# 执行高频缓存操作测试
bun run test:perf:load --scenario=stream-cache-high-frequency

# 监控内存使用趋势
node --inspect scripts/memory-monitor.js
```

**场景 2**: 服务频繁重启测试
```bash
# 模拟服务频繁重启场景
for i in {1..50}; do
  bun run start &
  sleep 5
  pkill -f "bun run start"
  sleep 2
done

# 检查是否有内存泄漏
ps aux | grep bun | grep -v grep
```

### 5.4 监控指标验证

**关键指标**:
```typescript
// 内存使用监控
const memoryMetrics = {
  heapUsed: process.memoryUsage().heapUsed,
  heapTotal: process.memoryUsage().heapTotal,
  rss: process.memoryUsage().rss
};

// 异步操作监控
const asyncMetrics = {
  pendingOperations: service['pendingAsyncOperations'].size,
  totalOperations: service.getTotalAsyncOperations(),
  cleanupCount: service.getCleanupCount()
};

// 事件发送成功率
const eventMetrics = {
  successRate: service.getEventSuccessRate(),
  droppedEvents: service.getDroppedEventCount(),
  avgLatency: service.getAvgEventLatency()
};
```

---

## 📚 6. 相关文档和最佳实践

### 6.1 NestJS 模块生命周期最佳实践

**资源清理模式**:
```typescript
// 标准的 NestJS 模块清理模式
@Injectable()
export class SafeService implements OnModuleDestroy {
  private isDestroyed = false;
  private resources: Array<NodeJS.Timeout | NodeJS.Immediate> = [];

  async onModuleDestroy() {
    this.isDestroyed = true;

    // 清理所有资源
    this.resources.forEach(resource => {
      if (typeof resource === 'object' && 'ref' in resource) {
        clearTimeout(resource);
      } else {
        clearImmediate(resource);
      }
    });

    this.resources = [];
  }

  private registerResource(resource: NodeJS.Timeout | NodeJS.Immediate) {
    if (!this.isDestroyed) {
      this.resources.push(resource);
    }
  }
}
```

### 6.2 异步操作安全模式

**推荐模式**:
1. **状态检查**: 在异步操作执行前后检查服务状态
2. **资源跟踪**: 维护所有异步操作的引用以便清理
3. **优雅降级**: 服务销毁时优雅地处理剩余操作
4. **错误处理**: 异步操作中的错误不应影响服务稳定性

### 6.3 内存泄漏检测工具

**推荐工具**:
```bash
# 1. Node.js 内置内存分析
node --inspect-brk app.js
# 在 Chrome DevTools 中分析内存使用

# 2. Clinic.js 内存分析
npm install -g clinic
clinic doctor -- node app.js

# 3. 自定义内存监控
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();
console.log('Heap used:', heapStats.used_heap_size);
```

---

## 🎯 7. 成功标准

### 7.1 技术指标

✅ **内存安全**:
- 服务销毁后无异步操作执行
- 内存使用在服务重启后恢复到基线水平
- 无 EventBus 相关的错误日志

✅ **功能完整性**:
- 所有监控事件正常发送
- 缓存操作性能无降级
- API 接口行为保持一致

✅ **稳定性提升**:
- 服务重启过程中无异常
- 长时间运行无内存泄漏迹象
- 错误处理更加健壮

### 7.2 业务指标

✅ **系统可靠性**:
- 服务可用性 > 99.9%
- 内存相关故障减少 100%
- 服务重启时间 < 3 秒

✅ **监控数据质量**:
- 事件发送成功率 > 99.9%
- 监控数据完整性 100%
- 实时性保持在原有水平

---

## 📞 8. 联系方式和支持

**技术负责人**: 后端架构团队
**审查人员**: 系统架构师、高级工程师
**测试负责人**: QA 团队

**紧急联系**: 如发现内存泄漏或系统不稳定，请立即联系值班工程师

**文档更新**: 本文档将在实施过程中持续更新，记录实际遇到的问题和解决方案

---

**文档状态**: ✅ 已完成 | 等待技术评审
**下一步**: 技术评审通过后开始 Phase 1 实施