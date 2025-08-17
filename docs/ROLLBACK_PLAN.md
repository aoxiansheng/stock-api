# Symbol Mapper 缓存重构回滚方案

## 概述

本文档详细说明了 Symbol Mapper 缓存重构项目的回滚策略和应急响应方案，确保在出现问题时能够快速、安全地恢复到稳定状态。

## 🎯 回滚策略分层

```
┌─────────────────────┐
│   Level 1: 特性开关  │ ← 最快速的回滚 (秒级)
├─────────────────────┤
│   Level 2: 配置回滚  │ ← 快速回滚 (分钟级)
├─────────────────────┤
│   Level 3: 代码回滚  │ ← 完整回滚 (10-30分钟)
├─────────────────────┤
│   Level 4: 数据回滚  │ ← 最后手段 (小时级)
└─────────────────────┘
```

## 🚨 Level 1: 特性开关紧急回滚

### 立即禁用缓存系统 (< 30秒)

```bash
# 方法1: 环境变量动态更新 (推荐)
kubectl set env deployment/new-stock-api SYMBOL_MAPPING_CACHE_ENABLED=false
kubectl set env deployment/new-stock-api FEATURE_NEW_CACHE_SYSTEM=false

# 方法2: 通过 ConfigMap 更新
kubectl patch configmap app-config -p '{"data":{"SYMBOL_MAPPING_CACHE_ENABLED":"false"}}'

# 方法3: 通过 Secret 更新敏感配置
kubectl patch secret app-secrets -p '{"data":{"EMERGENCY_ROLLBACK":"dHJ1ZQ=="}}' # base64 for "true"
```

### FeatureFlags 紧急回滚配置

```typescript
// 在应用启动时检查紧急回滚标志
export class FeatureFlags {
  // 紧急回滚时禁用所有优化功能
  static getEmergencyRollbackConfig(): Record<string, string> {
    return {
      SYMBOL_MAPPING_CACHE_ENABLED: 'false',
      DATA_TRANSFORM_CACHE_ENABLED: 'false',
      BATCH_PROCESSING_ENABLED: 'false',
      OBJECT_POOL_ENABLED: 'false',
      RULE_COMPILATION_ENABLED: 'false',
      DYNAMIC_LOG_LEVEL_ENABLED: 'false',
      METRICS_LEGACY_MODE_ENABLED: 'true', // 切换到传统指标模式
    };
  }
}
```

### 自动回滚脚本

```bash
#!/bin/bash
# emergency-rollback.sh

set -euo pipefail

echo "🚨 执行 Symbol Mapper 缓存系统紧急回滚..."

# 1. 立即禁用缓存特性
kubectl set env deployment/new-stock-api \
  SYMBOL_MAPPING_CACHE_ENABLED=false \
  FEATURE_NEW_CACHE_SYSTEM=false \
  METRICS_LEGACY_MODE_ENABLED=true

# 2. 等待 Pod 更新
kubectl rollout status deployment/new-stock-api --timeout=120s

# 3. 验证回滚效果
CACHE_DISABLED=$(kubectl exec deployment/new-stock-api -- curl -s localhost:3000/api/v1/monitoring/health | jq -r '.cache.enabled')

if [ "$CACHE_DISABLED" = "false" ]; then
    echo "✅ 缓存系统已成功禁用"
    
    # 发送回滚通知
    curl -X POST "$SLACK_WEBHOOK" -d '{
      "text": "🚨 Symbol Mapper 缓存系统已紧急回滚",
      "attachments": [{
        "color": "warning",
        "fields": [
          {"title": "回滚时间", "value": "'$(date)'", "short": true},
          {"title": "回滚级别", "value": "Level 1 - 特性开关", "short": true},
          {"title": "影响范围", "value": "缓存功能已禁用，切换到传统模式", "short": false}
        ]
      }]
    }'
else
    echo "❌ 回滚验证失败，需要进一步处理"
    exit 1
fi
```

## ⚡ Level 2: 配置回滚 (2-5分钟)

### 配置文件回滚

