import { Test, TestingModule } from '@nestjs/testing';
import { StreamRecoveryWorkerService, RecoveryJob, RecoveryResult, RecoveryMetrics } from '../../../../../../src/core/stream-data-fetcher/services/stream-recovery-worker.service';
import { StreamDataCacheService } from '../../../../../../src/core/stream-data-fetcher/services/stream-data-cache.service';
import { StreamClientStateManager } from '../../../../../../src/core/stream-data-fetcher/services/stream-client-state-manager.service';
import { StreamDataFetcherService } from '../../../../../../src/core/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamRecoveryConfigService } from '../../../../../../src/core/stream-data-fetcher/config/stream-recovery.config';
import { StreamRecoveryMetricsService } from '../../../../../../src/core/stream-data-fetcher/metrics/stream-recovery.metrics';
import { createLogger } from '../../../../../../src/common/config/logger.config';
import { Server } from 'socket.io';

// Mock logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn(),
    obliterate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
  })),
  Worker: jest.fn().mockImplementation((queueName, processor, options) => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(),
    isRunning: jest.fn().mockReturnValue(true),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(),
  })),
  Job: jest.fn(),
}));

const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock services
const mockStreamDataCache = {
  setData: jest.fn(),
  getData: jest.fn(),
  getDataSince: jest.fn(),
  getCacheStats: jest.fn(),
};

const mockClientStateManager = {
  addClientSubscription: jest.fn(),
  removeClientSubscription: jest.fn(),
  getClientSubscription: jest.fn(),
  getClientSymbols: jest.fn(),
  getClientStateStats: jest.fn(),
  addSubscriptionChangeListener: jest.fn(),
  broadcastToSymbolSubscribers: jest.fn(),
};

const mockStreamDataFetcher = {
  establishStreamConnection: jest.fn(),
  subscribeToSymbols: jest.fn(),
  unsubscribeFromSymbols: jest.fn(),
  isConnectionActive: jest.fn(),
  getConnectionStatsByProvider: jest.fn(),
  batchHealthCheck: jest.fn(),
};

// Phase 3 Mock Services
const mockStreamRecoveryConfig = {
  getConfig: jest.fn().mockReturnValue({
    worker: {
      concurrency: 4,
      maxRetries: 3,
      retryDelay: 1000,
    },
    queue: {
      name: 'stream-recovery-test',
      redis: { host: 'localhost', port: 6379 },
    },
    recovery: {
      batchSize: 100,
      maxDataPoints: 10000,
    },
    rateLimit: {
      default: {
        maxQPS: 100,
        burstSize: 150,
        window: 1000,
      },
    },
    cleanup: {
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  }),
  getRateLimitConfig: jest.fn().mockReturnValue({
    maxQPS: 100,
    burstSize: 150,
    window: 1000,
  }),
  getPriorityWeight: jest.fn().mockImplementation((priority) => {
    const weights = { high: 10, normal: 5, low: 1 };
    return weights[priority] || 5;
  }),
};

const mockStreamRecoveryMetrics = {
  incrementJobSubmitted: jest.fn(),
  incrementJobCompleted: jest.fn(),
  incrementJobFailed: jest.fn(),
  recordBatchSent: jest.fn(),
  recordQPS: jest.fn(),
  recordRateLimitHit: jest.fn(),
  recordRateLimitMiss: jest.fn(),
  recordTokensConsumed: jest.fn(),
  incrementError: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    jobs: {
      totalJobs: 10,
      pendingJobs: 2,
      activeJobs: 1,
      completedJobs: 6,
      failedJobs: 1,
    },
    performance: {
      averageRecoveryTime: 500,
    },
    rateLimit: {
      qps: 25,
    },
  }),
};

// Mock WebSocket Server
const mockWebSocketServer = {
  sockets: {
    sockets: new Map(),
  },
  emit: jest.fn(),
};

const mockSocketClient = {
  id: 'test-client-socket',
  connected: true,
  emit: jest.fn(),
};

