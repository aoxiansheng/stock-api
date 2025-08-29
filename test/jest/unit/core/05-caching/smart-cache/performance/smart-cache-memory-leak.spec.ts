import { SmartCachePerformanceOptimizer } from '@core/05-caching/smart-cache/services/smart-cache-performance-optimizer.service';

// 内存使用率监控工具
class MemoryMonitor {
  private snapshots: NodeJS.MemoryUsage[] = [];
  private interval: NodeJS.Timeout | null = null;

  startMonitoring(intervalMs = 1000) {
    this.snapshots = [];
    this.interval = setInterval(() => {
      this.snapshots.push(process.memoryUsage());
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getMemoryReport() {
    if (this.snapshots.length === 0) {
      return null;
    }

    const initial = this.snapshots[0];
    const final = this.snapshots[this.snapshots.length - 1];
    
    return {
      initialHeapUsed: initial.heapUsed,
      finalHeapUsed: final.heapUsed,
      heapGrowth: final.heapUsed - initial.heapUsed,
      heapGrowthPercent: ((final.heapUsed - initial.heapUsed) / initial.heapUsed) * 100,
      maxHeapUsed: Math.max(...this.snapshots.map(s => s.heapUsed)),
      snapshots: this.snapshots.length,
    };
  }

  checkForMemoryLeak(thresholdPercent = 50) {
    const report = this.getMemoryReport();
    if (!report) return false;
    
    return report.heapGrowthPercent > thresholdPercent;
  }
}

describe('SmartCache Performance Optimizer Memory Leak Detection', () => {
  let performanceOptimizer: SmartCachePerformanceOptimizer;
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    // Create performance optimizer without collector service (it's optional)
    performanceOptimizer = new SmartCachePerformanceOptimizer();
    memoryMonitor = new MemoryMonitor();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    memoryMonitor.stopMonitoring();
    
    // Stop optimization if running
    if (performanceOptimizer) {
      performanceOptimizer.stopOptimization();
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Leak Detection Tests', () => {
    it('should not leak memory during repeated concurrency calculations', async () => {
      memoryMonitor.startMonitoring(500);

      // Simulate repeated concurrency calculations
      for (let i = 0; i < 100; i++) {
        await performanceOptimizer.calculateOptimalConcurrency();
        
        // Occasional garbage collection hint
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // Wait for memory monitoring
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Memory growth should not exceed 30%
      expect(report!.heapGrowthPercent).toBeLessThan(30);
    }, 15000);

    it('should not leak memory during memory pressure checks', async () => {
      memoryMonitor.startMonitoring(500);

      // Simulate repeated memory pressure checks
      for (let i = 0; i < 50; i++) {
        await performanceOptimizer.checkMemoryPressure();
        await performanceOptimizer.handleMemoryPressure();
      }

      // Wait for memory monitoring
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Memory growth should be minimal
      expect(report!.heapGrowthPercent).toBeLessThan(25);
    }, 10000);

    it('should not leak memory during batch size calculations', async () => {
      memoryMonitor.startMonitoring(300);

      // Simulate repeated batch size calculations
      for (let i = 0; i < 200; i++) {
        const randomLoad = Math.random() * 10;
        performanceOptimizer.calculateOptimalBatchSize(randomLoad);
      }

      // Wait for memory monitoring
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Memory growth should be minimal for calculations
      expect(report!.heapGrowthPercent).toBeLessThan(20);
    }, 8000);

    it('should not leak memory during optimization lifecycle', async () => {
      memoryMonitor.startMonitoring(500);

      // Simulate multiple optimization cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        performanceOptimizer.startOptimization(8);
        
        // Simulate some activity
        await performanceOptimizer.calculateOptimalConcurrency();
        await performanceOptimizer.getSystemMetrics();
        
        performanceOptimizer.stopOptimization();
        
        // Brief pause between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for memory monitoring
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Memory growth should not exceed 35% for lifecycle operations
      expect(report!.heapGrowthPercent).toBeLessThan(35);
    }, 12000);

    it('should handle system metrics collection without memory leaks', async () => {
      memoryMonitor.startMonitoring(400);

      // Simulate repeated system metrics collection
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(performanceOptimizer.getSystemMetrics().catch(() => {}));
      }

      await Promise.allSettled(promises);

      // Wait for memory monitoring
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Memory growth should be controlled
      expect(report!.heapGrowthPercent).toBeLessThan(40);
    }, 10000);

    it('should maintain stable memory usage over extended operation', async () => {
      memoryMonitor.startMonitoring(1000);

      performanceOptimizer.startOptimization(4);

      // Simulate extended operation
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
          performanceOptimizer.calculateOptimalConcurrency(),
          performanceOptimizer.checkMemoryPressure(),
        );
        
        // Add delay between batches
        if (i % 5 === 0) {
          await Promise.all(operations);
          operations.length = 0;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      await Promise.all(operations);

      // Wait for final monitoring
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const report = memoryMonitor.getMemoryReport();
      expect(report).toBeDefined();
      
      // Extended operation should maintain reasonable memory growth
      expect(report!.heapGrowthPercent).toBeLessThan(50);
      
      performanceOptimizer.stopOptimization();
    }, 20000);
  });

  describe('Performance Statistics Integrity', () => {
    it('should maintain consistent performance statistics without memory leaks', () => {
      memoryMonitor.startMonitoring(200);

      // Access performance stats repeatedly
      for (let i = 0; i < 100; i++) {
        const stats = performanceOptimizer.getPerformanceStats();
        expect(stats).toBeDefined();
        expect(typeof stats.dynamicMaxConcurrency).toBe('number');
        expect(typeof stats.currentBatchSize).toBe('number');
      }

      // Brief monitoring period
      setTimeout(() => {
        const report = memoryMonitor.getMemoryReport();
        if (report) {
          // Statistics access should not cause significant memory growth
          expect(report.heapGrowthPercent).toBeLessThan(15);
        }
      }, 800);
    });
  });
});