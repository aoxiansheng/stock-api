# 遗留代码清理计划：StreamReceiver 服务阶段性修复

> 目标：在不改变接口契约和业务行为的前提下，系统性清理 `StreamReceiverService` 中的遗留问题，包括显性技术债（未使用依赖、重复统计等）和隐性架构风险（内存泄漏、并发安全等），提高系统稳定性、可维护性和可观测性。

## 一、范围与背景

### 组件定位
- **核心文件**：`src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
- **架构地位**：7组件架构中的实时流数据入口，负责WebSocket连接管理和数据流转
- **当前状态**：已按 Phase 4 架构运行（Fetcher承担连接、Transformer统一转换、管道化处理与指标埋点）

### 问题分类

#### 1. 显性技术债（文档已识别）
- 未使用依赖注入残留（旧 `SymbolMapperService`）
- 批量统计重复累计，监控数据翻倍错误
- 取消订阅的 `clientId` 使用占位实现
- Provider 标签从符号启发式推断，监控维度可能偏差
- `transDataRuleListType` 字符串替换逻辑脆弱

#### 2. 隐性架构风险（新增识别）
- **连接内存泄漏风险**：`activeConnections` Map缺少清理机制
- **并发安全问题**：`batchProcessingStats`缺少并发保护
- **批量处理错误恢复**：管道失败时缺少重试和降级策略
- **监控性能影响**：高频场景下的监控开销未优化

## 二、证据定位（代码片段）

### 显性技术债证据

#### 1. 未使用依赖（导入与构造注入）
```typescript
// 第3行：导入未使用的服务
import { SymbolMapperService } from '../../../00-prepare/symbol-mapper/services/symbol-mapper.service';

// 第65行：注入但未使用
constructor(
  private readonly symbolMapperService: SymbolMapperService, // ❌ 未使用
  private readonly symbolTransformerService: SymbolTransformerService, // ✅ 实际使用
  // ...其他依赖
)

// 第612-616行：实际使用的是SymbolTransformerService
const mappedResult = await this.symbolTransformerService.transformSymbolsForProvider(
  providerName, 
  [symbol], 
  `map_${Date.now()}`
);
```

#### 2. 批量统计重复累计（双重统计）
```typescript
// 第777-778行：processBatch方法中第一次累计
this.batchProcessingStats.totalBatches++;
this.batchProcessingStats.totalQuotes += batch.length;

// 第1031-1033行：recordPipelineMetrics方法中第二次累计（导致数据翻倍）
this.batchProcessingStats.totalBatches++;  // ❌ 重复累计
this.batchProcessingStats.totalQuotes += metrics.quotesCount;  // ❌ 重复累计
```

#### 3. 取消订阅使用硬编码clientId
```typescript
// 第148行：TODO标记明确
const clientId = 'temp_client_id'; // TODO: 从WebSocket连接上下文获取
```

#### 4. Provider标签启发式推断
```typescript
// 第1126-1137行：仅基于符号格式判断，不准确
private extractProviderFromSymbol(symbol: string): string {
  if (symbol.includes('.HK')) return 'longport';
  else if (symbol.includes('.US')) return 'longport';
  else if (symbol.includes('.SZ') || symbol.includes('.SH')) return 'longport';
  else return 'unknown';
}
```

#### 5. 能力映射字符串替换脆弱
```typescript
// 第871行：硬编码的字符串操作
transDataRuleListType: capability.replace('stream-', '').replace('-', '_')
```

### 隐性架构风险证据

#### 1. 连接内存泄漏风险
```typescript
// 第53行：Map无上限和清理机制
private readonly activeConnections = new Map<string, StreamConnection>();

