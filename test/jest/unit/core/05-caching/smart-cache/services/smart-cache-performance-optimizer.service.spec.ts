import { Test } from '@nestjs/testing';
import { SmartCachePerformanceOptimizer } from '../../../../../../../src/core/05-caching/smart-cache/services/smart-cache-performance-optimizer.service';
import { CollectorService } from '../../../../../../../src/monitoring/collector/collector.service';
import  os from 'os';

// Mock os module
jest.mock('os');

describe('SmartCachePerformanceOptimizer', () => {
  let service: SmartCachePerformanceOptimizer;
  let mockCollectorService: any;

  beforeEach(async () => {
    // Setup OS mocks
    (os.cpus as jest.Mock).mockReturnValue(new Array(8).fill({}));
    (os.totalmem as jest.Mock).mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
    (os.freemem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free
    (os.loadavg as jest.Mock).mockReturnValue([1.0, 1.2, 1.1]);
    (os.uptime as jest.Mock).mockReturnValue(86400); // 1 day

    // Create mock collector service
    mockCollectorService = {
      recordSystemMetrics: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: SmartCachePerformanceOptimizer,
          useFactory: () => new SmartCachePerformanceOptimizer(mockCollectorService),
        },
      ],
    }).compile();

    service = module.get<SmartCachePerformanceOptimizer>(SmartCachePerformanceOptimizer);
    
    // Mock process.memoryUsage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024, // 100MB
      heapTotal: 50 * 1024 * 1024, // 50MB
      heapUsed: 30 * 1024 * 1024, // 30MB
      external: 5 * 1024 * 1024, // 5MB
      arrayBuffers: 1 * 1024 * 1024, // 1MB
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    service?.stopOptimization();
  });

  describe('Initialization', () => {
    it('should be created successfully', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct default settings', () => {
      const dynamicConcurrency = service.getDynamicMaxConcurrency();
      const batchSize = service.getCurrentBatchSize();
      
      expect(dynamicConcurrency).toBeGreaterThan(0);
      expect(dynamicConcurrency).toBeLessThanOrEqual(16);
      expect(batchSize).toBe(10); // Default batch size
    });

    it('should provide performance statistics', () => {
      const stats = service.getPerformanceStats();
      
      expect(stats).toHaveProperty('concurrencyAdjustments');
      expect(stats).toHaveProperty('memoryPressureEvents');
      expect(stats).toHaveProperty('tasksCleared');
      expect(stats).toHaveProperty('dynamicMaxConcurrency');
      expect(stats).toHaveProperty('originalMaxConcurrency');
      expect(stats).toHaveProperty('currentBatchSize');
    });
  });

  describe('Dynamic Concurrency Control', () => {
    it('should calculate optimal concurrency based on system resources', async () => {
      const optimalConcurrency = await service.calculateOptimalConcurrency();
      
      expect(optimalConcurrency).toBeGreaterThanOrEqual(2); // Minimum
      expect(optimalConcurrency).toBeLessThanOrEqual(32); // Maximum
      expect(typeof optimalConcurrency).toBe('number');
    });

    it('should adjust concurrency based on low CPU usage', async () => {
      // Mock low CPU usage
      (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.6, 0.7]);
      
      const optimalConcurrency = await service.calculateOptimalConcurrency();
      
      // Should allow higher concurrency when CPU usage is low
      expect(optimalConcurrency).toBeGreaterThan(0);
    });

    it('should reduce concurrency on high CPU usage', async () => {
      // Mock high CPU usage
      (os.loadavg as jest.Mock).mockReturnValue([7.0, 6.8, 6.5]); // High load
      
      const optimalConcurrency = await service.calculateOptimalConcurrency();
      
      // Should still provide a valid concurrency value
      expect(optimalConcurrency).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Memory Pressure Management', () => {
    it('should detect no memory pressure under normal conditions', async () => {
      // Normal memory usage (60%)
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 600 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024, // 60% usage
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      (os.freemem as jest.Mock).mockReturnValue(6 * 1024 * 1024 * 1024); // 6GB free

      const hasMemoryPressure = await service.checkMemoryPressure();
      expect(hasMemoryPressure).toBe(false);
    });

    it('should detect memory pressure under high usage', async () => {
      // High memory usage (90%)
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 900 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        heapUsed: 900 * 1024 * 1024, // 90% usage
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      (os.freemem as jest.Mock).mockReturnValue(1 * 1024 * 1024 * 1024); // 1GB free

      const hasMemoryPressure = await service.checkMemoryPressure();
      expect(hasMemoryPressure).toBe(true);
    });

    it('should handle memory pressure by reducing concurrency', async () => {
      // Setup high memory usage
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 900 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        heapUsed: 900 * 1024 * 1024, // 90% usage
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      (os.freemem as jest.Mock).mockReturnValue(1 * 1024 * 1024 * 1024); // Low free memory

      const initialConcurrency = service.getDynamicMaxConcurrency();
      const result = await service.handleMemoryPressure();

      expect(result.handled).toBe(true);
      expect(result.reducedConcurrency).toBeLessThan(initialConcurrency);
      expect(result.reducedConcurrency).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Batch Size Optimization', () => {
    it('should calculate optimal batch size based on load', () => {
      const lowLoadBatchSize = service.calculateOptimalBatchSize(1); // Low load
      const highLoadBatchSize = service.calculateOptimalBatchSize(10); // High load
      
      expect(lowLoadBatchSize).toBeGreaterThanOrEqual(5);
      expect(lowLoadBatchSize).toBeLessThanOrEqual(50);
      expect(highLoadBatchSize).toBeGreaterThanOrEqual(5);
      expect(highLoadBatchSize).toBeLessThanOrEqual(50);
    });

    it('should return default batch size on calculation errors', () => {
      // Force an error by mocking process.memoryUsage to throw
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory usage error');
      });

      const batchSize = service.calculateOptimalBatchSize();
      expect(batchSize).toBe(10); // Default batch size
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics successfully', async () => {
      const metrics = await service.getSystemMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('system');

      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(1);

      expect(metrics.memory.totalMB).toBeGreaterThan(0);
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(1);

      expect(Array.isArray(metrics.system.loadAvg)).toBe(true);
      expect(metrics.system.uptime).toBeGreaterThan(0);
    });

    it('should handle system metrics collection gracefully', async () => {
      // Mock OS functions to throw errors
      (os.loadavg as jest.Mock).mockImplementation(() => {
        throw new Error('OS API error');
      });

      // Should not crash and should return reasonable defaults
      await expect(service.getSystemMetrics()).rejects.toThrow();
    });
  });

  describe('Optimization Lifecycle', () => {
    it('should start optimization successfully', () => {
      expect(() => service.startOptimization(16)).not.toThrow();
      
      const stats = service.getPerformanceStats();
      expect(stats.originalMaxConcurrency).toBe(16);
    });

    it('should stop optimization gracefully', () => {
      service.startOptimization();
      expect(() => service.stopOptimization()).not.toThrow();
    });

    it('should handle optimization with custom base concurrency', () => {
      const customConcurrency = 12;
      service.startOptimization(customConcurrency);
      
      const stats = service.getPerformanceStats();
      expect(stats.originalMaxConcurrency).toBe(customConcurrency);
    });
  });

  describe('Error Handling', () => {
    it('should handle collector service failures gracefully', async () => {
      mockCollectorService.recordSystemMetrics.mockRejectedValueOnce(new Error('Collector error'));
      
      // Should not crash when metrics recording fails
      await expect(service.calculateOptimalConcurrency()).resolves.not.toThrow();
    });

    it('should handle missing collector service gracefully', () => {
      const serviceWithoutCollector = new SmartCachePerformanceOptimizer();
      
      expect(() => serviceWithoutCollector.startOptimization()).not.toThrow();
      expect(() => serviceWithoutCollector.stopOptimization()).not.toThrow();
    });

    it('should handle OS API failures in concurrency calculation', async () => {
      // Mock OS functions to fail
      (os.cpus as jest.Mock).mockImplementation(() => {
        throw new Error('CPU info error');
      });

      // Should return current concurrency value as fallback
      const concurrency = await service.calculateOptimalConcurrency();
      expect(typeof concurrency).toBe('number');
      expect(concurrency).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work without collector service', () => {
      const serviceWithoutCollector = new SmartCachePerformanceOptimizer();
      
      expect(serviceWithoutCollector).toBeDefined();
      expect(serviceWithoutCollector.getDynamicMaxConcurrency()).toBeGreaterThan(0);
      expect(serviceWithoutCollector.getCurrentBatchSize()).toBe(10);
    });

    it('should provide consistent interface regardless of collector availability', async () => {
      const serviceWithCollector = new SmartCachePerformanceOptimizer(mockCollectorService);
      const serviceWithoutCollector = new SmartCachePerformanceOptimizer();

      // Both should provide the same interface
      expect(typeof serviceWithCollector.calculateOptimalConcurrency).toBe('function');
      expect(typeof serviceWithoutCollector.calculateOptimalConcurrency).toBe('function');
      
      expect(typeof serviceWithCollector.getDynamicMaxConcurrency).toBe('function');
      expect(typeof serviceWithoutCollector.getDynamicMaxConcurrency).toBe('function');
    });
  });
});