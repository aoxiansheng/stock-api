# 环境变量命名规范与标准

## 📋 概述

本文档定义了New Stock API后端项目的环境变量命名规范和使用标准，旨在消除组件间环境变量交叉使用问题，建立清晰的架构边界。

## 🎯 核心原则

### 1. 单一职责原则
每个环境变量只能服务于一个特定组件，禁止跨组件共享使用。

### 2. 前缀一致性原则  
同一组件的所有环境变量必须使用统一的前缀，便于识别和管理。

### 3. 语义明确原则
变量名称应清晰表达其用途，避免歧义和重复含义。

### 4. 分层隔离原则
不同层次的配置应使用不同的前缀，避免配置职责混淆。

## 🏗️ 前缀分类体系

### **系统级前缀（全局配置）**
```bash
NODE_ENV            # 运行环境（development/production/test）
PORT                # 服务端口
HOST                # 服务主机
CORS_ORIGIN         # 跨域配置
LOG_LEVEL           # 日志级别
```

### **应用级前缀（应用通用配置）**
```bash
APP_*               # 应用级通用配置
APPLICATION_*       # 应用生命周期配置
APP_NAME            # 应用名称
APP_VERSION         # 应用版本
APP_TIMEOUT         # 应用超时配置
APP_MAX_CONNECTIONS # 应用最大连接数
```

### **通用配置前缀（跨组件共享）**
```bash
COMMON_*            # 跨组件通用配置
SHARED_*            # 共享资源配置
COMMON_DEFAULT_BATCH_SIZE   # 通用批处理大小
COMMON_MAX_BATCH_SIZE       # 通用最大批处理大小
COMMON_DEFAULT_PAGE_SIZE    # 通用分页大小
COMMON_MAX_PAGE_SIZE        # 通用最大分页大小
```

### **组件级前缀（组件专用配置）**

#### Auth组件
```bash
AUTH_*              # 认证系统配置
AUTH_JWT_SECRET                 # JWT密钥
AUTH_JWT_EXPIRES_IN            # JWT过期时间
AUTH_API_KEY_LENGTH            # API密钥长度
AUTH_MAX_API_KEYS_PER_USER     # 每用户最大API密钥数
AUTH_RATE_LIMIT                # 认证速率限制
AUTH_CACHE_TTL                 # 认证缓存TTL
AUTH_SESSION_CACHE_TTL         # 会话缓存TTL
AUTH_MAX_LOGIN_ATTEMPTS        # 最大登录尝试次数
AUTH_LOGIN_LOCKOUT_MINUTES     # 登录锁定时间（分钟）
```

#### Cache组件
```bash
CACHE_*             # 缓存系统配置
CACHE_DEFAULT_TTL               # 默认缓存TTL
CACHE_MAX_TTL                   # 最大缓存TTL
CACHE_REDIS_URL                 # Redis连接URL
CACHE_REDIS_KEY_PREFIX          # Redis键前缀
CACHE_MEMORY_LIMIT              # 内存缓存限制
CACHE_LRU_MAX_SIZE              # LRU缓存最大大小
```

#### Alert组件
```bash
ALERT_*             # 告警系统配置
ALERT_CACHE_ACTIVE_TTL          # 活跃告警缓存TTL
ALERT_CACHE_HISTORICAL_TTL      # 历史告警缓存TTL
ALERT_BATCH_SIZE                # 告警批处理大小
ALERT_MAX_RETRY_ATTEMPTS        # 最大重试次数
ALERT_RETRY_DELAY               # 重试延迟时间
ALERT_THRESHOLD_HIGH            # 高告警阈值
ALERT_THRESHOLD_CRITICAL        # 严重告警阈值
```

#### Notification组件
```bash
NOTIFICATION_*      # 通知系统配置
NOTIFICATION_EMAIL_ENABLED      # 邮件通知启用状态
NOTIFICATION_SLACK_ENABLED      # Slack通知启用状态
NOTIFICATION_WEBHOOK_ENABLED    # Webhook通知启用状态
NOTIFICATION_DINGTALK_ENABLED   # 钉钉通知启用状态
NOTIFICATION_BATCH_SIZE         # 通知批处理大小
NOTIFICATION_RETRY_ATTEMPTS     # 通知重试次数
```

#### Monitoring组件
```bash
MONITORING_*        # 监控系统配置
MONITORING_ENABLED              # 监控启用状态
MONITORING_METRICS_ENABLED      # 指标收集启用状态
MONITORING_HEALTH_CHECK_INTERVAL # 健康检查间隔
MONITORING_CACHE_TTL            # 监控缓存TTL
MONITORING_BATCH_SIZE           # 监控批处理大小
```