describe('StreamRecoveryWorkerService', () => {
  let service: StreamRecoveryWorkerService;
  let streamDataCache: jest.Mocked<StreamDataCacheService>;
  let clientStateManager: jest.Mocked<StreamClientStateManager>;
  let streamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let configService: jest.Mocked<StreamRecoveryConfigService>;
  let metricsService: jest.Mocked<StreamRecoveryMetricsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamRecoveryWorkerService,
        {
          provide: StreamDataCacheService,
          useValue: mockStreamDataCache,
        },
        {
          provide: StreamClientStateManager,
          useValue: mockClientStateManager,
        },
        {
          provide: StreamDataFetcherService,
          useValue: mockStreamDataFetcher,
        },
      ],
    }).compile();

    service = module.get<StreamRecoveryWorkerService>(StreamRecoveryWorkerService);
    streamDataCache = module.get(StreamDataCacheService);
    clientStateManager = module.get(StreamClientStateManager);
    streamDataFetcher = module.get(StreamDataFetcherService);
  });

  describe('服务初始化', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
    });

    it('应该在模块初始化时创建队列和Worker', async () => {
      await service.onModuleInit();
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        'StreamRecoveryWorker 初始化完成',
        expect.objectContaining({
          concurrency: expect.any(Number),
          queueName: 'stream-recovery',
        })
      );
    });

    it('应该在模块销毁时关闭队列和Worker', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      
      expect(mockLogger.log).toHaveBeenCalledWith('StreamRecoveryWorker 已关闭');
    });
  });

  describe('补发任务提交', () => {
    const mockRecoveryJob: RecoveryJob = {
      clientId: 'test-client-1',
      symbols: ['AAPL.US', '700.HK'],
      lastReceiveTimestamp: Date.now() - 60000, // 1分钟前
      provider: 'longport',
      capability: 'stream-stock-quote',
      priority: 'high',
    };

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该成功提交补发任务', async () => {
      const jobId = await service.submitRecoveryJob(mockRecoveryJob);
      
      expect(jobId).toBe('mock-job-id');
      expect(mockLogger.log).toHaveBeenCalledWith(
        '补发任务已提交',
        expect.objectContaining({
          jobId: 'mock-job-id',
          clientId: mockRecoveryJob.clientId,
          priority: 'high',
          symbolCount: 2,
        })
      );
    });

    it('应该验证lastReceiveTimestamp的有效性', async () => {
      const invalidJob = {
        ...mockRecoveryJob,
        lastReceiveTimestamp: 0,
      };

      await expect(service.submitRecoveryJob(invalidJob)).rejects.toThrow(
        'Invalid lastReceiveTimestamp'
      );
    });

    it('应该根据优先级设置任务权重', async () => {
      const normalPriorityJob = {
        ...mockRecoveryJob,
        priority: 'normal' as const,
      };

      await service.submitRecoveryJob(normalPriorityJob);
      
      // 验证任务被添加到队列时使用了正确的优先级权重
      expect(mockLogger.log).toHaveBeenCalledWith(
        '补发任务已提交',
        expect.objectContaining({
          priority: 'normal',
        })
      );
    });
  });

  describe('批量任务提交', () => {
    const mockJobs: RecoveryJob[] = [
      {
        clientId: 'client-1',
        symbols: ['AAPL.US'],
        lastReceiveTimestamp: Date.now() - 30000,
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 'high',
      },
      {
        clientId: 'client-2',
        symbols: ['700.HK'],
        lastReceiveTimestamp: Date.now() - 60000,
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 'normal',
      },
    ];

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该批量提交多个补发任务', async () => {
      const jobIds = await service.submitBatchRecoveryJobs(mockJobs);
      
      expect(jobIds).toHaveLength(2);
      expect(jobIds[0]).toBe('mock-job-id');
      expect(jobIds[1]).toBe('mock-job-id');
    });

    it('应该处理批量提交中的个别失败', async () => {
      const invalidJobs = [
        mockJobs[0],
        {
          ...mockJobs[1],
          lastReceiveTimestamp: 0, // 无效的时间戳
        },
      ];

      const jobIds = await service.submitBatchRecoveryJobs(invalidJobs);
      
      expect(jobIds).toHaveLength(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '批量提交任务失败',
        expect.objectContaining({
          clientId: 'client-2',
        })
      );
    });
  });

  describe('QPS限流', () => {
    it('应该正确实施Token Bucket限流算法', () => {
      const service_: any = service;
      
      // 第一次请求应该成功
      expect(service_.checkRateLimit('longport')).toBe(true);
      
      // 快速连续请求多次，耗尽tokens
      for (let i = 0; i < 150; i++) {
        service_.checkRateLimit('longport');
      }
      
      // 超过限制后应该失败
      expect(service_.checkRateLimit('longport')).toBe(false);
    });

    it('应该为不同提供商维护独立的限流器', () => {
      const service_: any = service;
      
      expect(service_.checkRateLimit('longport')).toBe(true);
      expect(service_.checkRateLimit('itick')).toBe(true);
      
      // 耗尽longport的tokens
      for (let i = 0; i < 150; i++) {
        service_.checkRateLimit('longport');
      }
      
      // longport应该被限流，但itick仍然可用
      expect(service_.checkRateLimit('longport')).toBe(false);
      expect(service_.checkRateLimit('itick')).toBe(true);
    });
  });

  describe('任务管理', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该取消指定的补发任务', async () => {
      const mockJob = {
        id: 'test-job-id',
        remove: jest.fn().mockResolvedValue(),
      };
      
      const queue: any = (service as any).recoveryQueue;
      queue.getJob.mockResolvedValue(mockJob);
      
      const result = await service.cancelRecoveryJob('test-job-id');
      
      expect(result).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        '补发任务已取消',
        { jobId: 'test-job-id' }
      );
    });

    it('应该返回任务状态信息', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: { clientId: 'test-client' },
        progress: 50,
        attemptsMade: 1,
        finishedOn: null,
        processedOn: Date.now(),
        failedReason: null,
        getState: jest.fn().mockResolvedValue('active'),
      };
      
      const queue: any = (service as any).recoveryQueue;
      queue.getJob.mockResolvedValue(mockJob);
      
      const status = await service.getJobStatus('test-job-id');
      
      expect(status).toMatchObject({
        id: 'test-job-id',
        data: { clientId: 'test-client' },
        progress: 50,
        attemptsMade: 1,
        state: 'active',
      });
    });

    it('应该返回null当任务不存在时', async () => {
      const queue: any = (service as any).recoveryQueue;
      queue.getJob.mockResolvedValue(null);
      
      const status = await service.getJobStatus('non-existent-job');
      
      expect(status).toBeNull();
    });
  });

  describe('指标和统计', () => {
    it('应该返回Worker指标', () => {
      const metrics = service.getMetrics();
      
      expect(metrics).toMatchObject({
        totalJobs: expect.any(Number),
        pendingJobs: expect.any(Number),
        activeJobs: expect.any(Number),
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        averageRecoveryTime: expect.any(Number),
        qps: expect.any(Number),
      });
    });

    it('应该计算平均恢复时间', () => {
      const service_: any = service;
      service_.metrics.completedJobs = 10;
      service_.metrics.totalRecoveryTime = 5000;
      
      const metrics = service.getMetrics();
      
      expect(metrics.averageRecoveryTime).toBe(500);
    });

    it('应该追踪QPS指标', () => {
      const service_: any = service;
      const now = Date.now();
      
      // 添加一些最近的请求
      service_.metrics.recentQPS = [
        now - 500,
        now - 300,
        now - 100,
      ];
      
      service_.updateQPSMetrics();
      
      const metrics = service.getMetrics();
      expect(metrics.qps).toBe(4); // 3个历史 + 1个新的
    });
  });

  describe('健康检查', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该返回健康状态', async () => {
      const queue: any = (service as any).recoveryQueue;
      queue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 10,
        delayed: 0,
      });
      
      const worker: any = (service as any).recoveryWorker;
      worker.isRunning.mockReturnValue(true);
      
      const health = await service.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details).toMatchObject({
        workerRunning: true,
        queueCounts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 10,
        },
      });
    });

    it('应该在失败任务过多时返回降级状态', async () => {
      const queue: any = (service as any).recoveryQueue;
      queue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 200, // 大量失败
        delayed: 0,
      });
      
      const health = await service.healthCheck();
      
      expect(health.status).toBe('degraded');
    });

    it('应该在Worker停止时返回不健康状态', async () => {
      const worker: any = (service as any).recoveryWorker;
      worker.isRunning.mockReturnValue(false);
      
      const queue: any = (service as any).recoveryQueue;
      queue.getJobCounts.mockResolvedValue({
        failed: 600, // 超过阈值
      });
      
      const health = await service.healthCheck();
      
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('补发失败处理', () => {
    it('应该处理补发失败并发送降级通知', async () => {
      const clientId = 'test-client';
      const symbols = ['AAPL.US', '700.HK'];
      const mockCallback = jest.fn();
      
      mockClientStateManager.getClientSubscription.mockReturnValue({
        clientId,
        symbols: new Set(symbols),
        wsCapabilityType: 'stream-stock-quote',
        providerName: 'longport',
        subscriptionTime: Date.now(),
        lastActiveTime: Date.now(),
        messageCallback: mockCallback,
      });
      
      const service_: any = service;
      await service_.handleRecoveryFailure(clientId, symbols);
      
      expect(mockCallback).toHaveBeenCalledWith({
        type: 'recovery_failed',
        message: '数据补发失败，请重新订阅',
        symbols,
        action: 'resubscribe',
        timestamp: expect.any(Number),
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '补发失败，执行降级策略',
        { clientId, symbols }
      );
    });
  });

  describe('AsyncLocalStorage上下文隔离', () => {
    it('应该为每个任务维护独立的上下文', () => {
      const service_: any = service;
      const asyncLocalStorage = service_.asyncLocalStorage;
      
      expect(asyncLocalStorage).toBeDefined();
      
      // 验证AsyncLocalStorage被正确初始化
      expect(typeof asyncLocalStorage.run).toBe('function');
      expect(typeof asyncLocalStorage.getStore).toBe('function');
    });
  });

  // ========== Phase 3 Critical Tests ==========
  
  describe('Phase 3: WebSocket Gateway Integration', () => {
    const mockRecoveryData = [
      { t: Date.now() - 10000, d: { symbol: 'AAPL.US', price: 150.0 } },
      { t: Date.now() - 5000, d: { symbol: 'AAPL.US', price: 151.0 } },
    ];

    beforeEach(async () => {
      await service.onModuleInit();
      // Reset WebSocket mocks
      jest.clearAllMocks();
      mockSocketClient.connected = true;
      mockWebSocketServer.sockets.sockets.clear();
      mockWebSocketServer.sockets.sockets.set('test-client-socket', mockSocketClient);
      service.setWebSocketServer(mockWebSocketServer as any);
    });

    it('应该通过WebSocket服务器发送补发数据', async () => {
      const clientId = 'test-client-socket';
      mockStreamDataCache.getDataSince.mockResolvedValue(mockRecoveryData);
      
      const service_: any = service;
      await service_.sendRecoveryDataToClient(clientId, mockRecoveryData);

      // 验证WebSocket消息发送
      expect(mockSocketClient.emit).toHaveBeenCalledWith('recovery-data', 
        expect.objectContaining({
          type: 'recovery',
          data: expect.arrayContaining([
            expect.objectContaining({ t: expect.any(Number) })
          ]),
          metadata: expect.objectContaining({
            recoveryBatch: 1,
            totalBatches: 1,
            isLastBatch: true,
            dataPointsCount: 2,
          })
        })
      );

      expect(mockSocketClient.emit).toHaveBeenCalledWith('recovery-complete', 
        expect.objectContaining({
          type: 'recovery_complete',
          message: '数据补发完成',
          totalDataPoints: 2,
          totalBatches: 1,
        })
      );

      expect(mockStreamRecoveryMetrics.recordBatchSent).toHaveBeenCalledWith(
        2, // batch size  
        expect.any(Number) // network bytes
      );
    });

    it('应该处理客户端连接不存在的情况', async () => {
      mockWebSocketServer.sockets.sockets.clear(); // No client connections
      
      const service_: any = service;
      await service_.sendRecoveryDataToClient('non-existent-client', mockRecoveryData);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '客户端Socket连接不存在，无法发送补发数据',
        { clientId: 'non-existent-client' }
      );
      expect(mockStreamRecoveryMetrics.incrementError).toHaveBeenCalledWith('networkErrors');
    });
  });

  describe('Phase 3: 智能调度算法 (scheduleRecovery)', () => {
    const mockScheduleJob: RecoveryJob = {
      clientId: 'schedule-test-client',
      symbols: ['AAPL.US', '700.HK'],
      lastReceiveTimestamp: Date.now() - 30000, // 30秒前
      provider: 'longport',
      capability: 'stream-stock-quote',
      priority: 'normal',
    };

    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('应该成功调度补发任务', async () => {
      const jobId = await service.scheduleRecovery(mockScheduleJob);

      expect(jobId).toBe('mock-job-id');
      expect(mockLogger.log).toHaveBeenCalledWith(
        '补发任务调度成功',
        expect.objectContaining({
          jobId: 'mock-job-id',
          clientId: mockScheduleJob.clientId,
          originalPriority: 'normal',
          adjustedPriority: expect.any(String),
          delay: expect.any(Number),
          symbolCount: 2,
        })
      );
      expect(mockStreamRecoveryMetrics.incrementJobSubmitted).toHaveBeenCalled();
    });

    it('应该拒绝无效的任务参数', async () => {
      const invalidJob = {
        ...mockScheduleJob,
        clientId: '', // Invalid clientId
      };

      await expect(service.scheduleRecovery(invalidJob)).rejects.toThrow(
        'Invalid recovery job parameters'
      );
    });

    it('应该拒绝过大的时间窗口', async () => {
      const oldJob = {
        ...mockScheduleJob,
        lastReceiveTimestamp: Date.now() - 25 * 60 * 60 * 1000, // 25小时前
      };

      await expect(service.scheduleRecovery(oldJob)).rejects.toThrow(
        'Recovery window too large, data may be expired'
      );
    });
  });

  describe('Phase 3: 配置和指标服务集成', () => {
    it('应该使用配置服务获取Worker配置', () => {
      expect(mockStreamRecoveryConfig.getConfig).toHaveBeenCalled();
    });

    it('应该从指标服务获取Worker统计信息', () => {
      const metrics = service.getMetrics();
      
      expect(mockStreamRecoveryMetrics.getMetrics).toHaveBeenCalled();
      expect(metrics).toMatchObject({
        totalJobs: 10,
        pendingJobs: 2,
        activeJobs: 1,
        completedJobs: 6,
        failedJobs: 1,
        averageRecoveryTime: 500,
        qps: 25,
      });
    });
  });
});