```bash
#!/bin/bash
# config-rollback.sh

echo "🔧 执行配置回滚..."

# 1. 备份当前配置
kubectl get configmap app-config -o yaml > config-backup-$(date +%Y%m%d-%H%M%S).yaml

# 2. 恢复到预发布配置
kubectl apply -f configs/pre-cache-refactor/

# 3. 重启服务应用新配置
kubectl rollout restart deployment/new-stock-api

# 4. 验证配置是否正确加载
kubectl exec deployment/new-stock-api -- env | grep -E "(SYMBOL_MAPPING|CACHE)"
```

### 数据库配置回滚

```bash
#!/bin/bash
# database-config-rollback.sh

echo "🗄️ 回滚数据库相关配置..."

# 1. 禁用 Change Stream 监听
kubectl set env deployment/new-stock-api CHANGE_STREAM_ENABLED=false

# 2. 调整连接池配置为保守设置
kubectl set env deployment/new-stock-api \
  DB_POOL_MIN=5 \
  DB_POOL_MAX=20 \
  REDIS_POOL_SIZE=5

# 3. 验证数据库连接
kubectl exec deployment/new-stock-api -- curl -s localhost:3000/api/v1/monitoring/health | jq '.services.database'
```

## 🔄 Level 3: 代码回滚 (10-30分钟)

### Git 版本回滚

```bash
#!/bin/bash
# code-rollback.sh

echo "📦 执行代码版本回滚..."

# 1. 确定回滚目标版本
LAST_STABLE_COMMIT=$(git log --oneline --grep="stable release" -n 1 --format="%H")
CURRENT_COMMIT=$(git rev-parse HEAD)

echo "当前版本: $CURRENT_COMMIT"
echo "回滚目标: $LAST_STABLE_COMMIT"

# 2. 创建回滚分支
git checkout -b emergency-rollback-$(date +%Y%m%d-%H%M%S)
git reset --hard $LAST_STABLE_COMMIT

# 3. 推送回滚版本
git push origin emergency-rollback-$(date +%Y%m%d-%H%M%S)

# 4. 触发CI/CD部署
echo "🚀 触发回滚部署..."
```

### Docker 镜像回滚

```bash
#!/bin/bash
# docker-rollback.sh

echo "🐳 执行 Docker 镜像回滚..."

# 1. 查找最后一个稳定镜像版本
STABLE_TAG=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | \
  grep new-stock-api | grep -v cache-refactor | head -n 1 | awk '{print $2}')

echo "回滚到镜像版本: new-stock-api:$STABLE_TAG"

# 2. 更新 Kubernetes 部署
kubectl set image deployment/new-stock-api new-stock-api=new-stock-api:$STABLE_TAG

# 3. 等待回滚完成
kubectl rollout status deployment/new-stock-api --timeout=600s

# 4. 验证回滚版本
kubectl get pods -l app=new-stock-api -o jsonpath='{.items[0].spec.containers[0].image}'
```

### Kubernetes 原生回滚

```bash
#!/bin/bash
# k8s-native-rollback.sh

echo "☸️ 使用 Kubernetes 原生回滚..."

# 1. 查看部署历史
kubectl rollout history deployment/new-stock-api

# 2. 回滚到上一个版本
kubectl rollout undo deployment/new-stock-api

# 3. 或回滚到指定版本
# kubectl rollout undo deployment/new-stock-api --to-revision=2

# 4. 验证回滚状态
kubectl rollout status deployment/new-stock-api
kubectl get deployment new-stock-api -o wide
```

## 🗄️ Level 4: 数据回滚 (最后手段)

### MongoDB 数据回滚

```bash
#!/bin/bash
# mongodb-rollback.sh

echo "🗄️ 执行 MongoDB 数据回滚..."

# 1. 停止应用避免数据写入
kubectl scale deployment/new-stock-api --replicas=0

# 2. 创建当前数据备份
mongodump --uri="$MONGODB_URI" --out="/backup/emergency-$(date +%Y%m%d-%H%M%S)"

# 3. 恢复到预重构数据状态
RESTORE_POINT="/backup/pre-cache-refactor-$(date +%Y%m%d)"
mongorestore --uri="$MONGODB_URI" --drop $RESTORE_POINT

# 4. 验证数据恢复
mongo "$MONGODB_URI" --eval "db.symbol_mapping_rules.countDocuments()"

# 5. 重启应用
kubectl scale deployment/new-stock-api --replicas=3
```

### Redis 缓存清理

