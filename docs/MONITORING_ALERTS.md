# 监控告警配置文档

## 概述

本文档详细说明了 Symbol Mapper 缓存重构项目的监控告警配置，包括性能监控、缓存指标、系统健康状态和故障告警机制。

## 🎯 监控架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   Prometheus    │───▶│    Grafana      │
│   Metrics       │    │   (Metrics DB)  │    │  (Dashboard)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Custom Log    │    │   AlertManager  │    │   Notification  │
│   Structured    │    │   (Rules)       │    │   (Slack/Email) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Symbol Mapper 缓存指标

### 核心性能指标

#### 1. 缓存命中率指标

```typescript
// Prometheus 指标定义
const symbolMappingCacheHitRate = new Gauge({
  name: 'symbol_mapping_cache_hit_rate',
  help: 'Symbol mapping cache hit rate by layer',
  labelNames: ['cache_layer', 'provider', 'direction']
});

// 指标标签
// cache_layer: l1_rules, l2_symbols, l3_batch
// provider: longport, longport-sg, itick, etc.
// direction: to_standard, from_standard
```

#### 2. 缓存性能指标

```typescript
// 响应时间分布
const symbolMappingResponseTime = new Histogram({
  name: 'symbol_mapping_response_time_seconds',
  help: 'Symbol mapping response time distribution',
  labelNames: ['cache_hit', 'provider', 'batch_size'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// 缓存大小监控
const symbolMappingCacheSize = new Gauge({
  name: 'symbol_mapping_cache_size',
  help: 'Current cache size by layer',
  labelNames: ['cache_layer']
});

// 缓存操作计数
const symbolMappingCacheOperations = new Counter({
  name: 'symbol_mapping_cache_operations_total',
  help: 'Total cache operations',
  labelNames: ['operation', 'cache_layer', 'result']
});
```

#### 3. 系统资源指标

```typescript
// 内存使用监控
const processMemoryUsage = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage',
  labelNames: ['type'] // heap_used, heap_total, external, rss
});

// 数据库连接监控
const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Active database connections',
  labelNames: ['database', 'pool']
});
```

### 监控指标收集配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "symbol_mapper_alerts.yml"

scrape_configs:
  - job_name: 'new-stock-api'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s
```

## 🚨 告警规则配置

### 1. 缓存性能告警

```yaml
# symbol_mapper_alerts.yml
groups:
  - name: symbol_mapper_cache
    rules:
      # 缓存命中率告警
      - alert: LowCacheHitRate
        expr: symbol_mapping_cache_hit_rate < 0.5
        for: 5m
        labels:
          severity: warning
          component: symbol-mapper-cache
        annotations:
          summary: "Symbol mapping cache hit rate is low"
          description: "Cache hit rate for {{ $labels.cache_layer }} is {{ $value | humanizePercentage }}, below 50% threshold"

      # L1缓存命中率严重告警
      - alert: CriticalL1CacheHitRate
        expr: symbol_mapping_cache_hit_rate{cache_layer="l1_rules"} < 0.3
        for: 2m
        labels:
          severity: critical
          component: symbol-mapper-cache
        annotations:
          summary: "L1 Rules cache hit rate critically low"
          description: "L1 rules cache hit rate is {{ $value | humanizePercentage }}, system performance severely impacted"

      # 响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, symbol_mapping_response_time_seconds) > 0.1
        for: 3m
        labels:
          severity: warning
          component: symbol-mapper-cache
        annotations:
          summary: "Symbol mapping response time is high"
          description: "95th percentile response time is {{ $value }}s, exceeding 100ms threshold"

      # 缓存大小告警
      - alert: CacheSizeLimit
        expr: symbol_mapping_cache_size > 0.9 * on(cache_layer) symbol_mapping_cache_max_size
        for: 5m
        labels:
          severity: warning
          component: symbol-mapper-cache
        annotations:
          summary: "Cache approaching size limit"
          description: "{{ $labels.cache_layer }} cache size is {{ $value }}, approaching maximum capacity"
```

### 2. 系统资源告警

```yaml
  - name: system_resources
    rules:
      # 内存使用告警
      - alert: HighMemoryUsage
        expr: (process_memory_usage_bytes{type="heap_used"} / process_memory_usage_bytes{type="heap_total"}) > 0.8
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High memory usage detected"
          description: "Heap memory usage is {{ $value | humanizePercentage }}, exceeding 80% threshold"

      # 数据库连接告警
      - alert: DatabaseConnectionIssue
        expr: up{job="mongodb"} == 0 or up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "Database connection failed"
          description: "{{ $labels.job }} is unreachable"

      # Change Stream 监控
      - alert: ChangeStreamDisconnected
        expr: increase(symbol_mapping_change_stream_errors_total[5m]) > 5
        for: 2m
        labels:
          severity: warning
          component: symbol-mapper-cache
        annotations:
          summary: "Change Stream experiencing issues"
          description: "{{ $value }} Change Stream errors in the last 5 minutes"