// 连接添加但缺少完整清理逻辑
this.activeConnections.set(connectionId, connection);
// 缺少：定期清理断开连接、连接数上限控制等
```

#### 2. 并发安全问题
```typescript
// 第50-56行：统计对象缺少并发保护
private batchProcessingStats = {
  totalBatches: 0,
  totalQuotes: 0,
  batchProcessingTime: 0,
  // 多个异步方法同时修改，存在竞态条件
};
```

#### 3. 批量处理错误恢复缺失
```typescript
// 第850-900行：管道处理缺少完整错误恢复
try {
  const result = await this.processPipeline(batch, provider, capability);
  // ...
} catch (error) {
  this.logger.error('管道处理失败', error);
  // ❌ 缺少：重试机制、降级策略、断路器模式
}
```

## 三、影响分析与优先级评估

### 显性技术债影响

| 问题 | 风险级别 | 业务影响 | 技术影响 | 可观测性影响 |
|------|----------|----------|----------|-------------|
| 未使用依赖注入 | 🟡 低 | 无直接影响 | 增加耦合度、认知负担 | 无 |
| 统计重复累计 | 🔴 高 | **监控数据翻倍错误** | 影响性能分析准确性 | 严重影响指标可信度 |
| 硬编码clientId | 🟠 中 | 取消订阅可能不精确 | 与WebSocket上下文脱节 | 追踪困难 |
| Provider标签启发式 | 🟡 低 | 无直接影响 | 监控维度偏差 | 影响问题定位 |
| 能力映射字符串替换 | 🟡 低 | 潜在隐蔽错误 | 维护性差 | 无 |

### 隐性架构风险影响

| 问题 | 风险级别 | 业务影响 | 技术影响 | 运维影响 |
|------|----------|----------|----------|----------|
| 连接内存泄漏 | 🔴 高 | **服务可用性风险** | 内存持续增长，潜在OOM | 需要定期重启 |
| 并发安全问题 | 🟠 中 | 统计数据不准确 | 竞态条件，数据不一致 | 监控噪音增加 |
| 错误恢复缺失 | 🟠 中 | **数据丢失风险** | 缺少容错能力 | 告警风暴 |
| 监控性能影响 | 🟡 低 | 轻微性能损耗 | 高频场景下资源浪费 | 无明显影响 |

### 优先级排序（基于影响分析）

1. **P0 - 立即修复**：统计重复累计、连接内存泄漏
2. **P1 - 本迭代**：并发安全问题、错误恢复机制
3. **P2 - 下迭代**：硬编码clientId、未使用依赖
4. **P3 - 技术债**：Provider标签优化、能力映射集中化

## 四、分阶段修复方案

### 🚨 阶段一：紧急修复（P0优先级，当天完成）

#### 1.1 统计重复累计修复
```typescript
// ✅ 修复方案：仅在processBatch累计，recordPipelineMetrics只记录日志
private async processBatch(batch: StreamQuote[], provider: string, capability: string): Promise<void> {
  const startTime = Date.now();
  
  // ✅ 保留：统计累计逻辑
  this.batchProcessingStats.totalBatches++;
  this.batchProcessingStats.totalQuotes += batch.length;
  
  // ...处理逻辑...
  
  const processingTime = Date.now() - startTime;
  this.batchProcessingStats.batchProcessingTime += processingTime;
  
  // 调用详细指标记录（无重复累计）
  this.recordPipelineMetrics({...});
}

private recordPipelineMetrics(metrics: PipelineMetrics): void {
  // ❌ 移除：重复累计逻辑
  // this.batchProcessingStats.totalBatches++;
  // this.batchProcessingStats.totalQuotes += metrics.quotesCount;
  
  // ✅ 保留：详细阶段性能日志
  this.logger.debug('管道性能指标', metrics);
}
```

#### 1.2 连接内存泄漏修复
```typescript
// ✅ 新增：连接清理机制
private readonly activeConnections = new Map<string, StreamConnection>();
private readonly CONNECTION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟
private readonly MAX_CONNECTIONS = 1000; // 连接数上限

async onModuleInit() {
  // 定期清理断开的连接
  setInterval(() => this.cleanupStaleConnections(), this.CONNECTION_CLEANUP_INTERVAL);
}

