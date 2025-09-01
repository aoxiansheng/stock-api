import { Test, TestingModule } from "@nestjs/testing";
import { StreamConfigHotReloadService } from "../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-config-hot-reload.service";
import fs from "fs";
import path from "path";

// Mock fs module
jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("StreamConfigHotReloadService", () => {
  let service: StreamConfigHotReloadService;
  let originalProcessListeners: any;

  beforeEach(async () => {
    // Store original process listeners to restore them later
    originalProcessListeners = {
      SIGHUP: process.listeners("SIGHUP"),
      SIGUSR1: process.listeners("SIGUSR1"),
      SIGUSR2: process.listeners("SIGUSR2"),
    };

    // Clear existing listeners
    process.removeAllListeners("SIGHUP");
    process.removeAllListeners("SIGUSR1");
    process.removeAllListeners("SIGUSR2");

    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamConfigHotReloadService],
    }).compile();

    service = module.get<StreamConfigHotReloadService>(
      StreamConfigHotReloadService,
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup service
    await service.onModuleDestroy();

    // Restore original process listeners
    process.removeAllListeners("SIGHUP");
    process.removeAllListeners("SIGUSR1");
    process.removeAllListeners("SIGUSR2");

    originalProcessListeners.SIGHUP.forEach((listener: any) => {
      process.on("SIGHUP", listener);
    });
    originalProcessListeners.SIGUSR1.forEach((listener: any) => {
      process.on("SIGUSR1", listener);
    });
    originalProcessListeners.SIGUSR2.forEach((listener: any) => {
      process.on("SIGUSR2", listener);
    });
  });

  describe("Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should initialize with default config paths", () => {
      expect(service["configPaths"]).toContain("config");
      expect(
        service["configPaths"].some((p) => p.includes("stream-data-fetcher")),
      ).toBe(true);
    });

    it("should setup signal handlers on module init", async () => {
      // Arrange
      const setupSignalHandlersSpy = jest.spyOn(
        service as any,
        "setupSignalHandlers",
      );
      const setupFileWatchersSpy = jest.spyOn(
        service as any,
        "setupFileWatchers",
      );

      // Act
      await service.onModuleInit();

      // Assert
      expect(setupSignalHandlersSpy).toHaveBeenCalled();
      expect(setupFileWatchersSpy).toHaveBeenCalled();

      setupSignalHandlersSpy.mockRestore();
      setupFileWatchersSpy.mockRestore();
    });
  });

  describe("Signal Handling", () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it("should handle SIGHUP signal", (done) => {
      // Arrange
      const reloadSpy = jest
        .spyOn(service as any, "reloadConfiguration")
        .mockImplementation((signal: string) => {
          expect(signal).toBe("SIGHUP");
          reloadSpy.mockRestore();
          done();
        });

      // Act
      process.emit("SIGHUP", "SIGHUP");
    });

    it("should handle SIGUSR1 signal", (done) => {
      // Arrange
      const reloadSpy = jest
        .spyOn(service as any, "reloadConfiguration")
        .mockImplementation((signal: string) => {
          expect(signal).toBe("SIGUSR1");
          reloadSpy.mockRestore();
          done();
        });

      // Act
      process.emit("SIGUSR1", "SIGUSR1");
    });

    it("should handle SIGUSR2 signal", (done) => {
      // Arrange
      const reloadSpy = jest
        .spyOn(service as any, "reloadConfiguration")
        .mockImplementation((signal: string) => {
          expect(signal).toBe("SIGUSR2");
          reloadSpy.mockRestore();
          done();
        });

      // Act
      process.emit("SIGUSR2", "SIGUSR2");
    });

    it("should handle signal setup errors gracefully", async () => {
      // Arrange
      const loggerErrorSpy = jest.spyOn(service["logger"], "error");
      const originalProcessOn = process.on;

      process.on = jest.fn().mockImplementation(() => {
        throw new Error("Signal setup failed");
      });

      // Act
      await (service as any).setupSignalHandlers();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "设置信号处理器失败",
        expect.objectContaining({
          error: "Signal setup failed",
        }),
      );

      // Restore
      process.on = originalProcessOn;
      loggerErrorSpy.mockRestore();
    });
  });

  describe("Configuration Reloading", () => {
    const mockConfig = {
      connectionPool: {
        maxConnections: 100,
        idleTimeoutMs: 30000,
      },
      reconnection: {
        maxAttempts: 5,
        backoffMultiplier: 2,
      },
    };

    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      mockFs.existsSync.mockReturnValue(true);
    });

    it("should reload configuration successfully", async () => {
      // Arrange
      const loggerLogSpy = jest.spyOn(service["logger"], "log");

      // Act
      await (service as any).reloadConfiguration("SIGHUP");

      // Assert
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith(
        "配置重载完成",
        expect.objectContaining({
          signal: "SIGHUP",
          configCount: expect.any(Number),
        }),
      );

      loggerLogSpy.mockRestore();
    });

    it("should validate configuration before applying", async () => {
      // Arrange
      const invalidConfig = { invalid: "config" };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const loggerWarnSpy = jest.spyOn(service["logger"], "warn");

      // Act
      await (service as any).reloadConfiguration("SIGUSR1");

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "跳过无效配置文件",
        expect.objectContaining({
          reason: expect.stringContaining("缺少必需字段"),
        }),
      );

      loggerWarnSpy.mockRestore();
    });

    it("should handle file read errors gracefully", async () => {
      // Arrange
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      const loggerErrorSpy = jest.spyOn(service["logger"], "error");

      // Act
      await (service as any).reloadConfiguration("SIGUSR2");

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "读取配置文件失败",
        expect.objectContaining({
          error: "File read error",
        }),
      );

      loggerErrorSpy.mockRestore();
    });

    it("should handle JSON parsing errors gracefully", async () => {
      // Arrange
      mockFs.readFileSync.mockReturnValue("invalid json content");

      const loggerErrorSpy = jest.spyOn(service["logger"], "error");

      // Act
      await (service as any).reloadConfiguration("SIGHUP");

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "解析配置文件失败",
        expect.objectContaining({
          error: expect.stringContaining("Unexpected token"),
        }),
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe("Configuration Validation", () => {
    it("should validate connection pool configuration", () => {
      // Arrange
      const validConfig = {
        connectionPool: {
          maxConnections: 50,
          idleTimeoutMs: 30000,
        },
      };

      // Act
      const result = (service as any).validateConfig(validConfig);

      // Assert
      expect(result).toBe(true);
    });

    it("should validate reconnection configuration", () => {
      // Arrange
      const validConfig = {
        reconnection: {
          maxAttempts: 3,
          backoffMultiplier: 1.5,
        },
      };

      // Act
      const result = (service as any).validateConfig(validConfig);

      // Assert
      expect(result).toBe(true);
    });

    it("should reject configuration with invalid types", () => {
      // Arrange
      const invalidConfigs = [
        { connectionPool: { maxConnections: "invalid" } },
        { connectionPool: { idleTimeoutMs: "invalid" } },
        { reconnection: { maxAttempts: "invalid" } },
        { reconnection: { backoffMultiplier: "invalid" } },
      ];

      // Act & Assert
      invalidConfigs.forEach((config) => {
        expect((service as any).validateConfig(config)).toBe(false);
      });
    });

    it("should reject configuration with invalid ranges", () => {
      // Arrange
      const invalidConfigs = [
        { connectionPool: { maxConnections: -1 } },
        { connectionPool: { maxConnections: 1001 } },
        { connectionPool: { idleTimeoutMs: -1 } },
        { reconnection: { maxAttempts: -1 } },
        { reconnection: { maxAttempts: 11 } },
        { reconnection: { backoffMultiplier: 0 } },
        { reconnection: { backoffMultiplier: 11 } },
      ];

      // Act & Assert
      invalidConfigs.forEach((config) => {
        expect((service as any).validateConfig(config)).toBe(false);
      });
    });

    it("should accept empty configuration", () => {
      // Act
      const result = (service as any).validateConfig({});

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("File Watching", () => {
    let mockWatcher: any;

    beforeEach(() => {
      mockWatcher = {
        close: jest.fn(),
        on: jest.fn(),
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.watch = jest.fn().mockReturnValue(mockWatcher);
    });

    it("should setup file watchers for existing config paths", async () => {
      // Act
      await (service as any).setupFileWatchers();

      // Assert
      expect(mockFs.watch).toHaveBeenCalled();
      expect(mockWatcher.on).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    it("should skip non-existent config paths", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      const loggerWarnSpy = jest.spyOn(service["logger"], "warn");

      // Act
      await (service as any).setupFileWatchers();

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "配置目录不存在，跳过文件监听",
        expect.any(Object),
      );

      loggerWarnSpy.mockRestore();
    });

    it("should handle file watcher setup errors gracefully", async () => {
      // Arrange
      mockFs.watch.mockImplementation(() => {
        throw new Error("Watcher setup failed");
      });

      const loggerErrorSpy = jest.spyOn(service["logger"], "error");

      // Act
      await (service as any).setupFileWatchers();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "设置文件监听器失败",
        expect.objectContaining({
          error: "Watcher setup failed",
        }),
      );

      loggerErrorSpy.mockRestore();
    });

    it("should debounce file change events", async () => {
      // Arrange
      let changeCallback: (eventType: string, filename: string) => void;
      mockWatcher.on.mockImplementation(
        (
          event: string,
          callback: (eventType: string, filename: string) => void,
        ) => {
          if (event === "change") {
            changeCallback = callback;
          }
        },
      );

      const reloadSpy = jest.spyOn(service as any, "reloadConfiguration");
      await (service as any).setupFileWatchers();

      // Act - trigger multiple rapid changes
      changeCallback("change", "config.json");
      changeCallback("change", "config.json");
      changeCallback("change", "config.json");

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Assert - should only reload once due to debouncing
      expect(reloadSpy).toHaveBeenCalledTimes(1);

      reloadSpy.mockRestore();
    });
  });

  describe("Cleanup and Resource Management", () => {
    let mockWatchers: any[];

    beforeEach(() => {
      mockWatchers = [{ close: jest.fn() }, { close: jest.fn() }];

      service["fileWatchers"] = mockWatchers;
    });

    it("should cleanup file watchers on module destroy", async () => {
      // Act
      await service.onModuleDestroy();

      // Assert
      mockWatchers.forEach((watcher) => {
        expect(watcher.close).toHaveBeenCalled();
      });
      expect(service["fileWatchers"]).toHaveLength(0);
    });

    it("should handle watcher cleanup errors gracefully", async () => {
      // Arrange
      mockWatchers[0].close.mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      const loggerErrorSpy = jest.spyOn(service["logger"], "error");

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "关闭文件监听器失败",
        expect.objectContaining({
          error: "Cleanup failed",
        }),
      );

      loggerErrorSpy.mockRestore();
    });

    it("should clear reload timeouts on destroy", async () => {
      // Arrange
      service["reloadTimeouts"].set(
        "test-file",
        setTimeout(() => {}, 1000),
      );
      expect(service["reloadTimeouts"].size).toBe(1);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(service["reloadTimeouts"].size).toBe(0);
    });

    it("should not process signals after destruction", async () => {
      // Arrange
      await service.onModuleInit();
      const reloadSpy = jest.spyOn(service as any, "reloadConfiguration");

      // Act - destroy service then emit signal
      await service.onModuleDestroy();
      process.emit("SIGHUP", "SIGHUP");

      // Assert
      expect(reloadSpy).not.toHaveBeenCalled();

      reloadSpy.mockRestore();
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle multiple rapid reload requests efficiently", async () => {
      // Arrange
      const reloadCount = 50;
      const reloadPromises: Promise<void>[] = [];

      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      mockFs.existsSync.mockReturnValue(true);

      const startTime = Date.now();

      // Act
      for (let i = 0; i < reloadCount; i++) {
        reloadPromises.push((service as any).reloadConfiguration("SIGHUP"));
      }

      await Promise.all(reloadPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(reloadCount);
    });

    it("should manage memory efficiently with many configuration files", () => {
      // Arrange
      const largeConfigCount = 100;
      const configPaths = Array.from(
        { length: largeConfigCount },
        (_, i) => `config-${i}.json`,
      );

      service["configPaths"] = configPaths;

      // Act & Assert - should not cause memory issues
      expect(() => {
        service["configPaths"].forEach((path) => {
          service["reloadTimeouts"].set(
            path,
            setTimeout(() => {}, 100),
          );
        });
      }).not.toThrow();

      expect(service["reloadTimeouts"].size).toBe(largeConfigCount);
    });
  });

  describe("Integration with StreamDataFetcher", () => {
    it("should handle configuration changes that affect existing connections", async () => {
      // Arrange
      const newConfig = {
        connectionPool: {
          maxConnections: 200,
          idleTimeoutMs: 60000,
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(newConfig));
      mockFs.existsSync.mockReturnValue(true);

      const loggerLogSpy = jest.spyOn(service["logger"], "log");

      // Act
      await (service as any).reloadConfiguration("SIGHUP");

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        "配置重载完成",
        expect.objectContaining({
          signal: "SIGHUP",
        }),
      );

      loggerLogSpy.mockRestore();
    });
  });
});
