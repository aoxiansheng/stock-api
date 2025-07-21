# 认证系统 API 文档

## 概述

智能股票数据系统提供统一的权限验证架构，支持不同类型的用户和使用场景：

1. **JWT 认证** - 用于管理员和开发者的Web界面访问（角色 + 权限验证）
2. **API Key 认证** - 用于第三方应用的程序化访问（权限列表验证）
3. **统一权限验证** - UnifiedPermissionsGuard处理所有权限验证
4. **频率限制** - 基于API Key的智能访问频率控制

## 认证类型

### 1. JWT Token 认证
适用于：管理员和开发者的交互式操作

**特点：**
- 基于Bearer Token的标准HTTP认证
- 支持角色和权限双重验证
- 自动令牌刷新机制
- 适合Web应用和管理后台
- 使用UnifiedPermissionsGuard进行权限验证

### 2. API Key 认证
适用于：第三方应用的自动化访问

**特点：**
- App Key + Access Token 双重验证
- 基于权限列表的细粒度控制
- 自动频率限制
- 使用统计和监控
- 支持批量操作
- 统一的权限验证机制

### 3. 频率限制系统
**自动应用于所有API Key认证的请求**

**特点：**
- 固定窗口和滑动窗口算法
- Redis原子操作确保并发安全
- 标准HTTP频率限制头
- 智能容错机制

---

## API 端点

### 用户管理

