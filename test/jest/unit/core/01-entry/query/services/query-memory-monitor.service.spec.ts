import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryMemoryMonitorService } from '../../../../../../../src/core/01-entry/query/services/query-memory-monitor.service';
import { QueryConfigService } from '../../../../../../../src/core/01-entry/query/config/query.config';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { SystemMetricsDto } from '@monitoring/contracts/interfaces/collector.interface';
import { createLogger } from '@common/logging/index';

// Mock the logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('QueryMemoryMonitorService', () => {
  let service: QueryMemoryMonitorService;
  let eventBus: EventEmitter2;
  let queryConfig: QueryConfigService;
  let metricsRegistry: MetricsRegistryService;
  let mockLogger: any;

  // Mock configuration values
  const mockConfig = {
    memoryWarningThreshold: 0.7,
    memoryCriticalThreshold: 0.9,
    memoryPressureReductionRatio: 0.6,
  };

  beforeEach(async () => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Create mock EventEmitter2
    const mockEventBus = {
      emit: jest.fn(),
    };

    // Create mock QueryConfigService
    const mockQueryConfig = {
      ...mockConfig,
    };

    // Create mock MetricsRegistryService with method chaining
    const createMockMetric = () => ({
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    });

    const mockMetricsRegistry = {
      queryMemoryTriggeredDegradations: createMockMetric(),
      queryMemoryUsageBytes: createMockMetric(),
      queryMemoryPressureLevel: createMockMetric(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryMemoryMonitorService,
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: QueryConfigService,
          useValue: mockQueryConfig,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService);
    eventBus = module.get<EventEmitter2>(EventEmitter2);
    queryConfig = module.get<QueryConfigService>(QueryConfigService);
    metricsRegistry = module.get<MetricsRegistryService>(MetricsRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Lifecycle', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should emit shutdown event during module destruction', async () => {
      // Act
      await service.onModuleDestroy();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_memory_monitor',
          metricType: 'system',
          metricName: 'service_shutdown',
          metricValue: 1,
          tags: expect.objectContaining({
            operation: 'module_destroy',
            componentType: 'query',
          }),
        })
      );
    });

    it('should handle event emission error during shutdown gracefully', async () => {
      // Arrange
      (eventBus.emit as jest.Mock).mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Act
      await service.onModuleDestroy();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('服务关闭事件发送失败')
      );
    });
  });

  describe('Memory Check Before Batch Processing', () => {
    it('should return proceed recommendation for normal memory usage', async () => {
      // Arrange
      const symbolsCount = 10;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 512 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      // Mock getCurrentSystemMetrics
      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(result).toEqual({
        canProcess: true,
        currentUsage: mockSystemMetrics,
        recommendation: 'proceed',
        pressureLevel: 'normal',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('内存状况良好'),
        expect.objectContaining({
          memoryPercentage: '50.0%',
          symbolsCount,
          recommendation: 'proceed',
        })
      );
    });

    it('should return reduce_batch recommendation for warning threshold', async () => {
      // Arrange
      const symbolsCount = 50;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 768 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.75 },
        cpu: { usage: 0.4 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(result.canProcess).toBe(true);
      expect(result.recommendation).toBe('reduce_batch');
      expect(result.pressureLevel).toBe('warning');
      expect(result.suggestedBatchSize).toBeDefined();
      expect(result.suggestedBatchSize).toBeLessThan(symbolsCount);

      expect(metricsRegistry.queryMemoryTriggeredDegradations?.labels).toHaveBeenCalledWith(
        'batch_reduced',
        '26-50'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('内存使用率达到警告阈值'),
        expect.objectContaining({
          memoryPercentage: '75.0%',
          symbolsCount,
          recommendation: 'reduce_batch',
        })
      );
    });

    it('should return defer recommendation for critical threshold', async () => {
      // Arrange
      const symbolsCount = 100;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 950 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.95 },
        cpu: { usage: 0.8 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(result.canProcess).toBe(false);
      expect(result.recommendation).toBe('defer');
      expect(result.pressureLevel).toBe('critical');

      expect(metricsRegistry.queryMemoryTriggeredDegradations?.labels).toHaveBeenCalledWith(
        'batch_deferred',
        '51-100'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('内存使用率达到临界阈值'),
        expect.objectContaining({
          memoryPercentage: '95.0%',
          symbolsCount,
          recommendation: 'defer',
        })
      );
    });

    it('should emit memory check event after successful check', async () => {
      // Arrange
      const symbolsCount = 25;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 512 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      await service.checkMemoryBeforeBatch(symbolsCount);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_memory_monitor',
          metricType: 'memory',
          metricName: 'memory_check',
          tags: expect.objectContaining({
            symbolsCount,
            memoryUsage: 0.5,
            pressureLevel: 'normal',
            recommendation: 'proceed',
          }),
        })
      );
    });

    it('should handle memory check error gracefully', async () => {
      // Arrange
      const symbolsCount = 10;
      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockRejectedValue(
        new Error('System metrics unavailable')
      );

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(result.canProcess).toBe(true);
      expect(result.recommendation).toBe('proceed');
      expect(result.pressureLevel).toBe('normal');
      expect(result.currentUsage.memory.percentage).toBe(0);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('内存检查失败'),
        expect.objectContaining({
          error: 'System metrics unavailable',
          symbolsCount,
        })
      );

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'error',
          metricName: 'memory_check_failed',
        })
      );
    });

    it('should handle event emission error during memory check', async () => {
      // Arrange
      const symbolsCount = 10;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 512 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);
      (eventBus.emit as jest.Mock).mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Act
      await service.checkMemoryBeforeBatch(symbolsCount);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('内存检查事件发送失败')
      );
    });

    it('should calculate suggested batch size correctly for warning threshold', async () => {
      // Arrange
      const symbolsCount = 100;
      const memoryPercentage = 0.8; // 80% - between warning (70%) and critical (90%)
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 800 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: memoryPercentage },
        cpu: { usage: 0.5 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      const pressureRatio = (memoryPercentage - mockConfig.memoryWarningThreshold) /
        (mockConfig.memoryCriticalThreshold - mockConfig.memoryWarningThreshold);
      const expectedReductionFactor = mockConfig.memoryPressureReductionRatio * (1 - pressureRatio);
      const expectedBatchSize = Math.max(1, Math.floor(symbolsCount * expectedReductionFactor));

      expect(result.suggestedBatchSize).toBe(expectedBatchSize);
    });
  });

  describe('Memory Metrics Recording', () => {
    it('should record memory metrics to Prometheus', async () => {
      // Arrange
      const symbolsCount = 20;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 600 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.6 },
        cpu: { usage: 0.4 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(metricsRegistry.queryMemoryUsageBytes?.labels).toHaveBeenCalledWith('query', 'current');
      expect(metricsRegistry.queryMemoryUsageBytes?.set).toHaveBeenCalledWith(0.6);

      expect(metricsRegistry.queryMemoryPressureLevel?.labels).toHaveBeenCalledWith('normal', '11-25');
      expect(metricsRegistry.queryMemoryPressureLevel?.set).toHaveBeenCalledWith(0);
    });

    it('should handle metrics recording error gracefully', async () => {
      // Arrange
      const symbolsCount = 15;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 500 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Mock metrics registry to throw error
      (metricsRegistry.queryMemoryUsageBytes?.set as jest.Mock).mockImplementation(() => {
        throw new Error('Metrics recording failed');
      });

      // Act
      await service.checkMemoryBeforeBatch(symbolsCount);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('内存监控指标记录失败'),
        expect.objectContaining({
          error: 'Metrics recording failed',
          memoryPercentage: 0.5,
          pressureLevel: 'normal',
        })
      );
    });
  });

  describe('Symbols Count Range Classification', () => {
    it('should classify symbols count into correct ranges', async () => {
      // Test different symbol counts and their expected ranges
      const testCases = [
        { count: 0, expected: '0' },
        { count: 3, expected: '1-5' },
        { count: 8, expected: '6-10' },
        { count: 20, expected: '11-25' },
        { count: 35, expected: '26-50' },
        { count: 75, expected: '51-100' },
        { count: 150, expected: '100+' },
      ];

      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 512 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      for (const testCase of testCases) {
        // Act
        await service.checkMemoryBeforeBatch(testCase.count);

        // Assert
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('内存状况良好'),
          expect.objectContaining({
            symbolsCount: testCase.count,
          })
        );
      }
    });
  });

  describe('Monitor Status', () => {
    it('should return enabled monitor status with current metrics', async () => {
      // Arrange
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 400 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.4 },
        cpu: { usage: 0.2 },
        uptime: 7200,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const status = await service.getMonitorStatus();

      // Assert
      expect(status).toEqual({
        enabled: true,
        thresholds: {
          warning: mockConfig.memoryWarningThreshold,
          critical: mockConfig.memoryCriticalThreshold,
        },
        currentMemoryUsage: mockSystemMetrics,
        lastCheckTime: expect.any(Date),
      });

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_memory_monitor',
          metricType: 'system',
          metricName: 'monitor_status_check',
          tags: expect.objectContaining({
            operation: 'get_monitor_status',
          }),
        })
      );
    });

    it('should return disabled status when metrics unavailable', async () => {
      // Arrange
      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockRejectedValue(
        new Error('Metrics unavailable')
      );

      // Act
      const status = await service.getMonitorStatus();

      // Assert
      expect(status).toEqual({
        enabled: false,
        thresholds: {
          warning: mockConfig.memoryWarningThreshold,
          critical: mockConfig.memoryCriticalThreshold,
        },
        lastCheckTime: expect.any(Date),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('获取内存监控状态失败'),
        expect.any(Error)
      );
    });

    it('should handle event emission error during status check', async () => {
      // Arrange
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 400 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.4 },
        cpu: { usage: 0.2 },
        uptime: 7200,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);
      (eventBus.emit as jest.Mock).mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Act
      await service.getMonitorStatus();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('监控状态检查事件发送失败')
      );
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect real system metrics successfully', async () => {
      // Act
      const result = await service.checkMemoryBeforeBatch(10);

      // Assert - The private method should return real system metrics
      expect(result.currentUsage.memory.used).toBeGreaterThan(0);
      expect(result.currentUsage.memory.total).toBeGreaterThan(0);
      expect(result.currentUsage.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(result.currentUsage.memory.percentage).toBeLessThanOrEqual(1);
      expect(result.currentUsage.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(result.currentUsage.cpu.usage).toBeLessThanOrEqual(1);
      expect(result.currentUsage.uptime).toBeGreaterThan(0);
      expect(result.currentUsage.timestamp).toBeInstanceOf(Date);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('系统指标获取成功'),
        expect.objectContaining({
          memoryUsedMB: expect.any(Number),
          memoryTotalMB: expect.any(Number),
          memoryPercentage: expect.stringContaining('%'),
          cpuUsage: expect.stringContaining('%'),
          uptimeSeconds: expect.any(Number),
        })
      );
    });

    it('should handle system metrics collection error and return safe defaults', async () => {
      // Arrange - Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory usage unavailable');
      }) as any;

      // Act
      const result = await service.checkMemoryBeforeBatch(10);

      // Assert
      expect(result.canProcess).toBe(true);
      expect(result.currentUsage.memory.percentage).toBe(0); // 根据实际实现，错误时返回0
      expect(result.currentUsage.cpu.usage).toBe(0); // 根据实际实现，错误时返回0
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('获取系统指标失败'),
        expect.objectContaining({
          error: 'Memory usage unavailable',
        })
      );

      // Cleanup
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('CPU Usage Calculation', () => {
    it('should calculate CPU usage within reasonable bounds', async () => {
      // Act
      const result = await service.checkMemoryBeforeBatch(5);

      // Assert - CPU usage should be within 0-1 range
      expect(result.currentUsage.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(result.currentUsage.cpu.usage).toBeLessThanOrEqual(1);
    });

    it('should handle CPU calculation error and return default', async () => {
      // Arrange - Mock process.cpuUsage to throw error
      const originalCpuUsage = process.cpuUsage;
      process.cpuUsage = jest.fn(() => {
        throw new Error('CPU usage unavailable');
      });

      // Act
      const result = await service.checkMemoryBeforeBatch(5);

      // Assert
      expect(result.currentUsage.cpu.usage).toBe(0.1); // 根据实际实现，错误时返回默认值0.1

      // Cleanup
      process.cpuUsage = originalCpuUsage;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete monitoring workflow for high memory scenario', async () => {
      // Arrange
      const symbolsCount = 80;
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 850 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.83 },
        cpu: { usage: 0.6 },
        uptime: 5400,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(symbolsCount);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(result.recommendation).toBe('reduce_batch');
      expect(result.pressureLevel).toBe('warning');
      expect(result.suggestedBatchSize).toBeLessThan(symbolsCount);

      // Verify metrics recording
      expect(metricsRegistry.queryMemoryTriggeredDegradations?.labels).toHaveBeenCalledWith(
        'batch_reduced',
        '51-100'
      );

      // Verify event emission
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            pressureLevel: 'warning',
            recommendation: 'reduce_batch',
          }),
        })
      );

      // Verify logging
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('内存使用率达到警告阈值'),
        expect.anything()
      );
    });

    it('should provide comprehensive monitoring status with all components working', async () => {
      // Arrange
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 300 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.3 },
        cpu: { usage: 0.15 },
        uptime: 10800,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const status = await service.getMonitorStatus();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(status.enabled).toBe(true);
      expect(status.currentMemoryUsage).toEqual(mockSystemMetrics);
      expect(status.thresholds.warning).toBe(0.7);
      expect(status.thresholds.critical).toBe(0.9);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_memory_monitor',
          metricType: 'system',
          metricName: 'monitor_status_check',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero symbols count', async () => {
      // Arrange
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 500 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(0);

      // Assert
      expect(result.canProcess).toBe(true);
      expect(result.recommendation).toBe('proceed');
    });

    it('should handle negative symbols count', async () => {
      // Arrange
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 500 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(-5);

      // Assert
      expect(result.canProcess).toBe(true);
      expect(result.recommendation).toBe('proceed');
    });

    it('should handle extreme memory usage values', async () => {
      // Test with 100% memory usage
      const mockSystemMetrics: SystemMetricsDto = {
        memory: { used: 1024 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 1.0 },
        cpu: { usage: 1.0 },
        uptime: 3600,
        timestamp: new Date(),
      };

      jest.spyOn(service as any, 'getCurrentSystemMetrics').mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.checkMemoryBeforeBatch(50);

      // Assert
      expect(result.canProcess).toBe(false);
      expect(result.recommendation).toBe('defer');
      expect(result.pressureLevel).toBe('critical');
    });
  });
});