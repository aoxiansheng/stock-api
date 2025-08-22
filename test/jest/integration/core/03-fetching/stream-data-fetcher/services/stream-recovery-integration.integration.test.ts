/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 🎯 Stream Recovery Integration Tests - Phase 3 Complete Recovery Chain
 * 
 * 端到端测试覆盖：
 * 1. 断线检测 → 补发任务调度
 * 2. Worker线程池处理 → WebSocket消息发送
 * 3. 完整的客户端重连恢复流程
 * 4. 真实Redis + 模拟WebSocket环境
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { StreamReceiverGateway } from '../../../../../../../src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway';
import { StreamReceiverService } from '../../../../../../../src/core/01-entry/stream-receiver/services/stream-receiver.service';
import { StreamRecoveryWorkerService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';
import { StreamCacheService } from '../../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import { StreamCacheModule } from '../../../../../../../src/core/05-caching/stream-cache/module/stream-cache.module';
import { StreamClientStateManager } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { StreamRecoveryConfigService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/config/stream-recovery.config';
import { StreamRecoveryMetricsService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/metrics/stream-recovery.metrics';
import { ApiKeyService } from '../../../../../../../src/auth/services/apikey.service';
import { CacheService } from '../../../../../../../src/cache/services/cache.service';
import { createLogger } from '../../../../../../../src/common/config/logger.config';
import { Server } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

// Mock Logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock BullMQ for integration tests
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'integration-job-id' }),
    getJob: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    obliterate: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 1,
      active: 1,
      complet_ed: 5,
      failed: 0,
      delayed: 0,
    }),
  })),
  Worker: jest.fn().mockImplementation((queueName, processor, options) => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
    isRunning: jest.fn().mockReturnValue(true),
    process: processor, // 保存处理器函数以供测试调用
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  })),
}));

