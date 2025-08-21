# 环境变量配置文档

## 概述

本文档详细说明了 New Stock API Symbol Mapper 缓存重构项目的环境变量配置，包括开发、预生产和生产环境的完整配置指南。

## 🎯 配置文件结构

```
├── .env                    # 默认环境配置 (开发环境)
├── .env.development        # 开发环境配置
├── .env.staging           # 预生产环境配置
├── .env.production        # 生产环境配置
└── .env.test              # 测试环境配置
```

## 🚀 Symbol Mapper 缓存重构新增配置

### 核心缓存配置

| 变量名 | 默认值 | 说明 | 环境 |
|--------|--------|------|------|
| `SYMBOL_MAPPING_CACHE_ENABLED` | `true` | 符号映射缓存总开关 | 所有 |
| `RULE_CACHE_MAX_SIZE` | `100` | L1规则缓存最大条目数 | 所有 |
| `RULE_CACHE_TTL` | `600000` | L1规则缓存TTL(毫秒) | 所有 |
| `SYMBOL_CACHE_MAX_SIZE` | `2000` | L2符号缓存最大条目数 | 所有 |
| `SYMBOL_CACHE_TTL` | `300000` | L2符号缓存TTL(毫秒) | 所有 |
| `BATCH_RESULT_CACHE_MAX_SIZE` | `1000` | L3批量缓存最大条目数 | 所有 |
| `BATCH_RESULT_CACHE_TTL` | `7200000` | L3批量缓存TTL(毫秒) | 所有 |

### 性能优化配置

| 变量名 | 默认值 | 说明 | 环境 |
|--------|--------|------|------|
| `DATA_TRANSFORM_CACHE_ENABLED` | `true` | 数据转换缓存开关 | 所有 |
| `OBJECT_POOL_ENABLED` | `true` | 对象池优化开关 | 所有 |
| `RULE_COMPILATION_ENABLED` | `true` | 规则编译优化开关 | 所有 |
| `DYNAMIC_LOG_LEVEL_ENABLED` | `true` | 动态日志级别开关 | 所有 |
| `METRICS_LEGACY_MODE_ENABLED` | `true` | 指标双写兼容模式 | 所有 |

### 环境特定推荐配置

#### 开发环境配置 (.env.development)
```bash
# 缓存配置 - 开发环境较小配置便于调试
RULE_CACHE_MAX_SIZE=50
RULE_CACHE_TTL=300000        # 5分钟
SYMBOL_CACHE_MAX_SIZE=1000
SYMBOL_CACHE_TTL=180000      # 3分钟
BATCH_RESULT_CACHE_MAX_SIZE=500
BATCH_RESULT_CACHE_TTL=1800000  # 30分钟

# 自动初始化 - 开发环境启用
AUTO_INIT_ENABLED=true
AUTO_INIT_SYMBOL_MAPPINGS=true
```

#### 预生产环境配置 (.env.staging)
```bash
# 缓存配置 - 接近生产环境但便于验证
RULE_CACHE_MAX_SIZE=100
RULE_CACHE_TTL=300000        # 5分钟，便于观察失效
SYMBOL_CACHE_MAX_SIZE=5000
SYMBOL_CACHE_TTL=180000      # 3分钟
BATCH_RESULT_CACHE_MAX_SIZE=2000
BATCH_RESULT_CACHE_TTL=3600000  # 1小时

# 验证配置
CACHE_VALIDATION_ENABLED=true
CACHE_HIT_RATIO_TARGET=70
```

#### 生产环境配置 (.env.production)
```bash
# 缓存配置 - 生产环境优化配置
RULE_CACHE_MAX_SIZE=200
RULE_CACHE_TTL=600000        # 10分钟
SYMBOL_CACHE_MAX_SIZE=10000
SYMBOL_CACHE_TTL=300000      # 5分钟
BATCH_RESULT_CACHE_MAX_SIZE=5000
BATCH_RESULT_CACHE_TTL=7200000  # 2小时

# 安全配置
AUTO_INIT_ENABLED=false     # 生产环境关闭自动初始化
```

## 📊 监控告警配置

### 缓存性能监控

| 变量名 | 说明 | 推荐值 |
|--------|------|--------|
| `CACHE_HIT_RATE_ALERT_THRESHOLD` | 缓存命中率告警阈值(%) | 开发:30, 预生产:40, 生产:50 |
| `MEMORY_ALERT_THRESHOLD` | 内存使用率告警阈值(%) | 开发:85, 预生产:70, 生产:80 |
| `CPU_ALERT_THRESHOLD` | CPU使用率告警阈值(%) | 开发:90, 预生产:75, 生产:85 |
| `RESPONSE_TIME_ALERT` | 响应时间告警阈值(毫秒) | 开发:2000, 预生产:500, 生产:1000 |

### 告警配置示例

```bash
# 告警系统配置
ALERTING_ENABLED=true
ALERTING_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ALERTING_EMAIL=alerts@your-domain.com

# 性能阈值告警
MEMORY_ALERT_THRESHOLD=80
CPU_ALERT_THRESHOLD=85
RESPONSE_TIME_ALERT=1000
CACHE_HIT_RATE_ALERT_THRESHOLD=50
```

## 🔧 运维配置

### 数据库配置