#### Core组件（数据处理核心）
```bash
CORE_*              # 核心数据处理配置
STREAM_*            # 流式数据配置
RECOVERY_*          # 数据恢复配置
CORE_BATCH_SIZE                 # 核心批处理大小
CORE_MAX_CONCURRENT_REQUESTS    # 最大并发请求数
STREAM_RATE_WINDOW              # 流式数据速率窗口
STREAM_BUFFER_SIZE              # 流式数据缓冲区大小
RECOVERY_RATE_WINDOW            # 恢复速率窗口
RECOVERY_MAX_ATTEMPTS           # 恢复最大尝试次数
```

#### Provider组件
```bash
PROVIDER_*          # 数据提供商通用配置
LONGPORT_*          # Longport提供商配置
PROVIDER_TIMEOUT                # 提供商请求超时
PROVIDER_MAX_RETRIES           # 提供商最大重试次数
LONGPORT_APP_KEY               # Longport应用密钥
LONGPORT_APP_SECRET            # Longport应用秘钥
LONGPORT_ACCESS_TOKEN          # Longport访问令牌
```

#### Database组件
```bash
MONGODB_*           # MongoDB配置
REDIS_*             # Redis配置
MONGODB_URI                     # MongoDB连接字符串
MONGODB_DB_NAME                 # MongoDB数据库名
MONGODB_MAX_POOL_SIZE           # MongoDB最大连接池大小
REDIS_URL                       # Redis连接URL
REDIS_KEY_PREFIX                # Redis键前缀
REDIS_MAX_CONNECTIONS           # Redis最大连接数
```

## 🚫 违规模式识别

### **严重违规示例**

#### ❌ 跨组件环境变量使用
```typescript
// Stream组件使用Auth变量（严重违规）
window: parseInt(process.env.AUTH_RATE_LIMIT_TTL || "60000")

// 正确方式
window: parseInt(process.env.STREAM_RATE_WINDOW || "60000")
```

#### ❌ 组件职责混淆
```typescript
// Cache组件包含Alert配置（严重违规）
alertActiveDataTtl: parseInt(process.env.CACHE_ALERT_ACTIVE_TTL, 10) || 300

// 正确方式：Alert配置应在Alert组件中
alertActiveDataTtl: parseInt(process.env.ALERT_CACHE_ACTIVE_TTL, 10) || 300
```

#### ❌ 配置重叠冲突
```typescript
// 同时使用两套前缀（严重违规）
activeDataTtl: parseInt(process.env.ALERT_CACHE_ACTIVE_TTL, 10) ||
               parseInt(process.env.CACHE_ALERT_ACTIVE_TTL, 10) || 300

// 正确方式：统一使用组件前缀
activeDataTtl: parseInt(process.env.ALERT_CACHE_ACTIVE_TTL, 10) || 300
```

### **中等违规示例**

#### ❌ 不规范命名
```typescript
// 缺少组件前缀（中等违规）
defaultBatchSize: parseInt(process.env.DEFAULT_BATCH_SIZE, 10) || 100

// 正确方式
defaultBatchSize: parseInt(process.env.COMMON_DEFAULT_BATCH_SIZE, 10) || 100
```

#### ❌ 前缀不一致
```typescript
// 同一组件使用不同前缀（中等违规）
defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
authTtl: parseInt(process.env.APP_AUTH_TTL, 10) || 300

// 正确方式：统一前缀
defaultTtl: parseInt(process.env.APP_DEFAULT_TTL, 10) || 300,
authTtl: parseInt(process.env.APP_AUTH_TTL, 10) || 300
```

## 🛠️ 实施指南

### **第一步：环境变量审计**

使用自动化脚本检测违规：
```bash
# 运行环境变量违规检测
bun run check-env-violations

# 检测结果示例
🚨 严重违规发现:
  - src/core/03-fetching/stream-data-fetcher/config/stream-recovery.config.ts:110
    AUTH_RATE_LIMIT_TTL 应改为 STREAM_RATE_WINDOW
  
⚠️  中等违规发现:
  - src/common/config/common-constants.config.ts:30
    DEFAULT_BATCH_SIZE 应改为 COMMON_DEFAULT_BATCH_SIZE
```

### **第二步：逐步重构**

#### 2.1 修复严重违规
```bash
# 修复Stream组件违规
sed -i 's/AUTH_RATE_LIMIT_TTL/STREAM_RATE_WINDOW/g' \
  src/core/03-fetching/stream-data-fetcher/config/stream-recovery.config.ts

# 移除Cache组件Alert配置
# 手动编辑 src/cache/config/cache-unified.config.ts
```

#### 2.2 标准化命名
```bash
# 重构Common组件配置
sed -i 's/DEFAULT_BATCH_SIZE/COMMON_DEFAULT_BATCH_SIZE/g' \
  src/common/config/common-constants.config.ts
sed -i 's/MAX_BATCH_SIZE/COMMON_MAX_BATCH_SIZE/g' \
  src/common/config/common-constants.config.ts
```

#### 2.3 更新环境文件
```bash
# 更新所有 .env.*.example 文件
# 按组件分组整理变量
# 添加详细注释说明
```

### **第三步：验证测试**

