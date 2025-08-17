/**
 * 集成测试全局设置
 * 设置真实的数据库连接和Redis连接
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { jest } from "@jest/globals";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";
import { RedisModule, RedisService } from "@liaoliaots/nestjs-redis";
import { EventEmitterModule, EventEmitter2 } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";
import { TestEnvironment, smartDelay } from "../utils/utils/async-test-helpers";

// Import modules needed for integration tests
import { AuthModule } from "../../src/auth/module/auth.module";
import { MonitoringModule } from "../../src/monitoring/module/monitoring.module";
import { AlertModule } from "../../src/alert/module/alert.module";
// import { CacheModule } from "../../src/cache/module/cache.module"; // 移除：已通过SharedServicesModule提供
import { SecurityModule } from "../../src/security/module/security.module";
import { alertConfig } from "../../src/common/config/alert.config";
// 临时禁用LongPort模块以避免资源泄露
import { ProvidersModule } from "../../src/providers/module/providers.module";
// 添加节流模块导入
import { ThrottlerModule } from "@nestjs/throttler";

// Core modules - 添加缺失的核心模块导入
import { SymbolMapperModule } from "../../src/core/public/symbol-mapper/module/symbol-mapper.module";
import { DataMapperModule } from "../../src/core/public/data-mapper/module/data-mapper.module";
// import { StorageModule } from "../../src/core/public/storage/module/storage.module"; // 移除：已通过SmartCacheModule提供
import { SymbolSmartCacheModule } from "../../src/core/public/symbol-smart-cache/module/symbol-smart-cache.module";
import { QueryModule } from "../../src/core/restapi/query/module/query.module"; 
import { TransformerModule } from "../../src/core/public/transformer/module/transformer.module";
import { ReceiverModule } from "../../src/core/restapi/receiver/module/receiver.module";
// 添加分页模块导入
import { PaginationModule } from "../../src/common/modules/pagination/modules/pagination.module";

import { PerformanceMonitorService } from "../../src/metrics/services/performance-monitor.service";

// 导入拦截器和过滤器
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from "../../src/common/core/interceptors";
import { PerformanceInterceptor } from "../../src/metrics/interceptors/performance.interceptor";
import { GlobalExceptionFilter } from "../../src/common/core/filters";
import { Reflector } from "@nestjs/core";

// 全局类型声明
declare global {
  var getRedisClient: () => any | null;
}

let mongoServer: MongoMemoryServer;
let mongoUri: string;
let testApp: INestApplication;
let testModule: TestingModule;

// 创建测试应用
async function createTestApplication(): Promise<void> {
  console.log("创建测试应用...");

  testModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: "test/config/integration.env",
        load: [alertConfig],
      }),
      MongooseModule.forRoot(mongoUri),
      RedisModule.forRoot({
        config: {
          host: "localhost",
          port: 6379,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
          commandTimeout: 5000,
          // 在集成测试中使用更稳定的连接设置
          keepAlive: 30000,
          family: 4,
          // 设置数据库为测试专用
          db: 2,
          // 优化重连和错误处理
          enableReadyCheck: false,
        },
      }),
      EventEmitterModule.forRoot(),
      JwtModule.register({
        secret:
          process.env.JWT_SECRET || "test-secret-key-for-integration-tests",
        signOptions: { expiresIn: "1h" },
      }),
      AuthModule,
      ProvidersModule, // 临时禁用以避免LongPort资源泄露
      MonitoringModule,
      AlertModule,
      // CacheModule, // 已通过SharedServicesModule提供，移除重复导入
      SecurityModule,
      SymbolMapperModule,
      DataMapperModule,
      // StorageModule, // 已通过SmartCacheModule提供，移除重复导入
      SymbolSmartCacheModule,
      QueryModule,
      TransformerModule,
      ReceiverModule,
      PaginationModule,
      ThrottlerModule.forRoot([
        {
          ttl: 60,
          limit: 10,
        },
      ]),
    ],
  }).compile();

  // 在模块创建后重新配置Mock的事件发射功能
  const eventEmitter = testModule.get(EventEmitter2);
  const mockPerformanceMonitor = testModule.get(PerformanceMonitorService);

  // 重新配置recordRequest方法以发射事件
  mockPerformanceMonitor.recordRequest = jest
    .fn()
    .mockImplementation(
      async (endpoint: string, method: string, responseTime: number) => {
        if (eventEmitter) {
          eventEmitter.emit("performance.metric", {
            metric: "api_request_duration",
            value: responseTime,
          });
        }
        return Promise.resolve();
      },
    ) as any;

  testApp = testModule.createNestApplication();

  // 设置全局前缀，与实际应用保持一致
  testApp.setGlobalPrefix("api/v1");

  // 全局异常过滤器
  testApp.useGlobalFilters(new GlobalExceptionFilter());

  // 全局验证管道
  testApp.useGlobalPipes(
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
  testApp.useGlobalInterceptors(new RequestTrackingInterceptor());

  // 全局性能监控拦截器
  const reflector = testModule.get(Reflector);
  testApp.useGlobalInterceptors(
    new PerformanceInterceptor(mockPerformanceMonitor, reflector),
  );

  // 全局响应格式拦截器（最后执行）
  testApp.useGlobalInterceptors(new ResponseInterceptor());

  // 设置全局性能监控服务（供装饰器使用）
  (global as any).performanceMonitorService = mockPerformanceMonitor;

  await testApp.init();

  // 设置全局变量供测试使用
  (global as any).testApp = testApp;
  (global as any).testModule = testModule;
  (global as any).httpServer = testApp.getHttpServer();

  console.log("✅ 测试应用创建成功");
}

// 设置集成测试超时（根据环境调整）
jest.setTimeout(TestEnvironment.getTimeout(60000));

// 确保设置必要的环境变量
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// 全局设置 - 启动测试数据库和应用
beforeAll(async () => {
  console.log("🚀 启动集成测试环境...");

  try {
    // 启动MongoDB内存服务器
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "test-integration",
      },
    });

    mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    console.log(`✅ MongoDB内存服务器启动: ${mongoUri}`);

    // 等待数据库连接稳定
    await smartDelay(1000);

    // 创建测试应用
    await createTestApplication();
  } catch (error) {
    console.error("❌ 集成测试环境启动失败:", error);
    throw error;
  }
});

// 每个测试套件前的设置
beforeEach(async () => {
  // 清理数据库数据，但保持连接
  const app = (global as any).testApp;
  if (!app) return;

  try {
    // 通过应用实例获取所有注册的模型，确保上下文一致
    const userModel = app.get(getModelToken("User"), { strict: false });
    const apiKeyModel = app.get(getModelToken("ApiKey"), { strict: false });
    const symbolMappingModel = app.get(getModelToken("SymbolMappingRuleDocument"), {
      strict: false,
    });
    const dataMappingModel = app.get(getModelToken("DataMappingRule"), {
      strict: false,
    });
    const storageModel = app.get(getModelToken("StoredData"), {
      strict: false,
    });

    const models = [
      userModel,
      apiKeyModel,
      symbolMappingModel,
      dataMappingModel,
      storageModel,
    ].filter(Boolean);

    // 并行清理所有模型数据
    await Promise.all(models.map((model) => model.deleteMany({})));

    // 清理Redis缓存数据
    await cleanupRedisData();

    // 清理全局测试变量
    delete (global as any).testApiKey;
    delete (global as any).testApiSecret;
    delete (global as any).testAdminToken;
    delete (global as any).testDeveloperToken;

    console.log("✅ 测试数据清理完成");
  } catch (error) {
    console.error("❌ 测试数据清理失败:", error);
  }
});

// 每个测试后清理
afterEach(async () => {
  try {
    // 清理模拟状态
    jest.clearAllMocks();

    // 重置性能监控模拟
    const app = (global as any).testApp;
    if (app) {
      const mockPerformanceMonitor = app.get(PerformanceMonitorService);
      if (mockPerformanceMonitor) {
        // 重置所有模拟函数的调用记录
        Object.values(mockPerformanceMonitor).forEach((fn) => {
          if (typeof fn === "function" && (fn as jest.Mock).mockClear) {
            (fn as jest.Mock).mockClear();
          }
        });
      }
    }

    // 清理全局测试状态
    delete (global as any).currentTestData;
    delete (global as any).testRequestId;

    // 等待异步操作完成
    await smartDelay(10);
  } catch (error) {
    console.error("❌ 测试清理失败:", error);
  }
});

// 全局清理 - 关闭数据库和应用
afterAll(async () => {
  console.log("🧹 清理集成测试环境...");

  try {
    // 1. 先清理Redis缓存，避免在连接关闭后访问
    try {
      const app = (global as any).testApp;
      if (app) {
        const cacheService = app.get("CacheService", { strict: false });
        if (cacheService && cacheService.getClient) {
          const redis = cacheService.getClient();
          if (redis && redis.status === "ready") {
            await redis.flushdb();
            console.log("✅ Redis缓存已清理");
          }
        }
      }
    } catch (error) {
      console.log("⚠️ Redis清理失败:", error.message);
    }

    // 增加延时，确保所有操作完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. 关闭NestJS应用
    // 这将触发所有 onModuleDestroy 和 onApplicationShutdown 钩子
    if (testApp) {
      await testApp.close();
      console.log("✅ 测试应用已关闭");
    }

    // 增加延时，确保应用完全关闭
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. 关闭测试模块
    if (testModule) {
      await testModule.close();
      console.log("✅ 测试模块已关闭");
    }

    // Redis 连接由 @liaoliaots/nestjs-redis 模块在 app.close() 期间自动管理
    // 无需手动关闭

    // 增加延时，确保模块完全关闭
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. 停止MongoDB内存服务器
    if (mongoServer) {
      await mongoServer.stop();
      console.log("✅ MongoDB内存服务器已停止");
    }

    // 最终延时，确保所有资源释放完成
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("❌ 集成测试环境清理失败:", error);
  } finally {
    console.log("🎉 集成测试环境已完全清理");
  }
});

// 全局工具函数
global.createTestModule = async (
  imports: any[] = [],
  providers: any[] = [],
) => {
  const moduleBuilder = Test.createTestingModule({
    imports,
    providers,
  });

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  return { module, app };
};

export class TestDataHelper {
  static async createTestUser(userModel: any, userData: Partial<any> = {}) {
    const defaultUser = {
      username: "testuser-" + Date.now(),
      email: `test-${Date.now()}@example.com`,
      passwordHash:
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Mf.z1R2PfQgIaVXAu", // 'password123'
      role: "developer",
      isActive: true,
      ...userData,
    };

    const user = new userModel(defaultUser);
    return await user.save();
  }

  static async createAdminUser(userModel: any, userData: Partial<any> = {}) {
    return this.createTestUser(userModel, {
      role: "admin",
      ...userData,
    });
  }

  static async createDeveloperUser(
    userModel: any,
    userData: Partial<any> = {},
  ) {
    return this.createTestUser(userModel, {
      role: "developer",
      ...userData,
    });
  }

  static async createUserWithCredentials(
    userModel: any,
    userData: Partial<any> = {},
  ) {
    const password = "password123";
    const timestamp = Date.now();
    const defaultUsername = `testuser-${timestamp}`;
    const defaultEmail = `test-${timestamp}@example.com`;

    const user = await this.createTestUser(userModel, {
      username: defaultUsername,
      email: defaultEmail,
      ...userData,
    });

    return {
      user,
      credentials: {
        username: user.username,
        password,
      },
    };
  }

  static async createAdminUserWithCredentials(
    userModel: any,
    userData: Partial<any> = {},
  ) {
    return this.createUserWithCredentials(userModel, {
      role: "admin",
      ...userData,
    });
  }

  static async createDeveloperUserWithCredentials(
    userModel: any,
    userData: Partial<any> = {},
  ) {
    return this.createUserWithCredentials(userModel, {
      role: "developer",
      ...userData,
    });
  }

  static async createTestApiKey(
    apiKeyModel: any,
    userId: string,
    apiKeyData: Partial<any> = {},
  ) {
    const defaultApiKey = {
      appKey: "test-app-key-" + Date.now(),
      accessToken: "test-access-token-" + Date.now(),
      name: "Test API Key",
      userId,
      permissions: ["data:read", "query:execute", "providers:read"],
      rateLimit: {
        requests: 1000,
        window: "1h",
      },
      isActive: true,
      ...apiKeyData,
    };

    const apiKey = new apiKeyModel(defaultApiKey);
    return await apiKey.save();
  }

  static async createReadOnlyApiKey(
    apiKeyModel: any,
    userId: string,
    apiKeyData: Partial<any> = {},
  ) {
    return this.createTestApiKey(apiKeyModel, userId, {
      permissions: ["data:read", "providers:read"],
      ...apiKeyData,
    });
  }

  static async createFullAccessApiKey(
    apiKeyModel: any,
    userId: string,
    apiKeyData: Partial<any> = {},
  ) {
    return this.createTestApiKey(apiKeyModel, userId, {
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "mapping:write",
        "config:read",
        "transformer:preview",
        "system:admin",
      ],
      ...apiKeyData,
    });
  }

  static async createTestSymbolMapping(
    symbolMappingModel: any,
    data: Partial<any> = {},
  ) {
    const defaultMapping = {
      dataSourceName: `test-provider-${Date.now()}`,
      description: "Test symbol mapping",
      SymbolMappingRule: [
        {
          standardSymbol: "A",
          sdkSymbol: "B",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ],
      ...data,
    };
    const mapping = new symbolMappingModel(defaultMapping);
    return await mapping.save();
  }

  // receiverType 到 transDataRuleListType 的映射（统一使用get-前缀格式）
  static mapReceiverTypeToRuleListType(receiverType: string): string {
    const mapping = {
      "get-stock-quote": "quote_fields",
      "get-stock-basic-info": "basic_info_fields",
      "get-index-quote": "index_fields",
      "get-market-status": "market_status_fields",
      "get-trading-days": "basic_info_fields",
      "get-global-state": "basic_info_fields",
      "get-crypto-quote": "quote_fields",
      "get-crypto-basic-info": "basic_info_fields",
      "get-stock-logo": "basic_info_fields",
      "get-crypto-logo": "basic_info_fields",
      "get-stock-news": "basic_info_fields",
      "get-crypto-news": "basic_info_fields",
    };
    return mapping[receiverType] || "quote_fields";
  }

  static async createTestDataMapping(
    dataMappingModel: any,
    data: Partial<any> = {},
  ) {
    const defaultMapping = {
      name: `Test Data Mapping ${Date.now()}`,
      provider: "test-provider",
      transDataRuleListType: "quote_fields",
      description: "Test data mapping rule",
      sharedDataFieldMappings: [
        {
          sourceField: "last_price",
          targetField: "lastPrice",
        },
        { sourceField: "vol", targetField: "volume" },
      ],
      ...data,
    };
    const mapping = new dataMappingModel(defaultMapping);
    return await mapping.save();
  }
}

// 集成测试专用的Mock配置
global.setupIntegrationMocks = () => {
  // 保持较少的控制台输出
  const originalWarn = console.warn;
  console.warn = jest.fn();
  console.debug = jest.fn();
  console.info = jest.fn();

  return () => {
    console.warn = originalWarn;
  };
};

// 清理Redis数据的辅助函数
async function cleanupRedisData(): Promise<void> {
  try {
    const app = (global as any).testApp;
    if (!app) return;

    const redisService = app.get(RedisService);
    if (redisService) {
      const redisClient = redisService.getOrThrow();
      if (redisClient && redisClient.status === "ready") {
        // 清理测试相关的Redis键
        const testKeys = await redisClient.keys("test:*");
        if (testKeys.length > 0) {
          await redisClient.del(...testKeys);
        }

        // 清理性能监控相关的键
        const perfKeys = await redisClient.keys("metrics:*");
        if (perfKeys.length > 0) {
          await redisClient.del(...perfKeys);
        }

        // 清理缓存键
        const cacheKeys = await redisClient.keys("cache:*");
        if (cacheKeys.length > 0) {
          await redisClient.del(...cacheKeys);
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ 清理Redis数据时出错:", error.message);
  }
}

// 清理所有测试数据的辅助函数
async function cleanupAllTestData(): Promise<void> {
  try {
    const app = (global as any).testApp;
    if (!app) return;

    // 获取所有数据库模型
    const userModel = app.get(getModelToken("User"), { strict: false });
    const apiKeyModel = app.get(getModelToken("ApiKey"), { strict: false });
    const symbolMappingModel = app.get(getModelToken("SymbolMappingRuleDocument"), {
      strict: false,
    });
    const dataMappingModel = app.get(getModelToken("DataMappingRule"), {
      strict: false,
    });
    const storageModel = app.get(getModelToken("StoredData"), {
      strict: false,
    });

    const models = [
      userModel,
      apiKeyModel,
      symbolMappingModel,
      dataMappingModel,
      storageModel,
    ].filter(Boolean);

    // 并行清理所有模型数据
    await Promise.all(models.map((model) => model.deleteMany({})));

    // 清理Redis数据
    await cleanupRedisData();

    console.log("✅ 所有测试数据已清理");
  } catch (error) {
    console.error("❌ 清理测试数据失败:", error);
  }
}

// 创建隔离的测试数据前缀
function createTestDataPrefix(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 提供给具体测试文件使用的 Longport Mock 工厂
global.createLongportMock = () => ({
  Config: {
    fromEnv: jest.fn().mockReturnValue({
      app_key: "test-app-key",
      app_secret: "test-secret",
      access_token: "test-token",
    }),
  },
  QuoteContext: {
    // @ts-expect-error - Jest mock type inference issue in test setup
    new: jest.fn().mockResolvedValue({
      // @ts-expect-error - Jest mock return type not matching expected interface
      quote: jest.fn().mockResolvedValue([
        {
          symbol: "700.HK",
          last_done: 503.0,
          open: 500.0,
          high: 505.0,
          low: 498.0,
          volume: 1000000,
        },
      ]),
      // @ts-expect-error - Jest mock void return type mismatch
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
});

// 导出清理函数供外部使用
global.cleanupRedisData = cleanupRedisData;
global.cleanupAllTestData = cleanupAllTestData;
global.createTestDataPrefix = createTestDataPrefix;

// 添加安全的Redis客户端获取函数
global.getRedisClient = (): any | null => {
  try {
    const app = (global as any).testApp;
    if (!app) return null;

    const redisService = app.get(RedisService);
    const redis = redisService.getOrThrow();

    return redis && redis.status === "ready" ? redis : null;
  } catch (error) {
    console.warn("⚠️ 获取Redis客户端失败:", error.message);
    return null;
  }
};
