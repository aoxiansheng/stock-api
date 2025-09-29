import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventHandler } from '@notification/handlers/notification-event.handler';
import { NotificationHistoryService } from '@notification/services/notification-history.service';
import { createLogger } from '@common/logging/index';
import {
  NotificationEventType,
  NotificationRequestedEvent,
  NotificationSentEvent,
  NotificationDeliveredEvent,
  NotificationFailedEvent,
  NotificationRetriedEvent,
  BatchNotificationStartedEvent,
  BatchNotificationCompletedEvent,
  BatchNotificationFailedEvent,
  NotificationHistoryRecordedEvent,
  NotificationHistoryQueriedEvent,
  NotificationSystemErrorEvent,
  NotificationChannelErrorEvent,
} from '@notification/events/notification.events';
import {
  NotificationPriority,
  NotificationChannelType,
  NotificationStatus,
} from '@notification/types/notification.types';

// Mock the logger
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('NotificationEventHandler', () => {
  let handler: NotificationEventHandler;
  let historyService: NotificationHistoryService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventHandler,
        {
          provide: NotificationHistoryService,
          useValue: {
            logNotificationResult: jest.fn(),
          },
        },
        EventEmitter2,
      ],
    }).compile();

    handler = module.get<NotificationEventHandler>(NotificationEventHandler);
    historyService = module.get<NotificationHistoryService>(
      NotificationHistoryService,
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should initialize statistics correctly', () => {
    const stats = handler.getStatistics();
    expect(stats.totalEvents).toBe(0);
    expect(stats.errorEvents).toBe(0);
    expect(stats.successEvents).toBe(0);
    expect(stats.averageProcessingTime).toBe(0);
    Object.values(NotificationEventType).forEach((type) => {
      expect(stats.eventsByType[type]).toBe(0);
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'NotificationEventHandler 已初始化',
    );
  });

  describe('handleNotificationRequested', () => {
    it('should log debug messages and record statistics', async () => {
      const event: NotificationRequestedEvent = {
        eventId: 'req-1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'alert-1',
        requestId: 'req-id-1',
        severity: NotificationPriority.HIGH,
        title: 'Test Title',
        message: 'Test Message',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      };

      await handler.handleNotificationRequested(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知请求事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知请求事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_REQUESTED]).toBe(1);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationRequestedEvent = {
        eventId: 'req-2',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'alert-2',
        requestId: 'req-id-2',
        severity: NotificationPriority.NORMAL,
        title: 'Test Title',
        message: 'Test Message',
        channelTypes: [NotificationChannelType.SMS],
        metadata: {},
      };

      // Mocking an internal error for demonstration
      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationRequested(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知请求事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1); // Still increments totalEvents
      expect(stats.errorEvents).toBe(1); // Increments errorEvents
    });
  });

  describe('handleNotificationSent', () => {
    it('should log debug messages, record history, and update statistics', async () => {
      const event: NotificationSentEvent = {
        eventId: 'sent-1',
        eventType: NotificationEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        alertId: 'alert-1',
        notificationId: 'notif-1',
        channelId: 'chan-1',
        channelType: NotificationChannelType.EMAIL,
        recipient: 'test@example.com',
        sentAt: new Date(),
        duration: 100,
        metadata: { title: 'Test', content: 'Content' },
      };

      await handler.handleNotificationSent(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知发送成功事件',
        expect.any(Object),
      );
      expect(historyService.logNotificationResult).toHaveBeenCalledWith(
        expect.objectContaining({ id: event.notificationId, alertId: event.alertId }),
        expect.objectContaining({ success: true, channelType: event.channelType }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知发送成功事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.successEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_SENT]).toBe(1);
    });

    it('should log error if history service fails', async () => {
      const event: NotificationSentEvent = {
        eventId: 'sent-2',
        eventType: NotificationEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        alertId: 'alert-2',
        notificationId: 'notif-2',
        channelId: 'chan-2',
        channelType: NotificationChannelType.SMS,
        recipient: '+861234567890',
        sentAt: new Date(),
        duration: 50,
        metadata: {},
      };

      (historyService.logNotificationResult as jest.Mock).mockRejectedValueOnce(
        new Error('History service error'),
      );

      await handler.handleNotificationSent(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知发送成功事件失败',
        expect.objectContaining({ error: 'History service error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationDelivered', () => {
    it('should log debug messages and update statistics', async () => {
      const event: NotificationDeliveredEvent = {
        eventId: 'delivered-1',
        eventType: NotificationEventType.NOTIFICATION_DELIVERED,
        timestamp: new Date(),
        alertId: 'alert-1',
        notificationId: 'notif-1',
        channelType: NotificationChannelType.EMAIL,
        deliveredAt: new Date(),
        confirmationId: 'conf-1',
        metadata: {},
      };

      await handler.handleNotificationDelivered(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知投递成功事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知投递成功事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.successEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_DELIVERED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationDeliveredEvent = {
        eventId: 'delivered-2',
        eventType: NotificationEventType.NOTIFICATION_DELIVERED,
        timestamp: new Date(),
        alertId: 'alert-2',
        notificationId: 'notif-2',
        channelType: NotificationChannelType.SMS,
        deliveredAt: new Date(),
        confirmationId: 'conf-2',
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationDelivered(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知投递成功事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationFailed', () => {
    it('should log warn messages, record history, and update statistics', async () => {
      const event: NotificationFailedEvent = {
        eventId: 'failed-1',
        eventType: NotificationEventType.NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'alert-1',
        notificationId: 'notif-1',
        channelType: NotificationChannelType.EMAIL,
        error: 'Network error',
        failedAt: new Date(),
        retryCount: 0,
        willRetry: false,
        metadata: {},
      };

      await handler.handleNotificationFailed(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '处理通知发送失败事件',
        expect.any(Object),
      );
      expect(historyService.logNotificationResult).toHaveBeenCalledWith(
        expect.objectContaining({ id: event.notificationId, alertId: event.alertId }),
        expect.objectContaining({ success: false, channelType: event.channelType, error: event.error }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知发送失败事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_FAILED]).toBe(1);
    });

    it('should log debug message if willRetry is true', async () => {
      const event: NotificationFailedEvent = {
        eventId: 'failed-2',
        eventType: NotificationEventType.NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'alert-2',
        notificationId: 'notif-2',
        channelType: NotificationChannelType.SMS,
        error: 'Service unavailable',
        failedAt: new Date(),
        retryCount: 1,
        willRetry: true,
        metadata: {},
      };

      await handler.handleNotificationFailed(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知将进行重试',
        expect.objectContaining({ notificationId: event.notificationId, retryCount: event.retryCount }),
      );
    });

    it('should log error if history service fails', async () => {
      const event: NotificationFailedEvent = {
        eventId: 'failed-3',
        eventType: NotificationEventType.NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'alert-3',
        notificationId: 'notif-3',
        channelType: NotificationChannelType.WEBHOOK,
        error: 'Timeout',
        failedAt: new Date(),
        retryCount: 0,
        willRetry: false,
        metadata: {},
      };

      (historyService.logNotificationResult as jest.Mock).mockRejectedValueOnce(
        new Error('History service error'),
      );

      await handler.handleNotificationFailed(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知发送失败事件失败',
        expect.objectContaining({ error: 'History service error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationRetried', () => {
    it('should log debug messages and update statistics', async () => {
      const event: NotificationRetriedEvent = {
        eventId: 'retried-1',
        eventType: NotificationEventType.NOTIFICATION_RETRIED,
        timestamp: new Date(),
        alertId: 'alert-1',
        notificationId: 'notif-1',
        channelType: NotificationChannelType.EMAIL,
        retryAttempt: 1,
        previousError: 'Temporary error',
        retriedAt: new Date(),
        metadata: {},
      };

      await handler.handleNotificationRetried(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知重试事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知重试事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_RETRIED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationRetriedEvent = {
        eventId: 'retried-2',
        eventType: NotificationEventType.NOTIFICATION_RETRIED,
        timestamp: new Date(),
        alertId: 'alert-2',
        notificationId: 'notif-2',
        channelType: NotificationChannelType.SMS,
        retryAttempt: 2,
        previousError: 'Another temporary error',
        retriedAt: new Date(),
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationRetried(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知重试事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleBatchNotificationStarted', () => {
    it('should log debug messages and update statistics', async () => {
      const event: BatchNotificationStartedEvent = {
        eventId: 'batch-start-1',
        eventType: NotificationEventType.BATCH_NOTIFICATION_STARTED,
        timestamp: new Date(),
        alertId: 'alert-1',
        batchId: 'batch-1',
        requestCount: 10,
        concurrency: 5,
        startedAt: new Date(),
        metadata: {},
      };

      await handler.handleBatchNotificationStarted(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理批量通知开始事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '批量通知开始事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.BATCH_NOTIFICATION_STARTED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: BatchNotificationStartedEvent = {
        eventId: 'batch-start-2',
        eventType: NotificationEventType.BATCH_NOTIFICATION_STARTED,
        timestamp: new Date(),
        alertId: 'alert-2',
        batchId: 'batch-2',
        requestCount: 5,
        concurrency: 2,
        startedAt: new Date(),
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleBatchNotificationStarted(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理批量通知开始事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleBatchNotificationCompleted', () => {
    it('should log messages and update statistics for successful batch', async () => {
      const event: BatchNotificationCompletedEvent = {
        eventId: 'batch-comp-1',
        eventType: NotificationEventType.BATCH_NOTIFICATION_COMPLETED,
        timestamp: new Date(),
        alertId: 'alert-1',
        batchId: 'batch-1',
        successCount: 10,
        failureCount: 0,
        totalDuration: 500,
        completedAt: new Date(),
        metadata: { successRate: 1 },
      };

      await handler.handleBatchNotificationCompleted(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '处理批量通知完成事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '批量通知完成事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.successEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.BATCH_NOTIFICATION_COMPLETED]).toBe(1);
    });

    it('should log messages and update statistics for partially successful batch', async () => {
      const event: BatchNotificationCompletedEvent = {
        eventId: 'batch-comp-2',
        eventType: NotificationEventType.BATCH_NOTIFICATION_COMPLETED,
        timestamp: new Date(),
        alertId: 'alert-2',
        batchId: 'batch-2',
        successCount: 5,
        failureCount: 5,
        totalDuration: 500,
        completedAt: new Date(),
        metadata: { successRate: 0.5 },
      };

      await handler.handleBatchNotificationCompleted(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '处理批量通知完成事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '批量通知完成事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.successEvents).toBe(1); // successCount > 0
      expect(stats.eventsByType[NotificationEventType.BATCH_NOTIFICATION_COMPLETED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: BatchNotificationCompletedEvent = {
        eventId: 'batch-comp-3',
        eventType: NotificationEventType.BATCH_NOTIFICATION_COMPLETED,
        timestamp: new Date(),
        alertId: 'alert-3',
        batchId: 'batch-3',
        successCount: 10,
        failureCount: 0,
        totalDuration: 500,
        completedAt: new Date(),
        metadata: { successRate: 1 },
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleBatchNotificationCompleted(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理批量通知完成事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleBatchNotificationFailed', () => {
    it('should log error messages and update statistics', async () => {
      const event: BatchNotificationFailedEvent = {
        eventId: 'batch-fail-1',
        eventType: NotificationEventType.BATCH_NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'alert-1',
        batchId: 'batch-1',
        error: 'Batch processing failed',
        processedCount: 5,
        totalCount: 10,
        failedAt: new Date(),
        metadata: {},
      };

      await handler.handleBatchNotificationFailed(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理批量通知失败事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '批量通知失败事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.BATCH_NOTIFICATION_FAILED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: BatchNotificationFailedEvent = {
        eventId: 'batch-fail-2',
        eventType: NotificationEventType.BATCH_NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'alert-2',
        batchId: 'batch-2',
        error: 'Critical failure',
        processedCount: 0,
        totalCount: 10,
        failedAt: new Date(),
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleBatchNotificationFailed(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理批量通知失败事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationHistoryRecorded', () => {
    it('should log debug messages and update statistics', async () => {
      const event: NotificationHistoryRecordedEvent = {
        eventId: 'hist-rec-1',
        eventType: NotificationEventType.NOTIFICATION_HISTORY_RECORDED,
        timestamp: new Date(),
        alertId: 'alert-1',
        historyId: 'hist-1',
        notificationId: 'notif-1',
        status: NotificationStatus.SENT,
        recordedAt: new Date(),
        metadata: {},
      };

      await handler.handleNotificationHistoryRecorded(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知历史记录事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知历史记录事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_HISTORY_RECORDED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationHistoryRecordedEvent = {
        eventId: 'hist-rec-2',
        eventType: NotificationEventType.NOTIFICATION_HISTORY_RECORDED,
        timestamp: new Date(),
        alertId: 'alert-2',
        historyId: 'hist-2',
        notificationId: 'notif-2',
        status: NotificationStatus.FAILED,
        recordedAt: new Date(),
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationHistoryRecorded(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知历史记录事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationHistoryQueried', () => {
    it('should log debug messages and update statistics', async () => {
      const event: NotificationHistoryQueriedEvent = {
        eventId: 'hist-query-1',
        eventType: NotificationEventType.NOTIFICATION_HISTORY_QUERIED,
        timestamp: new Date(),
        alertId: 'alert-1',
        queryId: 'query-1',
        resultCount: 5,
        queryDuration: 100,
        queriedAt: new Date(),
        metadata: {},
      };

      await handler.handleNotificationHistoryQueried(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '处理通知历史查询事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知历史查询事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_HISTORY_QUERIED]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationHistoryQueriedEvent = {
        eventId: 'hist-query-2',
        eventType: NotificationEventType.NOTIFICATION_HISTORY_QUERIED,
        timestamp: new Date(),
        alertId: 'alert-2',
        queryId: 'query-2',
        resultCount: 0,
        queryDuration: 0,
        queriedAt: new Date(),
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationHistoryQueried(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知历史查询事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationSystemError', () => {
    it('should log error messages and update statistics', async () => {
      const event: NotificationSystemErrorEvent = {
        eventId: 'sys-err-1',
        eventType: NotificationEventType.NOTIFICATION_SYSTEM_ERROR,
        timestamp: new Date(),
        alertId: 'alert-1',
        component: 'sender',
        error: 'System down',
        context: {},
        metadata: {},
      };

      await handler.handleNotificationSystemError(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知系统错误事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知系统错误事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_SYSTEM_ERROR]).toBe(1);
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationSystemErrorEvent = {
        eventId: 'sys-err-2',
        eventType: NotificationEventType.NOTIFICATION_SYSTEM_ERROR,
        timestamp: new Date(),
        alertId: 'alert-2',
        component: 'db',
        error: 'DB connection lost',
        context: {},
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationSystemError(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知系统错误事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('handleNotificationChannelError', () => {
    it('should log error messages and update statistics', async () => {
      const event: NotificationChannelErrorEvent = {
        eventId: 'chan-err-1',
        eventType: NotificationEventType.NOTIFICATION_CHANNEL_ERROR,
        timestamp: new Date(),
        alertId: 'alert-1',
        channelType: NotificationChannelType.EMAIL,
        channelId: 'chan-1',
        error: 'Invalid credentials',
        isChannelDown: false,
        metadata: {},
      };

      await handler.handleNotificationChannelError(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知渠道错误事件',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '通知渠道错误事件处理完成',
        expect.any(Object),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_CHANNEL_ERROR]).toBe(1);
    });

    it('should log warn message if channel is down', async () => {
      const event: NotificationChannelErrorEvent = {
        eventId: 'chan-err-2',
        eventType: NotificationEventType.NOTIFICATION_CHANNEL_ERROR,
        timestamp: new Date(),
        alertId: 'alert-2',
        channelType: NotificationChannelType.SMS,
        channelId: 'chan-2',
        error: 'Channel unreachable',
        isChannelDown: true,
        metadata: {},
      };

      await handler.handleNotificationChannelError(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '通知渠道不可用，建议启用降级方案',
        expect.objectContaining({ channelType: event.channelType }),
      );
    });

    it('should log error if an error occurs', async () => {
      const event: NotificationChannelErrorEvent = {
        eventId: 'chan-err-3',
        eventType: NotificationEventType.NOTIFICATION_CHANNEL_ERROR,
        timestamp: new Date(),
        alertId: 'alert-3',
        channelType: NotificationChannelType.WEBHOOK,
        channelId: 'chan-3',
        error: 'Configuration error',
        isChannelDown: false,
        metadata: {},
      };

      jest.spyOn(handler as any, 'recordEventStatistics').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await handler.handleNotificationChannelError(event);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '处理通知渠道错误事件失败',
        expect.objectContaining({ error: 'Test error' }),
      );
      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.errorEvents).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return a copy of the current statistics', async () => {
      // Trigger some events to change statistics
      await handler.handleNotificationRequested({
        eventId: '1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'a',
        requestId: 'r',
        severity: NotificationPriority.LOW,
        title: 't',
        message: 'm',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      });
      await handler.handleNotificationSent({
        eventId: '2',
        eventType: NotificationEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        alertId: 'a',
        notificationId: 'n',
        channelId: 'c',
        channelType: NotificationChannelType.EMAIL,
        recipient: 'e',
        sentAt: new Date(),
        duration: 10,
        metadata: {},
      });

      const stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_REQUESTED]).toBe(1);
      expect(stats.eventsByType[NotificationEventType.NOTIFICATION_SENT]).toBe(1);
      expect(stats.successEvents).toBe(1);

      // Ensure it's a copy
      stats.totalEvents = 999;
      expect(handler.getStatistics().totalEvents).toBe(2);
    });
  });

  describe('resetStatistics', () => {
    it('should reset all statistics to initial values', async () => {
      // Trigger some events to change statistics
      await handler.handleNotificationRequested({
        eventId: '1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'a',
        requestId: 'r',
        severity: NotificationPriority.LOW,
        title: 't',
        message: 'm',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      });
      await handler.handleNotificationFailed({
        eventId: '2',
        eventType: NotificationEventType.NOTIFICATION_FAILED,
        timestamp: new Date(),
        alertId: 'a',
        notificationId: 'n',
        channelType: NotificationChannelType.EMAIL,
        error: 'e',
        failedAt: new Date(),
        retryCount: 0,
        willRetry: false,
        metadata: {},
      });

      let stats = handler.getStatistics();
      expect(stats.totalEvents).toBe(2);
      expect(stats.errorEvents).toBe(1);

      handler.resetStatistics();
      stats = handler.getStatistics();

      expect(stats.totalEvents).toBe(0);
      expect(stats.errorEvents).toBe(0);
      expect(stats.successEvents).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      Object.values(NotificationEventType).forEach((type) => {
        expect(stats.eventsByType[type]).toBe(0);
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status if error rate and processing time are within limits', async () => {
      // Simulate some successful events
      await handler.handleNotificationRequested({
        eventId: '1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'a',
        requestId: 'r',
        severity: NotificationPriority.LOW,
        title: 't',
        message: 'm',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      });
      await handler.handleNotificationSent({
        eventId: '2',
        eventType: NotificationEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        alertId: 'a',
        notificationId: 'n',
        channelId: 'c',
        channelType: NotificationChannelType.EMAIL,
        recipient: 'e',
        sentAt: new Date(),
        duration: 50,
        metadata: {},
      });

      const health = handler.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.errorRate).toBe('0.000');
      expect(health.details.healthCheck.currentAvgProcessingTime).toMatch(/\d+\.\dms/);
    });

    it('should return unhealthy status if error rate is too high', async () => {
      // Simulate many failed events
      for (let i = 0; i < 10; i++) {
        await handler.handleNotificationFailed({
          eventId: `fail-${i}`,
          eventType: NotificationEventType.NOTIFICATION_FAILED,
          timestamp: new Date(),
          alertId: 'a',
          notificationId: `n-${i}`,
          channelType: NotificationChannelType.EMAIL,
          error: 'e',
          failedAt: new Date(),
          retryCount: 0,
          willRetry: false,
          metadata: {},
        });
      }
      await handler.handleNotificationRequested({
        eventId: 'req-1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'a',
        requestId: 'r',
        severity: NotificationPriority.LOW,
        title: 't',
        message: 'm',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      });

      const health = handler.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(parseFloat(health.details.errorRate)).toBeGreaterThan(0.1);
    });

    it('should return unhealthy status if average processing time is too high', async () => {
      // Simulate events with long processing times
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0) // startTime for first event
        .mockReturnValueOnce(1500) // endTime for first event (1500ms)
        .mockReturnValueOnce(0) // startTime for second event
        .mockReturnValueOnce(1500); // endTime for second event (1500ms)

      await handler.handleNotificationRequested({
        eventId: '1',
        eventType: NotificationEventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        alertId: 'a',
        requestId: 'r',
        severity: NotificationPriority.LOW,
        title: 't',
        message: 'm',
        channelTypes: [NotificationChannelType.EMAIL],
        metadata: {},
      });
      await handler.handleNotificationSent({
        eventId: '2',
        eventType: NotificationEventType.NOTIFICATION_SENT,
        timestamp: new Date(),
        alertId: 'a',
        notificationId: 'n',
        channelId: 'c',
        channelType: NotificationChannelType.EMAIL,
        recipient: 'e',
        sentAt: new Date(),
        duration: 10,
        metadata: {},
      });

      const health = handler.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.details.healthCheck.currentAvgProcessingTime).toMatch(/1500\.0ms/);
    });

    it('should handle zero total events gracefully', () => {
      const health = handler.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.errorRate).toBe('0.000');
      expect(health.details.healthCheck.currentAvgProcessingTime).toBe('0.0ms');
    });
  });
});