```

### 3. 业务逻辑告警

```yaml
  - name: business_logic
    rules:
      # 符号映射失败率告警
      - alert: HighMappingFailureRate
        expr: rate(symbol_mapping_operations_total{result="failed"}[5m]) > 0.1
        for: 3m
        labels:
          severity: warning
          component: symbol-mapper
        annotations:
          summary: "High symbol mapping failure rate"
          description: "Symbol mapping failure rate is {{ $value | humanizePercentage }}"

      # 数据一致性告警
      - alert: DataInconsistency
        expr: symbol_mapping_consistency_check_failures_total > 0
        for: 1m
        labels:
          severity: critical
          component: symbol-mapper
        annotations:
          summary: "Data inconsistency detected"
          description: "{{ $value }} data consistency check failures detected"

      # 缓存失效异常
      - alert: CacheInvalidationErrors
        expr: increase(symbol_mapping_cache_invalidation_errors_total[10m]) > 10
        for: 2m
        labels:
          severity: warning
          component: symbol-mapper-cache
        annotations:
          summary: "Cache invalidation errors detected"
          description: "{{ $value }} cache invalidation errors in the last 10 minutes"
```

## 📈 Grafana 仪表板配置

### 主要仪表板面板

#### 1. 缓存性能总览

```json
{
  "dashboard": {
    "title": "Symbol Mapper Cache Performance",
    "panels": [
      {
        "title": "Cache Hit Rates",
        "type": "stat",
        "targets": [
          {
            "expr": "symbol_mapping_cache_hit_rate",
            "legendFormat": "{{cache_layer}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 0.5},
                {"color": "green", "value": 0.7}
              ]
            }
          }
        }
      },
      {
        "title": "Response Time Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, symbol_mapping_response_time_seconds)",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, symbol_mapping_response_time_seconds)",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, symbol_mapping_response_time_seconds)",
            "legendFormat": "99th percentile"
          }
        ]
      }
    ]
  }
}
```

#### 2. 缓存层级详情

```json
{
  "title": "Cache Layer Details",
  "panels": [
    {
      "title": "Cache Size by Layer",
      "type": "graph",
      "targets": [
        {
          "expr": "symbol_mapping_cache_size",
          "legendFormat": "{{cache_layer}}"
        }
      ]
    },
    {
      "title": "Cache Operations Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(symbol_mapping_cache_operations_total[5m])",
          "legendFormat": "{{operation}} - {{cache_layer}}"
        }
      ]
    }
  ]
}
```

### 仪表板导入配置

```bash
# Grafana 仪表板导入
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @symbol_mapper_dashboard.json
```

## 🔔 通知配置

### Slack 通知配置

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        component: symbol-mapper-cache
      receiver: 'cache-alerts'

receivers:
  - name: 'web.hook'
    slack_configs:
      - channel: '#alerts'
        username: 'AlertManager'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#critical-alerts'
        username: 'CRITICAL-ALERT'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'cache-alerts'
    slack_configs:
      - channel: '#cache-monitoring'
        username: 'CacheBot'
        title: '📊 Cache Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
```

### 邮件通知配置

```yaml
  - name: 'email-alerts'
    email_configs:
      - to: 'alerts@your-domain.com'
        from: 'alertmanager@your-domain.com'
        smarthost: 'smtp.your-domain.com:587'
        auth_username: 'alertmanager@your-domain.com'
        auth_password: 'your-email-password'
        subject: 'Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ range .Labels.SortedPairs }}
          - {{ .Name }}: {{ .Value }}
          {{ end }}
          {{ end }}
```

## 🎯 健康检查配置

### 应用健康检查端点

```typescript
// health-check.controller.ts
@Controller('api/v1/monitoring')
export class HealthCheckController {
  
  @Get('health')
  @Public()
  async getHealth(): Promise<HealthCheckResponse> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        cache: await this.checkCacheSystem()
      },
      cache: {
        l1HitRate: this.cacheService.getL1HitRate(),
        l2HitRate: this.cacheService.getL2HitRate(),
        l3HitRate: this.cacheService.getL3HitRate()
      }
    };
  }

  @Get('metrics-health')
  @Auth([UserRole.ADMIN])
  async getMetricsHealth(): Promise<MetricsHealthResponse> {
    return {
      prometheus: await this.checkPrometheus(),
      alertManager: await this.checkAlertManager(),
      cacheMetrics: await this.getCacheMetrics()
    };
  }
}
```

