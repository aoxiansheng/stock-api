# 新股票API - API 规范

**版本：** 2.0
**日期：** 2025-07-28
**状态：** 生产就绪

## 文档概述

本文档提供了新股票API系统的全面API规范，详细说明了RESTful端点、认证模式、请求/响应格式、错误处理和速率限制策略。系统采用**6核心组件架构**加**6增强模块**，为金融数据处理提供企业级解决方案。

## 系统架构概览

### 核心处理链路
```
请求 → 接收器 → 符号映射 → 数据映射 → 转换器 → 存储 → 查询 → 响应
```

### 增强功能模块
- **告警系统** - 智能规则引擎和多渠道通知
- **缓存服务** - 高性能分布式缓存优化
- **性能监控** - 全维度系统性能追踪
- **安全模块** - 漏洞扫描和实时审计
- **分页服务** - 标准化数据分页处理
- **权限验证** - 自动化权限合规检查

## 1. API 设计原则

### 1.1 RESTful 架构
```typescript
interface APIDesignPrinciples {
  resourceOriented: 'URLs 代表资源，而非操作';
  httpSemantics: '正确使用 HTTP 方法和状态码';
  stateless: '每个请求包含所有必要信息';
  cacheable: '响应包含适当的缓存头';
  layered: '客户端不了解中间层';
  codeOnDemand: '可选的可执行代码交付';
}
```

### 1.2 标准化响应格式
所有 API 响应都遵循一致的封装结构：

```typescript
interface StandardResponse<T> {
  statusCode: number;      // HTTP 状态码
  message: string;         // 中文成功/错误消息
  data: T | null;         // 实际响应数据
  timestamp: string;       // ISO 8601 时间戳
  requestId?: string;      // 可选的请求跟踪 ID
}
```

### 1.3 API 版本控制策略
```typescript
interface VersioningStrategy {
  scheme: 'URL 路径版本控制';
  pattern: '/api/v{major}/resource';
  current: 'v1';
  deprecation: '至少提前 6 个月通知';
  backward: '在主版本内保持兼容性';
}
```

## 2. 认证与授权规范

### 2.1 三层认证系统

#### 2.1.1 API 密钥认证（第三方应用程序）
```http
POST /api/v1/receiver/data
X-App-Key: your_application_key
X-Access-Token: your_access_token
Content-Type: application/json

{
  "symbols": ["700.HK", "AAPL.US"],
  "capabilityType": "stock-quote"
}
```

**权限级别：**
```typescript
enum ApiKeyPermissions {
  DATA_READ = "data:read",                    // 读取股票数据
  QUERY_EXECUTE = "query:execute",            // 执行分析查询
  PROVIDER_READ = "provider:read",            // 查看提供商信息
  MAPPING_READ = "mapping:read",              // 读取映射配置
  MAPPING_CREATE = "mapping:create",          // 创建新映射
  MAPPING_UPDATE = "mapping:update",          // 更新现有映射
  MAPPING_DELETE = "mapping:delete",          // 删除映射
  MONITOR_READ = "monitor:read",              // 读取监控数据
  HEALTH_READ = "health:read",                // 访问健康端点
  METRICS_READ = "metrics:read"               // 读取性能指标
}
```

#### 2.1.2 JWT 认证（开发者/管理员）
```http
POST /api/v1/auth/api-keys
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "交易应用程序",
  "permissions": ["data:read", "query:execute"]
}
```

**角色层级：**
```typescript
interface RoleHierarchy {
  DEVELOPER: {
    permissions: [
      "data:read", "query:execute", "mapping:read", "mapping:create",
      "mapping:update", "provider:read", "monitor:read", "health:read",
      "metrics:read"
    ];
    description: "除系统管理外，拥有完整的开发访问权限";
  };
  ADMIN: {
    permissions: [...DEVELOPER.permissions,
      "user:manage", "apikey:manage", "mapping:delete", "system:configure",
      "security:audit", "system:admin"
    ];
    description: "完整的系统管理能力";
  };
}
```

#### 2.1.3 公共访问
```http
GET /api/v1/monitoring/health
Content-Type: application/json
# 无需认证头
```

### 2.2 速率限制规范

#### 2.2.1 API 密钥速率限制
```typescript
interface ApiKeyRateLimits {
  default: {
    requests: '每小时 1000 次请求';
    burstLimit: '每分钟 50 次请求的突发限制';
    window: '滑动窗口';
  };
  premium: {
    requests: '每小时 10000 次请求';
    burstLimit: '每分钟 500 次请求的突发限制';
    window: '滑动窗口';
  };
  headers: {
    remaining: 'X-RateLimit-Remaining';
    reset: 'X-RateLimit-Reset';
    limit: 'X-RateLimit-Limit';
  };
}
```

#### 2.2.2 JWT 速率限制
```typescript
interface JwtRateLimits {
  administrative: {
    requests: '每小时 100 次请求';
    rationale: '管理操作不频繁';
  };
  development: {
    requests: '每小时 500 次请求';
    rationale: '开发和测试的更高限制';
  };
}
```

## 3. 核心 API 端点规范

### 3.1 数据接收 API (强实时接口)

#### 3.1.1 主要数据端点
```http
POST /api/v1/receiver/data
```

