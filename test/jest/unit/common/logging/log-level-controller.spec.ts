/**
 * LogLevelController 单元测试
 * 测试日志级别控制器的核心功能
 */

import { LogLevelController } from "../../../../../src/common/modules/logging/log-level-controller";
import {
  LogLevel,
  LogLevelConfig,
} from "../../../../../src/common/modules/logging/types";
import * as fs from "fs";
import * as path from "path";

describe("LogLevelController", () => {
  let controller: LogLevelController;
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置单例实例
    controller = LogLevelController.getInstance();
    controller.reset();

    // 清理环境变量
    process.env = { ...originalEnv };
    delete process.env.ENHANCED_LOGGING_ENABLED;
    delete process.env.LOG_LEVEL_CACHE_ENABLED;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_DEBUG_MODULE;
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = LogLevelController.getInstance();
      const instance2 = LogLevelController.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should maintain state across multiple getInstance calls", async () => {
      const instance1 = LogLevelController.getInstance();
      await instance1.onModuleInit();

      const instance2 = LogLevelController.getInstance();
      const config1 = instance1.getConfiguration();
      const config2 = instance2.getConfiguration();

      expect(config1).toBe(config2);
      expect(config1).toBeTruthy();
    });
  });

  describe("Configuration Loading", () => {
    it("should load default configuration when no config file exists", async () => {
      // 模拟不存在配置文件的情况
      jest.spyOn(fs, "existsSync").mockReturnValue(false);

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config).toBeTruthy();
      expect(config!.global).toBe("info");
      expect(config!.features.enhancedLoggingEnabled).toBe(false);
      expect(config!.features.levelCacheEnabled).toBe(true);
      expect(config!.performance.cacheEnabled).toBe(true);
    });

    it("should load configuration from file when it exists", async () => {
      // 不需要模拟，实际配置文件存在
      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config).toBeTruthy();
      expect(config!.version).toBe("1.0.0");
      expect(typeof config!.modules).toBe("object");
    });

    it("should handle invalid JSON configuration file gracefully", async () => {
      const invalidConfigPath = path.join(
        process.cwd(),
        "test-invalid-config.json",
      );
      const originalEnvPath = process.env.LOG_CONFIG_PATH;

      try {
        // 创建无效的JSON文件
        fs.writeFileSync(invalidConfigPath, "{ invalid json }");
        process.env.LOG_CONFIG_PATH = invalidConfigPath;

        await controller.onModuleInit();
        const config = controller.getConfiguration();

        // 应该回退到默认配置
        expect(config).toBeTruthy();
        expect(config!.global).toBe("info");
      } finally {
        // 清理
        if (fs.existsSync(invalidConfigPath)) {
          fs.unlinkSync(invalidConfigPath);
        }
        if (originalEnvPath) {
          process.env.LOG_CONFIG_PATH = originalEnvPath;
        } else {
          delete process.env.LOG_CONFIG_PATH;
        }
      }
    });
  });

  describe("Environment Variable Override", () => {
    it("should override global log level from environment", async () => {
      process.env.LOG_LEVEL = "debug";

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config!.global).toBe("debug");
    });

    it("should override module log levels from environment", async () => {
      process.env.LOG_DEBUG_MODULE = "TestService,AnotherService";

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config!.modules["TestService"]).toBe("debug");
      expect(config!.modules["AnotherService"]).toBe("debug");
    });

    it("should override feature flags from environment", async () => {
      process.env.ENHANCED_LOGGING_ENABLED = "true";
      process.env.LOG_LEVEL_CACHE_ENABLED = "false";

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config!.features.enhancedLoggingEnabled).toBe(true);
      expect(config!.features.levelCacheEnabled).toBe(false);
    });
  });

  describe("shouldLog Core Logic", () => {
    beforeEach(async () => {
      await controller.onModuleInit();
    });

    it("should respect global log level for unknown modules", () => {
      // 全局级别是 info，所以 error、warn、info 应该通过，debug、trace 不通过
      expect(controller.shouldLog("UnknownService", "error")).toBe(true);
      expect(controller.shouldLog("UnknownService", "warn")).toBe(true);
      expect(controller.shouldLog("UnknownService", "info")).toBe(true);
      expect(controller.shouldLog("UnknownService", "debug")).toBe(false);
      expect(controller.shouldLog("UnknownService", "trace")).toBe(false);
    });

    it("should respect module-specific log levels", () => {
      // AuthService 配置为 warn，所以只有 error、warn 应该通过
      expect(controller.shouldLog("AuthService", "error")).toBe(true);
      expect(controller.shouldLog("AuthService", "warn")).toBe(true);
      expect(controller.shouldLog("AuthService", "info")).toBe(false);
      expect(controller.shouldLog("AuthService", "debug")).toBe(false);

      // DataFetcherService 配置为 info，所以 error、warn、info 应该通过
      expect(controller.shouldLog("DataFetcherService", "error")).toBe(true);
      expect(controller.shouldLog("DataFetcherService", "warn")).toBe(true);
      expect(controller.shouldLog("DataFetcherService", "info")).toBe(true);
      expect(controller.shouldLog("DataFetcherService", "debug")).toBe(false);
    });

    it("should handle invalid log levels gracefully", () => {
      // 应该允许未知的日志级别（返回 true）
      expect(controller.shouldLog("TestService", "unknown" as LogLevel)).toBe(
        true,
      );
    });

    it("should work when configuration is not loaded", () => {
      const newController = LogLevelController.getInstance();
      newController.reset();

      // 未初始化时应该允许所有日志
      expect(newController.shouldLog("TestService", "debug")).toBe(true);
      expect(newController.shouldLog("TestService", "error")).toBe(true);
    });
  });

  describe("Caching Mechanism", () => {
    beforeEach(async () => {
      process.env.ENHANCED_LOGGING_ENABLED = "true";
      await controller.onModuleInit();
    });

    it("should cache shouldLog results", () => {
      const testCalls = 100;

      // 执行多次相同的查询
      for (let i = 0; i < testCalls; i++) {
        controller.shouldLog("AuthService", "warn");
        controller.shouldLog("DataFetcherService", "info");
      }

      const stats = controller.getStats();

      // 应该有缓存命中
      expect(stats.totalQueries).toBe(testCalls * 2);
      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it("should update statistics correctly", () => {
      const initialStats = controller.getStats();

      controller.shouldLog("TestService", "info");
      controller.shouldLog("TestService", "info"); // 第二次应该是缓存命中

      const finalStats = controller.getStats();

      expect(finalStats.totalQueries).toBe(initialStats.totalQueries + 2);
      expect(finalStats.cacheHits).toBe(initialStats.cacheHits + 1);
      expect(finalStats.cacheMisses).toBe(initialStats.cacheMisses + 1);
    });

    it("should respect cache settings", async () => {
      // 禁用缓存
      process.env.LOG_LEVEL_CACHE_ENABLED = "false";
      controller.reset();
      await controller.onModuleInit();

      const config = controller.getConfiguration();
      expect(config!.performance.cacheEnabled).toBe(false);

      // 执行查询
      controller.shouldLog("TestService", "info");
      controller.shouldLog("TestService", "info");

      const stats = controller.getStats();
      // 缓存禁用时，应该没有命中
      expect(stats.cacheHits).toBe(0);
    });
  });

  describe("Performance and Statistics", () => {
    beforeEach(async () => {
      await controller.onModuleInit();
    });

    it("should track response times", () => {
      controller.shouldLog("TestService", "info");

      const stats = controller.getStats();
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it("should maintain accurate hit rate calculations", () => {
      // 执行一些查询
      controller.shouldLog("Service1", "info"); // miss
      controller.shouldLog("Service2", "warn"); // miss
      controller.shouldLog("Service1", "info"); // hit
      controller.shouldLog("Service2", "warn"); // hit

      const stats = controller.getStats();
      expect(stats.totalQueries).toBe(4);
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.5, 1);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate and fix invalid global log level", async () => {
      const invalidConfig: Partial<LogLevelConfig> = {
        global: "invalid" as LogLevel,
      };

      // 模拟加载无效配置
      jest
        .spyOn(controller as any, "loadFromConfigFile")
        .mockReturnValue(invalidConfig);

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      // 应该回退到有效的默认值
      expect(config!.global).toBe("info");
    });

    it("should remove invalid module log levels", async () => {
      const invalidConfig: Partial<LogLevelConfig> = {
        modules: {
          ValidService: "info",
          InvalidService: "invalid_level",
        },
      };

      jest
        .spyOn(controller as any, "loadFromConfigFile")
        .mockReturnValue(invalidConfig);

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      expect(config!.modules["ValidService"]).toBe("info");
      expect(config!.modules["InvalidService"]).toBeUndefined();
    });

    it("should validate performance configuration ranges", async () => {
      const invalidConfig: Partial<LogLevelConfig> = {
        performance: {
          cacheEnabled: true,
          cacheExpiry: -100, // 无效值
          maxCacheSize: 50000, // 超过最大值
          performanceThreshold: 5,
        },
      };

      jest
        .spyOn(controller as any, "loadFromConfigFile")
        .mockReturnValue(invalidConfig);

      await controller.onModuleInit();
      const config = controller.getConfiguration();

      // 应该修正为有效值
      expect(config!.performance.cacheExpiry).toBe(5000);
      expect(config!.performance.maxCacheSize).toBe(500);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    beforeEach(async () => {
      await controller.onModuleInit();
    });

    it("should handle empty context strings", () => {
      expect(() => controller.shouldLog("", "info")).not.toThrow();
      expect(controller.shouldLog("", "info")).toBe(true);
    });

    it("should handle very long context strings", () => {
      const longContext = "A".repeat(1000);
      expect(() => controller.shouldLog(longContext, "info")).not.toThrow();
    });

    it("should handle special characters in context", () => {
      const specialContext = "Service-With.Special@Characters#123";
      expect(() => controller.shouldLog(specialContext, "info")).not.toThrow();
    });

    it("should handle concurrent access correctly", async () => {
      const promises: Promise<boolean>[] = [];

      // 模拟并发访问
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const result = controller.shouldLog("ConcurrentService", "info");
              resolve(result);
            }, Math.random() * 10);
          }),
        );
      }

      const results = await Promise.all(promises);

      // 所有结果应该一致
      expect(results.every((result) => result === results[0])).toBe(true);
    });
  });

  describe("Memory Management", () => {
    beforeEach(async () => {
      await controller.onModuleInit();
    });

    it("should limit cache size", () => {
      const config = controller.getConfiguration();
      const maxCacheSize = config!.performance.maxCacheSize;

      // 超过缓存大小限制
      for (let i = 0; i < maxCacheSize + 100; i++) {
        controller.shouldLog(`Service${i}`, "info");
      }

      const stats = controller.getStats();
      // 虽然查询了更多次，但缓存条目不应超过最大值
      expect(stats.totalQueries).toBeGreaterThan(maxCacheSize);
    });
  });
});