```bash
#!/bin/bash
# redis-cleanup.sh

echo "🧹 清理 Redis 缓存数据..."

# 1. 清除所有缓存相关数据
redis-cli -u "$REDIS_URL" FLUSHDB

# 2. 清除特定的缓存键模式
redis-cli -u "$REDIS_URL" --scan --pattern "*symbol_mapping*" | xargs redis-cli -u "$REDIS_URL" DEL
redis-cli -u "$REDIS_URL" --scan --pattern "*cache:*" | xargs redis-cli -u "$REDIS_URL" DEL

# 3. 验证清理结果
redis-cli -u "$REDIS_URL" INFO keyspace
```

## 🎯 自动化回滚监控

### 自动回滚触发器

```typescript
// auto-rollback-monitor.ts
export class AutoRollbackMonitor {
  private readonly thresholds = {
    cacheHitRate: 0.3,      // 缓存命中率 < 30%
    responseTime: 1000,     // 响应时间 > 1秒
    errorRate: 0.1,         // 错误率 > 10%
    memoryUsage: 0.9        // 内存使用 > 90%
  };

  async checkMetrics(): Promise<boolean> {
    const metrics = await this.getMetrics();
    
    // 检查关键指标
    const shouldRollback = 
      metrics.cacheHitRate < this.thresholds.cacheHitRate ||
      metrics.p95ResponseTime > this.thresholds.responseTime ||
      metrics.errorRate > this.thresholds.errorRate ||
      metrics.memoryUsage > this.thresholds.memoryUsage;

    if (shouldRollback) {
      await this.triggerEmergencyRollback(metrics);
    }

    return shouldRollback;
  }

  private async triggerEmergencyRollback(metrics: MetricsData): Promise<void> {
    console.log('🚨 Triggering emergency rollback due to:', metrics);
    
    // 1. 禁用缓存系统
    await this.disableCacheSystem();
    
    // 2. 发送告警
    await this.sendAlert('EMERGENCY_ROLLBACK', metrics);
    
    // 3. 记录回滚事件
    await this.logRollbackEvent(metrics);
  }
}
```

### 监控脚本

```bash
#!/bin/bash
# rollback-monitor.sh

set -euo pipefail

PROMETHEUS_URL="http://localhost:9090"
ALERT_THRESHOLD_FILE="/tmp/rollback_thresholds"

# 定义回滚阈值
cat > $ALERT_THRESHOLD_FILE << EOF
cache_hit_rate_min=0.3
response_time_max=1.0
error_rate_max=0.1
memory_usage_max=0.9
consecutive_failures_max=3
EOF

source $ALERT_THRESHOLD_FILE

check_metric() {
    local metric_name=$1
    local threshold=$2
    local comparison=$3
    
    local value=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric_name" | \
      jq -r '.data.result[0].value[1] // "0"')
    
    case $comparison in
        "lt") # less than
            if (( $(echo "$value < $threshold" | bc -l) )); then
                return 1
            fi
            ;;
        "gt") # greater than
            if (( $(echo "$value > $threshold" | bc -l) )); then
                return 1
            fi
            ;;
    esac
    return 0
}

# 主监控循环
while true; do
    failure_count=0
    
    # 检查缓存命中率
    if ! check_metric "symbol_mapping_cache_hit_rate" $cache_hit_rate_min "lt"; then
        echo "⚠️ Cache hit rate below threshold"
        ((failure_count++))
    fi
    
    # 检查响应时间
    if ! check_metric "histogram_quantile(0.95,symbol_mapping_response_time_seconds)" $response_time_max "gt"; then
        echo "⚠️ Response time above threshold"
        ((failure_count++))
    fi
    
    # 检查错误率
    if ! check_metric "rate(http_requests_total{status!~\"2..\"}[5m])" $error_rate_max "gt"; then
        echo "⚠️ Error rate above threshold"
        ((failure_count++))
    fi
    
    # 如果多个指标同时异常，触发回滚
    if [ $failure_count -ge $consecutive_failures_max ]; then
        echo "🚨 Multiple metrics failing, triggering emergency rollback"
        ./emergency-rollback.sh
        break
    fi
    
    sleep 30
done
```

## 📋 回滚验证检查清单

### Level 1 回滚验证