**请求规范：**
```typescript
interface DataRequestDto {
  symbols: string[];              // 股票代码 (最多 100 个)
  capabilityType: CapabilityType;            // 能力类型
  providerPreference?: string;    // 可选的提供商偏好
  metadata?: {
    includeTimestamp?: boolean;
    includeProvider?: boolean;
    includeMarket?: boolean;
    includePerformanceMetrics?: boolean;  // 新增：包含性能指标
  };
}

enum CapabilityType {
  STOCK_QUOTE = "stock-quote",
  STOCK_BASIC_INFO = "stock-basic-info", 
  MARKET_STATUS = "market-status",
  INDEX_QUOTE = "index-quote"           // 新增：指数行情支持
}
```

**响应规范：**
```typescript
interface DataResponse {
  statusCode: 200;
  message: "数据获取成功";
  data: {
    results: StockData[];
    metadata: {
      requestTime: string;
      responseTime: string;
      provider: string;
      cached: boolean;
      market: string;
    };
  };
  timestamp: string;
}

interface StockData {
  symbol: string;
  market: string;
  [key: string]: any;  // 基于映射的动态字段
}
```

**错误响应：**
```typescript
interface ErrorScenarios {
  invalidSymbols: {
    statusCode: 400;
    message: "无效的股票代码";
    data: null;
  };
  providerUnavailable: {
    statusCode: 503;
    message: "数据提供商暂时不可用";
    data: null;
  };
  rateLimitExceeded: {
    statusCode: 429;
    message: "请求频率超限";
    data: null;
  };
  authenticationFailed: {
    statusCode: 401;
    message: "API密钥验证失败";
    data: null;
  };
}
```

#### 3.1.2 接收器配置端点

**提供商健康检查：**
```http
GET /api/v1/receiver/providers/health
Authorization: X-App-Key + X-Access-Token (provider:read)

Response:
{
  "statusCode": 200,
  "message": "提供商健康状态查询成功",
  "data": {
    "providers": [
      {
        "name": "longport",
        "status": "healthy",
        "responseTime": 150,
        "capabilities": ["stock-quote", "stock-basic-info"],
        "markets": ["HK", "US"]
      }
    ]
  }
}
```

**市场检测测试：**
```http
POST /api/v1/receiver/detect-market
Content-Type: application/json
Authorization: X-App-Key + X-Access-Token (data:read)

Request:
{
  "symbols": ["700.HK", "AAPL", "000001.SZ"]
}

Response:
{
  "statusCode": 200,
  "message": "市场检测成功",
  "data": {
    "detections": [
      { "symbol": "700.HK", "market": "HK" },
      { "symbol": "AAPL", "market": "US" },
      { "symbol": "000001.SZ", "market": "SZ" }
    ]
  }
}
```

### 3.2 查询 API (弱实时分析接口)

#### 3.2.1 基于符号的查询
```http
POST /api/v1/query/by-symbols
Authorization: X-App-Key + X-Access-Token (query:execute)
Content-Type: application/json

Request:
{
  "symbols": ["700.HK", "BABA.US"],
  "dataTypeFilter": ["stock-quote", "stock-basic-info"],
  "includeMetadata": true,
  "changeThreshold": {
    "priceChangePercent": 0.05,
    "volumeChangePercent": 0.10
  }
}

Response:
{
  "statusCode": 200,
  "message": "符号查询成功",
  "data": {
    "results": [
      {
        "symbol": "700.HK",
        "market": "HK",
        "data": {
          "lastPrice": 320.50,
          "changePercent": 2.15,
          "volume": 12500000,
          "lastUpdated": "2025-07-27T09:30:00Z"
        },
        "changeDetected": true,
        "significantChanges": ["lastPrice", "volume"]
      }
    ],
    "metadata": {
      "totalSymbols": 2,
      "successfulSymbols": 2,
      "cacheHitRate": 0.85,
      "averageAge": "15s"
    }
  }
}
```

#### 3.2.2 基于市场的查询
```http
POST /api/v1/query/by-market
Authorization: X-App-Key + X-Access-Token (query:execute)

Request:
{
  "market": "HK",
  "dataTypeFilter": ["stock-quote"],
  "limit": 50,
  "sortBy": "changePercent",
  "sortOrder": "desc",
  "filters": {
    "minPrice": 1.0,
    "maxPrice": 1000.0,
    "minVolume": 100000
  }
}
```

#### 3.2.3 变化检测查询
```http
POST /api/v1/query/by-change-threshold
Authorization: X-App-Key + X-Access-Token (query:execute)

Request:
{
  "market": "US",
  "timeWindow": "1h",
  "thresholds": {
    "priceChange": 0.05,
    "volumeSpike": 2.0,
    "significantFields": ["lastPrice", "volume", "turnover"]
  },
  "limit": 100
}
```

### 3.3 符号映射 API

#### 3.3.1 符号转换
```http
POST /api/v1/symbol-mapper/transform
Authorization: X-App-Key + X-Access-Token (mapping:read)

Request:
{
  "symbols": ["00700", "BABA"],
  "sourceFormat": "provider-specific",
  "targetFormat": "standard",
  "provider": "longport"
}

Response:
{
  "statusCode": 200,
  "message": "符号转换成功",
  "data": {
    "transformations": [
      {
        "source": "00700",
        "target": "700.HK",
        "market": "HK",
        "provider": "longport"
      },
      {
        "source": "BABA",
        "target": "BABA.US",
        "market": "US",
        "provider": "longport"
      }
    ]
  }
}
```