private cleanupStaleConnections(): void {
  for (const [connectionId, connection] of this.activeConnections) {
    if (connection.status === 'disconnected' || this.isConnectionStale(connection)) {
      this.activeConnections.delete(connectionId);
      this.logger.debug(`清理断开连接: ${connectionId}`);
    }
  }
  
  // 连接数上限保护
  if (this.activeConnections.size > this.MAX_CONNECTIONS) {
    this.enforceConnectionLimit();
  }
}
```

### 🔧 阶段二：架构优化（P1优先级，本迭代完成）

#### 2.1 并发安全保护
```typescript
// ✅ 使用原子操作保护统计数据
private readonly batchProcessingStats = {
  totalBatches: new AtomicCounter(0),
  totalQuotes: new AtomicCounter(0),
  batchProcessingTime: new AtomicCounter(0),
};

// 或使用互斥锁方案
private readonly statsLock = new Mutex();

private async updateBatchStats(batchSize: number, processingTime: number): Promise<void> {
  await this.statsLock.runExclusive(() => {
    this.batchProcessingStats.totalBatches++;
    this.batchProcessingStats.totalQuotes += batchSize;
    this.batchProcessingStats.batchProcessingTime += processingTime;
  });
}
```

#### 2.2 批量处理错误恢复
```typescript
// ✅ 实现重试和断路器模式
private readonly circuitBreaker = new CircuitBreaker(this.processPipeline.bind(this), {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

private async processBatchWithRecovery(batch: StreamQuote[], provider: string, capability: string): Promise<void> {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.circuitBreaker.fire(batch, provider, capability);
      return; // 成功则返回
    } catch (error) {
      this.logger.warn(`批量处理失败，尝试 ${attempt}/${maxRetries}`, { error, provider, capability });
      
      if (attempt === maxRetries) {
        // 最后一次重试失败，使用降级策略
        await this.fallbackProcessing(batch, provider, capability, error);
        return;
      }
      
      // 指数退避
      await this.delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### 🏗️ 阶段三：技术债优化（P2-P3优先级，下迭代）

#### 3.1 请求上下文模式
```typescript
// ✅ 引入请求上下文替代硬编码clientId
interface StreamRequestContext {
  clientId: string;
  provider: string;
  userId?: string;
  permissions?: string[];
  traceId: string;
  connectionInfo: {
    ip: string;
    userAgent: string;
    connectedAt: Date;
  };
}

private resolveClientIdFromContext(defaultClientId: string = 'temp_client_id'): string {
  const context = this.getRequestContext();
  return context?.clientId || defaultClientId;
}
```

#### 3.2 配置化能力映射服务
```typescript
// ✅ 创建专门的能力映射服务
@Injectable()
export class CapabilityMappingService {
  private readonly mappingRules = new Map<string, string>();
  
  constructor() {
    this.initializeDefaultMappings();
  }
  
  mapStreamCapabilityToTransformType(capability: string): string {
    return this.mappingRules.get(capability) || 
           capability.replace('stream-', '').replace('-', '_'); // 兜底逻辑
  }
  
  private initializeDefaultMappings(): void {
    this.mappingRules.set('stream-stock-quote', 'stock_quote');
    this.mappingRules.set('stream-market-data', 'market_data');
    // ...更多映射规则
  }
}
```

#### 3.3 分层监控策略
```typescript
// ✅ 优化监控性能影响
private readonly criticalMetrics = new Set(['connection_count', 'error_rate', 'latency_p99']);
private readonly detailedMetricsBuffer: MetricEvent[] = [];
private readonly DETAILED_METRICS_FLUSH_INTERVAL = 10000; // 10秒批量提交

private recordMetric(metric: MetricEvent): void {
  if (this.criticalMetrics.has(metric.name)) {
    // 关键指标实时记录
    this.metricsRegistry.record(metric);
  } else {
    // 详细指标缓存批量提交
    this.detailedMetricsBuffer.push(metric);
  }
}
```

## 五、全面测试策略

### 5.1 单元测试（每阶段必备）

#### 阶段一测试重点
```typescript
// 1. 统计重复累计修复验证
describe('批量统计修复', () => {
  it('同一批次处理后，totalBatches只增加一次', async () => {
    const initialStats = { ...service.getBatchProcessingStats() };
    await service.processBatch(mockBatch, 'longport', 'stream-stock-quote');
    
    const finalStats = service.getBatchProcessingStats();
    expect(finalStats.totalBatches).toBe(initialStats.totalBatches + 1);
    expect(finalStats.totalQuotes).toBe(initialStats.totalQuotes + mockBatch.length);
  });
});

// 2. 连接清理机制验证
describe('连接内存泄漏修复', () => {
  it('应该定期清理断开的连接', async () => {
    // 模拟大量连接
    for (let i = 0; i < 100; i++) {
      service.addConnection(`conn_${i}`, mockDisconnectedConnection);
    }
    
    await service.cleanupStaleConnections();
    expect(service.getActiveConnectionsCount()).toBe(0);
  });
  
  it('应该强制执行连接数上限', () => {
    // 测试连接数上限保护逻辑
  });
});
```

#### 阶段二测试重点
```typescript
// 3. 并发安全测试
describe('并发安全保护', () => {
  it('多线程同时更新统计不会丢失数据', async () => {
    const promises = Array.from({ length: 100 }, (_, i) => 
      service.updateBatchStats(10, 100)
    );
    
    await Promise.all(promises);
    
    const stats = service.getBatchProcessingStats();
    expect(stats.totalBatches).toBe(100);
    expect(stats.totalQuotes).toBe(1000);
  });
});

// 4. 错误恢复测试
describe('批量处理错误恢复', () => {
  it('应该在失败时重试指定次数', async () => {
    const mockFailingService = jest.fn()
      .mockRejectedValueOnce(new Error('第一次失败'))
      .mockRejectedValueOnce(new Error('第二次失败'))
      .mockResolvedValueOnce('成功');
    
    await service.processBatchWithRecovery(mockBatch, 'longport', 'stream-stock-quote');
    expect(mockFailingService).toHaveBeenCalledTimes(3);
  });
  
  it('应该在所有重试失败后触发降级策略', async () => {
    const fallbackSpy = jest.spyOn(service, 'fallbackProcessing');
    // 测试降级逻辑
  });
});
```

### 5.2 集成测试

#### WebSocket连接集成测试
```typescript
describe('StreamReceiver集成测试', () => {
  it('应该在高负载下维持连接稳定性', async () => {
    // 模拟1000个并发连接，持续5分钟
    const connections = await createConcurrentConnections(1000);
    await simulateHighVolumeData(connections, 5 * 60 * 1000);
    
    // 验证：内存使用稳定，无连接泄漏
    expect(getMemoryUsage()).toBeLessThan(MEMORY_THRESHOLD);
    expect(service.getActiveConnectionsCount()).toBe(connections.length);
  });
  
  it('应该在MongoDB/Redis故障时优雅降级', async () => {
    // 测试数据库连接故障场景
  });
});
```

### 5.3 性能测试（K6脚本）

```javascript
// performance-test.js
import { check } from 'k6';
import ws from 'k6/ws';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // 爬坡到100连接
    { duration: '10m', target: 1000 }, // 保持1000连接
    { duration: '2m', target: 0 },     // 降回0
  ],
  thresholds: {
    ws_connecting: ['avg<1000'],        // 连接时间<1s
    ws_msgs_received: ['rate>100'],     // 消息接收率>100/s
    'iteration_duration': ['p(95)<5000'], // 95%请求<5s
  },
};

export default function () {
  const response = ws.connect('ws://localhost:3000/api/v1/stream-receiver/connect', {
    headers: { 
      'X-App-Key': __ENV.API_KEY,
      'X-Access-Token': __ENV.ACCESS_TOKEN 
    }
  }, function (socket) {
    socket.on('open', () => {
      // 订阅股票数据
      socket.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['700.HK', 'AAPL.US']
      }));
    });
    
    socket.on('message', (data) => {
      check(data, {
        '数据格式正确': (msg) => JSON.parse(msg).data !== undefined,
        '延迟可接受': (msg) => JSON.parse(msg).timestamp !== undefined,
      });
    });
    
    socket.setTimeout(() => socket.close(), 30000); // 30秒后关闭
  });
}
```

### 5.4 故障注入测试

```typescript
// 5. 混沌工程测试
describe('故障注入测试', () => {
  it('Redis突然断开时应该优雅处理', async () => {
    // 在处理过程中断开Redis连接
    await service.startProcessing();
    await redisContainer.stop();
    
    // 验证：服务继续运行，错误被正确记录
    expect(service.isHealthy()).toBe(true);
  });
  
  it('MongoDB连接超时应该触发重试', async () => {
    // 模拟MongoDB慢查询
    mongoMock.delay(10000);
    
    const result = await service.processBatch(mockBatch);
    expect(result).toBeDefined(); // 应该最终成功
  });
  
  it('内存不足时应该拒绝新连接', async () => {
    // 模拟内存压力
    simulateMemoryPressure();
    
    const connectionResult = await service.acceptNewConnection();
    expect(connectionResult.accepted).toBe(false);
    expect(connectionResult.reason).toContain('内存不足');
  });
});
```

## 六、风险评估与缓解策略

### 6.1 技术风险矩阵

| 风险类型 | 概率 | 影响 | 风险级别 | 缓解策略 |
|---------|------|------|----------|----------|
| 统计修复引入新Bug | 低 | 中 | 🟡 低 | 全面单元测试 + 金丝雀发布 |
| 连接清理过于激进 | 中 | 高 | 🟠 中 | 渐进式配置调优 + 监控告警 |
| 并发锁性能影响 | 中 | 中 | 🟡 低 | 性能基准测试 + 锁粒度优化 |
| 断路器误触发 | 低 | 高 | 🟠 中 | 阈值可配置 + 手动重置功能 |
| 内存泄漏修复不彻底 | 低 | 高 | 🟠 中 | 长期压力测试 + 内存监控 |

### 6.2 业务连续性保障

#### 蓝绿部署策略
```bash
# 1. 部署到绿环境
kubectl apply -f deployment-green.yaml

# 2. 健康检查通过后切换流量
kubectl patch service stream-receiver -p '{"spec":{"selector":{"version":"green"}}}'

# 3. 监控关键指标
# - 连接成功率 > 99.9%
# - 数据延迟 < 100ms P95
# - 错误率 < 0.1%

# 4. 如有异常立即回滚
kubectl patch service stream-receiver -p '{"spec":{"selector":{"version":"blue"}}}'
```

#### 监控告警升级
```yaml
# alerts.yaml
groups:
  - name: stream-receiver.critical
    rules:
      - alert: ConnectionMemoryLeak
        expr: active_connections_count > 10000
        for: 5m
        labels: { severity: critical }
        
      - alert: StatisticsAccuracyIssue  
        expr: rate(batch_processing_stats_inconsistency) > 0
        for: 1m
        labels: { severity: high }
        
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == "open"
        for: 30s
        labels: { severity: warning }
```

## 七、执行计划与里程碑

### 7.1 详细时间线

| 阶段 | 时间周期 | 关键交付物 | 验收标准 | 负责人 |
|------|----------|------------|----------|--------|
| **阶段一** | Day 1-2 | 统计修复 + 连接清理 | 单元测试通过，无功能回归 | 开发团队 |
| **阶段二** | Week 2 | 并发安全 + 错误恢复 | 压力测试通过，性能无显著下降 | 开发团队 + SRE |
| **阶段三** | Week 3-4 | 上下文优化 + 映射服务 | 集成测试通过，监控数据准确 | 开发团队 |
| **验收** | Week 5 | 全量发布 + 监控验证 | 线上运行稳定7天 | 全团队 |

### 7.2 关键检查点

- [ ] **P0修复完成检查点**：统计数据准确性验证 + 内存使用率稳定
- [ ] **P1优化完成检查点**：并发压力测试通过 + 错误恢复验证
- [ ] **技术债清理检查点**：代码质量提升 + 监控完整性
- [ ] **最终验收检查点**：生产环境稳定运行 + 性能指标达标

### 7.3 成功标准

#### 定量指标
- 连接内存使用：稳定在合理范围，无持续增长趋势
- 统计数据准确性：误差率 < 0.1%
- 系统响应时间：P95 < 200ms，P99 < 500ms
- 错误率：< 0.1%
- 代码覆盖率：> 95%

#### 定性指标
- 代码可维护性提升：依赖关系清晰，职责分离明确
- 运维友好性：监控数据准确，问题定位容易
- 系统稳定性：7x24小时稳定运行，无重大故障 