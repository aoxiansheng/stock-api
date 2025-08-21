/**
 * Gateway性能基准测试
 * 验证Legacy代码移除后性能无回归
 */
import { Test, TestingModule } from '@nestjs/testing';
import { GatewayPerformanceTracker } from '../../../../../../src/core/03-fetching/stream-data-fetcher/services/gateway-performance-tracker.service';
import { StreamClientStateManager } from '../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { WebSocketServerProvider } from '../../../../../../src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider';

describe('Gateway Performance Baseline Tests', () => {
  let performanceTracker: GatewayPerformanceTracker;
  let stateManager: StreamClientStateManager;
  let wsProvider: WebSocketServerProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayPerformanceTracker,
        {
          provide: StreamClientStateManager,
          useValue: {
            addClientSubscription: jest.fn(),
            broadcastToSymbolViaGateway: jest.fn(),
            getBroadcastStats: jest.fn().mockReturnValue({
              gateway: { success: 100, failure: 0 },
              legacy: { calls: 0 },
              total: { attempts: 100 }
            })
          }
        },
        {
          provide: WebSocketServerProvider,
          useValue: {
            isReadyForLegacyRemoval: jest.fn().mockReturnValue({
              ready: true,
              details: { serverSource: 'gateway' }
            }),
            healthCheck: jest.fn().mockReturnValue({
              status: 'healthy'
            })
          }
        }
      ],
    }).compile();

    performanceTracker = module.get<GatewayPerformanceTracker>(GatewayPerformanceTracker);
    stateManager = module.get<StreamClientStateManager>(StreamClientStateManager);
    wsProvider = module.get<WebSocketServerProvider>(WebSocketServerProvider);
  });

  describe('延迟性能基准', () => {
    it('应该记录和计算延迟指标在acceptable范围内', () => {
      // 模拟典型延迟数据 (毫秒)
      const testLatencies = [5, 8, 12, 15, 20, 25, 30, 35, 18, 22];
      
      testLatencies.forEach(latency => {
        performanceTracker.recordLatency(latency);
      });

      const metrics = performanceTracker.getPerformanceMetrics();
      
      // 验证基准性能指标
      expect(metrics.latency.p95).toBeLessThan(40); // P95延迟应小于40ms
      expect(metrics.latency.p99).toBeLessThan(50); // P99延迟应小于50ms
      expect(metrics.latency.average).toBeLessThan(30); // 平均延迟应小于30ms
      expect(metrics.latency.samples).toBe(10);
    });

    it('应该处理高延迟场景并提供警告阈值', () => {
      // 模拟高延迟场景
      const highLatencies = [45, 52, 48, 55, 60, 42, 38, 65, 70, 58];
      
      highLatencies.forEach(latency => {
        performanceTracker.recordLatency(latency);
      });

      const metrics = performanceTracker.getPerformanceMetrics();
      
      // 高延迟场景的阈值验证
      expect(metrics.latency.p95).toBeLessThan(80); // 即使高延迟，P95也应小于80ms
      expect(metrics.latency.p99).toBeLessThan(100); // P99应小于100ms
      
      // 记录基准性能供监控使用
      performanceTracker.setBaseline();
      const baseline = performanceTracker.compareWithBaseline();
      expect(baseline.hasBaseline).toBe(true);
    });
  });

  describe('连接性能基准', () => {
    it('应该维持高连接成功率', () => {
      // 模拟连接尝试
      for (let i = 0; i < 95; i++) {
        performanceTracker.recordConnectionAttempt(true);
      }
      for (let i = 0; i < 5; i++) {
        performanceTracker.recordConnectionAttempt(false);
      }

      const metrics = performanceTracker.getPerformanceMetrics();
      
      // 连接成功率基准
      expect(metrics.connections.successRate).toBeGreaterThanOrEqual(90); // 成功率应 >= 90%
      expect(metrics.connections.attempts).toBe(100);
      expect(metrics.connections.total).toBe(95);
    });

    it('应该正确处理连接断开统计', () => {
      // 建立连接
      performanceTracker.recordConnectionAttempt(true);
      performanceTracker.recordConnectionAttempt(true);
      
      // 断开连接
      performanceTracker.recordDisconnection();
      
      const metrics = performanceTracker.getPerformanceMetrics();
      expect(metrics.connections.current).toBe(1);
    });
  });

  describe('吞吐量性能基准', () => {
    it('应该记录和计算吞吐量指标', () => {
      // 模拟每分钟请求数
      const requestCounts = [50, 65, 45, 70, 55];
      
      requestCounts.forEach(count => {
        performanceTracker.recordThroughput(count);
      });

      const metrics = performanceTracker.getPerformanceMetrics();
      
      // 吞吐量基准验证
      expect(metrics.throughput.current).toBeGreaterThan(0);
      expect(metrics.throughput.peak).toBe(70);
      expect(metrics.throughput.samples).toBe(5);
    });
  });

  describe('基准对比功能', () => {
    it('应该设置和对比性能基准', () => {
      // 记录初始性能数据
      performanceTracker.recordLatency(10);
      performanceTracker.recordLatency(15);
      performanceTracker.recordConnectionAttempt(true);
      performanceTracker.recordThroughput(60);

      // 设置基准
      performanceTracker.setBaseline();

      // 添加新的性能数据
      performanceTracker.recordLatency(12);
      performanceTracker.recordLatency(18);
      
      const comparison = performanceTracker.compareWithBaseline();
      
      expect(comparison.hasBaseline).toBe(true);
      expect(comparison.changes).toBeDefined();
      expect(comparison.recommendations).toBeDefined();
      expect(Array.isArray(comparison.recommendations)).toBe(true);
    });

    it('应该生成性能建议', () => {
      // 设置初始基准
      performanceTracker.recordLatency(10);
      performanceTracker.recordConnectionAttempt(true);
      performanceTracker.recordThroughput(50);
      performanceTracker.setBaseline();

      // 模拟性能下降
      for (let i = 0; i < 10; i++) {
        performanceTracker.recordLatency(30); // 显著增加延迟
      }

      const comparison = performanceTracker.compareWithBaseline();
      
      expect(comparison.hasBaseline).toBe(true);
      expect(comparison.recommendations?.length).toBeGreaterThan(0);
      
      // 应该有关于延迟增加的建议
      const hasLatencyRecommendation = comparison.recommendations?.some(
        rec => rec.includes('延迟') || rec.includes('性能')
      );
      expect(hasLatencyRecommendation).toBe(true);
    });
  });

  describe('性能数据重置', () => {
    it('应该正确重置所有统计数据', () => {
      // 添加测试数据
      performanceTracker.recordLatency(20);
      performanceTracker.recordConnectionAttempt(true);
      performanceTracker.recordThroughput(40);
      performanceTracker.setBaseline();

      // 重置数据
      performanceTracker.reset();

      const metrics = performanceTracker.getPerformanceMetrics();
      
      // 验证数据已重置
      expect(metrics.latency.samples).toBe(0);
      expect(metrics.connections.attempts).toBe(0);
      expect(metrics.throughput.samples).toBe(0);
      expect(metrics.baseline).toBeUndefined();
    });
  });
});