# 增强日志系统

## 概述

这是一个高性能的分级日志控制系统，提供细粒度的日志级别管理、智能缓存机制和性能监控功能。

## 目录结构

```
src/common/logging/
├── config/                     # 配置文件目录
│   ├── log-levels.json         # 主配置文件
│   └── log-levels.schema.json  # JSON Schema验证
├── log-level-controller.ts     # 核心控制器
├── types.ts                    # 类型定义
└── README.md                   # 文档说明
```

## 核心特性

### 🎯 二级日志控制
- **全局级别控制**: 设置系统默认日志级别
- **模块级别控制**: 为特定服务/模块设置独立日志级别

### ⚡ 高性能缓存机制
- **智能缓存**: 5秒TTL，LRU淘汰策略
- **命中率优化**: 通常可达95%+的缓存命中率
- **自动预热**: 常用查询组合预加载

### 📊 性能监控
- **响应时间监控**: 超过阈值(默认5ms)自动告警
- **热路径分析**: 识别高频使用的服务组件
- **自动优化**: 缓存清理、预热、统计重置等

### 🔧 配置管理
- **环境变量支持**: `ENHANCED_LOGGING_ENABLED` 功能开关
- **多路径搜索**: 支持多种配置文件位置
- **向后兼容**: 兼容旧的配置文件路径

## 配置文件说明

### 主配置文件: `config/log-levels.json`

```json
{
  "$schema": "./log-levels.schema.json",
  "version": "1.0.0",
  "description": "New Stock API 日志级别配置 - 主配置文件",
  
  "global": "info",
  
  "modules": {
    "// ========== 核心数据流组件 ==========": "",
    "DataFetcherService": "info",
    "TransformerService": "warn",
    "StorageService": "warn",
    "QueryService": "info",
    "ReceiverService": "info",
    
    "// ========== 监控和缓存组件 ==========": "",
    "MonitoringEventBridge": "info",
    "MonitoringCacheService": "info",
    "CacheService": "info",
    "SmartCacheOrchestrator": "warn",
    
    "// ========== 认证和安全组件 ==========": "",
    "AuthService": "warn",
    "ApiKeyAuthGuard": "error",
    "JwtAuthGuard": "error",
    "RateLimitGuard": "warn",
    "ThrottlerGuard": "warn",
    "UnifiedPermissionsGuard": "error"
  },
  
  "features": {
    "enhancedLoggingEnabled": false,
    "levelCacheEnabled": true,
    "structuredLogging": true,
    "performanceMode": false,
    "dynamicUpdateEnabled": false
  },
  
  "performance": {
    "cacheEnabled": true,
    "cacheExpiry": 5000,
    "maxCacheSize": 500,
    "performanceThreshold": 5
  },
  
  "output": {
    "colorEnabled": false,
    "timestampEnabled": true,
    "contextEnabled": true,
    "stackTraceEnabled": true
  }
}
```

### 配置搜索优先级

系统按以下顺序搜索配置文件：

1. `process.env.LOG_CONFIG_PATH` (环境变量指定路径)
2. `src/common/logging/config/log-levels.json` **(优先 - 组件内部)**
3. `src/common/logging/config/log-levels.{NODE_ENV}.json` **(环境专用)**
4. `config/log-levels.json` (向后兼容)
5. `log-levels.json` (项目根目录)
6. `log-levels.{NODE_ENV}.json` (环境专用，根目录)

## 使用方法

### 基本使用

```typescript
import { createLogger } from "@common/logging";

const logger = createLogger('YourService');

// 这些调用会自动检查日志级别
logger.info('这是信息日志');
logger.warn('这是警告日志');
logger.error('这是错误日志');
```

### 手动级别检查

```typescript
import { LogLevelController } from '@common/logging/log-level-controller';

const controller = LogLevelController.getInstance();

// 检查特定级别是否应该记录
if (controller.shouldLog('YourService', 'debug')) {
  logger.debug('调试信息');
}
```

### 性能分析

```typescript
// 获取性能统计
const stats = controller.getStats();
console.log('命中率:', stats.hitRate);
console.log('平均响应时间:', stats.averageResponseTime);

// 热路径分析
const analysis = controller.analyzeHotPaths();
console.log('热路径服务:', analysis.hotPaths);
console.log('优化建议:', analysis.optimizationSuggestions);

// 执行性能优化
const result = controller.optimizePerformance();
console.log('应用的优化:', result.optimizationsApplied);
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `ENHANCED_LOGGING_ENABLED` | 是否启用增强日志功能 | `false` |
| `LOG_CONFIG_PATH` | 自定义配置文件路径 | - |
| `NODE_ENV` | 运行环境 | `development` |

## 性能特性

### 缓存统计示例
```
📈 系统最终状态:
- 总查询次数: 11,431
- 缓存命中率: 99.52%
- 平均响应时间: 0.000ms
- 缓存淘汰次数: 0
- 缓存大小: 63/500
- 缓存利用率: 12.60%
- QPS: 2,286,200
```

### 性能监控阈值

- **响应时间阈值**: 5ms (可配置)
- **缓存命中率目标**: >95%
- **内存使用监控**: 自动清理过期条目
- **热路径识别**: 自动识别高频服务

## 日志级别

| 级别 | 数值 | 描述 |
|------|------|------|
| `silent` | 0 | 静默，不输出任何日志 |
| `fatal` | 1 | 致命错误 |
| `error` | 2 | 错误信息 |
| `warn` | 3 | 警告信息 |
| `info` | 4 | 一般信息 |
| `debug` | 5 | 调试信息 |
| `trace` | 6 | 追踪信息 |

## 配置示例

### 开发环境配置
```json
{
  "global": "debug",
  "modules": {
    "AuthService": "info",
    "CacheService": "debug"
  },
  "performance": {
    "performanceThreshold": 10
  }
}
```

### 生产环境配置
```json
{
  "global": "warn",
  "modules": {
    "AuthService": "error",
    "CacheService": "warn"
  },
  "performance": {
    "performanceThreshold": 3
  }
}
```

## 架构优势

### 🎯 模块化设计
- 配置文件位于组件内部，完全自包含
- 清晰的职责分离和依赖关系
- 易于维护和扩展

### ⚡ 高性能
- 智能缓存机制，极低延迟
- 热路径自动优化
- 零拷贝级别检查

### 📊 可观测性
- 详细的性能指标
- 实时监控告警
- 自动问题诊断

### 🔧 易配置
- 直观的JSON配置格式
- 多环境支持
- 向后兼容保证

## 最佳实践

1. **生产环境**: 使用 `warn` 或 `error` 全局级别
2. **开发环境**: 使用 `debug` 或 `info` 全局级别
3. **性能敏感组件**: 设置为 `warn` 或更高级别
4. **调试组件**: 临时设置为 `debug` 或 `trace`
5. **定期检查**: 监控缓存命中率和响应时间指标

## 故障排查

### 配置加载问题
```bash
# 检查配置文件是否存在
ls -la src/common/logging/config/log-levels.json

# 验证JSON格式
npx tsx -e "console.log(JSON.parse(require('fs').readFileSync('src/common/logging/config/log-levels.json', 'utf8')))"
```

### 性能问题
```bash
# 运行性能诊断
ENHANCED_LOGGING_ENABLED=true npx tsx -e "
import { LogLevelController } from './src/common/logging/log-level-controller';
const controller = LogLevelController.getInstance();
controller.onModuleInit().then(() => {
  console.log('健康状态:', controller.getCacheHealth());
  console.log('性能分析:', controller.analyzeHotPaths());
});
"
```