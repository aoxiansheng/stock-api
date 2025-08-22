# Prometheus 指标规范文档

> 本文档说明 NewStock API 系统中 Prometheus 指标的命名规范、标签使用约定以及如何添加新指标。

## 1. 指标命名规范

所有 Prometheus 指标必须遵循以下命名规范：

| 规则 | 说明 | 示例 |
|------|------|------|
| 前缀 | 所有指标必须以 `newstock_` 开头 | `newstock_stream_processing_time_ms` |
| 命名风格 | 使用下划线命名法（snake_case） | `newstock_stream_cache_hit_rate` |
| 领域分组 | 在前缀后添加领域名称 | `newstock_stream_*`, `newstock_system_*` |
| 动作描述 | 通过动词或名词描述测量的行为 | `newstock_stream_symbols_processed_total` |
| 单位后缀 | 在指标名称末尾添加单位 | `newstock_stream_processing_time_ms`, `newstock_high_load_duration_seconds_total` |

### 1.1 常见后缀含义

- `_total`: 表示累计计数器，如 `newstock_stream_symbols_processed_total`
- `_count`: 表示事件发生次数，如 `newstock_http_requests_count`
- `_sum`: 表示总和值，如 `newstock_http_request_duration_seconds_sum`
- `_bucket`: 表示直方图桶，如 `newstock_http_request_duration_seconds_bucket`
- `_ratio`: 表示比率（0-1之间），如 `newstock_cache_hit_ratio`
- `_percent`: 表示百分比（0-100），如 `newstock_cpu_usage_percent`

### 1.2 推荐单位

- 时间：`_seconds`, `_ms` (毫秒), `_minutes`, `_hours`
- 内存：`_bytes`, `_mb`
- 计数：`_total`, `_count`

## 2. 标签使用约定

### 2.1 必需标签

所有指标应包含以下公共标签（由 `MonitoringRegistryService` 自动添加）：

- `app`: 应用名称，通常为 "newstock-api"
- `version`: 应用版本号，取自 `process.env.npm_package_version`

### 2.2 推荐标签

根据指标类型，推荐使用以下标签：

| 场景 | 推荐标签 | 示例值 |
|------|---------|--------|
| 流处理 | `provider` | "longport", "longport-sg", "unknown" |
| 流处理 | `market` | "HK", "US", "CN" |
| 批量处理 | `batch_type` | "small", "medium", "large", "xlarge" |
| 批量处理 | `batch_size_range` | "0-10", "11-100", "101-1000", "1000+" |
| 缓存操作 | `cache_type` | "redis", "memory", "preload", "general" |
| 错误监控 | `error_type` | "network", "timeout", "validation", "general" |
| 日志级别 | `from_level`, `to_level` | "debug", "info", "warn", "error" |

### 2.3 标签最佳实践

- **基数控制**: 避免使用高基数标签（如用户ID、请求ID）
- **标签一致性**: 同一领域的指标应使用一致的标签名称
- **标签值规范**: 标签值应使用简短、一致的字符串
- **标签数量**: 控制每个指标的标签数量（建议不超过5个）

## 3. 指标类型选择

根据不同的使用场景，选择合适的指标类型：

| 类型 | 适用场景 | 示例 |
|------|---------|------|
| **Counter** | 单调递增的计数器，如请求总数、错误数 | `newstock_stream_symbols_processed_total` |
| **Gauge** | 可升可降的指标，如当前连接数、CPU使用率 | `newstock_system_cpu_usage_percent` |
| **Histogram** | 观察值分布情况，如响应时间分布 | `newstock_stream_batch_processing_duration_ms` |
| **Summary** | 类似Histogram，但直接计算分位数（不常用） | 一般优先使用Histogram |

## 4. 如何添加新指标

### 4.1 在 `MonitoringRegistryService` 中定义

