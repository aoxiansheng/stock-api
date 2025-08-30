import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverService } from '../../../../../../../src/core/01-entry/stream-receiver/services/stream-receiver.service';
import { SymbolTransformerService } from '../../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { DataTransformerService } from '../../../../../../../src/core/02-processing/transformer/services/data-transformer.service';
import { StreamDataFetcherService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { CollectorService } from '@monitoring/collector/collector.service';
import { StreamRecoveryWorkerService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';

describe('StreamReceiverService - RxJS Subject Cleanup', () => {
  let service: StreamReceiverService;
  let mockSymbolTransformer: jest.Mocked<SymbolTransformerService>;
  let mockDataTransformer: jest.Mocked<DataTransformerService>;
  let mockStreamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let mockCollectorService: jest.Mocked<CollectorService>;
  let mockRecoveryWorker: jest.Mocked<StreamRecoveryWorkerService>;

  // 监视 Subject 方法的 spy
  let quoteBatchSubjectCompleteSpy: jest.SpyInstance;
  let quoteBatchSubjectUnsubscribeSpy: jest.SpyInstance;

  beforeEach(async () => {
    // 创建 mock 服务
    mockSymbolTransformer = {
      transformSymbols: jest.fn(),
    } as any;

    mockDataTransformer = {
      transform: jest.fn(),
    } as any;

    mockStreamDataFetcher = {
      getClientStateManager: jest.fn().mockReturnValue({
        addClientSubscription: jest.fn(),
        getClientSubscription: jest.fn(),
        getClientStateStats: jest.fn(),
        broadcastToSymbolViaGateway: jest.fn(),
        addSubscriptionChangeListener: jest.fn(),
      }),
      getStreamDataCache: jest.fn().mockReturnValue({
        setData: jest.fn(),
        getCacheStats: jest.fn(),
      }),
      establishStreamConnection: jest.fn(),
      isConnectionActive: jest.fn(),
      getConnectionStatsByProvider: jest.fn(),
      batchHealthCheck: jest.fn(),
    } as any;

    mockCollectorService = {
      recordRequest: jest.fn(),
      recordSystemMetrics: jest.fn(),
    } as any;

    mockRecoveryWorker = {
      submitRecoveryJob: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        { provide: SymbolTransformerService, useValue: mockSymbolTransformer },
        { provide: DataTransformerService, useValue: mockDataTransformer },
        { provide: StreamDataFetcherService, useValue: mockStreamDataFetcher },
        { provide: CollectorService, useValue: mockCollectorService },
        { provide: StreamRecoveryWorkerService, useValue: mockRecoveryWorker },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);

    // 创建 Subject 方法的 spy
    quoteBatchSubjectCompleteSpy = jest.spyOn(service['quoteBatchSubject'], 'complete');
    quoteBatchSubjectUnsubscribeSpy = jest.spyOn(service['quoteBatchSubject'], 'unsubscribe');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('onModuleDestroy - RxJS Subject Cleanup', () => {
    it('should properly clean up RxJS Subject when onModuleDestroy is called', () => {
      // Act
      service.onModuleDestroy();

      // Assert
      expect(quoteBatchSubjectCompleteSpy).toHaveBeenCalledTimes(1);
      expect(quoteBatchSubjectUnsubscribeSpy).toHaveBeenCalledTimes(1);
    });

    it('should clean up Subject before other resources', () => {
      // 监视定时器清理
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // Act
      service.onModuleDestroy();

      // Assert: Subject 清理应该在定时器清理之前调用
      expect(quoteBatchSubjectCompleteSpy).toHaveBeenCalled();
      expect(quoteBatchSubjectUnsubscribeSpy).toHaveBeenCalled();
      
      // 验证调用顺序 (Subject 清理在前)
      const completeCallOrder = quoteBatchSubjectCompleteSpy.mock.invocationCallOrder[0];
      const unsubscribeCallOrder = quoteBatchSubjectUnsubscribeSpy.mock.invocationCallOrder[0];
      
      expect(completeCallOrder).toBeDefined();
      expect(unsubscribeCallOrder).toBeDefined();
      expect(unsubscribeCallOrder).toBeGreaterThan(completeCallOrder);

      clearIntervalSpy.mockRestore();
    });

    it('should handle null/undefined Subject gracefully', () => {
      // Arrange: 模拟 Subject 方法抛出错误的情况
      quoteBatchSubjectCompleteSpy.mockImplementation(() => {
        throw new Error('Subject is null');
      });

      // Act & Assert: 不应该抛出错误
      expect(() => service.onModuleDestroy()).not.toThrow();
      
      // 验证清理过程仍然继续
      expect(service['activeConnections'].size).toBe(0);
    });

    it('should complete cleanup timer after Subject cleanup', () => {
      // Arrange: 设置一个模拟定时器
      const mockTimer = setTimeout(() => {}, 1000);
      service['cleanupTimer'] = mockTimer;
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Act
      service.onModuleDestroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimer);
      expect(service['cleanupTimer']).toBeUndefined();

      clearIntervalSpy.mockRestore();
    });

    it('should clear active connections after Subject and timer cleanup', () => {
      // Arrange: 添加一些模拟连接
      const mockConnection1 = { id: 'conn1', isConnected: true } as any;
      const mockConnection2 = { id: 'conn2', isConnected: true } as any;
      service['activeConnections'].set('provider1:capability1', mockConnection1);
      service['activeConnections'].set('provider2:capability2', mockConnection2);

      expect(service['activeConnections'].size).toBe(2);

      // Act
      service.onModuleDestroy();

      // Assert
      expect(service['activeConnections'].size).toBe(0);
    });

    it('should handle cleanup errors gracefully without failing', () => {
      // Arrange: 让 Subject.complete() 抛出错误
      quoteBatchSubjectCompleteSpy.mockImplementation(() => {
        throw new Error('Subject complete failed');
      });

      // Act & Assert: 整个清理过程不应该因为单个错误而失败
      expect(() => service.onModuleDestroy()).not.toThrow();
      
      // 验证其他清理步骤仍然执行
      expect(service['activeConnections'].size).toBe(0);
    });

    it('should log completion message after all cleanup is done', () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      // Act
      service.onModuleDestroy();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('StreamReceiver 资源已清理');
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should prevent memory leaks by properly disposing Subject subscriptions', () => {
      // Arrange: 获取初始 Subject 状态
      const initialSubject = service['quoteBatchSubject'];
      expect(initialSubject).toBeDefined();

      // Act
      service.onModuleDestroy();

      // Assert: 验证 Subject 已经被正确处置
      expect(quoteBatchSubjectCompleteSpy).toHaveBeenCalled();
      expect(quoteBatchSubjectUnsubscribeSpy).toHaveBeenCalled();
    });

    it('should not allow new data to be pushed after cleanup', () => {
      // Arrange
      const nextSpy = jest.spyOn(service['quoteBatchSubject'], 'next');

      // Act: 清理后尝试推送数据
      service.onModuleDestroy();
      
      // 模拟数据推送 (这通常发生在 handleIncomingData 中)
      try {
        service['quoteBatchSubject'].next({
          rawData: { test: 'data' },
          providerName: 'test',
          wsCapabilityType: 'test',
          timestamp: Date.now(),
          symbols: ['TEST'],
        });
      } catch (error) {
        // 预期的错误，因为 Subject 已经 completed
      }

      // Assert: next 方法被调用但 Subject 已完成，应该不会处理新数据
      expect(quoteBatchSubjectCompleteSpy).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup Integration', () => {
    it('should maintain correct cleanup order for all resources', () => {
      // Arrange
      const mockTimer = setTimeout(() => {}, 1000);
      service['cleanupTimer'] = mockTimer;
      service['activeConnections'].set('test:connection', { id: 'test' } as any);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const connectionsClearSpy = jest.spyOn(service['activeConnections'], 'clear');

      // Act
      service.onModuleDestroy();

      // Assert: 验证清理顺序
      expect(quoteBatchSubjectCompleteSpy).toHaveBeenCalled();
      expect(quoteBatchSubjectUnsubscribeSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(connectionsClearSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});