```bash
# 运行类型检查
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/path/to/modified-file.ts

# 运行单元测试
bun run test:unit:auth
bun run test:unit:cache
bun run test:unit:alert

# 运行集成测试
bun run test:integration:all
```

## 📋 环境文件组织规范

### **主环境文件 (.env)**
```bash
# ========================================
# 系统级配置（全局）
# ========================================
NODE_ENV=development
PORT=3000
HOST=localhost
LOG_LEVEL=debug

# ========================================
# 应用级配置（应用通用）
# ========================================
APP_NAME=new-stock-api
APP_VERSION=1.0.0
APP_TIMEOUT=30000
APP_MAX_CONNECTIONS=1000

# ========================================
# 通用配置（跨组件共享）
# ========================================
COMMON_DEFAULT_BATCH_SIZE=100
COMMON_MAX_BATCH_SIZE=1000
COMMON_DEFAULT_PAGE_SIZE=20
COMMON_MAX_PAGE_SIZE=1000
```

### **组件专用环境文件**
```bash
# .env.auth.example - 认证组件配置
AUTH_JWT_SECRET=your-jwt-secret
AUTH_JWT_EXPIRES_IN=1h
AUTH_API_KEY_LENGTH=32
AUTH_MAX_API_KEYS_PER_USER=50
AUTH_RATE_LIMIT=100
AUTH_CACHE_TTL=300

# .env.cache.example - 缓存组件配置
CACHE_DEFAULT_TTL=300
CACHE_MAX_TTL=3600
CACHE_REDIS_URL=redis://localhost:6379
CACHE_REDIS_KEY_PREFIX=newstock:
CACHE_MEMORY_LIMIT=512mb
CACHE_LRU_MAX_SIZE=10000

# .env.stream.example - 流式数据配置
STREAM_RATE_WINDOW=60000
STREAM_BUFFER_SIZE=1024
RECOVERY_RATE_WINDOW=60000
RECOVERY_MAX_ATTEMPTS=3
```

## 🔍 验证工具

### **静态分析工具**
```typescript
// scripts/validate-env-standards.ts
export class EnvironmentStandardsValidator {
  /**
   * 验证文件是否符合环境变量使用规范
   */
  static validateFile(filePath: string): ValidationResult {
    // 检查是否存在跨组件引用
    // 验证前缀一致性
    // 检测命名规范符合性
  }
  
  /**
   * 扫描整个项目的违规情况
   */
  static scanProject(): ProjectScanResult {
    // 返回所有违规的详细信息
    // 生成修复建议
  }
}
```

### **Git Hooks集成**
```bash
#!/bin/sh
# .git/hooks/pre-commit
# 自动检测新提交的环境变量违规

echo "🔍 检查环境变量使用规范..."
npm run validate-env-standards

if [ $? -ne 0 ]; then
  echo "❌ 发现环境变量使用违规，请修复后重新提交"
  exit 1
fi

echo "✅ 环境变量使用规范检查通过"
```

## 📊 合规性检查清单

### **文件级检查**
- [ ] 组件只使用对应前缀的环境变量
- [ ] 不存在跨组件环境变量引用
- [ ] 变量命名符合语义明确原则
- [ ] 配置职责单一，无混合配置

### **项目级检查**  
- [ ] 所有环境变量都有明确的组件归属
- [ ] 不存在重复或冲突的环境变量定义
- [ ] 环境文件按组件正确分类
- [ ] 所有变量都有默认值和注释说明

### **维护级检查**
- [ ] 新增环境变量自动符合规范
- [ ] 违规检测工具正常运行
- [ ] 环境文件模板保持最新
- [ ] 开发文档准确反映当前规范

## 🎯 最佳实践

### **新增环境变量时**
1. 确定变量归属的组件
2. 使用对应组件的前缀
3. 选择语义明确的变量名
4. 添加到对应的环境文件模板
5. 更新相关文档
6. 运行验证工具检查

### **重构现有配置时**
1. 识别违规的环境变量使用
2. 分析配置的真实归属
3. 制定渐进式迁移计划
4. 保持向后兼容性
5. 充分测试验证
6. 更新部署脚本和文档

### **团队协作时**
1. 新成员培训环境变量规范
2. Code Review时检查环境变量使用
3. 定期运行合规性检查
4. 持续改进验证工具
5. 保持文档和实际代码同步

## 🔄 持续改进

### **定期审查（月度）**
- 检查新增违规情况
- 更新验证工具规则
- 优化环境文件组织
- 改进开发体验

### **工具增强**
- 增强静态分析能力
- 提供自动修复建议
- 集成IDE插件支持
- 优化错误提示信息

### **文档维护**
- 根据实际使用情况更新规范
- 添加更多违规示例和修复案例
- 完善最佳实践指南
- 保持与项目架构同步

---

**版本**: 1.0.0  
**创建日期**: 2024-12-XX  
**最后更新**: 2024-12-XX  
**维护团队**: Backend Architecture Team  
**审核状态**: 待审核