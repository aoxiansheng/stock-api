/**
 * 日志配置集成测试
 * 测试 common/config/logger.config.ts 的日志功能
 */

import { INestApplication } from "@nestjs/common";
import request from "supertest";

import {
  CustomLogger,
  createLogger,
  getLogLevels,
  sanitizeLogData,
  LoggerConfig,
  TestableLogger,
} from "../../../../../src/app/config/logger.config";

// 模拟控制台输出以便测试
interface LogOutput {
  level: "log" | "error" | "warn" | "debug" | "verbose";
  message: string;
  timestamp: string;
}

class TestLoggerForIntegration extends TestableLogger {
  public capturedLogs: LogOutput[] = [];

  private safeStringify(obj: any): string {
    if (typeof obj !== "object" || obj === null) {
      return String(obj);
    }

    try {
      return JSON.stringify(obj);
    } catch {
      // 处理循环引用
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (this.testSeen?.has(value)) {
            return "[Circular]";
          }
          this.testSeen?.add(value);
        }
        return value;
      });
    }
  }

  private testSeen?: Set<any>;

  log(message: any, ...optionalParams: any[]): void {
    this.testSeen = new Set();
    this.capturedLogs.push({
      level: "log",
      message: this.safeStringify(message),
      timestamp: new Date().toISOString(),
    });
    this.testSeen = undefined;
    super.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.testSeen = new Set();
    this.capturedLogs.push({
      level: "error",
      message: this.safeStringify(message),
      timestamp: new Date().toISOString(),
    });
    this.testSeen = undefined;
    super.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.testSeen = new Set();
    this.capturedLogs.push({
      level: "warn",
      message: this.safeStringify(message),
      timestamp: new Date().toISOString(),
    });
    this.testSeen = undefined;
    super.warn(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    // 简化逻辑：直接检查是否应该记录调试日志
    if (this.isDebugEnabled()) {
      this.testSeen = new Set();
      this.capturedLogs.push({
        level: "debug",
        message: this.safeStringify(message),
        timestamp: new Date().toISOString(),
      });
      this.testSeen = undefined;
    }
    super.debug(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    // 简化逻辑：直接检查是否应该记录详细日志
    if (this.isVerboseEnabled()) {
      this.testSeen = new Set();
      this.capturedLogs.push({
        level: "verbose", // 使用正确的 verbose 级别
        message: this.safeStringify(message),
        timestamp: new Date().toISOString(),
      });
      this.testSeen = undefined;
    }
    super.verbose(message, ...optionalParams);
  }

  public getCapturedLogs(): LogOutput[] {
    return this.capturedLogs;
  }

  public clearLogs(): void {
    this.capturedLogs = [];
  }
}

describe("Logger Config Integration", () => {
  let app: INestApplication;
  let testLogger: TestLoggerForIntegration;

  // 使用由 integration.setup.ts 创建的全局应用实例
  beforeAll(() => {
    app = (global as any).testApp;
  });

  // afterAll钩子不再需要，因为全局的 afterAll (在integration.setup.ts中) 会处理关闭
  // afterAll(async () => {
  //   if (app) {
  //     await app.close();
  //   }
  // });

  beforeEach(() => {
    // 每个测试用例都使用一个新的、干净的logger实例
    testLogger = new TestLoggerForIntegration("LoggerIntegrationTest");
  });

  describe("CustomLogger 基础功能", () => {
    it("应该创建具有正确上下文的日志实例", () => {
      const contextName = "TestContext";
      const logger = createLogger(contextName);

      expect(logger).toBeInstanceOf(CustomLogger);
      expect(logger["context"]).toBe(contextName);
    });

    it("应该正确记录不同级别的日志", () => {
      const testMessage = "测试日志消息";

      testLogger.log(testMessage);
      testLogger.error(testMessage);
      testLogger.warn(testMessage);
      testLogger.debug(testMessage);
      testLogger.verbose(testMessage);

      const logs = testLogger.getCapturedLogs();

      // 在测试环境中，debug 和 verbose 应该被记录
      expect(logs.length).toBeGreaterThanOrEqual(3); // log, error, warn 至少会被记录

      const logMessages = logs.map((log) => log.message);
      expect(logMessages).toContain(testMessage);
    });

    it("应该正确处理对象类型的日志消息", () => {
      const testObject = {
        operation: "test",
        userId: "12345",
        status: "success",
      };

      testLogger.log(testObject);

      const logs = testLogger.getCapturedLogs();
      expect(logs.length).toBe(1);

      const loggedMessage = JSON.parse(logs[0].message);
      expect(loggedMessage).toEqual(testObject);
    });

    it("应该正确设置和使用上下文", () => {
      const originalContext = "OriginalContext";
      const newContext = "NewContext";

      const logger = createLogger(originalContext);
      expect(logger["context"]).toBe(originalContext);

      logger.setContext(newContext);
      expect(logger["context"]).toBe(newContext);
    });

    it("应该正确处理错误和堆栈跟踪", () => {
      const errorMessage = "测试错误";
      const stackTrace = "Error stack trace here";

      testLogger.error(errorMessage, stackTrace);

      const logs = testLogger.getCapturedLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe("error");
      expect(logs[0].message).toBe(errorMessage);
    });
  });

  describe("getLogLevels 环境配置", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalLogLevel = process.env.LOG_LEVEL;

    afterEach(() => {
      process.env.NODEENV = originalEnv;
      process.env.LOGLEVEL = originalLogLevel;
    });

    it("生产环境应该限制日志级别", () => {
      process.env.NODE_ENV = "production";
      const levels = getLogLevels();

      expect(levels).toEqual(["error", "warn", "log"]);
      expect(levels).not.toContain("debug");
      expect(levels).not.toContain("verbose");
    });

    it("测试环境应该包含所有日志级别", () => {
      process.env.NODE_ENV = "test";
      delete process.env.LOG_LEVEL; // 清除 LOG_LEVEL 环境变量
      const levels = getLogLevels();

      expect(levels).toEqual(["error", "warn", "log", "debug", "verbose"]);
    });

    it("开发环境应该包含所有日志级别", () => {
      process.env.NODE_ENV = "development";
      delete process.env.LOG_LEVEL; // 清除 LOG_LEVEL 环境变量
      const levels = getLogLevels();

      expect(levels).toEqual(["error", "warn", "log", "debug", "verbose"]);
    });

    it("应该根据 LOG_LEVEL 环境变量调整级别", () => {
      process.env.NODE_ENV = "development";

      process.env.LOG_LEVEL = "ERROR";
      expect(getLogLevels()).toEqual(["error"]);

      process.env.LOG_LEVEL = "WARN";
      expect(getLogLevels()).toEqual(["error", "warn"]);

      process.env.LOG_LEVEL = "DEBUG";
      expect(getLogLevels()).toEqual(["error", "warn", "log", "debug"]);

      process.env.LOG_LEVEL = "VERBOSE";
      expect(getLogLevels()).toEqual([
        "error",
        "warn",
        "log",
        "debug",
        "verbose",
      ]);
    });
  });

  describe("sanitizeLogData 数据脱敏", () => {
    it("应该脱敏敏感字段", () => {
      const sensitiveData = {
        username: "testuser",
        password: "secretpassword123",
        email: "test@example.com",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        apiKey: "ak_1234567890abcdef",
        normalField: "this should not be masked",
      };

      const sanitized = sanitizeLogData(sensitiveData);

      expect(sanitized.username).toBe("testuser"); // 不敏感
      expect(sanitized.email).toBe("test@example.com"); // 不敏感
      expect(sanitized.normalField).toBe("this should not be masked"); // 不敏感

      // 敏感字段应该被脱敏
      expect(sanitized.password).not.toBe("secretpassword123");
      expect(sanitized.password).toMatch(/\*/);
      expect(sanitized.token).not.toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(sanitized.token).toMatch(/\*/);
      expect(sanitized.apiKey).not.toBe("ak_1234567890abcdef");
      expect(sanitized.apiKey).toMatch(/\*/);
    });

    it("应该处理嵌套对象的脱敏", () => {
      const nestedData = {
        user: {
          id: "123",
          credentials: {
            password: "secret123",
            accessToken: "token_value",
          },
        },
        metadata: {
          source: "api",
          authorization: "Bearer secret_token",
        },
      };

      const sanitized = sanitizeLogData(nestedData);

      expect(sanitized.user.id).toBe("123");
      expect(sanitized.metadata.source).toBe("api");

      // 嵌套的敏感字段应该被脱敏
      expect(sanitized.user.credentials.password).toMatch(/\*/);
      expect(sanitized.user.credentials.accessToken).toMatch(/\*/);
      expect(sanitized.metadata.authorization).toMatch(/\*/);
    });

    it("应该处理数组中的脱敏", () => {
      const arrayData = [
        { name: "item1", secret: "secret1" },
        { name: "item2", secret: "secret2" },
      ];

      const sanitized = sanitizeLogData(arrayData);

      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized[0].name).toBe("item1");
      expect(sanitized[1].name).toBe("item2");
      expect(sanitized[0].secret).toMatch(/\*/);
      expect(sanitized[1].secret).toMatch(/\*/);
    });

    it("应该处理非对象类型的数据", () => {
      expect(sanitizeLogData("string")).toBe("string");
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(null)).toBe(null);
      expect(sanitizeLogData(undefined)).toBe(undefined);
    });

    it("应该正确脱敏短密码", () => {
      const shortSensitiveData = {
        password: "123",
        token: "ab",
      };

      const sanitized = sanitizeLogData(shortSensitiveData);

      expect(sanitized.password).toBe("****");
      expect(sanitized.token).toBe("****");
    });
  });

  describe("LoggerConfig 常量配置", () => {
    it("应该包含正确的配置常量", () => {
      expect(LoggerConfig.MAX_MESSAGE_LENGTH).toBe(10000);
      expect(Array.isArray(LoggerConfig.SENSITIVE_FIELDS)).toBe(true);
      expect(LoggerConfig.SENSITIVE_FIELDS).toContain("password");
      expect(LoggerConfig.SENSITIVE_FIELDS).toContain("token");
      expect(LoggerConfig.SENSITIVE_FIELDS).toContain("apiKey");
    });

    it("应该包含日志轮转配置", () => {
      expect(LoggerConfig.ROTATION).toBeDefined();
      expect(LoggerConfig.ROTATION.maxSize).toBe("20m");
      expect(LoggerConfig.ROTATION.maxFiles).toBe(10);
      expect(LoggerConfig.ROTATION.datePattern).toBe("YYYY-MM-DD");
    });
  });

  describe("系统集成测试", () => {
    it("应该在实际请求中记录日志", async () => {
      // 创建一个测试用户以产生日志
      const userData = {
        username: `logger_test_${Date.now()}`,
        email: `logger_test_${Date.now()}@example.com`,
        password: "password123",
        _role: "developer",
      };

      // 这个请求会触发系统中的各种日志记录
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.statusCode).toBe(201);

      // 验证响应中不包含敏感信息
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data._passwordHash).toBeUndefined();

      // 验证响应包含用户信息
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData._role);
    });

    it("应该在错误请求中记录适当的日志", async () => {
      // 发送一个会失败的请求
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          username: "nonexistent_user",
          password: "wrong_password",
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("性能测试", () => {
    it("应该在大量日志记录下保持性能", () => {
      const startTime = Date.now();
      const logCount = 1000;

      for (let i = 0; i < logCount; i++) {
        testLogger.log(`Performance test log ${i}`, {
          iteration: i,
          timestamp: Date.now(),
          data: "some test data",
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000条日志应该在1秒内完成
      expect(duration).toBeLessThan(1000);

      const logs = testLogger.getCapturedLogs();
      expect(logs.length).toBe(logCount);

      console.log(`性能测试完成: ${logCount} 条日志耗时 ${duration}ms`);
    });

    it("应该正确处理大型对象的日志记录", () => {
      const largeObject = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          password: `secret${i}`, // 这应该被脱敏
          metadata: {
            createdAt: new Date().toISOString(),
            permissions: ["read", "write"],
          },
        })),
      };

      const startTime = Date.now();
      const sanitized = sanitizeLogData(largeObject);
      const endTime = Date.now();

      // 脱敏处理应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(100);

      // 验证脱敏效果
      expect(sanitized.users.length).toBe(100);
      sanitized.users.forEach((user: any) => {
        expect(user.password).toMatch(/\*/);
        expect(user.name).toMatch(/User \d+/);
        expect(user.email).toMatch(/user\d+@example\.com/);
      });
    });
  });

  describe("环境变量集成测试", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("应该在测试环境中启用调试日志", () => {
      process.env.NODE_ENV = "test";
      process.env.LOG_LEVEL = "debug"; // 显式设置LOG_LEVEL以覆盖任何外部环境配置

      const logger = new TestLoggerForIntegration("TestDebug");
      logger.debug("这是一个调试日志");
      logger.log("这是一个普通日志");

      const logs = logger.getCapturedLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it("应该在生产环境中禁用调试日志", () => {
      process.env.NODE_ENV = "production";
      process.env.LOG_LEVEL = "info"; // 同样为生产环境测试显式设置

      const logger = new TestLoggerForIntegration("TestProductionDebug");
      logger.debug("这是一个调试日志");
      logger.log("这是一个普通日志");

      const logs = logger.getCapturedLogs();
      const debugLogs = logs.filter((l) => l.level === "debug");
      expect(debugLogs.length).toBe(0);
    });
  });

  describe("边界条件测试", () => {
    it("应该处理空值和未定义值", () => {
      testLogger.log(null);
      testLogger.log(undefined);
      testLogger.log("");

      const logs = testLogger.getCapturedLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe("null");
      expect(logs[1].message).toBe("undefined");
      expect(logs[2].message).toBe("");
    });

    it("应该处理循环引用对象", () => {
      const circularObj: any = { name: "test" };
      circularObj._self = circularObj;

      // 应该不会抛出异常
      expect(() => {
        testLogger.log(circularObj);
      }).not.toThrow();
    });

    it("应该处理非常长的日志消息", () => {
      const longMessage = "x".repeat(LoggerConfig.MAX_MESSAGE_LENGTH + 1000);

      expect(() => {
        testLogger.log(longMessage);
      }).not.toThrow();

      const logs = testLogger.getCapturedLogs();
      expect(logs.length).toBe(1);
    });
  });
});