```typescript
// 在 src/monitoring/metrics/services/metrics-registry.service.ts 中添加

@Injectable()
export class MonitoringRegistryService implements OnModuleInit {
  // ... 现有代码 ...
  
  // 添加新的计数器
  public readonly myNewCounter: Counter<string>;
  
  constructor() {
    // ... 现有代码 ...
    
    // 初始化新的计数器
    this.myNewCounter = new Counter({
      name: 'newstock_domain_action_total',
      help: '对该指标的详细描述',
      labelNames: ['label1', 'label2', 'app', 'version'],
      registers: [this.registry]
    });
  }
}
```

### 4.2 使用 `Metrics` 助手类更新指标

```typescript
// 在业务服务中

@Injectable()
export class MyBusinessService {
  constructor(
    private readonly metricsRegistry: MonitoringRegistryService
  ) {}
  
  someBusinessMethod(): void {
    // ... 业务逻辑 ...
    
    // 更新计数器
    Metrics.inc(
      this.metricsRegistry,
      'myNewCounter',
      { label1: 'value1', label2: 'value2' }
    );
    
    // 设置仪表值
    Metrics.setGauge(
      this.metricsRegistry,
      'someGauge',
      42.5,
      { label: 'value' }
    );
    
    // 记录直方图观测值
    Metrics.observe(
      this.metricsRegistry,
      'responseTimeHistogram',
      responseTime,
      { endpoint: '/api/data' }
    );
  }
}
```

### 4.3 添加新指标的流程

1. 在 `MonitoringRegistryService` 中声明并初始化指标
2. 为指标提供合适的名称、描述和标签
3. 在业务服务中注入 `MonitoringRegistryService`
4. 使用 `Metrics` 助手类更新指标值
5. 更新 E2E 测试以确认新指标正常工作
6. 在本文档中更新指标列表（可选）

## 5. 核心指标列表

以下是系统中定义的核心指标：

### 5.1 流处理指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `newstock_stream_symbols_processed_total` | Counter | 流处理的符号总数 | provider, market |
| `newstock_stream_rules_compiled_total` | Counter | 编译的规则总数 | provider, rule_type |
| `newstock_stream_processing_time_ms` | Gauge | 平均处理时间（毫秒） | operation_type |
| `newstock_stream_cache_hit_rate` | Gauge | 缓存命中率（百分比） | cache_type |
| `newstock_stream_error_rate` | Gauge | 错误率（百分比） | error_type |
| `newstock_stream_throughput_per_second` | Gauge | 每秒处理的请求数 | stream_type |
| `newstock_stream_concurrent_connections` | Gauge | 当前并发连接数 | connection_type |

### 5.2 批量处理指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `newstock_stream_batches_processed_total` | Counter | 处理的批次总数 | provider, batch_type |
| `newstock_stream_quotes_in_batches_total` | Counter | 批处理中的报价总数 | provider |
| `newstock_stream_average_batch_size` | Gauge | 平均批次大小 | provider |
| `newstock_stream_batch_processing_duration_ms` | Histogram | 批处理持续时间分布（毫秒） | provider, batch_size_range |
| `newstock_stream_batch_success_rate` | Gauge | 批处理成功率（百分比） | provider |

### 5.3 系统指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `newstock_log_level_switches_total` | Counter | 日志级别动态切换次数 | from_level, to_level, reason |
| `newstock_system_cpu_usage_percent` | Gauge | 系统CPU使用率（百分比） | - |
| `newstock_high_load_duration_seconds_total` | Counter | 高负载持续时间累计（秒） | - |

## 6. Grafana 看板集成

系统指标已配置 Grafana 看板，用于实时监控。主要看板包括：

1. **系统概览**: 展示整体健康状态、CPU使用率、内存使用情况等
2. **流处理性能**: 展示流处理吞吐量、延迟、错误率等
3. **批量处理监控**: 展示批处理效率、成功率、平均大小等
4. **缓存效率**: 展示各类缓存的命中率、使用情况等

如需创建自定义看板，请参考本文档中的指标命名和标签使用规范。 