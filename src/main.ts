import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express from "express";

import { createLogger, getLogLevels } from "@common/logging/index";
import { GlobalExceptionFilter } from "@common/core/filters";
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from "@common/core/interceptors";
import { HTTP_METHOD_ARRAYS } from "@common/constants/semantic";

import { AppModule } from "./app.module";

// 完全事件驱动架构，移除CollectorService直接依赖
import { ApplicationService } from "./appcore/core/services/application.service";

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envFilePath = `.env.${nodeEnv}`;
  const logger = createLogger("Bootstrap");

  logger.log(`
  ================================================
  🚀 环境变量env 加载日志 Starting application in [${nodeEnv}] mode.
  📝 Attempting to load environment file: [${envFilePath}]
  ================================================
  `);

  try {
    const app = await NestFactory.create(AppModule, {
      logger: getLogLevels(),
    });

    // 使用自定义日志器
    app.useLogger(createLogger("NestApplication"));

    // 配置请求体大小限制，防止DoS攻击
    app.use("/api", express.json({ limit: "10mb" }));
    app.use("/api", express.urlencoded({ limit: "10mb", extended: true }));

    // 精简：移除旧Auth安全中间件，保持标准校验与拦截器

    // 全局前缀（排除 Swagger 相关路径）
    app.setGlobalPrefix("api/v1", {
      exclude: ["/api-docs"] // 排除 Swagger 文档路径（使用 /api-docs 避免路径冲突）
    });

    // 全局异常过滤器
    app.useGlobalFilters(new GlobalExceptionFilter());

    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          // 将验证错误转换为自定义格式，由全局异常过滤器处理
          return new ValidationPipe().createExceptionFactory()(errors);
        },
      }),
    );

    // 全局请求追踪拦截器（第一个执行）
    app.useGlobalInterceptors(new RequestTrackingInterceptor());

    // 全局性能监控拦截器 - 事件化重构
    const reflector = app.get("Reflector");
    // 完全事件驱动架构，移除CollectorService直接依赖





    // 全局响应格式拦截器（最后执行）
    app.useGlobalInterceptors(new ResponseInterceptor());

    // ✅ 完全事件驱动架构 - 所有监控通过依赖注入的EventEmitter2处理
    // 不再需要全局变量暴露

    // CORS 配置
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(",") || true,
      methods: HTTP_METHOD_ARRAYS.CORS_COMMON,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-App-Key",
        "X-Access-Token",
        "X-Requested-With",
        "Origin",
        "Accept",
      ],
      credentials: true,
      maxAge: 86400, // 24小时预检缓存
      optionsSuccessStatus: 200,
    });

    // Swagger 配置 - 智能股票数据系统 API 文档
    try {
      const config = new DocumentBuilder()
        .setTitle("智能股票数据系统 API")
        .setDescription(
          `
## 📊 智能股票数据处理系统

基于六组件核心架构的智能化股票数据处理系统，提供**强时效vs弱时效**双接口设计和多数据源融合能力。

### 🚀 核心特性

- **🎯 双时效接口**: 强时效(1秒缓存) + 弱时效(智能变化检测)，满足不同应用场景
- **🧠 智能架构**: 六组件核心架构，消除循环依赖，提供清晰的数据流
- **⚡ 市场感知**: 自动识别交易时间，动态调整缓存策略，支持多市场夏令时
- **💾 双存储策略**: Redis缓存 + MongoDB持久化，确保数据可靠性和性能
- **🔍 变化检测**: 基于关键字段的高效变化检测，避免不必要的数据更新
- **🌍 多数据源**: 集成 LongPort、TwelveData、iTick 等多个数据源
- **🔐 三层认证**: API Key + JWT + 角色权限，确保企业级安全
- **📈 实时监控**: 全面的性能监控和健康检查
- **🛡️ 安全审计**: 完整的安全扫描和审计日志
- **🔄 弹性架构**: 支持高并发和自动故障恢复

### 🔐 三层认证架构

系统采用企业级三层认证模型，确保不同用户类型的安全访问：

#### 第三方应用访问层 (API Key 认证)
- **适用场景**: 外部应用、自动化脚本、数据集成
- **访问权限**: 数据查询、股票代码转换、实时行情获取
- **认证方式**: X-App-Key + X-Access-Token 请求头
- **安全特性**: 自动限流、使用统计、权限控制

#### 开发者访问层 (JWT + 开发者角色)
- **适用场景**: 系统开发、数据预览、功能测试
- **访问权限**: 数据转换预览、存储管理、系统监控
- **认证方式**: Authorization: Bearer JWT-Token
- **用户角色**: DEVELOPER 或 ADMIN

#### 管理员访问层 (JWT + 管理员角色)
- **适用场景**: 系统配置、用户管理、规则管理
- **访问权限**: 完整的系统管理权限
- **认证方式**: Authorization: Bearer JWT-Token
- **用户角色**: ADMIN

### 📈 数据类型

- **股票基本信息**: 公司基本信息、财务数据
- **实时行情**: 股价、成交量、涨跌幅
- **历史数据**: K线数据、技术指标
- **市场数据**: 板块信息、指数数据

### 🌍 支持市场

- **美股** (US): NASDAQ、NYSE
- **港股** (HK): HKEX
- **A股** (CN): 上交所、深交所
- **新加坡** (SG): SGX
      `,
        )
        .setVersion("1.0.0")
        .setContact(
          "系统管理员",
          "https://github.com/your-repo",
          "admin@yourcompany.com",
        )
        .setLicense("MIT License", "https://opensource.org/licenses/MIT")
        .addServer("http://localhost:3000", "开发环境")
        .addServer("https://api.yourcompany.com", "生产环境")

        // API 标签分组 - 按功能模块和时效性架构组织
        .addTag(
          "🔐 认证管理",
          "用户注册登录、JWT Token 管理、API Key 创建与管理 | 支持三层认证架构",
        )

        // === 六组件核心架构 - 强弱时效接口 ===
        .addTag(
          "🚀 强时效接口 - 实时数据接收",
          "专为高频交易设计的1秒级缓存策略，提供毫秒级响应 | 🔑 需要 API Key 认证 | 适合实时交易场景",
        )
        .addTag(
          "🧠 弱时效接口 - 智能数据查询",
          "专为数据分析设计的智能变化检测和双存储策略 | 🔑 需要 API Key 认证 | 适合分析决策场景",
        )

        // === 六组件核心架构 - 数据处理组件 ===
        .addTag(
          "🔄 符号映射器",
          "股票代码格式转换，支持多数据源代码映射 | 🔑 API Key + 🛡️ 管理员权限",
        )
        .addTag(
          "🗺️ 数据映射器",
          "数据源字段映射规则管理，支持智能字段建议 | 🛡️ 需要开发者/管理员权限",
        )
        .addTag(
          "⚡ 数据转换",
          "原始数据实时转换，格式标准化处理 | 🛡️ 需要开发者/管理员权限",
        )
        .addTag(
          "💾 数据存储",
          "智能缓存管理，Redis + MongoDB 双存储策略 | 🛡️ 需要开发者/管理员权限",
        )



        // JWT Bearer 认证
        .addBearerAuth(
          {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: `
### JWT 认证说明

JWT Token 用于用户身份验证，获取方式：

1. 调用 POST /api/v1/auth/login 登录
2. 在返回结果中获取 accessToken
3. 在请求头中添加：Authorization: Bearer {accessToken}

**Token 有效期**: 24小时  
**刷新机制**: 使用 refreshToken 刷新访问令牌
        `,
          },
          "bearer",
        )

        // API Key 认证 (App Key)
        .addApiKey(
          {
            type: "apiKey",
            name: "X-App-Key",
            in: "header",
            description: `
### API Key 认证说明 (第三方应用访问)

API Key 认证用于第三方应用和自动化脚本访问，采用双密钥验证机制：

**认证步骤**：
1. 使用 JWT Token 调用 POST /api/v1/auth/api-keys 创建 API Key
2. 在请求头中同时添加：
   - X-App-Key: {your-app-key}
   - X-Access-Token: {your-access-token}

**安全特性**：
- **双密钥验证**: App Key + Access Token 组合认证
- **自动限流**: 支持每分钟/每日请求限制配置
- **权限控制**: 支持 data:read、query:execute、providers:read 等细粒度权限
- **使用统计**: 实时监控 API 调用次数和性能指标

**适用端点**：

**🚀 强时效接口 (实时交易专用)**:
- 实时数据接收: POST /api/v1/receiver/data
  - 1秒级缓存，毫秒级响应
  - 适合高频交易、实时监控

**🧠 弱时效接口 (分析决策专用)**:
- 智能数据查询: POST /api/v1/query/execute
- 批量查询: POST /api/v1/query/bulk  
- 快速查询: GET /api/v1/query/symbols、GET /api/v1/query/market
  - 智能变化检测，双存储策略
  - 适合数据分析、投资研究

**🔄 数据处理组件**:
- 代码转换: POST /api/v1/symbol-mapper/transform
        `,
          },
          "ApiKey",
        )

        // Access Token 认证
        .addApiKey(
          {
            type: "apiKey",
            name: "X-Access-Token",
            in: "header",
            description: `
### Access Token 说明

Access Token 与 App Key 配合使用，提供双重安全验证：

**使用方式**: 与 X-App-Key 同时在请求头中发送
**安全级别**: 高级别加密，定期轮换
**有效期**: 根据应用配置决定
        `,
          },
          "AccessToken",
        )

        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api-docs", app, document, {
        customSiteTitle: "智能股票数据系统 API 文档",
        customCss: ".swagger-ui .topbar { display: none }",
        swaggerOptions: {
          persistAuthorization: true, // 持久化认证信息
          displayRequestDuration: true, // 显示请求耗时
          docExpansion: "none", // 默认折叠所有接口
          filter: true, // 启用搜索过滤
          showExtensions: true,
          showCommonExtensions: true,
        },
      });
      logger.log("📚 Swagger API 文档已启用: http://localhost:3000/api-docs");
    } catch (error) {
      logger.warn("⚠️ Swagger 配置失败，跳过 API 文档生成", {
        error: error.message,
      });
    }

    // 获取应用服务，执行启动初始化
    const applicationService = app.get(ApplicationService);
    await applicationService.initialize();

    const port = process.env.PORT || 3000;

    // 添加更详细的错误处理
    try {
      await app.listen(port);

      // 应用启动完成后的回调
      await applicationService.onApplicationBootstrap();

      logger.log(`
  ================================================
  🚀 智能股票数据系统启动成功
  ================================================
  📍 服务地址: http://localhost:${port}
  📚 API 文档: http://localhost:${port}/docs
  
  🎯 七组件核心架构已就绪：
  ├── 🚀 实时流数据接口：WebSocket /api/v1/stream-receiver/connect  (无缓存)
  ├── 🚀 强时效接口: /api/v1/receiver/* (1秒缓存)
  ├── 🧠 弱时效接口: /api/v1/query/* (智能检测)
  ├── 🔄 符号映射器: /api/v1/symbol-mapper/*
  ├── 🗺️ 数据映射器: /api/v1/data-mapper/*
  ├── ⚡ 数据转换器: /api/v1/transformer/*
  └── 💾 数据存储器: /api/v1/storage/*
  
  🔐 三层认证架构已启用
  📊 性能监控已启用
  🛡️ 安全中间件已启用
  🔧 应用生命周期管理已启用
  ================================================
  `);
    } catch (error) {
      // 检查是否是端口占用错误
      if (error.message && error.message.includes("port")) {
        logger.error(`❌ 端口 ${port} 已被占用！`, {
          suggestion: `请尝试以下方法：
1. 使用 'lsof -i :${port}' 查找占用端口的进程
2. 使用 'kill -9 <PID>' 终止占用进程
3. 或设置环境变量 PORT 使用其他端口：PORT=3001 bun run dev`,
        });
      } else {
        logger.error("❌ 应用启动失败", {
          error: error.message,
          stack: error.stack,
        });
      }
      process.exit(1);
    }
  } catch (error) {
    logger.error("❌ 应用初始化失败", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// 添加全局未捕获异常处理
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 未处理的Promise拒绝:", reason);
  console.error("Promise:", promise);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("🚨 未捕获的异常:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});

bootstrap();
