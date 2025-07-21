# 智能股票数据系统 (Smart Stock Data System)

基于NestJS的智能股票数据处理系统，提供强时效vs弱时效双接口设计和多数据源融合能力，实现金融数据的标准化处理和高效查询。

## 📑 目录

- [系统架构](#系统架构)
  - [六组件核心架构](#六组件核心架构)
  - [双时效接口设计](#双时效接口设计)
- [核心特性](#核心特性)
  - [认证系统](#认证系统)
  - [数据源支持](#数据源支持)
  - [监控与指标](#监控与指标)
  - [安全特性](#安全特性)
- [安装与设置](#安装与设置)
  - [环境要求](#环境要求)
  - [安装步骤](#安装步骤)
  - [配置说明](#配置说明)
  - [运行系统](#运行系统)
- [API使用指南](#api使用指南)
  - [认证API](#认证api)
  - [数据接收API](#数据接收api)
  - [查询API](#查询api)
  - [其他核心API](#其他核心api)
- [项目结构](#项目结构)
- [测试](#测试)
- [文档](#文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 系统架构

### 六组件核心架构

系统采用六组件核心架构设计，每个组件负责特定功能，共同构成完整的数据处理流程：

#### 1. Receiver（接收器）

接收器负责处理来自客户端的数据请求，是系统的入口点：

- **请求验证**：验证请求格式和参数
- **智能路由**：根据请求参数选择最合适的数据提供商
- **市场感知**：自动识别不同市场（HK、US、SZ、SH）的股票代码格式
- **错误处理**：统一的错误处理和响应格式

#### 2. Symbol Mapper（符号映射器）

符号映射器负责不同数据提供商之间的股票代码格式转换：

- **格式转换**：如 "700.HK" ↔ "00700"、"AAPL.US" ↔ "AAPL"
- **批量处理**：支持多个股票代码的批量转换
- **映射规则管理**：提供映射规则的CRUD操作
- **自动初始化**：系统启动时自动创建预设映射规则

#### 3. Data Mapper（数据映射器）

数据映射器负责管理字段映射规则，实现不同数据格式之间的转换：

- **字段映射**：定义源字段到目标字段的映射关系
- **嵌套对象支持**：支持复杂JSON结构的字段路径
- **转换函数**：支持数据类型转换和格式化
- **智能字段建议**：基于数据分析提供字段映射建议

#### 4. Transformer（转换器）

转换器负责应用映射规则，将原始数据转换为标准格式：

- **实时转换**：高性能的数据转换处理
- **批量处理**：支持大批量数据的转换
- **预览功能**：提供转换结果预览
- **元数据追踪**：记录转换过程的详细信息

#### 5. Storage（存储器）

存储器实现双存储策略，平衡性能和可靠性：

- **Redis缓存**：高性能的数据缓存，支持不同的缓存策略
- **MongoDB持久化**：可靠的数据持久化存储
- **智能缓存管理**：基于市场交易时间和数据类型的动态缓存策略
- **变化检测**：避免不必要的数据更新

#### 6. Query（查询器）

查询器提供统一的数据查询接口，支持多种查询方式：

- **多维查询**：支持按股票代码、市场、提供商等多种维度查询
- **智能缓存**：优先使用缓存数据，提高查询性能
- **批量查询**：支持大批量数据的并行查询
- **查询统计**：提供查询性能和使用情况的统计信息

这六个组件通过清晰的接口相互协作，形成完整的数据处理流程，避免了循环依赖，提高了系统的可维护性和可扩展性。

### 双时效接口设计

系统采用创新的双时效接口设计，针对不同的应用场景提供优化的数据访问方式：

#### 🚀 强时效接口（实时交易专用）

强时效接口通过 `/api/v1/receiver/*` 端点提供，专为高频交易和实时决策场景设计：

- **超快响应**：交易时间1秒缓存，非交易时间60秒缓存
- **市场感知**：自动识别交易时间，动态调整缓存策略
- **实时优先**：优先获取最新数据，确保数据时效性
- **智能容错**：缓存失败不阻塞业务，确保数据可用性

**适用场景**：
- 量化交易策略执行
- 实时价格监控告警
- 高频数据分析
- 交易决策支持系统

#### 🧠 弱时效接口（分析决策专用）

弱时效接口通过 `/api/v1/query/*` 端点提供，专为数据分析和决策支持场景设计：

- **智能变化检测**：基于关键字段变化检测，避免不必要的数据更新
- **双存储策略**：Redis缓存 + MongoDB持久化，确保数据可靠性
- **多维查询**：支持6种查询类型，满足复杂分析需求
- **灵活配置**：可自定义缓存策略、数据过滤等参数

**适用场景**：
- 投资组合分析与监控
- 市场研究与趋势分析
- 量化策略回测验证
- 风险管理数据支持
- 基本面数据分析

#### 双时效接口对比

| 特性 | 强时效接口 | 弱时效接口 |
|------|------------|------------|
| 端点 | `/api/v1/receiver/data` | `/api/v1/query/execute` |
| 缓存策略 | 交易时间1秒，非交易时间60秒 | 智能变化检测，1分钟~1小时 |
| 存储策略 | 优先Redis | Redis + MongoDB双存储 |
| 响应时间 | 毫秒级 | 百毫秒级 |
| 数据完整性 | 基础字段 | 完整字段 + 元数据 |
| 查询能力 | 基础查询 | 多维度复杂查询 |
| 适用场景 | 实时交易 | 数据分析 |

这种双时效接口设计使系统能够同时满足实时交易和数据分析两种不同场景的需求，提供最佳的性能和功能平衡。

## 核心特性

### 认证系统

系统采用企业级三层认证架构，确保不同用户类型的安全访问：

#### 第三方应用访问层 (API Key 认证)

适用于外部应用、自动化脚本和数据集成场景：

- **认证方式**：X-App-Key + X-Access-Token 请求头
- **访问权限**：数据查询、股票代码转换、实时行情获取
- **安全特性**：自动限流、使用统计、权限控制
- **适用端点**：强时效接口、弱时效接口、符号映射转换

```http
GET /api/v1/query/symbols?symbols=AAPL,MSFT
X-App-Key: your_app_key
X-Access-Token: your_access_token
```

#### 开发者访问层 (JWT + 开发者角色)

适用于系统开发、数据预览和功能测试场景：

- **认证方式**：Authorization: Bearer JWT-Token
- **用户角色**：DEVELOPER 或 ADMIN
- **访问权限**：数据转换预览、存储管理、系统监控
- **适用端点**：数据映射器、转换器、存储器管理接口

```http
GET /api/v1/transformer/preview
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 管理员访问层 (JWT + 管理员角色)

适用于系统配置、用户管理和规则管理场景：

- **认证方式**：Authorization: Bearer JWT-Token
- **用户角色**：ADMIN
- **访问权限**：完整的系统管理权限
- **适用端点**：用户管理、API Key管理、系统配置

```http
GET /api/v1/auth/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 权限系统

系统实现了细粒度的权限控制，主要权限包括：

- **DATA_READ**: 数据读取权限
- **QUERY_EXECUTE**: 查询执行权限
- **PROVIDERS_READ**: 数据提供商信息读取权限
- **SYSTEM_MONITOR**: 系统监控权限
- **SYSTEM_ADMIN**: 系统管理权限

权限可以通过API Key创建时指定，或通过用户角色自动分配。

### 数据源支持

系统支持多个金融数据提供商，通过统一的接口进行集成和管理：

#### 已集成的数据提供商

| 提供商 | 状态 | 支持市场 | 支持数据类型 | 说明 |
|--------|------|----------|--------------|------|
| **LongPort 长桥证券** | ✅ 完全实现 | HK, US, SZ, SH | 股票报价、基本信息、指数 | 真实SDK集成，生产就绪 |
| **LongPort SG** | 🚧 基础框架 | SG | 股票报价 | 新加坡市场支持 |
| **iTick** | 🚧 基础框架 | 多市场 | 股票、加密货币 | 多市场数据支持 |
| **Futu 富途证券** | 🚧 基础框架 | HK, SZ, SH | 股票报价 | 基础框架已就绪 |
| **TwelveData** | 🚧 基础框架 | 全球 | 多种金融数据 | 全球数据支持 |

#### 能力注册系统

系统实现了自动能力发现和注册机制，每个数据提供商可以注册多种数据能力：

```typescript
// 能力定义示例
const getStockQuote: ICapability = {
  name: "get-stock-quote",
  description: "获取股票实时报价",
  supportedMarkets: ["HK", "US", "SZ", "SH"],
  dataType: "stock-quote",
  execute: async (context, params) => {
    // 实现代码
  }
};
```

当添加新的数据提供商时，系统会自动发现并注册其能力，无需修改核心代码。

#### 支持的数据类型

系统支持多种金融数据类型：

- **stock-quote**: 股票实时报价（价格、涨跌、成交量等）
- **stock-basic-info**: 股票基本信息（公司名称、行业、财务指标等）
- **index-quote**: 指数报价（主要指数实时数据）
- **market-status**: 市场状态（开盘、收盘、休市等）
- **trading-days**: 交易日信息（交易日历、假期等）
- **global-state**: 全球市场状态（多市场综合状态）

#### 市场支持

系统支持多个金融市场，并针对不同市场实现了特定的处理逻辑：

- **美股 (US)**: NASDAQ、NYSE，支持夏令时自动调整
- **港股 (HK)**: 香港交易所
- **A股 (CN)**: 上交所 (SH)、深交所 (SZ)
- **新加坡 (SG)**: 新加坡交易所

系统能够根据股票代码格式自动推断市场（如 .HK 后缀表示港股，字母表示美股，00/30前缀表示深交所，60/68前缀表示上交所）。

### 监控与指标

系统实现了全面的监控和指标收集功能，确保系统性能和健康状态可见：

#### 性能监控

系统通过拦截器和装饰器实现了自动的性能监控：

- **请求追踪**：记录每个请求的处理时间和资源使用情况
- **数据库性能**：监控数据库操作的执行时间和查询效率
- **缓存效率**：监控缓存命中率和响应时间
- **提供商性能**：监控各数据提供商的响应时间和可用性

```typescript
// 性能监控装饰器示例
@PerformanceMonitoring('data-transformation')
async transformData(data: any): Promise<any> {
  // 方法实现
}
```

#### 健康检查

系统提供了多个健康检查端点，用于监控系统各组件的状态：

- **/api/v1/monitoring/health**: 系统整体健康状态
- **/api/v1/query/health**: 查询服务健康状态
- **/api/v1/storage/health**: 存储服务健康状态

健康检查结果包括组件可用性、响应延迟和资源使用情况。

#### 指标收集

系统自动收集多种运行时指标：

- **API使用情况**：各端点的调用次数和响应时间
- **数据处理量**：处理的数据量和处理时间
- **错误率**：各类操作的错误率和错误类型
- **资源使用**：CPU、内存、网络和磁盘使用情况

#### 监控面板

系统提供了监控数据的查询接口，可以与外部监控系统集成：

- **/api/v1/monitoring/metrics**: 获取系统指标数据
- **/api/v1/monitoring/performance**: 获取性能监控数据
- **/api/v1/query/stats**: 获取查询统计信息

这些监控和指标功能使系统运行状态透明可见，有助于及时发现和解决问题，确保系统稳定运行。

### 安全特性

系统实现了多层次的安全防护措施，确保数据和访问的安全性：

#### 频率限制系统

系统实现了灵活的频率限制机制，防止滥用和DoS攻击：

- **全局限制**：基于IP的全局请求限制
- **用户限制**：基于用户的请求限制
- **API Key限制**：基于API Key的精细请求限制
- **动态策略**：支持不同端点和操作的差异化限制策略

```typescript
// 频率限制装饰器示例
@RateLimit({
  requests: 100,
  window: '1m',
  strategy: RateLimitStrategy.SLIDING_WINDOW
})
async getStockData() {
  // 方法实现
}
```

#### 安全中间件

系统使用多种安全中间件保护API端点：

- **Helmet**：设置安全相关的HTTP头
- **XSS防护**：防止跨站脚本攻击
- **CSRF防护**：防止跨站请求伪造
- **请求验证**：严格验证所有请求参数

#### 安全审计

系统实现了全面的安全审计功能：

- **访问日志**：记录所有API访问
- **操作审计**：记录关键操作和数据变更
- **安全事件**：记录认证失败和可疑活动
- **合规报告**：支持生成安全合规报告

#### 数据保护

系统采取多种措施保护敏感数据：

- **密码加密**：使用bcrypt加密存储密码
- **令牌安全**：JWT令牌加密和过期机制
- **API Key保护**：API Key仅在创建时完整显示
- **数据脱敏**：敏感数据在日志和响应中自动脱敏

#### 安全扫描

系统支持安全漏洞扫描和检测：

- **/api/v1/security/scan**: 触发安全扫描
- **/api/v1/security/vulnerabilities**: 查看漏洞报告
- **/api/v1/security/audit-logs**: 查看安全审计日志

这些安全特性共同构成了系统的多层次防护体系，确保系统和数据的安全性。

## 安装与设置

### 环境要求

运行智能股票数据系统需要以下环境：

#### 软件要求

- **Node.js**: >= 16.0.0
- **Bun**: >= 1.0.0 (推荐，高性能TypeScript运行时)
- **MongoDB**: >= 5.0.0
- **Redis**: >= 6.0.0 (必需，用于缓存和消息队列)

#### 硬件推荐

- **CPU**: 4核心或更多
- **内存**: 最小8GB，推荐16GB或更多
- **存储**: 50GB SSD
- **网络**: 稳定的互联网连接，推荐带宽 ≥ 10Mbps

#### 数据提供商凭证

要获取实时数据，需要至少一个数据提供商的API凭证：

- **LongPort API 凭证**:
  - APP_KEY
  - APP_SECRET
  - ACCESS_TOKEN

#### 开发工具

- **IDE**: 推荐使用Visual Studio Code
- **Git**: 用于版本控制
- **Docker**: 可选，用于容器化部署

### 安装步骤

按照以下步骤安装智能股票数据系统：

#### 1. 克隆代码库

```bash
git clone https://github.com/your-username/smart-stock-data-system.git
cd smart-stock-data-system
```

#### 2. 安装依赖

使用Bun（推荐，更快）：

```bash
# 安装Bun（如果尚未安装）
curl -fsSL https://bun.sh/install | bash

# 安装项目依赖
bun install
```

或使用npm：

```bash
npm install
```

#### 3. 设置数据库

确保MongoDB和Redis服务已启动：

```bash
# 检查MongoDB状态
mongosh --eval "db.adminCommand('ping')"

# 检查Redis状态
redis-cli ping
```

如果使用Docker，可以使用以下命令启动数据库服务：

```bash
# 启动MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:5.0

# 启动Redis
docker run -d --name redis -p 6379:6379 redis:6.0
```

#### 4. 初始化数据库

系统会在启动时自动初始化必要的数据库内容，无需手动操作。

#### 5. 编译TypeScript代码

```bash
bun run compile
# 或
npm run compile
```

### 配置说明

系统使用环境变量进行配置，可以通过`.env`文件或直接设置环境变量来配置：

#### 环境变量文件

系统支持多环境配置，根据`NODE_ENV`自动加载对应的环境变量文件：

- `.env.development`: 开发环境配置（默认）
- `.env.test`: 测试环境配置
- `.env.production`: 生产环境配置

#### 核心配置项

创建`.env.development`文件（或复制`.env.example`），设置以下必要配置：

```bash
# 基础配置
PORT=3000
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/smart-stock-data
MONGODB_POOL_SIZE=100
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# LongPort API配置
LONGPORT_APP_KEY=your_longport_app_key
LONGPORT_APP_SECRET=your_longport_app_secret
LONGPORT_ACCESS_TOKEN=your_longport_access_token

# 系统配置
LOG_LEVEL=info
CORS_ORIGIN=*
DISABLE_AUTO_INIT=false
```

#### 可选配置项

以下是一些可选的高级配置项：

```bash
# 性能调优
UV_THREADPOOL_SIZE=16
MONGODB_MAX_POOL_SIZE=100
REDIS_MAX_RETRIES=3
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000

# 安全配置
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_SECURITY_SCANNER=true
SECURITY_SCAN_INTERVAL=86400

# 监控配置
ENABLE_PERFORMANCE_MONITORING=true
METRICS_RETENTION_DAYS=30
```

#### 数据提供商配置

每个数据提供商可能需要特定的配置：

```bash
# LongPort配置
LONGPORT_APP_KEY=your_app_key
LONGPORT_APP_SECRET=your_app_secret
LONGPORT_ACCESS_TOKEN=your_access_token

# 其他提供商配置
# TWELVEDATA_API_KEY=your_api_key
# ITICK_API_KEY=your_api_key
# FUTU_API_KEY=your_api_key
```

### 运行系统

系统提供多种运行模式，适应不同的使用场景：

#### 开发模式

开发模式提供热重载功能，适合开发过程中使用：

```bash
# 使用Bun（推荐）
bun run dev

# 或使用npm
npm run dev
```

开发服务器将在 http://localhost:3000 启动，并自动监视文件变化。

#### 生产模式

生产模式优化了性能，适合生产环境部署：

```bash
# 编译TypeScript
bun run compile
# 或
npm run compile

# 启动生产服务器
bun run start:prod
# 或
npm run start:prod
```

#### 调试模式

调试模式启用了调试器，方便排查问题：

```bash
bun run start:debug
# 或
npm run start:debug
```

#### 测试环境

测试环境使用测试配置，适合运行测试：

```bash
bun run start:test
# 或
npm run start:test
```

#### Docker部署

系统提供了Docker支持，可以使用以下命令构建和运行Docker容器：

```bash
# 构建Docker镜像
docker build -t smart-stock-data-system -f docker/Dockerfile.production .

# 运行Docker容器
docker run -d -p 3000:3000 --name smart-stock-data \
  -e MONGODB_URI=mongodb://mongo:27017/smart-stock-data \
  -e REDIS_HOST=redis \
  -e LONGPORT_APP_KEY=your_app_key \
  -e LONGPORT_APP_SECRET=your_app_secret \
  -e LONGPORT_ACCESS_TOKEN=your_access_token \
  smart-stock-data-system
```

#### 系统状态验证

启动后，可以通过以下端点验证系统状态：

- **API文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/api/v1/monitoring/health
- **查询服务**: http://localhost:3000/api/v1/query/health

## API使用指南

### 认证API

认证API提供用户注册、登录和API Key管理功能：

#### 用户注册

创建新用户账号：

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "developer01",
    "email": "developer@example.com",
    "password": "SecurePassword123",
    "role": "developer"
  }'
```

响应示例：

```json
{
  "statusCode": 201,
  "message": "用户注册成功",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "developer01",
    "email": "developer@example.com",
    "role": "developer",
    "isActive": true,
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 用户登录

使用用户名和密码登录：

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "developer01",
    "password": "SecurePassword123"
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "developer01",
      "email": "developer@example.com",
      "role": "developer",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 创建API Key

使用JWT Token创建API Key：

```bash
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Trading Bot API Key",
    "description": "用于自动交易机器人",
    "permissions": ["data:read", "query:execute", "providers:read"],
    "rateLimit": {
      "requestsPerMinute": 1000,
      "requestsPerDay": 50000
    },
    "expiresAt": "2025-01-01T00:00:00.000Z"
  }'
```

响应示例：

```json
{
  "statusCode": 201,
  "message": "API Key创建成功",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Trading Bot API Key",
    "keyPrefix": "ak_live_",
    "key": "ak_live_1234567890abcdef1234567890abcdef",
    "userId": "507f1f77bcf86cd799439011",
    "permissions": ["data:read", "query:execute", "providers:read"],
    "rateLimit": {
      "requestsPerMinute": 1000,
      "requestsPerDay": 50000
    },
    "isActive": true,
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

> **重要提示**：API Key仅在创建时完整显示一次，请妥善保存。

#### 获取API Key列表

获取当前用户的API Key列表：

```bash
curl -X GET http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Trading Bot API Key",
      "keyPrefix": "ak_live_",
      "permissions": ["data:read", "query:execute", "providers:read"],
      "isActive": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "lastUsedAt": "2024-01-01T12:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T12:35:00.000Z"
}
```

#### 撤销API Key

撤销指定的API Key：

```bash
curl -X DELETE http://localhost:3000/api/v1/auth/api-keys/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "API Key撤销成功",
  "data": { "success": true },
  "timestamp": "2024-01-01T12:40:00.000Z"
}
```

### 数据接收API

数据接收API是强时效接口的主要入口，专为实时交易场景设计：

#### 获取实时股票数据

使用API Key获取实时股票数据：

```bash
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "symbols": ["AAPL.US", "MSFT.US", "700.HK"],
    "dataType": "stock-quote",
    "options": {
      "realtime": true,
      "timeout": 3000
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "强时效数据获取成功",
  "data": {
    "success": true,
    "data": [
      {
        "symbol": "AAPL.US",
        "lastPrice": 195.89,
        "change": 2.31,
        "changePercent": 1.19,
        "volume": 45678900,
        "bid": 195.85,
        "ask": 195.91,
        "market": "US",
        "marketStatus": "TRADING",
        "timestamp": "2024-01-01T15:30:01.123Z"
      },
      {
        "symbol": "MSFT.US",
        "lastPrice": 376.17,
        "change": 3.45,
        "changePercent": 0.93,
        "volume": 23456700,
        "bid": 376.15,
        "ask": 376.20,
        "market": "US",
        "marketStatus": "TRADING",
        "timestamp": "2024-01-01T15:30:01.456Z"
      },
      {
        "symbol": "700.HK",
        "lastPrice": 385.6,
        "change": -4.2,
        "changePercent": -1.08,
        "volume": 12345600,
        "bid": 385.4,
        "ask": 385.8,
        "market": "HK",
        "marketStatus": "TRADING",
        "timestamp": "2024-01-01T08:00:01.789Z"
      }
    ],
    "metadata": {
      "requestId": "req_realtime_1704110400123",
      "provider": "longport",
      "processingTime": 23,
      "cacheUsed": false,
      "cacheTTL": 1,
      "marketAware": true,
      "timestamp": "2024-01-01T12:00:01.789Z"
    }
  },
  "timestamp": "2024-01-01T12:00:01.789Z"
}
```

#### 获取股票基本信息

获取股票的基本信息：

```bash
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "symbols": ["AAPL.US"],
    "dataType": "stock-basic-info",
    "options": {
      "preferredProvider": "longport"
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "强时效数据获取成功",
  "data": {
    "success": true,
    "data": [
      {
        "symbol": "AAPL.US",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "industry": "Technology",
        "listedDate": "1980-12-12",
        "totalShares": 16406400000,
        "marketCap": 3213189376000,
        "peRatio": 32.15,
        "eps": 6.09,
        "dividend": 0.96,
        "dividendYield": 0.49,
        "website": "https://www.apple.com",
        "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide."
      }
    ],
    "metadata": {
      "requestId": "req_basic_1704110500456",
      "provider": "longport",
      "processingTime": 45,
      "cacheUsed": true,
      "cacheTTL": 3600,
      "marketAware": true,
      "timestamp": "2024-01-01T12:01:40.456Z"
    }
  },
  "timestamp": "2024-01-01T12:01:40.456Z"
}
```

#### 获取指数数据

获取指数实时数据：

```bash
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "symbols": ["HSI.HK", "SPX.US"],
    "dataType": "index-quote",
    "options": {
      "fields": ["symbol", "lastPrice", "change", "changePercent"]
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "强时效数据获取成功",
  "data": {
    "success": true,
    "data": [
      {
        "symbol": "HSI.HK",
        "lastPrice": 18889.34,
        "change": 123.45,
        "changePercent": 0.66
      },
      {
        "symbol": "SPX.US",
        "lastPrice": 4783.45,
        "change": 32.67,
        "changePercent": 0.69
      }
    ],
    "metadata": {
      "requestId": "req_index_1704110600789",
      "provider": "longport",
      "processingTime": 18,
      "cacheUsed": false,
      "cacheTTL": 1,
      "marketAware": true,
      "timestamp": "2024-01-01T12:03:20.789Z"
    }
  },
  "timestamp": "2024-01-01T12:03:20.789Z"
}
```

#### 指定数据提供商

通过`preferredProvider`参数指定数据提供商：

```bash
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "symbols": ["700.HK"],
    "dataType": "stock-quote",
    "options": {
      "preferredProvider": "longport",
      "market": "HK",
      "realtime": true
    }
  }'
```

如果未指定`preferredProvider`，系统会根据股票代码和数据类型自动选择最合适的提供商。

### 查询API

查询API是弱时效接口的主要入口，专为数据分析和决策支持场景设计：

#### 按股票代码查询

使用`by_symbols`查询类型按股票代码查询数据：

```bash
curl -X POST http://localhost:3000/api/v1/query/execute \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "queryType": "by_symbols",
    "symbols": ["AAPL.US", "MSFT.US", "700.HK"],
    "dataTypeFilter": "stock-quote",
    "options": {
      "useCache": true,
      "updateCache": true,
      "includeMetadata": true
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "智能数据查询执行成功",
  "data": {
    "success": true,
    "data": [
      {
        "symbol": "AAPL.US",
        "lastPrice": 195.89,
        "change": 2.31,
        "changePercent": 1.19,
        "volume": 45678900,
        "market": "US",
        "dataAge": 45,
        "changeDetected": false,
        "lastUpdate": "2024-01-01T15:29:15.000Z"
      },
      {
        "symbol": "MSFT.US",
        "lastPrice": 376.17,
        "change": 3.45,
        "changePercent": 0.93,
        "volume": 23456700,
        "market": "US",
        "dataAge": 48,
        "changeDetected": false,
        "lastUpdate": "2024-01-01T15:29:12.000Z"
      },
      {
        "symbol": "700.HK",
        "lastPrice": 385.6,
        "change": -4.2,
        "changePercent": -1.08,
        "volume": 12345600,
        "market": "HK",
        "dataAge": 62,
        "changeDetected": true,
        "lastUpdate": "2024-01-01T07:59:58.000Z"
      }
    ],
    "metadata": {
      "queryType": "by_symbols",
      "totalResults": 3,
      "returnedResults": 3,
      "executionTime": 89,
      "cacheUsed": true,
      "changeDetection": {
        "enabled": true,
        "fieldsChecked": ["lastPrice", "volume", "change"],
        "significantChanges": 1
      },
      "dataSources": {
        "cache": 2,
        "persistent": 0,
        "realtime": 1
      },
      "cachingStrategy": {
        "ttl": 60,
        "dualStorage": true,
        "marketAware": true
      },
      "timestamp": "2024-01-01T12:05:00.000Z"
    }
  },
  "timestamp": "2024-01-01T12:05:00.000Z"
}
```

#### 按市场查询

使用`by_market`查询类型按市场查询数据：

```bash
curl -X GET "http://localhost:3000/api/v1/query/market?market=HK&limit=2" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token"
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "按市场查询成功",
  "data": {
    "success": true,
    "data": [
      {
        "symbol": "700.HK",
        "lastPrice": 385.6,
        "change": -4.2,
        "changePercent": -1.08,
        "volume": 12345600,
        "market": "HK"
      },
      {
        "symbol": "9988.HK",
        "lastPrice": 76.8,
        "change": 0.5,
        "changePercent": 0.66,
        "volume": 9876500,
        "market": "HK"
      }
    ],
    "metadata": {
      "queryType": "by_market",
      "market": "HK",
      "totalResults": 50,
      "returnedResults": 2,
      "executionTime": 120,
      "cacheUsed": true,
      "timestamp": "2024-01-01T12:06:00.000Z"
    }
  },
  "timestamp": "2024-01-01T12:06:00.000Z"
}
```

#### 批量查询

使用批量查询接口同时执行多个查询：

```bash
curl -X POST http://localhost:3000/api/v1/query/bulk \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "queries": [
      {
        "queryType": "by_symbols",
        "symbols": ["AAPL.US", "MSFT.US"],
        "dataTypeFilter": "stock-quote"
      },
      {
        "queryType": "by_symbols",
        "symbols": ["700.HK", "9988.HK"],
        "dataTypeFilter": "stock-quote"
      }
    ],
    "parallel": true,
    "continueOnError": true
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "批量查询执行成功",
  "data": {
    "results": [
      {
        "success": true,
        "data": [
          {
            "symbol": "AAPL.US",
            "lastPrice": 195.89,
            "change": 2.31,
            "changePercent": 1.19,
            "volume": 45678900
          },
          {
            "symbol": "MSFT.US",
            "lastPrice": 376.17,
            "change": 3.45,
            "changePercent": 0.93,
            "volume": 23456700
          }
        ]
      },
      {
        "success": true,
        "data": [
          {
            "symbol": "700.HK",
            "lastPrice": 385.6,
            "change": -4.2,
            "changePercent": -1.08,
            "volume": 12345600
          },
          {
            "symbol": "9988.HK",
            "lastPrice": 76.8,
            "change": 0.5,
            "changePercent": 0.66,
            "volume": 9876500
          }
        ]
      }
    ],
    "summary": {
      "totalQueries": 2,
      "successful": 2,
      "failed": 0,
      "totalExecutionTime": 156,
      "averageExecutionTime": 78
    }
  },
  "timestamp": "2024-01-01T12:07:00.000Z"
}
```

#### 快速查询（GET方式）

使用GET方式进行快速查询：

```bash
curl -X GET "http://localhost:3000/api/v1/query/symbols?symbols=AAPL.US,MSFT.US&useCache=true" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token"
```

这种方式适合简单的查询场景，内部会转换为`by_symbols`查询类型。

#### 查询统计信息

获取查询服务的统计信息：

```bash
curl -X GET http://localhost:3000/api/v1/query/stats \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token"
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "查询统计信息获取成功",
  "data": {
    "performance": {
      "totalQueries": 15420,
      "averageExecutionTime": 127,
      "cacheHitRate": 0.82,
      "errorRate": 0.03,
      "queriesPerSecond": 45.6
    },
    "queryTypes": {
      "by_symbols": {
        "count": 8540,
        "averageTime": 95
      },
      "by_market": {
        "count": 4120,
        "averageTime": 185
      }
    },
    "dataSources": {
      "cache": { "queries": 12644, "avgTime": 15, "successRate": 0.99 },
      "persistent": { "queries": 2776, "avgTime": 125, "successRate": 0.97 },
      "realtime": { "queries": 324, "avgTime": 456, "successRate": 0.94 }
    },
    "timestamp": "2024-01-01T12:08:00.000Z"
  },
  "timestamp": "2024-01-01T12:08:00.000Z"
}
```

### 其他核心API

系统提供了多个核心API，用于符号映射、数据映射和转换等操作：

#### 符号映射转换

使用符号映射器转换股票代码格式：

```bash
curl -X POST http://localhost:3000/api/v1/symbol-mapper/transform \
  -H "Content-Type: application/json" \
  -H "X-App-Key: your_app_key" \
  -H "X-Access-Token: your_access_token" \
  -d '{
    "dataSourceName": "longport-demo",
    "symbols": ["700.HK", "AAPL.US", "000001.SZ", "600036.SH"]
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "代码转换成功",
  "data": {
    "dataSourceName": "longport-demo",
    "transformedSymbols": {
      "700.HK": "00700",
      "AAPL.US": "AAPL",
      "000001.SZ": "000001",
      "600036.SH": "600036"
    },
    "processingTimeMs": 15
  },
  "timestamp": "2024-01-01T12:10:00.000Z"
}
```

#### 数据映射规则解析

解析JSON结构，获取可用的字段路径：

```bash
curl -X POST http://localhost:3000/api/v1/data-mapper/parse-json \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "jsonData": {
      "secu_quote": [
        {
          "symbol": "700.HK",
          "last_done": 503.0,
          "prev_close": 513.0,
          "open": 509.0,
          "high": 511.5,
          "low": 503.0,
          "volume": 18464531,
          "turnover": 9333594435.0,
          "timestamp": "2024-01-01T08:08:11.000Z",
          "trade_status": 0
        }
      ]
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "JSON解析成功",
  "data": {
    "paths": [
      "secu_quote[].symbol",
      "secu_quote[].last_done",
      "secu_quote[].prev_close",
      "secu_quote[].open",
      "secu_quote[].high",
      "secu_quote[].low",
      "secu_quote[].volume",
      "secu_quote[].turnover",
      "secu_quote[].timestamp",
      "secu_quote[].trade_status"
    ],
    "suggestions": [
      {
        "sourceField": "secu_quote[].symbol",
        "suggestedTargetField": "symbol",
        "confidence": 1.0
      },
      {
        "sourceField": "secu_quote[].last_done",
        "suggestedTargetField": "lastPrice",
        "confidence": 0.9
      },
      {
        "sourceField": "secu_quote[].prev_close",
        "suggestedTargetField": "previousClose",
        "confidence": 0.9
      }
    ]
  },
  "timestamp": "2024-01-01T12:11:00.000Z"
}
```

#### 数据转换

使用转换器将原始数据转换为标准格式：

```bash
curl -X POST http://localhost:3000/api/v1/transformer/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "provider": "preset",
    "dataType": "get-stock-quote-fields",
    "rawData": {
      "secu_quote": [
        {
          "symbol": "700.HK",
          "last_done": "503.000",
          "prev_close": "513.000",
          "open": "509.000",
          "high": "511.500",
          "low": "503.000",
          "volume": 18464531,
          "turnover": "9333594435.000",
          "timestamp": "2024-01-01T08:08:11.000Z",
          "trade_status": 0
        }
      ]
    },
    "options": {
      "includeMetadata": true
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "数据转换成功",
  "data": {
    "transformedData": {
      "symbol": "700.HK",
      "lastPrice": "503.000",
      "previousClose": "513.000",
      "openPrice": "509.000",
      "highPrice": "511.500",
      "lowPrice": "503.000",
      "volume": 18464531,
      "turnover": "9333594435.000",
      "timestamp": "2024-01-01T08:08:11.000Z",
      "tradeStatus": 0
    },
    "metadata": {
      "ruleId": "686343fafddceb058001695c",
      "ruleName": "股票报价数据的标准字段映射配置",
      "fieldsTransformed": 10,
      "transformationTime": "2024-01-01T12:12:00.000Z"
    }
  },
  "timestamp": "2024-01-01T12:12:00.000Z"
}
```

#### 转换预览

预览数据转换结果，不保存数据：

```bash
curl -X POST http://localhost:3000/api/v1/transformer/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "provider": "preset",
    "dataType": "get-stock-quote-fields",
    "rawData": {
      "secu_quote": [
        {
          "symbol": "700.HK",
          "last_done": "503.000",
          "prev_close": "513.000"
        }
      ]
    }
  }'
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "转换预览成功",
  "data": {
    "original": {
      "secu_quote": [
        {
          "symbol": "700.HK",
          "last_done": "503.000",
          "prev_close": "513.000"
        }
      ]
    },
    "transformed": {
      "symbol": "700.HK",
      "lastPrice": "503.000",
      "previousClose": "513.000"
    },
    "mappingInfo": {
      "provider": "preset",
      "dataType": "get-stock-quote-fields",
      "fieldsTransformed": 3,
      "mappingRules": [
        {
          "sourceField": "secu_quote[].symbol",
          "targetField": "symbol"
        },
        {
          "sourceField": "secu_quote[].last_done",
          "targetField": "lastPrice"
        },
        {
          "sourceField": "secu_quote[].prev_close",
          "targetField": "previousClose"
        }
      ]
    }
  },
  "timestamp": "2024-01-01T12:13:00.000Z"
}
```

#### 存储管理

查询存储在缓存中的数据：

```bash
curl -X GET "http://localhost:3000/api/v1/storage/cache?key=stock-quote:AAPL.US" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

响应示例：

```json
{
  "statusCode": 200,
  "message": "缓存数据获取成功",
  "data": {
    "key": "stock-quote:AAPL.US",
    "value": {
      "symbol": "AAPL.US",
      "lastPrice": 195.89,
      "change": 2.31,
      "changePercent": 1.19,
      "volume": 45678900
    },
    "ttl": 58,
    "createdAt": "2024-01-01T12:14:02.000Z",
    "expiresAt": "2024-01-01T12:15:00.000Z"
  },
  "timestamp": "2024-01-01T12:14:02.000Z"
}
```

## 项目结构

项目采用模块化结构，遵循NestJS最佳实践：

```
src/
├── core/                              # 六组件核心架构
│   ├── receiver/                      # 请求处理与智能路由
│   ├── symbol-mapper/                 # 符号格式转换
│   ├── data-mapper/                   # 字段映射规则与建议
│   ├── transformer/                   # 数据转换引擎
│   ├── storage/                       # 双存储策略
│   └── query/                         # 统一数据检索
├── providers/                         # 金融数据提供商
│   ├── capability-registry.service.ts # 自动发现系统
│   ├── interfaces/                    # 提供商接口定义
│   │   ├── capability.interface.ts    # 能力接口
│   │   └── provider.interface.ts      # 提供商接口
│   ├── longport/                      # LongPort集成（完整实现）
│   │   ├── capabilities/              # 能力实现
│   │   │   ├── get-stock-quote.ts     # 股票报价能力
│   │   │   ├── get-stock-basic-info.ts # 股票基本信息能力
│   │   │   └── get-index-quote.ts     # 指数报价能力
│   │   ├── longport-context.service.ts # LongPort上下文服务
│   │   ├── longport.module.ts         # LongPort模块
│   │   ├── longport.provider.ts       # LongPort提供商
│   │   └── types.ts                   # 类型定义
│   ├── longport-sg/                   # LongPort SG集成（基础框架）
│   └── providers-controller.ts        # 提供商控制器
├── auth/                              # 认证系统
│   ├── auth.controller.ts             # 认证控制器
│   ├── auth.module.ts                 # 认证模块
│   ├── constants/                     # 常量定义
│   ├── decorators/                    # 认证装饰器
│   ├── dto/                           # 数据传输对象
│   ├── enums/                         # 枚举定义
│   ├── filters/                       # 异常过滤器
│   ├── guards/                        # 认证守卫
│   ├── repositories/                  # 数据仓库
│   ├── schemas/                       # 数据模型
│   ├── services/                      # 认证服务
│   ├── strategies/                    # Passport策略
│   └── subjects/                      # 认证主体
├── scripts/                           # 自动初始化系统
│   ├── auto-init-on-startup.service.ts # 启动初始化服务
│   └── auto-init-on-startup.module.ts  # 初始化模块
├── common/                            # 共享基础设施
│   ├── config/                        # 配置文件
│   ├── constants/                     # 系统常量
│   ├── decorators/                    # 共享装饰器
│   ├── dto/                           # 共享数据传输对象
│   ├── filters/                       # 全局异常过滤器
│   ├── interceptors/                  # 全局拦截器
│   └── utils/                         # 工具函数
├── metrics/                           # 指标系统
│   ├── constants/                     # 指标常量
│   ├── decorators/                    # 性能监控装饰器
│   ├── dto/                           # 指标数据传输对象
│   ├── interceptors/                  # 性能拦截器
│   ├── metrics.module.ts              # 指标模块
│   ├── repositories/                  # 指标数据仓库
│   └── services/                      # 指标服务
├── monitoring/                        # 监控系统
│   ├── dto/                           # 监控数据传输对象
│   ├── monitoring.controller.ts       # 监控控制器
│   └── monitoring.module.ts           # 监控模块
├── security/                          # 安全系统
│   ├── constants/                     # 安全常量
│   ├── middleware/                    # 安全中间件
│   ├── security.controller.ts         # 安全控制器
│   ├── security.module.ts             # 安全模块
│   └── services/                      # 安全服务
├── alert/                             # 告警系统
│   ├── alert.controller.ts            # 告警控制器
│   ├── alert.module.ts                # 告警模块
│   ├── constants/                     # 告警常量
│   ├── dto/                           # 告警数据传输对象
│   ├── repositories/                  # 告警数据仓库
│   ├── schemas/                       # 告警数据模型
│   └── services/                      # 告警服务
├── app.module.ts                      # 应用主模块
└── main.ts                            # 应用入口
```

### 关键文件说明

- **app.module.ts**: 应用主模块，导入和配置所有子模块
- **main.ts**: 应用入口，配置全局中间件、拦截器和过滤器
- **core/**: 六组件核心架构的实现
- **providers/**: 数据提供商的实现和能力注册
- **auth/**: 三层认证架构的实现
- **scripts/auto-init-on-startup.service.ts**: 自动初始化服务，在应用启动时初始化必要数据
- **common/**: 共享基础设施，包括配置、常量、装饰器等
- **metrics/**: 性能指标收集和监控
- **monitoring/**: 系统监控和健康检查
- **security/**: 安全防护和审计
- **alert/**: 告警系统和通知

## 测试

系统实现了全面的测试策略，包括单元测试、集成测试、端到端测试和性能测试：

### 测试类型

- **单元测试**: 测试单个组件和服务的功能
- **集成测试**: 测试多个组件之间的交互
- **端到端测试**: 测试完整的API流程
- **安全测试**: 测试系统的安全防护措施
- **性能测试**: 测试系统在不同负载下的性能

### 运行测试

运行所有测试：

```bash
bun test
# 或
npm test
```

运行特定类型的测试：

```bash
# 单元测试
bun run test:unit
# 或
npm run test:unit

# 集成测试
bun run test:integration
# 或
npm run test:integration

# 端到端测试
bun run test:e2e
# 或
npm run test:e2e

# 安全测试
bun run test:security
# 或
npm run test:security

# 性能测试
bun run test:perf
# 或
npm run test:perf
```

运行特定模块的测试：

```bash
# 认证模块单元测试
bun run test:unit:auth
# 或
npm run test:unit:auth

# 核心模块集成测试
bun run test:integration:core
# 或
npm run test:integration:core
```

### 测试覆盖率

生成测试覆盖率报告：

```bash
bun run test:coverage:all
# 或
npm run test:coverage:all
```

覆盖率报告将生成在`coverage/`目录下，可以通过浏览器查看HTML报告：

```bash
open coverage/html/index.html
```

### 测试工具

系统提供了多种测试工具和助手函数：

```bash
# 运行所有测试工具
bun run test:tools:all
# 或
npm run test:tools:all

# 生成统一测试报告
bun run test:report:unified
# 或
npm run test:report:unified
```

### 测试配置

测试配置文件位于`test/config/`目录下：

- **jest.unit.config.js**: 单元测试配置
- **jest.integration.config.js**: 集成测试配置
- **jest.e2e.config.js**: 端到端测试配置
- **jest.security.config.js**: 安全测试配置
- **k6.config.js**: 性能测试配置