#### 3.3.2 批量符号操作
```http
POST /api/v1/symbol-mapper/bulk-transform
Authorization: X-App-Key + X-Access-Token (mapping:read)

Request:
{
  "symbols": [...], // 最多 100 个符号
  "sourceFormat": "mixed",
  "targetFormat": "standard"
}
```

#### 3.3.3 映射管理 (管理员/开发者)
```http
POST /api/v1/symbol-mapper/mappings
Authorization: Bearer JWT_TOKEN (mapping:create)

Request:
{
  "provider": "new-provider",
  "symbolMappings": [
    {
      "providerSymbol": "ABC123",
      "standardSymbol": "ABC.US",
      "market": "US"
    }
  ]
}
```

### 3.4 数据映射 API

#### 3.4.1 字段映射配置
```http
GET /api/v1/data-mapper/preset-fields
Authorization: X-App-Key + X-Access-Token (mapping:read)

Response:
{
  "statusCode": 200,
  "message": "预设字段获取成功",
  "data": {
    "stockQuoteFields": [
      {
        "name": "lastPrice",
        "type": "number",
        "description": "最新成交价",
        "required": true
      },
      {
        "name": "changePercent",
        "type": "number",
        "description": "涨跌幅百分比",
        "required": false
      }
    ],
    "stockBasicInfoFields": [
      {
        "name": "companyName",
        "type": "string",
        "description": "公司名称",
        "required": true
      }
    ]
  }
}
```

#### 3.4.2 自定义映射创建
```http
POST /api/v1/data-mapper/custom-mappings
Authorization: Bearer JWT_TOKEN (mapping:create)

Request:
{
  "provider": "custom-provider",
  "dataRuleListType": "stock-quote",
  "mappings": [
    {
      "sourceField": "data.securities[0].last_price",
      "targetField": "lastPrice",
      "transform": {
        "type": "direct"
      }
    },
    {
      "sourceField": "data.securities[0].change_rate",
      "targetField": "changePercent",
      "transformation": "multiply",
      "multiplier": 100
    }
  ]
}
```

#### 3.4.3 映射预览和测试
```http
POST /api/v1/data-mapper/preview
Authorization: Bearer JWT_TOKEN (mapping:read)

Request:
{
  "provider": "longport",
  "dataRuleListType": "stock-quote",
  "sampleData": {
    "data": {
      "securities": [
        {
          "last_price": 320.5,
          "change_rate": 0.0215
        }
      ]
    }
  }
}

Response:
{
  "statusCode": 200,
  "message": "映射预览成功",
  "data": {
    "transformedData": {
      "lastPrice": 320.5,
      "changePercent": 2.15
    },
    "mappingRules": [
      {
        "sourceField": "data.securities[0].last_price",
        "targetField": "lastPrice",
        "value": 320.5
      }
    ]
  }
}
```

### 3.5 转换 API

#### 3.5.1 数据转换执行
```http
POST /api/v1/transformer/transform
Authorization: X-App-Key + X-Access-Token (data:read)

Request:
{
  "provider": "longport",
  "dataRuleListType": "stock-quote",
  "rawData": {
    "data": {
      "securities": [...]
    }
  },
  "symbols": ["700.HK"],
  "options": {
    "includeMetadata": true,
    "validateOutput": true
  }
}
```

#### 3.5.2 批量转换
```http
POST /api/v1/transformer/batch-transform
Authorization: X-App-Key + X-Access-Token (data:read)

Request:
{
  "transformations": [
    {
      "provider": "longport",
      "dataRuleListType": "stock-quote",
      "rawData": {...},
      "symbols": ["700.HK"]
    }
  ],
  "parallel": true
}
```

### 3.6 存储 API

#### 3.6.1 数据存储操作
```http
POST /api/v1/storage/store
Authorization: Bearer JWT_TOKEN (system:admin)

Request:
{
  "dataClassification": "stock-quote",
  "symbols": ["700.HK"],
  "data": {
    "700.HK": {
      "lastPrice": 320.5,
      "timestamp": "2025-07-27T09:30:00Z"
    }
  },
  "metadata": {
    "provider": "longport",
    "ttl": 30
  }
}
```

#### 3.6.2 缓存管理
```http
POST /api/v1/storage/cache/invalidate
Authorization: Bearer JWT_TOKEN (system:admin)

Request:
{
  "keys": ["stock-quote:700.HK", "stock-quote:AAPL.US"],
  "pattern": "stock-quote:*",
  "market": "HK"
}
```

### 3.7 认证管理 API

#### 3.7.1 用户注册和登录
```http
POST /api/v1/auth/register
Content-Type: application/json

Request:
{
  "username": "developer1",
  "email": "dev@company.com",
  "password": "SecurePassword123!",
  "role": "developer"
}

Response:
{
  "statusCode": 201,
  "message": "用户注册成功",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "developer1",
    "role": "developer"
  }
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

Request:
{
  "username": "developer1",
  "password": "SecurePassword123!"
}

Response:
{
  "statusCode": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "def50200a2...",
    "expiresIn": 3600,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "developer1",
      "role": "developer"
    }
  }
}
```

