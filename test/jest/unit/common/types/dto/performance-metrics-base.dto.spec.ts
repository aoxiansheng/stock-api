/**
 * Performance Metrics Base DTO 单元测试
 * 测试性能指标基础DTO类型
 */

import {
  BasePerformanceMetrics,
  SystemPerformanceMetricsDto,
} from "../../../../../../src/common/types/dto/performance-metrics-base.dto";

describe("Performance Metrics Base DTO", () => {
  describe("BasePerformanceMetrics Interface", () => {
    it("should define correct interface structure", () => {
      // Arrange - 创建BasePerformanceMetrics实例
      const baseMetrics: BasePerformanceMetrics = {
        processingTime: 150,
        timestamp: "2023-06-01T10:00:00.000Z",
      };

      // Assert - 验证属性
      expect(baseMetrics).toHaveProperty("processingTime");
      expect(baseMetrics).toHaveProperty("timestamp");
      expect(typeof baseMetrics.processingTime).toBe("number");
      expect(typeof baseMetrics.timestamp).toBe("string");
    });

    it("should allow optional timestamp", () => {
      // Arrange - 创建不带时间戳的指标
      const metricsWithoutTimestamp: BasePerformanceMetrics = {
        processingTime: 200,
      };

      const metricsWithTimestamp: BasePerformanceMetrics = {
        processingTime: 200,
        timestamp: "2023-06-01T10:00:00.000Z",
      };

      // Assert
      expect(metricsWithoutTimestamp.timestamp).toBeUndefined();
      expect(metricsWithTimestamp.timestamp).toBeDefined();
      expect(typeof metricsWithTimestamp.timestamp).toBe("string");
    });

    it("should enforce required processingTime field", () => {
      // Arrange & Assert - 验证处理时间字段是必需的
      const validMetrics: BasePerformanceMetrics = {
        processingTime: 100,
      };

      expect(validMetrics.processingTime).toBeDefined();
      expect(typeof validMetrics.processingTime).toBe("number");
    });
  });

  describe("SystemPerformanceMetricsDto Class", () => {
    let dto: SystemPerformanceMetricsDto;

    beforeEach(() => {
      dto = new SystemPerformanceMetricsDto();
    });

    describe("Instance Creation", () => {
      it("should create instance successfully", () => {
        // Assert
        expect(dto).toBeInstanceOf(SystemPerformanceMetricsDto);
        expect(dto).toBeDefined();
      });

      it("should implement BasePerformanceMetrics interface", () => {
        // Arrange
        dto.timestamp = "2023-06-01T10:00:00.000Z";
        dto.processingTime = 150;

        // Assert - 验证实现了基础接口
        const baseMetrics: BasePerformanceMetrics = dto;
        expect(baseMetrics.processingTime).toBe(150);
        expect(baseMetrics.timestamp).toBe("2023-06-01T10:00:00.000Z");
      });
    });

    describe("Property Types and Structure", () => {
      it("should have correct property types", () => {
        // Arrange
        dto.timestamp = "2023-06-01T10:00:00.000Z";
        dto.healthScore = 95.5;
        dto.processingTime = 200;
        dto.summary = {
          totalRequests: 1000,
          averageResponseTime: 150,
          errorRate: 0.01,
          systemLoad: 0.75,
          memoryUsage: 1024000000,
          cacheHitRate: 0.85,
        };
        dto.endpoints = [{ path: "/api/test", responseTime: 100 }];
        dto.database = { connectionPool: 10 };
        dto.redis = { connected: true };
        dto.system = { cpuUsage: 0.6 };

        // Assert
        expect(typeof dto.timestamp).toBe("string");
        expect(typeof dto.healthScore).toBe("number");
        expect(typeof dto.processingTime).toBe("number");
        expect(typeof dto.summary).toBe("object");
        expect(Array.isArray(dto.endpoints)).toBe(true);
        expect(typeof dto.database).toBe("object");
        expect(typeof dto.redis).toBe("object");
        expect(typeof dto.system).toBe("object");
      });

      it("should have correct summary object structure", () => {
        // Arrange
        dto.summary = {
          totalRequests: 500,
          averageResponseTime: 120,
          errorRate: 0.02,
          systemLoad: 0.8,
          memoryUsage: 2048000000,
          cacheHitRate: 0.9,
        };

        // Assert
        expect(dto.summary).toHaveProperty("totalRequests");
        expect(dto.summary).toHaveProperty("averageResponseTime");
        expect(dto.summary).toHaveProperty("errorRate");
        expect(dto.summary).toHaveProperty("systemLoad");
        expect(dto.summary).toHaveProperty("memoryUsage");
        expect(dto.summary).toHaveProperty("cacheHitRate");

        expect(typeof dto.summary.totalRequests).toBe("number");
        expect(typeof dto.summary.averageResponseTime).toBe("number");
        expect(typeof dto.summary.errorRate).toBe("number");
        expect(typeof dto.summary.systemLoad).toBe("number");
        expect(typeof dto.summary.memoryUsage).toBe("number");
        expect(typeof dto.summary.cacheHitRate).toBe("number");
      });
    });

    describe("Data Validation and Constraints", () => {
      it("should handle realistic performance metric values", () => {
        // Arrange - 设置真实的性能指标值
        dto.timestamp = new Date().toISOString();
        dto.healthScore = 92.5; // 范围 0-100
        dto.processingTime = 156; // 毫秒
        dto.summary = {
          totalRequests: 15432,
          averageResponseTime: 145, // 毫秒
          errorRate: 0.003, // 0.3% 错误率
          systemLoad: 0.65, // 65% 系统负载
          memoryUsage: 1536000000, // ~1.5GB
          cacheHitRate: 0.87, // 87% 缓存命中率
        };

        // Assert
        expect(dto.healthScore).toBeGreaterThan(0);
        expect(dto.healthScore).toBeLessThanOrEqual(100);
        expect(dto.processingTime).toBeGreaterThan(0);
        expect(dto.summary.errorRate).toBeGreaterThanOrEqual(0);
        expect(dto.summary.errorRate).toBeLessThanOrEqual(1);
        expect(dto.summary.systemLoad).toBeGreaterThanOrEqual(0);
        expect(dto.summary.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(dto.summary.cacheHitRate).toBeLessThanOrEqual(1);
      });

      it("should handle edge case values", () => {
        // Arrange - 边界情况
        dto.healthScore = 0; // 最小值
        dto.processingTime = 1; // 最小有效值
        dto.summary = {
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0, // 无错误
          systemLoad: 0, // 无负载
          memoryUsage: 0,
          cacheHitRate: 1, // 100% 命中率
        };

        // Assert
        expect(dto.healthScore).toBe(0);
        expect(dto.processingTime).toBe(1);
        expect(dto.summary.errorRate).toBe(0);
        expect(dto.summary.cacheHitRate).toBe(1);
      });
    });

    describe("Endpoints Array Handling", () => {
      it("should handle empty endpoints array", () => {
        // Arrange
        dto.endpoints = [];

        // Assert
        expect(Array.isArray(dto.endpoints)).toBe(true);
        expect(dto.endpoints.length).toBe(0);
      });

      it("should handle endpoints with performance data", () => {
        // Arrange
        dto.endpoints = [
          {
            path: "/api/v1/data",
            method: "POST",
            averageResponseTime: 200,
            requestCount: 1500,
            errorCount: 5,
          },
          {
            path: "/api/v1/query",
            method: "GET",
            averageResponseTime: 80,
            requestCount: 3000,
            errorCount: 1,
          },
        ];

        // Assert
        expect(dto.endpoints.length).toBe(2);
        expect(dto.endpoints[0]).toHaveProperty("path");
        expect(dto.endpoints[0]).toHaveProperty("averageResponseTime");
        expect(dto.endpoints[1].path).toBe("/api/v1/query");
      });
    });

    describe("Resource Metrics Objects", () => {
      it("should handle database metrics", () => {
        // Arrange
        dto.database = {
          connectionPoolSize: 10,
          activeConnections: 7,
          queryExecutionTime: 25,
          slowQueries: 2,
          deadlocks: 0,
        };

        // Assert
        expect(dto.database).toHaveProperty("connectionPoolSize");
        expect(dto.database).toHaveProperty("activeConnections");
        expect(dto.database.queryExecutionTime).toBe(25);
        expect(dto.database.deadlocks).toBe(0);
      });

      it("should handle Redis metrics", () => {
        // Arrange
        dto.redis = {
          connected: true,
          usedMemory: 52428800, // ~50MB
          hitRate: 0.89,
          missRate: 0.11,
          keyCount: 15000,
          evictedKeys: 100,
        };

        // Assert
        expect(dto.redis.connected).toBe(true);
        expect(dto.redis.hitRate).toBe(0.89);
        expect(dto.redis.keyCount).toBe(15000);
        expect(typeof dto.redis.usedMemory).toBe("number");
      });

      it("should handle system resource metrics", () => {
        // Arrange
        dto.system = {
          cpuUsage: 0.72,
          memoryUsage: 0.68,
          diskUsage: 0.45,
          networkIO: {
            bytesIn: 1024000,
            bytesOut: 2048000,
          },
          uptime: 86400, // 1 day in seconds
        };

        // Assert
        expect(dto.system.cpuUsage).toBe(0.72);
        expect(dto.system.memoryUsage).toBe(0.68);
        expect(dto.system.networkIO).toHaveProperty("bytesIn");
        expect(dto.system.networkIO).toHaveProperty("bytesOut");
        expect(dto.system.uptime).toBe(86400);
      });
    });

    describe("Timestamp Handling", () => {
      it("should handle ISO timestamp format", () => {
        // Arrange
        const isoTimestamp = "2023-06-01T10:30:45.123Z";
        dto.timestamp = isoTimestamp;

        // Assert
        expect(dto.timestamp).toBe(isoTimestamp);
        expect(() => new Date(dto.timestamp)).not.toThrow();
        expect(new Date(dto.timestamp)).toBeInstanceOf(Date);
      });

      it("should work with current timestamp", () => {
        // Arrange
        const now = new Date().toISOString();
        dto.timestamp = now;

        // Assert
        expect(dto.timestamp).toBe(now);
        const parsedDate = new Date(dto.timestamp);
        expect(parsedDate.getTime()).toBeCloseTo(Date.now(), -1000); // 1秒内
      });
    });

    describe("Complete Performance Metrics Example", () => {
      it("should handle comprehensive performance metrics", () => {
        // Arrange - 完整性能指标示例
        dto.timestamp = "2023-06-01T10:00:00.000Z";
        dto.healthScore = 88.5;
        dto.processingTime = 175;
        dto.summary = {
          totalRequests: 25678,
          averageResponseTime: 142,
          errorRate: 0.008,
          systemLoad: 0.73,
          memoryUsage: 3221225472, // ~3GB
          cacheHitRate: 0.82,
        };
        dto.endpoints = [
          { path: "/api/v1/receiver/data", responseTime: 250, requests: 8000 },
          { path: "/api/v1/query/execute", responseTime: 95, requests: 12000 },
          {
            path: "/api/v1/monitoring/health",
            responseTime: 15,
            requests: 5678,
          },
        ];
        dto.database = {
          type: "MongoDB",
          connectionPool: 15,
          activeConnections: 12,
          averageQueryTime: 35,
          slowQueries: 5,
        };
        dto.redis = {
          connected: true,
          version: "6.2.7",
          usedMemory: 104857600, // 100MB
          hitRate: 0.85,
          keyCount: 45000,
        };
        dto.system = {
          cpuUsage: 0.73,
          memoryUsage: 0.68,
          diskUsage: 0.42,
          loadAverage: [0.75, 0.7, 0.65],
          uptime: 2592000, // 30 days
        };

        // Assert - 验证完整指标
        expect(dto).toBeInstanceOf(SystemPerformanceMetricsDto);
        expect(dto.healthScore).toBeGreaterThan(80);
        expect(dto.summary.totalRequests).toBeGreaterThan(20000);
        expect(dto.endpoints.length).toBe(3);
        expect(dto.database.type).toBe("MongoDB");
        expect(dto.redis.connected).toBe(true);
        expect(dto.system.uptime).toBe(2592000);

        // 验证指标范围
        expect(dto.summary.errorRate).toBeLessThan(0.01); // 低于1%
        expect(dto.summary.cacheHitRate).toBeGreaterThan(0.8); // 缓存命中率大于80%
        expect(dto.system.cpuUsage).toBeLessThan(1); // CPU使用率低于100%
      });
    });

    describe("Type Compatibility", () => {
      it("should be compatible with BasePerformanceMetrics", () => {
        // Arrange
        dto.processingTime = 123;
        dto.timestamp = "2023-06-01T10:00:00.000Z";

        // Act - 转换为基础接口类型
        const baseMetrics: BasePerformanceMetrics = dto;

        // Assert
        expect(baseMetrics.processingTime).toBe(123);
        expect(baseMetrics.timestamp).toBe("2023-06-01T10:00:00.000Z");
      });

      it("should maintain all properties when used as interface", () => {
        // Arrange
        dto.healthScore = 95;
        dto.processingTime = 100;
        dto.timestamp = "2023-06-01T10:00:00.000Z";
        dto.summary = {
          totalRequests: 1000,
          averageResponseTime: 100,
          errorRate: 0.001,
          systemLoad: 0.5,
          memoryUsage: 1000000,
          cacheHitRate: 0.9,
        };
        dto.endpoints = [];
        dto.database = {};
        dto.redis = {};
        dto.system = {};

        // Act - 作为完整DTO使用
        const metrics: SystemPerformanceMetricsDto = dto;

        // Assert - 验证所有属性都保留
        expect(metrics.healthScore).toBe(95);
        expect(metrics.summary.totalRequests).toBe(1000);
        expect(Array.isArray(metrics.endpoints)).toBe(true);
        expect(typeof metrics.database).toBe("object");
        expect(typeof metrics.redis).toBe("object");
        expect(typeof metrics.system).toBe("object");
      });
    });
  });

  describe("Integration and Usage Patterns", () => {
    it("should support serialization and deserialization", () => {
      // Arrange
      const dto = new SystemPerformanceMetricsDto();
      dto.timestamp = "2023-06-01T10:00:00.000Z";
      dto.healthScore = 90;
      dto.processingTime = 150;
      dto.summary = {
        totalRequests: 1000,
        averageResponseTime: 120,
        errorRate: 0.01,
        systemLoad: 0.7,
        memoryUsage: 2000000,
        cacheHitRate: 0.85,
      };
      dto.endpoints = [{ path: "/test", responseTime: 100 }];
      dto.database = { connected: true };
      dto.redis = { hitRate: 0.9 };
      dto.system = { cpuUsage: 0.6 };

      // Act
      const serialized = JSON.stringify(dto);
      const deserialized = JSON.parse(serialized);

      // Assert
      expect(deserialized.timestamp).toBe(dto.timestamp);
      expect(deserialized.healthScore).toBe(dto.healthScore);
      expect(deserialized.summary.totalRequests).toBe(
        dto.summary.totalRequests,
      );
      expect(deserialized.endpoints[0].path).toBe("/test");
    });

    it("should work with Object.assign for updates", () => {
      // Arrange
      const dto = new SystemPerformanceMetricsDto();
      const updates = {
        healthScore: 85,
        processingTime: 200,
        summary: {
          totalRequests: 2000,
          averageResponseTime: 180,
          errorRate: 0.02,
          systemLoad: 0.8,
          memoryUsage: 3000000,
          cacheHitRate: 0.75,
        },
      };

      // Act
      Object.assign(dto, updates);

      // Assert
      expect(dto.healthScore).toBe(85);
      expect(dto.processingTime).toBe(200);
      expect(dto.summary.totalRequests).toBe(2000);
      expect(dto.summary.cacheHitRate).toBe(0.75);
    });
  });
});