describe('Stream Recovery Integration Tests - Phase 3 Complete Chain', () => {
  let app: INestApplication;
  let gateway: StreamReceiverGateway;
  let receiverService: StreamReceiverService;
  let recoveryWorker: StreamRecoveryWorkerService;
  let streamCache: StreamCacheService;
  let clientStateManager: StreamClientStateManager;
  let cacheService: CacheService;
  let server: Server;
  let clientSocket: ClientSocket;

  // Integration test data
  const testApiKey = 'test-integration-key';
  const testAccessToken = 'test-integration-token';
  const testClientId = 'integration-client-001';
  const testSymbols = ['AAPL.US', '700.HK'];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        StreamCacheModule,
      ],
      providers: [
        StreamReceiverGateway,
        StreamReceiverService,
        StreamRecoveryWorkerService,
        StreamClientStateManager,
        StreamRecoveryConfigService,
        StreamRecoveryMetricsService,
        // Mock services for integration
        {
          provide: ApiKeyService,
          useValue: {
            validateApiKey: jest.fn().mockResolvedValue({
              id: 'mock-api-key-id',
              name: 'Integration Test Key',
              permissions: ['stream:read', 'stream:subscribe'],
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            exists: jest.fn().mockResolvedValue(false),
            hashGetAll: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: 'WEBSOCKET_SERVER',
          useValue: null,
        },
        // Mock other required dependencies
        {
          provide: 'StreamDataFetcherService',
          useValue: {
            establishStreamConnection: jest.fn(),
            subscribeToSymbols: jest.fn(),
            unsubscribeFromSymbols: jest.fn(),
            isConnectionActive: jest.fn().mockReturnValue(true),
            batchHealthCheck: jest.fn().mockResolvedValue({ healthy: true }),
          },
        },
        {
          provide: 'SymbolMapperService',
          useValue: {
            mapSymbolToProvider: jest.fn().mockImplementation((symbol) => ({
              originalSymbol: symbol,
              mappedSymbol: symbol,
              provider: 'longport',
            })),
          },
        },
        {
          provide: 'DataTransformerService',
          useValue: {
            transformData: jest.fn().mockImplementation((data) => data),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));

    gateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
    receiverService = module.get<StreamReceiverService>(StreamReceiverService);
    recoveryWorker = module.get<StreamRecoveryWorkerService>(StreamRecoveryWorkerService);
    streamCache = module.get<StreamCacheService>(StreamCacheService);
    clientStateManager = module.get<StreamClientStateManager>(StreamClientStateManager);
    cacheService = module.get<CacheService>(CacheService);

    await app.init();
    
    // 获取实际的 WebSocket 服务器实例
    server = (gateway as any).server;
    
    // 注入 WebSocket 服务器到 Recovery Worker
    if (recoveryWorker && server) {
      recoveryWorker.setWebSocketServer(server);
    }
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phase 3: 完整的断线检测→补发链路', () => {
    it('应该完成完整的客户端重连补发流程', async (done) => {
      const mockRecoveryData = [
        { 
          s: 'AAPL.US', 
          p: 150.0, 
          v: 1000,
          t: Date.now() - 30000
        },
        { 
          s: 'AAPL.US', 
          p: 151.5, 
          v: 2000,
          t: Date.now() - 15000
        },
      ];

      // 1. 模拟缓存中有历史数据
      jest.spyOn(streamCache, 'getDataSince').mockResolvedValue(mockRecoveryData);

      // 2. 建立 WebSocket 连接
      const port = 3001; // 使用测试端口
      await app.listen(port);
      
      clientSocket = ClientIO(`http://localhost:${port}`, {
        path: '/api/v1/stream-receiver/connect',
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
        transports: ['websocket'],
      });

      let recoveryDataReceived = false;
      let recoveryCompleteReceived = false;

      // 3. 监听客户端事件
      clientSocket.on('connect', () => {
        console.log('✅ 客户端WebSocket连接成功');
        
        // 4. 订阅数据流
        clientSocket.emit('subscribe', {
          symbols: testSymbols,
          wsCapabilityType: 'stream-stock-quote',
        });
      });

      clientSocket.on('subscribe-ack', (data) => {
        console.log('✅ 订阅确认:', data);
        
        // 5. 模拟客户端请求数据补发
        const lastReceiveTimestamp = Date.now() - 60000; // 1分钟前断线
        
        clientSocket.emit('request-recovery', {
          symbols: testSymbols,
          lastReceiveTimestamp,
        });
      });

      clientSocket.on('recovery-started', (data) => {
        console.log('✅ 补发已启动:', data);
        expect(data.message).toContain('数据补发已启动');
        expect(data.symbols).toEqual(testSymbols);
      });

      // 6. 验证补发数据接收
      clientSocket.on('recovery-data', (data) => {
        console.log('✅ 收到补发数据:', data);
        
        expect(data.type).toBe('recovery');
        expect(data.data).toHaveLength(2);
        expect(data._metadata).toMatchObject({
          recoveryBatch: 1,
          _totalBatches: 1,
          isLastBatch: true,
          dataPointsCount: 2,
        });
        
        // 验证数据内容
        expect(data.data[0]).toMatchObject({
          t: expect.any(Number),
          d: expect.objectContaining({
            symbol: 'AAPL.US',
            price: expect.any(Number),
          }),
        });
        
        recoveryDataReceived = true;
      });

      // 7. 验证补发完成通知
      clientSocket.on('recovery-complete', (data) => {
        console.log('✅ 补发完成:', data);
        
        expect(data.type).toBe('recovery_complete');
        expect(data.message).toContain('数据补发完成');
        expect(data.totalDataPoints).toBe(2);
        expect(data.totalBatches).toBe(1);
        
        recoveryCompleteReceived = true;
        
        // 检查完整流程是否完成
        if (recoveryDataReceived && recoveryCompleteReceived) {
          console.log('🎉 完整的补发流程验证成功!');
          done();
        }
      });

      clientSocket.on('recovery-error', (error) => {
        console.error('❌ 补发错误:', error);
        done(new Error(`Recovery failed: ${error.message}`));
      });

      clientSocket.on('connect_error', (error) => {
        console.error('❌ 连接错误:', error);
        done(new Error(`Connection failed: ${error.message}`));
      });

      // 8. 设置测试超时
      setTimeout(() => {
        if (!recoveryDataReceived || !recoveryCompleteReceived) {
          done(new Error('补发流程超时 - 未收到预期的所有消息'));
        }
      }, 10000); // 10秒超时

    }, 15000); // Jest超时15秒

    it('应该处理无历史数据的补发请求', async (done) => {
      // 模拟缓存中没有数据
      jest.spyOn(streamCache, 'getDataSince').mockResolvedValue([]);

      const port = 3002;
      await app.listen(port);
      
      const testClient = ClientIO(`http://localhost:${port}`, {
        path: '/api/v1/stream-receiver/connect',
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
        transports: ['websocket'],
      });

      testClient.on('connect', () => {
        testClient.emit('request-recovery', {
          symbols: ['TEST.US'],
          lastReceiveTimestamp: Date.now() - 30000,
        });
      });

      testClient.on('recovery-started', () => {
        // 应该收到启动通知，即使没有数据
        console.log('✅ 空数据补发流程启动');
      });

      testClient.on('recovery-complete', (data) => {
        expect(data.totalDataPoints).toBe(0);
        expect(data.message).toContain('数据补发完成');
        
        testClient.disconnect();
        done();
      });

      setTimeout(() => done(new Error('空数据补发超时')), 5000);

    }, 8000);

    it('应该拒绝无效的补发时间窗口', async (done) => {
      const port = 3003;
      await app.listen(port);
      
      const testClient = ClientIO(`http://localhost:${port}`, {
        path: '/api/v1/stream-receiver/connect',
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
        transports: ['websocket'],
      });

      testClient.on('connect', () => {
        // 请求25小时前的数据 (超过24小时限制)
        testClient.emit('request-recovery', {
          symbols: ['TEST.US'],
          lastReceiveTimestamp: Date.now() - (25 * 60 * 60 * 1000),
        });
      });

      testClient.on('recovery-error', (error) => {
        expect(error.type).toBe('invalid_request');
        expect(error.message).toContain('补发时间窗口过大');
        
        testClient.disconnect();
        done();
      });

      setTimeout(() => done(new Error('无效时间窗口测试超时')), 3000);

    }, 5000);
  });

  describe('Phase 3: Worker线程池集成测试', () => {
    it('应该通过Worker线程池处理补发任务', async () => {
      // 初始化Worker
      await recoveryWorker.onModuleInit();

      const mockJob = {
        clientId: 'worker-test-client',
        symbols: ['WORKER.TEST'],
        lastReceiveTimestamp: Date.now() - 30000,
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 'normal' as const,
      };

      // 提交任务到Worker线程池
      const jobId = await recoveryWorker.scheduleRecovery(mockJob);
      
      expect(jobId).toBe('integration-job-id');
      
      // 验证任务状态
      const workerMetrics = recoveryWorker.getMetrics();
      expect(workerMetrics).toMatchObject({
        totalJobs: expect.any(Number),
        qps: expect.any(Number),
      });

      // 验证健康状态
      const healthStatus = await recoveryWorker.healthCheck();
      expect(healthStatus.status).toMatch(/healthy|degraded/);
    });

    it('应该正确处理QPS限流', async () => {
      await recoveryWorker.onModuleInit();

      // 快速连续提交多个任务测试限流
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        clientId: `rate-limit-client-${i}`,
        symbols: ['RATE.TEST'],
        lastReceiveTimestamp: Date.now() - 10000,
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 'normal' as const,
      }));

      const jobIds = await recoveryWorker.submitBatchRecoveryJobs(jobs);
      
      // 所有任务都应该被提交 (在测试环境中限流相对宽松)
      expect(jobIds).toHaveLength(5);
      expect(jobIds.every(id => id === 'integration-job-id')).toBe(true);
    });
  });

  describe('Phase 3: 错误处理和降级', () => {
    it('应该处理WebSocket连接断开后的补发失败', async (done) => {
      const port = 3004;
      await app.listen(port);
      
      const testClient = ClientIO(`http://localhost:${port}`, {
        path: '/api/v1/stream-receiver/connect',
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
        transports: ['websocket'],
      });

      testClient.on('connect', () => {
        // 立即断开连接
        testClient.disconnect();
        
        // 尝试向断开的客户端发送补发数据 (模拟内部调用)
        setTimeout(async () => {
          const service_: any = recoveryWorker;
          await service_.handleRecoveryFailure(testClient.id, ['FAIL.TEST']);
          
          // 验证日志记录了连接断开
          expect(createLogger).toHaveBeenCalled();
          done();
        }, 100);
      });

    }, 3000);

    it('应该处理缓存服务不可用的情况', async () => {
      // 模拟缓存服务错误
      jest.spyOn(streamCache, 'getDataSince').mockRejectedValue(
        new Error('Cache service unavailable')
      );

      const mockJob = {
        clientId: 'cache-error-test',
        symbols: ['CACHE.ERROR'],
        lastReceiveTimestamp: Date.now() - 30000,
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 'normal' as const,
      };

      // 任务提交应该成功，但处理时会遇到缓存错误
      const jobId = await recoveryWorker.scheduleRecovery(mockJob);
      expect(jobId).toBe('integration-job-id');
      
      // 验证错误被正确处理
      const healthStatus = await recoveryWorker.healthCheck();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('Phase 3: 性能和监控集成', () => {
    it('应该正确收集和报告Prometheus指标', () => {
      // 获取指标服务实例
      const metricsService = app.get(StreamRecoveryMetricsService);
      
      // 模拟一些指标操作
      metricsService.incrementJobSubmitted();
      metricsService.incrementJobCompleted(1500, 50);
      metricsService.recordBatchSent(25, 2048);
      metricsService.recordRateLimitHit();

      // 验证指标数据
      const metrics = metricsService.getMetrics();
      expect(metrics).toMatchObject({
        jobs: expect.objectContaining({
          totalJobs: expect.any(Number),
        }),
        data: expect.objectContaining({
          totalBatchesSent: expect.any(Number),
        }),
        rateLimit: expect.objectContaining({
          rateLimitHits: expect.any(Number),
        }),
      });

      // 验证Prometheus导出格式
      const prometheusMetrics = metricsService.getPrometheusMetrics();
      expect(prometheusMetrics).toMatchObject({
        'stream_recovery_jobs_total': expect.any(Number),
        'stream_recovery_data_points_total': expect.any(Number),
      });
    });

    it('应该提供详细的系统健康状态', async () => {
      await recoveryWorker.onModuleInit();
      
      const healthStatus = await recoveryWorker.healthCheck();
      
      expect(healthStatus).toMatchObject({
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        details: expect.objectContaining({
          workerRunning: expect.any(Boolean),
          queueCounts: expect.objectContaining({
            waiting: expect.any(Number),
            active: expect.any(Number),
            complet_ed: expect.any(Number),
            failed: expect.any(Number),
          }),
          metrics: expect.any(Object),
        }),
      });
    });
  });
});