#### 3.7.2 API 密钥管理
```http
POST /api/v1/auth/api-keys
Authorization: Bearer JWT_TOKEN

Request:
{
  "name": "交易机器人 v2.1",
  "description": "自动化交易应用程序",
  "permissions": ["data:read", "query:execute"],
  "expiresAt": "2026-07-27T00:00:00Z",
  "rateLimitTier": "premium"
}

Response:
{
  "statusCode": 201,
  "message": "API密钥创建成功",
  "data": {
    "keyId": "6123abc456def789",
    "appKey": "ak_1234567890abcdef",
    "accessToken": "at_abcdef1234567890",
    "name": "交易机器人 v2.1",
    "permissions": ["data:read", "query:execute"],
    "createdAt": "2025-07-27T10:00:00Z",
    "expiresAt": "2026-07-27T00:00:00Z"
  }
}
```

```http
GET /api/v1/auth/api-keys
Authorization: Bearer JWT_TOKEN

Response:
{
  "statusCode": 200,
  "message": "API密钥列表获取成功",
  "data": {
    "apiKeys": [
      {
        "keyId": "6123abc456def789",
        "appKey": "ak_1234567890abcdef",
        "name": "交易机器人 v2.1",
        "permissions": ["data:read", "query:execute"],
        "status": "active",
        "lastUsed": "2025-07-27T09:45:00Z",
        "requestCount": 15420
      }
    ],
    "total": 1
  }
}
```

### 3.8 告警系统 API

#### 3.8.1 告警规则管理
```http
POST /api/v1/alerts/rules
Authorization: Bearer JWT_TOKEN (admin)
Content-Type: application/json

Request:
{
  "name": "响应时间告警",
  "metric": "response_time_p95",
  "operator": "gt",
  "threshold": 100,
  "severity": "high",
  "channels": ["email", "slack"],
  "cooldown": 300,
  "description": "API响应时间P95超过100ms时触发告警"
}

Response:
{
  "statusCode": 201,
  "message": "告警规则创建成功",
  "data": {
    "id": "alert_rule_123",
    "name": "响应时间告警",
    "status": "active",
    "createdAt": "2025-07-28T10:00:00Z"
  }
}
```

#### 3.8.2 活跃告警查询
```http
GET /api/v1/alerts/active
Authorization: X-App-Key + X-Access-Token (monitor:read)

Query Parameters:
- severity?: "critical" | "high" | "medium" | "low"
- limit?: number (默认20, 最大100)
- page?: number

Response:
{
  "statusCode": 200,
  "message": "活跃告警查询成功",
  "data": {
    "items": [
      {
        "id": "alert_001",
        "ruleName": "响应时间告警",
        "severity": "high",
        "message": "API响应时间P95为156ms，超过阈值100ms",
        "triggeredAt": "2025-07-28T09:45:00Z",
        "status": "firing",
        "attempts": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### 3.8.3 批量告警操作
```http
POST /api/v1/alerts/batch/acknowledge
Authorization: Bearer JWT_TOKEN (admin)
Content-Type: application/json

Request:
{
  "alertIds": ["alert_001", "alert_002"],
  "reason": "已确认问题并开始修复"
}

Response:
{
  "statusCode": 200,
  "message": "批量确认告警成功",
  "data": {
    "acknowledged": 2,
    "failed": 0,
    "results": [
      { "id": "alert_001", "status": "acknowledged" },
      { "id": "alert_002", "status": "acknowledged" }
    ]
  }
}
```

### 3.9 性能监控 API

#### 3.9.1 性能指标查询
```http
GET /api/v1/metrics/performance
Authorization: X-App-Key + X-Access-Token (metrics:read)

Query Parameters:
- timeRange?: "1h" | "6h" | "24h" | "7d" (默认1h)
- granularity?: "1m" | "5m" | "15m" | "1h" (默认5m)
- metrics?: string[] (默认全部指标)

Response:
{
  "statusCode": 200,
  "message": "性能指标查询成功",
  "data": {
    "timeRange": "1h",
    "granularity": "5m",
    "summary": {
      "healthScore": 94,
      "totalRequests": 15420,
      "averageResponseTime": 87.5,
      "errorRate": 0.002,
      "cacheHitRate": 0.932
    },
    "metrics": {
      "responseTime": {
        "p50": 65,
        "p95": 89,
        "p99": 156,
        "unit": "ms"
      },
      "database": {
        "avgQueryTime": 23.5,
        "connectionPoolUtilization": 0.45,
        "slowQueryCount": 2
      },
      "cache": {
        "hitRate": 0.932,
        "avgOperationTime": 0.8,
        "memoryUtilization": 0.67
      }
    }
  }
}
```

#### 3.9.2 指标健康评估
```http
GET /api/v1/metrics/health
Authorization: Bearer JWT_TOKEN (admin)

Response:
{
  "statusCode": 200,
  "message": "指标系统健康检查成功",
  "data": {
    "systemStatus": "healthy",
    "healthScore": 94,
    "components": {
      "metricsCollection": {
        "status": "healthy",
        "collectionRate": 0.998,
        "lastCollection": "2025-07-28T10:00:00Z"
      },
      "storage": {
        "status": "healthy",
        "redisConnected": true,
        "dataRetention": "7天"
      },
      "alerts": {
        "status": "healthy",
        "activeRules": 15,
        "firingAlerts": 2
      }
    },
    "recommendations": [
      "考虑增加Redis内存以提高缓存命中率",
      "数据库连接池使用率较低，可以适当减少连接数"
    ]
  }
}
```

### 3.10 安全审计 API

#### 3.10.1 安全扫描执行
```http
POST /api/v1/security/scan
Authorization: Bearer JWT_TOKEN (admin)
Content-Type: application/json