- [ ] 缓存系统已禁用 (`SYMBOL_MAPPING_CACHE_ENABLED=false`)
- [ ] 应用恢复到传统模式运行
- [ ] 响应时间恢复正常 (< 100ms)
- [ ] 错误率降低到正常水平 (< 1%)
- [ ] 内存使用稳定
- [ ] 数据库连接正常
- [ ] 监控指标正常上报

### Level 2 回滚验证

- [ ] 配置文件已恢复到稳定版本
- [ ] 环境变量已正确设置
- [ ] 数据库连接池配置已恢复
- [ ] Redis 连接配置已恢复
- [ ] 日志输出正常
- [ ] 健康检查通过

### Level 3 回滚验证

- [ ] 代码版本已回滚到稳定提交
- [ ] Docker 镜像版本正确
- [ ] Kubernetes 部署状态正常
- [ ] 所有 Pod 运行正常
- [ ] 服务网络连接正常
- [ ] API 端点响应正常

### Level 4 回滚验证

- [ ] 数据库数据已恢复
- [ ] 数据一致性检查通过
- [ ] 缓存数据已清理
- [ ] 历史数据完整性验证
- [ ] 备份数据可用性确认

## 🚨 故障排查指南

### 常见回滚问题

#### 1. 配置不生效
```bash
# 问题：环境变量更新后不生效
# 解决：强制重启 Pod
kubectl delete pods -l app=new-stock-api
kubectl rollout status deployment/new-stock-api
```

#### 2. 数据库连接问题
```bash
# 问题：回滚后数据库连接异常
# 解决：检查连接字符串和权限
kubectl exec deployment/new-stock-api -- env | grep MONGODB_URI
kubectl exec deployment/new-stock-api -- curl -s localhost:3000/api/v1/monitoring/health
```

#### 3. 缓存数据不一致
```bash
# 问题：缓存中存在旧数据
# 解决：清除所有缓存
redis-cli -u "$REDIS_URL" FLUSHALL
```

#### 4. 监控指标缺失
```bash
# 问题：Prometheus 指标不上报
# 解决：检查指标端点
kubectl exec deployment/new-stock-api -- curl -s localhost:9090/metrics | grep symbol_mapping
```

### 回滚失败应急方案

```bash
#!/bin/bash
# emergency-recovery.sh

echo "🆘 执行紧急恢复方案..."

# 1. 停止所有服务
kubectl scale deployment/new-stock-api --replicas=0

# 2. 恢复最小可用配置
kubectl apply -f configs/minimal-stable/

# 3. 使用最稳定的镜像版本
kubectl set image deployment/new-stock-api new-stock-api=new-stock-api:stable

# 4. 重启单个实例验证
kubectl scale deployment/new-stock-api --replicas=1
kubectl wait --for=condition=ready pod -l app=new-stock-api --timeout=300s

# 5. 验证基本功能
if curl -f http://localhost:3000/api/v1/monitoring/health; then
    echo "✅ 最小系统恢复成功"
    kubectl scale deployment/new-stock-api --replicas=3
else
    echo "❌ 紧急恢复失败，需要人工介入"
    exit 1
fi
```

## 📞 应急联系信息

### 回滚决策流程

```
Level 1 (自动) → Level 2 (运维) → Level 3 (开发+运维) → Level 4 (全员)
    ↓               ↓                 ↓                   ↓
  < 5分钟         < 15分钟          < 60分钟            > 60分钟
```

### 联系方式

- **Level 1**: 自动执行 + Slack 通知
- **Level 2**: 运维团队 ops@your-domain.com
- **Level 3**: 开发团队 dev@your-domain.com + 运维团队
- **Level 4**: 技术负责人 +1-555-TECH-LEAD + 全员

### 上报机制

```bash
# 自动发送回滚报告
curl -X POST "$INCIDENT_WEBHOOK" -d '{
  "incident_type": "ROLLBACK",
  "severity": "HIGH",
  "component": "symbol-mapper-cache",
  "rollback_level": "'$ROLLBACK_LEVEL'",
  "timestamp": "'$(date -Iseconds)'",
  "metrics": {
    "cache_hit_rate": "'$CACHE_HIT_RATE'",
    "response_time": "'$RESPONSE_TIME'",
    "error_rate": "'$ERROR_RATE'"
  }
}'
```

---

**紧急联系**: emergency@your-domain.com  
**文档更新**: 2025年8月  
**版本**: v1.0.0 - Symbol Mapper 缓存重构回滚方案