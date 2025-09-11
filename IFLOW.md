# iFlow 上下文说明 (IFLOW.md)

## 项目概述

这是一个名为"智能股票数据系统"的企业级股票数据处理平台，基于 NestJS + Bun 构建。系统采用**七组件核心架构**和**双时效接口设计**，提供强时效(实时交易)和弱时效(分析决策)两种数据访问模式，并支持 WebSocket 实时流数据。

### 核心特性

*   **🎯 双时效接口设计**: 强时效(1秒缓存, 实时交易) + 弱时效(智能变化检测, 分析决策)
*   **🧠 七组件核心架构**: Receiver、Stream Receiver、Symbol Mapper、Data Mapper、Transformer、Storage、Query
*   **🌊 WebSocket实时流**: 新增Stream Receiver组件，支持实时数据流推送和订阅管理
*   **⚡ 智能缓存策略**: SmartCacheOrchestrator Phase 5重构，性能提升36%，内存优化39%，市场状态感知的动态TTL (1s-3600s)
*   **🔐 三层认证体系**: API Key(17权限) + JWT(角色继承) + 分布式限流
*   **📊 能力导向数据源**: 自动发现注册，LongPort/LongPort-SG生产就绪
*   **💾 双存储策略**: Redis缓存 + MongoDB持久化，自动压缩与故障转移
*   **🛡️ 企业级容错**: 关键/非关键操作分离，优雅降级机制
*   **📈 全面性能监控**: 健康评分、P95/P99响应时间、故障检测
*   **🤖 自动化初始化**: 37预设字段、符号映射、配置驱动的幂等启动

## 技术栈

*   **运行时**: Bun 1.0+
*   **框架**: NestJS
*   **语言**: TypeScript
*   **数据库**: MongoDB 5.0+, Redis 6.0+
*   **认证**: JWT, Passport, bcrypt
*   **监控**: 自研性能监控, Redis时间序列
*   **测试**: Jest, K6
*   **文档**: Swagger

## 项目结构

```
src/
├── 🧠 core/                     # 7组件核心架构 (按数据流编号)
│   ├── 00-prepare/              # 数据准备层
│   │   ├── data-mapper/         # 数据映射器
│   │   └── symbol-mapper/       # 符号映射器
│   ├── 01-entry/                # 数据入口层
│   │   ├── query/               # 弱时效查询引擎
│   │   ├── receiver/            # 强时效数据接收器
│   │   └── stream-receiver/     # 实时流数据接收器 (WebSocket)
│   ├── 02-processing/           # 数据处理层
│   │   └── transformer/         # 数据转换器
│   ├── 03-fetching/             # 数据获取层
│   ├── 04-storage/              # 数据存储层
│   │   └── storage/             # 智能存储层
│   ├── 05-caching/              # 缓存层
│   └── shared/                  # 核心共享服务
├── 📊 providers/                # 能力导向数据源架构
├── 🔐 auth/                     # 三层认证系统 (17权限)
├── 📈 monitoring/               # 系统状态监控架构 (新重构)
├── 🚨 alert/                    # 智能告警系统
├── 🛡️ security/                # 安全框架
├── 💾 cache/                    # 缓存服务层
├── 🧩 common/                   # 通用模块根目录
└── 🤖 scripts/                  # 自动初始化系统
```

## 核心架构

### 七组件核心架构详解

1.  **Receiver (强时效数据接收器) 🚀**
    *   接口: `POST /api/v1/receiver/data`
    *   核心: 1秒级实时缓存, 智能市场推断, 能力导向路由
2.  **Stream Receiver (实时流接收器) 🌊**
    *   接口: `WebSocket /api/v1/stream-receiver/connect`
    *   核心: WebSocket连接管理, 流能力发现, 实时数据推送
3.  **Symbol Mapper (符号映射器) 🔄**
    *   接口: `POST /api/v1/symbol-mapper/transform`
    *   核心: 批量转换, 提供商特定映射, MongoDB存储
4.  **Data Mapper (数据映射器) 🗺️**
    *   接口: `POST /api/v1/data-mapper/apply`
    *   核心: 37个预设字段, 嵌套路径支持, 智能字段建议
5.  **Transformer (数据转换器) ⚡**
    *   接口: `POST /api/v1/transformer/transform`
    *   核心: 实时转换引擎, 批量处理优化, 预览模式
6.  **Storage (智能存储层) 💾**
    *   接口: `POST /api/v1/storage/store`
    *   核心: 双存储策略 (Redis + MongoDB), 智能检索, 自动压缩
7.  **Query (弱时效查询引擎) 🧠**
    *   接口: `POST /api/v1/query/execute`
    *   核心: 智能变化检测, 6种查询类型, 多层缓存策略

### 双时效接口设计

*   **🚀 强时效接口 (实时交易专用)**: 通过 Receiver 组件，1秒超短缓存，毫秒级响应。
*   **🧠 弱时效接口 (分析决策专用)**: 通过 Query 组件，智能变化检测，30s-3600s动态TTL。

## 认证体系

系统实现了企业级**三层认证模型**：

1.  **第三方应用访问层 (API Key认证) 🔑**: 双密钥验证 (X-App-Key + X-Access-Token)，17个细粒度权限。
2.  **开发者访问层 (JWT + DEVELOPER角色) 👨‍💻**: Bearer Token认证，9个开发者权限。
3.  **管理员访问层 (JWT + ADMIN角色) 👨‍💼**: 权限继承，14个权限，完整系统控制。

## 构建和运行

### 启动命令

*   `bun run dev`: 开发模式启动，带文件监听。
*   `bun run start`: 生产模式启动。
*   `bun run start:debug`: 调试模式启动。
*   `bun run start:prod`: 生产模式启动，设置UV_THREADPOOL_SIZE。
*   `bun run start:test`: 测试环境启动。

### 构建命令

*   `bun run build`: 构建项目 (执行 `tsc -p tsconfig.build.json`)。

### 代码质量命令

*   `bun run lint`: 运行 ESLint 并自动修复。
*   `bun run format`: 使用 Prettier 格式化代码。
*   `bun run format:check`: 检查代码格式。

### 测试命令

系统拥有非常完善的测试体系，包含多种测试类型：

*   `bun run test`: 运行所有测试 (单元、集成、E2E、黑盒、安全、性能)。
*   `bun run test:unit`: 运行单元测试。
*   `bun run test:integration`: 运行集成测试。
*   `bun run test:e2e`: 运行端到端测试。
*   `bun run test:security`: 运行安全测试。
*   `bun run test:perf`: 运行性能测试 (使用 K6)。
*   `bun run test:coverage`: 生成测试覆盖率报告。

## 开发约定

*   **语言**: TypeScript (100%类型安全)
*   **框架**: NestJS (模块化、依赖注入)
*   **代码风格**: 使用 ESLint 和 Prettier 保证代码质量和风格统一。
*   **测试**: 强调全面的测试覆盖，包括单元测试、集成测试、E2E测试等。
*   **文档**: 使用 Swagger 自动生成 API 文档。
*   **日志**: 使用自定义日志器，支持不同日志级别。
*   **错误处理**: 使用全局异常过滤器统一处理错误。
*   **响应格式**: 使用全局拦截器统一响应格式。
*   **认证**: 实现了多层认证和权限控制。
*   **安全**: 实现了多种安全措施，如输入验证、CORS、安全中间件等。
*   **监控**: 实现了全面的性能监控和健康检查。
*   **缓存**: 实现了智能缓存策略，支持市场状态感知和故障容错。
*   **自动化**: 实现了自动初始化和 Provider 自动发现。