```bash
# MongoDB 生产环境配置
MONGODB_URI=mongodb://cluster.mongodb.net/smart-stock-data-prod
MONGODB_OPTIONS=retryWrites=true&w=majority&maxPoolSize=50&minPoolSize=5

# Redis 生产环境配置
REDIS_URL=redis://redis-cluster:6379
REDIS_PASSWORD=your_secure_redis_password
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
```

### 性能调优

```bash
# Node.js 性能优化
NODE_OPTIONS=--max-old-space-size=4096 --enable-source-maps

# 集群配置
CLUSTER_ENABLED=true
CLUSTER_WORKERS=auto

# 连接池配置
DB_POOL_MIN=10
DB_POOL_MAX=100
REDIS_POOL_SIZE=20
```

## 🚨 安全配置

### 生产环境安全要求

```bash
# CSRF 保护 - 生产环境必须启用
DISABLE_CSRF=false

# JWT 安全配置
JWT_SECRET=your_ultra_secure_256_bit_secret_key_here
JWT_EXPIRES_IN=24h

# CORS 配置
CORS_ORIGIN=https://your-frontend-domain.com

# 请求限制
MAX_REQUEST_SIZE=10mb
MAX_JSON_SIZE=5mb
REQUEST_TIMEOUT=30000
```

### API 速率限制

```bash
# 双轨制限速系统
IP_RATE_LIMIT_ENABLED=true
IP_RATE_LIMIT_MAX=1000
IP_RATE_LIMIT_WINDOW=60000

# API Key 限制
API_RATE_LIMIT_STRATEGY=sliding_window
API_RATE_LIMIT_DEFAULT_REQUESTS=500
API_RATE_LIMIT_DEFAULT_WINDOW=1h
```

## 🔄 部署和迁移

### 渐进式部署配置

1. **阶段1：预生产验证**
   ```bash
   FEATURE_NEW_CACHE_SYSTEM=true
   CACHE_VALIDATION_ENABLED=true
   METRICS_LEGACY_MODE_ENABLED=true
   ```

2. **阶段2：生产环境A/B测试**
   ```bash
   FEATURE_NEW_CACHE_SYSTEM=true
   CACHE_ROLLOUT_PERCENTAGE=10  # 10%流量启用新缓存
   ```

3. **阶段3：全量部署**
   ```bash
   FEATURE_NEW_CACHE_SYSTEM=true
   CACHE_ROLLOUT_PERCENTAGE=100
   METRICS_LEGACY_MODE_ENABLED=false
   ```

### 回滚配置

```bash
# 紧急回滚配置
EMERGENCY_ROLLBACK=true
FEATURE_NEW_CACHE_SYSTEM=false
METRICS_LEGACY_MODE_ENABLED=true

# 或使用 FeatureFlags 紧急回滚
SYMBOL_MAPPING_CACHE_ENABLED=false
DATA_TRANSFORM_CACHE_ENABLED=false
```

## 📈 性能基准和验证

### 缓存性能指标

| 指标 | 目标值 | 验证方法 |
|------|--------|----------|
| L1缓存命中率 | > 30% | 监控面板 |
| L2缓存命中率 | > 60% | 监控面板 |
| L3缓存命中率 | > 50% | 监控面板 |
| 平均响应时间 | < 50ms | 性能测试 |
| 内存增长 | < 100MB | 压力测试 |

### 验证配置

```bash
# 性能验证配置
PERFORMANCE_TEST_ENABLED=true
LOAD_TEST_CONCURRENT_USERS=50
LOAD_TEST_DURATION=300

# 缓存验证
CACHE_VALIDATION_ENABLED=true
CACHE_HIT_RATIO_TARGET=70

# 数据一致性验证
DATA_CONSISTENCY_CHECK=true
CONSISTENCY_CHECK_INTERVAL=3600000
```

## 📋 检查清单

### 部署前检查

- [ ] 所有环境变量已正确设置
- [ ] 数据库连接字符串已更新
- [ ] Redis 连接配置已验证
- [ ] 安全密钥已更新
- [ ] 监控告警已配置
- [ ] 缓存配置已根据环境调整
- [ ] 特性开关已正确设置

### 部署后验证

- [ ] 应用启动成功
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 缓存系统运行正常
- [ ] 监控指标正常上报
- [ ] 告警系统功能正常
- [ ] 性能基准达标
- [ ] 日志输出正常

## 🆘 故障排查

### 常见问题和解决方案

1. **缓存命中率低**
   - 检查 TTL 配置是否过短
   - 验证缓存键生成是否一致
   - 查看缓存失效日志

2. **内存使用过高**
   - 调整缓存最大条目数
   - 检查是否有内存泄漏
   - 监控 GC 频率

3. **响应时间慢**
   - 检查数据库连接池配置
   - 验证 Redis 连接是否正常
   - 查看并发请求处理情况

4. **Change Stream 连接失败**
   - 确认 MongoDB 为副本集模式
   - 检查数据库权限配置
   - 验证网络连接

## 📞 支持联系

- **技术支持**: tech-support@your-domain.com
- **运维支持**: ops@your-domain.com
- **紧急联系**: emergency@your-domain.com

---

**最后更新**: 2025年8月
**版本**: v1.0.0 - Symbol Mapper 缓存重构