#### 注册用户
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "developer123",
  "email": "dev@example.com", 
  "password": "securePassword123",
  "role": "developer"  // "admin" | "developer"
}
```

**响应：**
```json
{
  "statusCode": 201,
  "message": "用户注册成功",
  "data": {
    "_id": "668...",
    "username": "developer123",
    "email": "dev@example.com",
    "role": "developer",
    "isActive": true,
    "createdAt": "2025-07-01T10:00:00.000Z",
    "updatedAt": "2025-07-01T10:00:00.000Z"
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

#### 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "developer123",
  "password": "securePassword123"
}
```

**响应：**
```json
{
  "statusCode": 201,
  "message": "登录成功", 
  "data": {
    "user": {
      "_id": "668...",
      "username": "developer123",
      "email": "dev@example.com",
      "role": "developer",
      "isActive": true,
      "lastLoginAt": "2025-07-01T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

#### 刷新令牌
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 获取用户资料
```http
GET /api/v1/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### API Key 管理

#### 创建 API Key
```http
POST /api/v1/auth/api-keys
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "我的应用API Key",
  "description": "用于数据获取的API密钥",
  "permissions": [
    "data:read",
    "query:execute", 
    "providers:read"
  ],
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  }
}
```

**响应：**
```json
{
  "statusCode": 201,
  "message": "API Key创建成功",
  "data": {
    "appKey": "47618d9f-f1e3-42f9-b87b-5c7d1ef6ffa3",
    "accessToken": "40da2dbc66da44b5ac1b0b4171cf14b1",
    "name": "我的应用API Key",
    "permissions": ["data:read", "query:execute", "providers:read"],
    "rateLimit": {
      "requests": 1000,
      "window": "1h"
    },
    "isActive": true,
    "usageCount": 0,
    "_id": "668...",
    "createdAt": "2025-07-01T10:00:00.000Z",
    "updatedAt": "2025-07-01T10:00:00.000Z"
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

#### 列出 API Keys
```http
GET /api/v1/auth/api-keys
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 获取 API Key 详情
```http
GET /api/v1/auth/api-keys/{apiKeyId}
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 更新 API Key
```http
PUT /api/v1/auth/api-keys/{apiKeyId}
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "更新后的名称",
  "isActive": false,
  "rateLimit": {
    "requests": 500,
    "window": "1h"
  }
}
```

#### 删除 API Key
```http
DELETE /api/v1/auth/api-keys/{apiKeyId}
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 获取 API Key 使用统计
```http
GET /api/v1/auth/api-keys/{apiKeyId}/usage
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应：**
```json
{
  "statusCode": 200,
  "message": "获取使用统计成功",
  "data": {
    "totalRequests": 12567,
    "currentPeriodRequests": 45,
    "lastRequestTime": "2025-07-01T09:45:30.000Z",
    "averageRequestsPerHour": 125.67,
    "currentUsage": {
      "current": 45,
      "limit": 1000,
      "remaining": 955,
      "resetTime": 1751394000000
    }
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

---

## 使用 API Key 访问资源

### 认证方式
使用API Key访问资源时，需要在HTTP头中提供：

```http
X-App-Key: 47618d9f-f1e3-42f9-b87b-5c7d1ef6ffa3
X-Access-Token: 40da2dbc66da44b5ac1b0b4171cf14b1
```

### 示例请求
```http
GET /api/v1/providers/capabilities
X-App-Key: 47618d9f-f1e3-42f9-b87b-5c7d1ef6ffa3
X-Access-Token: 40da2dbc66da44b5ac1b0b4171cf14b1
```

### 响应头中的频率限制信息
所有使用API Key的请求都会返回频率限制信息：

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 955
X-RateLimit-Reset: 1751394000
Content-Type: application/json

{
  "statusCode": 200,
  "message": "获取成功",
  "data": { ... }
}
```

**频率限制头说明：**
- `X-RateLimit-Limit`: 当前时间窗口的请求限制
- `X-RateLimit-Remaining`: 当前时间窗口剩余请求数
- `X-RateLimit-Reset`: 限制重置的UNIX时间戳

---

## 频率限制系统

### 限制策略

#### 1. 固定窗口算法（默认）
- 在固定时间窗口内统计请求数
- 窗口重置时计数器归零
- 适合大多数使用场景

#### 2. 滑动窗口算法
- 基于时间戳的动态窗口
- 更精确的频率控制
- 适合严格的限制场景

### 时间窗口格式
支持以下时间窗口格式：
- `60s` - 60秒
- `5m` - 5分钟  
- `1h` - 1小时
- `1d` - 1天

### 超过限制时的响应
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1751397600
Retry-After: 3600
Content-Type: application/json

{
  "statusCode": 429,
  "message": "请求频率超出限制",
  "error": "Too Many Requests",
  "details": {
    "limit": 1000,
    "current": 1001,
    "remaining": 0,
    "resetTime": 1751397600000,
    "retryAfter": 3600
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

---

## 权限系统

### 权限验证架构
系统采用统一的权限验证架构：

- **JWT用户**：基于角色的权限验证（角色 + 权限）
- **API Key**：基于权限列表的验证（仅权限）
- **统一守卫**：UnifiedPermissionsGuard处理所有权限验证

### 用户角色
- **admin**: 系统管理员，拥有所有权限
- **developer**: 开发者，拥有开发相关权限，可以管理自己的API Keys

### 权限枚举
系统定义了以下权限类型：

#### 数据访问权限
- `data:read` - 读取股票数据
- `query:execute` - 执行数据查询
- `providers:read` - 查看数据提供商信息

#### 开发者权限
- `transformer:preview` - 数据转换预览
- `system:monitor` - 系统监控
- `system:metrics` - 系统指标
- `system:health` - 系统健康状态
- `debug:access` - 调试访问
- `config:read` - 配置读取

#### 管理员权限
- `user:manage` - 用户管理
- `apikey:manage` - API Key管理
- `config:write` - 配置写入
- `mapping:write` - 映射写入
- `system:admin` - 系统管理

### 权限验证流程
1. **认证阶段**：验证JWT Token或API Key
2. **权限检查**：UnifiedPermissionsGuard验证所需权限
3. **访问控制**：根据权限验证结果允许或拒绝访问

### 权限检查
系统会自动验证每个请求的权限，权限不足时返回详细的403错误：

```json
{
  "statusCode": 403,
  "message": "API Key权限不足",
  "error": "Insufficient Permissions",
  "details": {
    "type": "API_KEY_PERMISSION_DENIED",
    "apiKeyName": "我的应用API Key",
    "requiredPermissions": ["data:read", "query:execute"],
    "grantedPermissions": ["data:read"],
    "missingPermissions": ["query:execute"],
    "endpoint": "/api/v1/query/execute",
    "method": "POST"
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

---

## 错误处理

### 认证错误
```json
{
  "statusCode": 401,
  "message": "API凭证无效",
  "error": "Unauthorized",
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

### 权限错误
```json
{
  "statusCode": 403,
  "message": "权限不足",
  "error": "Forbidden", 
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

### 频率限制错误
```json
{
  "statusCode": 429,
  "message": "请求频率超出限制",
  "error": "Too Many Requests",
  "details": {
    "limit": 1000,
    "current": 1001,
    "remaining": 0,
    "resetTime": 1751397600000,
    "retryAfter": 3600
  },
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

### 验证错误
```json
{
  "statusCode": 400,
  "message": "请求参数验证失败",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ],
  "timestamp": "2025-07-01T10:00:00.000Z"
}
```

---

## 最佳实践

### 1. API Key 安全
- 妥善保管App Key和Access Token
- 定期轮换API密钥
- 为不同应用创建独立的API Key
- 设置合适的权限范围

### 2. 频率限制处理
- 监控`X-RateLimit-*`响应头
- 实现指数退避重试机制
- 根据业务需求设置合理的限制

### 3. 错误处理
- 检查HTTP状态码
- 解析错误响应中的详细信息
- 实现适当的错误恢复逻辑

### 4. 性能优化
- 使用批量API减少请求次数
- 实现客户端缓存
- 合理设置请求超时

---

## SDK 和工具

### 官方SDK（规划中）
- JavaScript/Node.js SDK
- Python SDK  
- Java SDK
- Go SDK

### 测试工具
- Postman集合
- curl脚本示例
- 在线API调试器

---

## 支持和反馈

如有问题或建议，请联系：
- 技术支持：tech-support@example.com
- 文档反馈：docs@example.com
- GitHub Issues：[项目地址]

---

*文档版本：v1.0.0*  
*最后更新：2025-07-01*