Request:
{
  "scanTypes": ["authentication", "authorization", "configuration"],
  "includeRecommendations": true
}

Response:
{
  "statusCode": 200,
  "message": "安全扫描执行成功",
  "data": {
    "scanId": "scan_20250728_001",
    "summary": {
      "totalChecks": 45,
      "vulnerabilities": 3,
      "criticalIssues": 0,
      "highRiskIssues": 1,
      "mediumRiskIssues": 2,
      "lowRiskIssues": 0
    },
    "vulnerabilities": [
      {
        "id": "vuln_001",
        "type": "configuration",
        "severity": "high",
        "title": "API密钥过期时间过长",
        "description": "部分API密钥设置的过期时间超过推荐的90天",
        "recommendation": "将API密钥过期时间设置为不超过90天",
        "affectedResources": 3
      }
    ],
    "recommendations": [
      "启用API访问日志记录",
      "定期更新系统依赖包",
      "实施更严格的密码策略"
    ]
  }
}
```

#### 3.10.2 安全审计日志
```http
GET /api/v1/security/audit/events
Authorization: Bearer JWT_TOKEN (admin)

Query Parameters:
- eventType?: "authentication" | "authorization" | "data_access"
- severity?: "critical" | "high" | "medium" | "low"
- startTime?: string (ISO 8601)
- endTime?: string (ISO 8601)
- page?: number
- limit?: number