### Kubernetes 健康检查

```yaml
# kubernetes/deployment.yaml
spec:
  containers:
    - name: new-stock-api
      image: new-stock-api:latest
      ports:
        - containerPort: 3000
      livenessProbe:
        httpGet:
          path: /api/v1/monitoring/health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /api/v1/monitoring/health
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
```

## 📋 运维手册

### 告警响应流程

#### 1. 缓存命中率低告警
```bash
# 检查步骤
1. 查看缓存配置是否正确
2. 检查 TTL 是否过短
3. 验证缓存键生成逻辑
4. 查看 Change Stream 是否正常
5. 检查数据库负载

# 处理命令
kubectl logs -f deployment/new-stock-api | grep "cache"
kubectl exec -it pod/new-stock-api-xxx -- curl localhost:3000/api/v1/monitoring/metrics-health
```

#### 2. 内存使用过高告警
```bash
# 检查步骤
1. 查看内存使用趋势
2. 检查缓存大小配置
3. 分析是否有内存泄漏
4. 验证 GC 频率

# 处理命令
kubectl top pod new-stock-api-xxx
kubectl exec -it pod/new-stock-api-xxx -- node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
```

#### 3. 数据库连接告警
```bash
# 检查步骤
1. 验证数据库服务状态
2. 检查连接池配置
3. 查看网络连接状态
4. 验证认证凭据

# 处理命令
kubectl get pods -l app=mongodb
kubectl exec -it pod/mongodb-xxx -- mongo --eval "db.stats()"
```

### 性能调优指南

#### 缓存配置优化

| 场景 | L1配置 | L2配置 | L3配置 |
|------|--------|--------|--------|
| 高频交易 | 500条/30min | 20000条/10min | 10000条/1h |
| 一般应用 | 200条/10min | 10000条/5min | 5000条/2h |
| 低频应用 | 100条/20min | 5000条/15min | 2000条/4h |

#### 内存使用优化

```bash
# Node.js 堆内存优化
NODE_OPTIONS="--max-old-space-size=8192 --optimize-for-size"

# 缓存大小动态调整
RULE_CACHE_MAX_SIZE=$(( $(free -m | grep Mem | awk '{print $2}') / 100 ))
SYMBOL_CACHE_MAX_SIZE=$(( $(free -m | grep Mem | awk '{print $2}') / 50 ))
```

## 🚀 部署监控

### CI/CD 集成

```yaml
# .github/workflows/deploy.yml
name: Deploy with Monitoring
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Application
        run: kubectl apply -f kubernetes/
      
      - name: Wait for Deployment
        run: kubectl rollout status deployment/new-stock-api
      
      - name: Health Check
        run: |
          sleep 30
          curl -f http://your-domain.com/api/v1/monitoring/health
      
      - name: Cache System Validation
        run: |
          # 验证缓存系统启动
          CACHE_STATUS=$(curl -s http://your-domain.com/api/v1/monitoring/metrics-health | jq -r '.cacheSystem.status')
          if [ "$CACHE_STATUS" != "healthy" ]; then
            echo "Cache system unhealthy, rolling back"
            kubectl rollout undo deployment/new-stock-api
            exit 1
          fi
      
      - name: Performance Smoke Test
        run: |
          # 运行性能验证测试
          ./scripts/performance-smoke-test.sh
```

### 回滚监控

```bash
#!/bin/bash
# rollback-monitor.sh

# 监控关键指标
CACHE_HIT_RATE=$(curl -s localhost:9090/api/v1/query?query=symbol_mapping_cache_hit_rate | jq -r '.data.result[0].value[1]')
RESPONSE_TIME=$(curl -s localhost:9090/api/v1/query?query=histogram_quantile\(0.95,symbol_mapping_response_time_seconds\) | jq -r '.data.result[0].value[1]')

# 检查是否需要回滚
if (( $(echo "$CACHE_HIT_RATE < 0.3" | bc -l) )) || (( $(echo "$RESPONSE_TIME > 0.5" | bc -l) )); then
    echo "Performance degraded, initiating rollback"
    kubectl rollout undo deployment/new-stock-api
    
    # 发送告警
    curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"🚨 Auto-rollback triggered due to performance degradation\"}"
fi
```

---

**监控联系人**:
- **运维团队**: ops@your-domain.com  
- **开发团队**: dev@your-domain.com
- **紧急联系**: +1-555-EMERGENCY

**最后更新**: 2025年8月  
**版本**: v1.0.0 - Symbol Mapper 缓存重构