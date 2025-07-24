/**
 * MetricsHealthService 单元测试
 * 测试指标系统健康检查服务的各项功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "@liaoliaots/nestjs-redis";
import Redis from "ioredis";

import { MetricsHealthService } from "../../../../src/metrics/services/metrics-health.service";

describe("MetricsHealthService", () => {
  let service: MetricsHealthService;
  let redisService: jest.Mocked<RedisService>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // 创建Redis mock
    mockRedis = {
      ping: jest.fn(),
    } as any;

    // 创建RedisService mock
    redisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsHealthService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<MetricsHealthService>(MetricsHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkMetricsHealth", () => {
    it("应该在Redis连接正常时更新健康状态", async () => {
      // Arrange
      mockRedis.ping.mockResolvedValue("PONG");

      // Act
      await service.checkMetricsHealth();

      // Assert
      const status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(true);
      expect(status.status).toBe("healthy");
      expect(status.consecutiveFailures).toBe(0);
      expect(status.description).toBe("指标系统运行正常");
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
    });

    it("应该在Redis连接失败时更新健康状态", async () => {
      // Arrange
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));

      // Act
      await service.checkMetricsHealth();

      // Assert
      const status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(false);
      expect(status.status).toBe("degraded");
      expect(status.consecutiveFailures).toBe(1);
      expect(status.description).toBe("指标系统降级运行 (连续失败1次)");
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
    });

    it("应该记录连续失败次数", async () => {
      // Arrange
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));

      // Act - 模拟多次失败
      await service.checkMetricsHealth();
      await service.checkMetricsHealth();
      await service.checkMetricsHealth();

      // Assert
      const status = service.getHealthStatus();
      expect(status.consecutiveFailures).toBe(3);
      expect(status.description).toBe("指标系统降级运行 (连续失败3次)");
    });

    it("应该在Redis恢复时重置失败计数", async () => {
      // Arrange - 先失败几次
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));
      await service.checkMetricsHealth();
      await service.checkMetricsHealth();

      // 验证失败状态
      let status = service.getHealthStatus();
      expect(status.consecutiveFailures).toBe(2);
      expect(status.redisHealthy).toBe(false);

      // Act - Redis恢复
      mockRedis.ping.mockResolvedValue("PONG");
      await service.checkMetricsHealth();

      // Assert - 状态已重置
      status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.status).toBe("healthy");
    });
  });

  describe("getHealthStatus", () => {
    it("应该返回正确的健康状态结构", () => {
      // Act
      const status = service.getHealthStatus();

      // Assert
      expect(status).toHaveProperty("redisHealthy");
      expect(status).toHaveProperty("lastHealthCheck");
      expect(status).toHaveProperty("lastHealthCheckTime");
      expect(status).toHaveProperty("consecutiveFailures");
      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("description");

      expect(typeof status.redisHealthy).toBe("boolean");
      expect(typeof status.lastHealthCheck).toBe("number");
      expect(typeof status.lastHealthCheckTime).toBe("string");
      expect(typeof status.consecutiveFailures).toBe("number");
      expect(["healthy", "degraded"]).toContain(status.status);
      expect(typeof status.description).toBe("string");
    });

    it("应该正确格式化时间戳", () => {
      // Act
      const status = service.getHealthStatus();

      // Assert
      const timeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(status.lastHealthCheckTime).toMatch(timeRegex);

      // 验证时间戳一致性
      const parsedTime = new Date(status.lastHealthCheckTime).getTime();
      expect(parsedTime).toBe(status.lastHealthCheck);
    });
  });

  describe("manualHealthCheck", () => {
    it("应该触发健康检查并更新状态", async () => {
      // Arrange
      mockRedis.ping.mockResolvedValue("PONG");
      const initialTime = service.getHealthStatus().lastHealthCheck;

      // 等待足够时间确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      await service.manualHealthCheck();

      // Assert
      const status = service.getHealthStatus();
      expect(status.lastHealthCheck).toBeGreaterThanOrEqual(initialTime);
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
    });
  });

  describe("isRedisHealthy", () => {
    it("应该返回Redis健康状态", async () => {
      // Act - 初始状态应该是健康的
      expect(service.isRedisHealthy()).toBe(true);

      // Arrange - 模拟Redis失败
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));
      await service.checkMetricsHealth();

      // Act & Assert
      expect(service.isRedisHealthy()).toBe(false);

      // Arrange - Redis恢复
      mockRedis.ping.mockResolvedValue("PONG");
      await service.checkMetricsHealth();

      // Act & Assert
      expect(service.isRedisHealthy()).toBe(true);
    });
  });

  describe("getDetailedHealthReport", () => {
    it("应该返回完整的健康报告", () => {
      // Act
      const report = service.getDetailedHealthReport();

      // Assert - 验证基础健康状态字段
      expect(report).toHaveProperty("redisHealthy");
      expect(report).toHaveProperty("lastHealthCheck");
      expect(report).toHaveProperty("lastHealthCheckTime");
      expect(report).toHaveProperty("consecutiveFailures");
      expect(report).toHaveProperty("status");
      expect(report).toHaveProperty("description");

      // 验证指标字段
      expect(report).toHaveProperty("metrics");
      expect(report.metrics).toHaveProperty("healthCheckInterval", 30000);
      expect(report.metrics).toHaveProperty("maxConsecutiveFailures", 3);
      expect(report.metrics).toHaveProperty("timeSinceLastCheck");
      expect(typeof report.metrics.timeSinceLastCheck).toBe("number");

      // 验证建议字段
      expect(report).toHaveProperty("recommendations");
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("应该在Redis健康时返回空建议", () => {
      // Act
      const report = service.getDetailedHealthReport();

      // Assert
      expect(report.redisHealthy).toBe(true);
      expect(report.recommendations).toEqual([]);
    });

    it("应该在Redis不健康时返回故障排除建议", async () => {
      // Arrange
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));
      await service.checkMetricsHealth();

      // Act
      const report = service.getDetailedHealthReport();

      // Assert
      expect(report.redisHealthy).toBe(false);
      expect(report.recommendations).toEqual([
        "检查Redis服务器状态",
        "验证网络连接",
        "检查Redis配置",
        "查看系统资源使用情况",
      ]);
    });

    it("应该正确计算距离上次检查的时间", async () => {
      // Arrange
      const beforeTime = Date.now();
      await service.checkMetricsHealth();

      // 等待几毫秒
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const report = service.getDetailedHealthReport();
      const afterTime = Date.now();

      // Assert
      expect(report.metrics.timeSinceLastCheck).toBeGreaterThanOrEqual(0);
      expect(report.metrics.timeSinceLastCheck).toBeLessThan(
        afterTime - beforeTime + 100,
      ); // 允许一些误差
    });
  });

  describe("错误处理", () => {
    it("应该正确处理Redis连接超时", async () => {
      // Arrange
      mockRedis.ping.mockRejectedValue(new Error("Command timed out"));

      // Act
      await service.checkMetricsHealth();

      // Assert
      const status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(false);
      expect(status.consecutiveFailures).toBe(1);
    });

    it("应该正确处理Redis连接被拒绝", async () => {
      // Arrange
      mockRedis.ping.mockRejectedValue(new Error("Connection refused"));

      // Act
      await service.checkMetricsHealth();

      // Assert
      const status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(false);
      expect(status.consecutiveFailures).toBe(1);
    });

    it("应该正确处理RedisService获取失败", async () => {
      // Arrange
      redisService.getOrThrow.mockImplementation(() => {
        throw new Error("Redis service not available");
      });

      // Act & Assert - 不应该抛出异常
      await expect(service.checkMetricsHealth()).resolves.not.toThrow();

      const status = service.getHealthStatus();
      expect(status.redisHealthy).toBe(false);
    });
  });
});