Response:
{
  "statusCode": 200,
  "message": "安全审计事件查询成功",
  "data": {
    "items": [
      {
        "eventId": "event_20250728_001",
        "type": "authentication",
        "severity": "medium",
        "timestamp": "2025-07-28T09:30:00Z",
        "clientIP": "192.168.1.100",
        "userAgent": "APIClient/1.0",
        "outcome": "failure",
        "details": {
          "reason": "无效的API密钥",
          "attemptCount": 3,
          "riskScore": 65
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3.11 监控和健康 API

#### 3.11.1 系统健康端点
```http
GET /api/v1/monitoring/health
# 公共端点 - 无需认证

Response:
{
  "statusCode": 200,
  "message": "系统健康检查成功",
  "data": {
    "status": "healthy",
    "score": 95,
    "components": {
      "database": { "status": "healthy", "responseTime": 45 },
      "cache": { "status": "healthy", "responseTime": 2 },
      "providers": { "status": "healthy", "count": 2 },
      "alerting": { "status": "healthy", "activeRules": 15 },
      "security": { "status": "healthy", "lastScan": "2025-07-28T06:00:00Z" }
    },
    "timestamp": "2025-07-28T10:00:00Z"
  }
}
```

```http
GET /api/v1/monitoring/health/detailed
Authorization: Bearer JWT_TOKEN (monitor:read)

Response:
{
  "statusCode": 200,
  "message": "详细健康检查成功",
  "data": {
    "overallHealth": 95,
    "services": {
      "mongodb": {
        "status": "healthy",
        "connectionPool": { "active": 5, "available": 95 },
        "avgResponseTime": 45,
        "errors": 0
      },
      "redis": {
        "status": "healthy",
        "memory": { "used": "2.1GB", "available": "3.9GB" },
        "avgResponseTime": 2,
        "hitRate": 0.85
      }
    },
    "providers": [
      {
        "name": "longport",
        "status": "healthy",
        "responseTime": 150,
        "successRate": 0.995,
        "lastCheck": "2025-07-27T09:59:30Z"
      }
    ]
  }
}
```

#### 3.8.2 性能指标
```http
GET /api/v1/monitoring/metrics
Authorization: Bearer JWT_TOKEN (metrics:read)

Query Parameters:
- timeRange: 1h, 6h, 24h, 7d
- granularity: 1m, 5m, 15m, 1h
- metrics: responseTime,errorRate,throughput

Response:
{
  "statusCode": 200,
  "message": "性能指标获取成功",
  "data": {
    "timeRange": "1h",
    "granularity": "5m",
    "metrics": {
      "responseTime": {
        "p50": 85,
        "p95": 195,
        "p99": 450,
        "unit": "ms"
      },
      "errorRate": {
        "rate": 0.002,
        "total": 12,
        "unit": "percentage"
      },
      "throughput": {
        "requestsPerSecond": 145,
        "requestsPerMinute": 8700
      }
    },
    "timeSeries": [
      {
        "timestamp": "2025-07-27T09:00:00Z",
        "responseTime": 92,
        "errorRate": 0.001,
        "throughput": 150
      }
    ]
  }
}
```

#### 3.8.3 提供商状态
```http
GET /api/v1/monitoring/providers
Authorization: X-App-Key + X-Access-Token (provider:read)

Response:
{
  "statusCode": 200,
  "message": "提供商状态获取成功",
  "data": {
    "providers": [
      {
        "name": "longport",
        "status": "healthy",
        "capabilities": ["stock-quote", "stock-basic-info", "market-status"],
        "markets": ["HK", "US", "CN"],
        "performance": {
          "avgResponseTime": 150,
          "successRate": 0.995,
          "requestsToday": 85430
        },
        "healthChecks": {
          "lastCheck": "2025-07-27T09:58:00Z",
          "consecutiveFailures": 0,
          "uptime": "99.95%"
        }
      }
    ]
  }
}
```

## 4. 错误处理规范

### 4.1 标准错误响应格式
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;        // 中文错误消息
  data: null;
  timestamp: string;
  error?: {
    code: string;         // 机器可读的错误代码
    details?: any;        // 附加错误上下文
    stack?: string;       // 堆栈跟踪 (仅限开发环境)
  };
}
```

### 4.2 HTTP 状态码使用
```typescript
interface StatusCodeUsage {
  200: '操作成功';
  201: '资源创建成功';
  400: '错误请求 - 无效输入';
  401: '需要认证或认证失败';
  403: '禁止访问 - 权限不足';
  404: '资源未找到';
  429: '请求频率超限';
  500: '内部服务器错误';
  502: '网关错误 - 提供商错误';
  503: '服务不可用';
  504: '网关超时 - 提供商超时';
}
```

### 4.3 错误代码分类
```typescript
enum ErrorCodes {
  // 认证错误 (AUTH_*)
  AUTH_INVALID_CREDENTIALS = "AUTH_001",
  AUTH_TOKEN_EXPIRED = "AUTH_002",
  AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_003",
  AUTH_RATE_LIMIT_EXCEEDED = "AUTH_004",
  AUTH_API_KEY_REVOKED = "AUTH_005",         // 新增：API密钥已撤销

  // 验证错误 (VAL_*)
  VAL_INVALID_SYMBOL = "VAL_001",
  VAL_INVALID_MARKET = "VAL_002",
  VAL_INVALID_DATA_TYPE = "VAL_003",
  VAL_EXCEEDS_LIMIT = "VAL_004",
  VAL_INVALID_PAGINATION = "VAL_005",        // 新增：分页参数无效
  VAL_INVALID_TIME_RANGE = "VAL_006",        // 新增：时间范围无效

  // 提供商错误 (PROV_*)
  PROV_UNAVAILABLE = "PROV_001",
  PROV_TIMEOUT = "PROV_002",
  PROV_RATE_LIMITED = "PROV_003",
  PROV_INVALID_RESPONSE = "PROV_004",
  PROV_DATA_QUALITY_LOW = "PROV_005",        // 新增：数据质量过低

  // 系统错误 (SYS_*)
  SYS_DATABASE_ERROR = "SYS_001",
  SYS_CACHE_ERROR = "SYS_002",
  SYS_INTERNAL_ERROR = "SYS_003",
  SYS_MAINTENANCE_MODE = "SYS_004",          // 新增：系统维护模式

  // 告警错误 (ALERT_*)
  ALERT_RULE_NOT_FOUND = "ALERT_001",        // 新增：告警规则不存在
  ALERT_INVALID_CONDITION = "ALERT_002",     // 新增：告警条件无效
  ALERT_CHANNEL_UNAVAILABLE = "ALERT_003",   // 新增：通知渠道不可用

  // 监控错误 (METRICS_*)
  METRICS_COLLECTION_FAILED = "METRICS_001", // 新增：指标收集失败
  METRICS_STORAGE_FULL = "METRICS_002",       // 新增：指标存储已满

  // 安全错误 (SEC_*)
  SEC_SCAN_IN_PROGRESS = "SEC_001",          // 新增：安全扫描进行中
  SEC_VULNERABILITY_FOUND = "SEC_002",       // 新增：发现安全漏洞
  SEC_AUDIT_LOG_FULL = "SEC_003"             // 新增：审计日志已满
}
```

### 4.4 错误响应示例
```typescript
interface ErrorExamples {
  invalidSymbol: {
    statusCode: 400;
    message: "无效的股票代码格式";
    data: null;
    error: {
      code: "VAL_001";
      details: {
        invalidSymbols: ["INVALID123"];
        validFormat: "例如: 700.HK, AAPL.US, 000001.SZ";
      };
    };
  };

  authenticationFailed: {
    statusCode: 401;
    message: "API密钥验证失败";
    data: null;
    error: {
      code: "AUTH_001";
      details: {
        reason: "无效的 X-Access-Token";
        hint: "请检查 X-App-Key 和 X-Access-Token 是否正确";
      };
    };
  };

  rateLimitExceeded: {
    statusCode: 429;
    message: "请求频率超出限制";
    data: null;
    error: {
      code: "AUTH_004";
      details: {
        limit: 1000;
        window: "1 小时";
        resetTime: "2025-07-27T11:00:00Z";
      };
    };
  };

  providerUnavailable: {
    statusCode: 503;
    message: "数据提供商暂时不可用";
    data: null;
    error: {
      code: "PROV_001";
      details: {
        provider: "longport";
        estimatedRecovery: "2025-07-27T10:30:00Z";
        alternativeProviders: ["longport-sg"];
      };
    };
  };
}
```

## 5. 请求/响应规范

### 5.1 请求头
```typescript
interface StandardHeaders {
  required: {
    'Content-Type': 'application/json';
  };

  apiKeyAuth: {
    'X-App-Key': 'your_application_key';
    'X-Access-Token': 'your_access_token';
  };

  jwtAuth: {
    'Authorization': 'Bearer your_jwt_token';
  };

  optional: {
    'X-Request-ID': 'unique_request_identifier';
    'Accept-Encoding': 'gzip, deflate';
    'User-Agent': 'YourApp/1.0.0';
  };
}
```

### 5.2 响应头
```typescript
interface ResponseHeaders {
  standard: {
    'Content-Type': 'application/json; charset=utf-8';
    'X-Response-Time': 'response_time_in_ms';
    'X-Request-ID': 'request_identifier';
  };

  caching: {
    'Cache-Control': 'public, max-age=30' | 'no-cache';
    'ETag': 'response_version_hash';
    'Last-Modified': 'last_modification_time';
  };

  rateLimiting: {
    'X-RateLimit-Limit': 'requests_per_window';
    'X-RateLimit-Remaining': 'remaining_requests';
    'X-RateLimit-Reset': 'window_reset_time';
  };

  security: {
    'X-Content-Type-Options': 'nosniff';
    'X-Frame-Options': 'DENY';
    'X-XSS-Protection': '1; mode=block';
  };
}
```

### 5.3 分页规范
```typescript
interface PaginationRequest {
  page?: number;          // 页码 (从 1 开始)
  limit?: number;         // 每页项目数 (最大 100)
  sort?: string;          // 排序字段
  order?: 'asc' | 'desc'; // 排序顺序
}

interface PaginationResponse<T> {
  statusCode: 200;
  message: string;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
  timestamp: string;
}
```

## 6. 数据格式规范

### 6.1 符号格式标准
```typescript
interface SymbolFormats {
  hongKong: {
    pattern: /^\d{4,5}\.HK$/;
    examples: ['0700.HK', '00001.HK', '09988.HK'];
    description: '4-5 位数字 + .HK 后缀';
  };

  us: {
    pattern: /^[A-Z]{1,5}(\.US)?$/;
    examples: ['AAPL.US', 'GOOGL.US', 'TSLA'];
    description: '1-5 个大写字母，可选 .US 后缀';
  };

  shenzhen: {
    pattern: /^(00|30)\d{4}(\.SZ)?$/;
    examples: ['000001.SZ', '300001.SZ'];
    description: '00/30 前缀 + 4 位数字，可选 .SZ 后缀';
  };

  shanghai: {
    pattern: /^(60|68)\d{4}(\.SH)?$/;
    examples: ['600000.SH', '688001.SH'];
    description: '60/68 前缀 + 4 位数字，可选 .SH 后缀';
  };
}
```

### 6.2 日期/时间格式标准
```typescript
interface DateTimeFormats {
  timestamp: {
    format: 'ISO 8601';
    pattern: 'YYYY-MM-DDTHH:mm:ss.sssZ';
    example: '2025-07-27T14:30:00.123Z';
    timezone: 'UTC';
  };

  date: {
    format: 'ISO 8601 仅日期';
    pattern: 'YYYY-MM-DD';
    example: '2025-07-27';
  };

  time: {
    format: 'ISO 8601 仅时间';
    pattern: 'HH:mm:ss';
    example: '14:30:00';
  };
}
```

### 6.3 数字格式标准
```typescript
interface NumericFormats {
  price: {
    type: 'number';
    precision: '最多 4 位小数';
    example: 320.1250;
  };

  percentage: {
    type: 'number';
    format: '小数 (0.05 = 5%)';
    range: '通常 -1.0 到 1.0';
    example: 0.0215;
  };

  volume: {
    type: 'number';
    format: '整数';
    example: 12500000;
  };

  marketCap: {
    type: 'number';
    format: '以基础货币计的十进制数';
    example: 2500000000.50;
  };
}
```

## 7. OpenAPI 3.0 规范

### 7.1 API 文档标准
完整的 API 使用 OpenAPI 3.0 规范进行文档化，可在以下地址获取：
- **交互式文档**：http://localhost:3000/api/docs
- **JSON 规范**：http://localhost:3000/api/docs-json
- **YAML 规范**：http://localhost:3000/api/docs-yaml

### 7.2 Swagger UI 配置
```typescript
interface SwaggerConfig {
  title: '新股票 API';
  version: '1.0.0';
  description: '智能股票数据聚合和标准化平台';

  servers: [
    {
      url: 'http://localhost:3000';
      description: '开发服务器';
    },
    {
      url: 'https://api.newstock.example.com';
      description: '生产服务器';
    }
  ];

  securitySchemes: {
    ApiKeyAuth: {
      type: 'apiKey';
      in: 'header';
      name: 'X-App-Key';
      description: '第三方应用程序的 API 密钥认证';
    };
    BearerAuth: {
      type: 'http';
      scheme: 'bearer';
      bearerFormat: 'JWT';
      description: '开发者和管理员的 JWT 令牌认证';
    };
  };
}
```

## 8. 向后兼容性和版本控制

### 8.1 API 版本控制策略
```typescript
interface VersioningPolicy {
  strategy: 'URL 路径版本控制';
  currentVersion: 'v1';

  compatibilityRules: {
    majorVersion: '允许破坏性更改';
    minorVersion: '仅允许向后兼容的添加';
    patchVersion: '仅限错误修复和内部改进';
  };

  deprecationPolicy: {
    notice: '至少提前 6 个月通知';
    support: '至少 12 个月并行支持';
    migration: '提供全面的迁移指南';
  };

  versioningExamples: {
    current: '/api/v1/receiver/data';
    future: '/api/v2/receiver/data';
    deprecated: '/api/v0/receiver/data';
  };
}
```

### 8.2 破坏性更改管理
```typescript
interface BreakingChangePolicy {
  definition: [
    '删除或重命名 API 端点',
    '更改必需的请求参数',
    '修改响应数据结构',
    '更改认证要求',
    '更改错误响应格式'
  ];

  process: [
    '提前 6 个月宣布破坏性更改',
    '提供迁移时间表和文档',
    '提供并行 API 版本支持',
    '监控已弃用端点的使用情况指标',
    '在迁移期间提供开发者支持'
  ];

  nonBreakingChanges: [
    '添加新的可选请求参数',
    '向响应对象添加新字段',
    '添加新的 API 端点',
    '改进错误消息',
    '性能优化'
  ];
}
```

## 9. 安全规范

### 9.1 输入验证
```typescript
interface InputValidation {
  stringFields: {
    maxLength: 1000;
    encoding: 'UTF-8';
    sanitization: 'HTML 转义，SQL 注入防御';
  };

  arrayFields: {
    maxItems: 100;
    validation: '每个项目单独验证';
  };

  numericFields: {
    ranges: '根据业务逻辑强制执行';
    precision: '验证适当的小数位数';
  };

  dateFields: {
    format: '严格执行 ISO 8601';
    range: '合理的历史和未来限制';
  };
}
```

### 9.2 输出净化
```typescript
interface OutputSanitization {
  dataEscaping: '所有用户提供的数据在响应中转义';
  sensitiveData: '绝不包含密码、令牌或内部 ID';
  errorMessages: '通用消息，不包含内部系统详细信息';
  logging: '敏感数据从日志中排除';
}
```

### 9.3 速率限制详情
```typescript
interface RateLimitingImplementation {
  algorithm: '滑动窗口日志';
  storage: '用于分布式速率限制的 Redis';
  headers: '包含标准速率限制头';

  limits: {
    apiKey: {
      default: '每小时 1000 次请求';
      premium: '每小时 10000 次请求';
      burst: '每分钟最多 50 次请求';
    };
    jwt: {
      developer: '每小时 500 次请求';
      admin: '每小时 100 次请求';
    };
    public: '每个 IP 每小时 100 次请求';
  };

  responses: {
    normal: '包含速率限制头';
    exceeded: '429 状态码，带 retry-after 头';
    error: '速率限制器故障时的优雅降级';
  };
}
```

## 10. 性能规范

### 10.1 响应时间目标
```typescript
interface ResponseTimeTargets {
  strongRealtime: {
    p50: '<50ms';
    p95: '<100ms';
    p99: '<200ms';
    endpoints: ['/api/v1/receiver/data'];
  };

  weakRealtime: {
    p50: '<200ms';
    p95: '<500ms';
    p99: '<1000ms';
    endpoints: ['/api/v1/query/*'];
  };

  administrative: {
    p50: '<500ms';
    p95: '<2000ms';
    p99: '<5000ms';
    endpoints: ['/api/v1/auth/*', '/api/v1/monitoring/*'];
  };
}
```

### 10.2 吞吐量要求
```typescript
interface ThroughputRequirements {
  sustained: {
    requestsPerSecond: 167;  // 每分钟 10,000 次
    concurrentUsers: 1000;
    peakMultiplier: 3;       // 处理 3 倍正常负载
  };

  burst: {
    duration: '30 秒';
    multiplier: 5;           // 5 倍持续速率
    recovery: '< 60 秒';
  };
}
```

### 10.3 缓存策略
```typescript
interface CachingStrategy {
  strongRealtime: {
    ttl: '1 秒';
    rationale: '交易应用程序的最大新鲜度';
  };

  weakRealtime: {
    ttl: '30-3600 秒 (市场感知)';
    rationale: '针对分析工作负载优化';
  };

  staticData: {
    ttl: '24 小时';
    rationale: '公司信息和其他缓慢变化的数据';
  };

  invalidation: {
    strategy: '基于更改的失效，带回退 TTL';
    monitoring: '缓存命中率和有效性指标';
  };
}
```

## 版本历史

### v2.0 (2025-07-28)
- **新增功能模块**：告警系统、性能监控、安全审计、缓存服务、分页服务、权限验证
- **API端点扩展**：新增37个告警管理端点、15个监控端点、12个安全端点
- **指数行情支持**：添加index-quote数据类型
- **批量操作增强**：支持批量告警操作和批量数据查询
- **错误代码扩展**：新增14个错误代码类型
- **性能指标集成**：响应中可包含性能监控数据

### v1.0 (2025-07-27)
- **初始版本**：6核心组件架构API规范
- **基础认证系统**：API密钥和JWT认证
- **核心数据处理**：股票行情和基本信息API
- **提供商集成**：LongPort和LongPort SG支持

---

**文档控制：**
- **API 设计师**：API 架构团队
- **审阅者**：开发团队，质量保证团队，安全团队
- **批准者**：技术负责人
- **实施状态**：生产就绪
- **最后更新**：2025-07-28
- **下次审阅**：2025-10-28