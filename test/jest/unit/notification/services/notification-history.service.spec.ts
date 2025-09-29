import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationHistoryService } from '@notification/services/notification-history.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import {
  NotificationLog,
  NotificationLogDocument,
} from '@notification/schemas/notification-log.schema';
import {
  NotificationInstance,
  NotificationDocument,
} from '@notification/schemas/notification.schema';
import {
  NotificationQueryDto,
} from '@notification/dto/notification-query.dto';
import {
  NotificationChannelType,
  NotificationPriority,
  NotificationStatus,
} from '@notification/types/notification.types';

// Mock logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('NotificationHistoryService', () => {
  let service: NotificationHistoryService;
  let notificationLogModel: any;
  let notificationModel: any;
  let paginationService: jest.Mocked<PaginationService>;

  const mockNotificationLog = {
    _id: 'log-id-1',
    notificationId: 'notification-1',
    alertId: 'alert-1',
    channelId: 'channel-1',
    channelType: NotificationChannelType.EMAIL,
    status: NotificationStatus.SENT,
    sentAt: new Date('2023-01-15T10:00:00Z'),
    deliveryId: 'delivery-123',
    errorMessage: null,
    metadata: {
      retryCount: 0,
      duration: 150,
    },
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
  };

  const mockNotification = {
    id: 'notification-1',
    _id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'channel-1',
    title: 'Test Alert',
    content: 'This is a test alert message',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.SENT,
    recipient: 'test@example.com',
    channelType: NotificationChannelType.EMAIL,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
    },
  };

  beforeEach(async () => {
    const mockModelMethods = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      select: jest.fn(),
      exec: jest.fn(),
      save: jest.fn(),
    };

    // Mock chainable methods
    Object.keys(mockModelMethods).forEach((method) => {
      if (['sort', 'skip', 'limit', 'select'].includes(method)) {
        mockModelMethods[method].mockReturnThis();
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationHistoryService,
        {
          provide: getModelToken(NotificationLog.name),
          useValue: {
            ...mockModelMethods,
            constructor: jest.fn().mockImplementation((dto) => ({
              ...dto,
              save: jest.fn().mockResolvedValue({ ...mockNotificationLog, ...dto }),
            })),
          },
        },
        {
          provide: getModelToken('Notification'),
          useValue: {
            ...mockModelMethods,
            constructor: jest.fn().mockImplementation((dto) => ({
              ...dto,
              save: jest.fn().mockResolvedValue({ ...mockNotification, ...dto }),
            })),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            normalizePaginationQuery: jest.fn(),
            calculateSkip: jest.fn(),
            createPaginatedResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationHistoryService>(NotificationHistoryService);
    notificationLogModel = module.get(getModelToken(NotificationLog.name));
    notificationModel = module.get(getModelToken('Notification'));
    paginationService = module.get(PaginationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logNotificationResult', () => {
    it('should log notification result successfully', async () => {
      const notificationResult = {
        success: true,
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'Email sent successfully',
        sentAt: new Date(),
        deliveryId: 'delivery-123',
        duration: 150,
      };

      const notification = { ...mockNotification };

      const mockLogInstance = {
        save: jest.fn().mockResolvedValue(mockNotificationLog),
      };

      (notificationLogModel.constructor as jest.Mock).mockReturnValue(mockLogInstance);

      const result = await service.logNotificationResult(notification, notificationResult);

      expect(notificationLogModel.constructor).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: notification._id,
          alertId: notification.alertId,
          channelId: notificationResult.channelId,
          channelType: notificationResult.channelType,
          status: NotificationStatus.SENT,
          sentAt: notificationResult.sentAt,
          deliveryId: notificationResult.deliveryId,
        })
      );
      expect(mockLogInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockNotificationLog);
    });

    it('should log failed notification result', async () => {
      const notificationResult = {
        success: false,
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'SMTP connection failed',
        sentAt: new Date(),
        error: 'Connection timeout',
        duration: 0,
      };

      const notification = { ...mockNotification };

      const mockLogInstance = {
        save: jest.fn().mockResolvedValue({
          ...mockNotificationLog,
          status: NotificationStatus.FAILED,
          errorMessage: 'Connection timeout',
        }),
      };

      (notificationLogModel.constructor as jest.Mock).mockReturnValue(mockLogInstance);

      await service.logNotificationResult(notification, notificationResult);

      expect(notificationLogModel.constructor).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.FAILED,
          errorMessage: 'Connection timeout',
        })
      );
    });
  });

  describe('queryNotificationHistory', () => {
    beforeEach(() => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.calculateSkip.mockReturnValue(0);
      paginationService.createPaginatedResponse.mockReturnValue({
        items: [mockNotificationLog],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should query notification history with default parameters', async () => {
      const queryDto: NotificationQueryDto = {};

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.skip.mockReturnThis();
      notificationLogModel.limit.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue([mockNotificationLog]);
      notificationLogModel.countDocuments.mockResolvedValue(1);

      const result = await service.queryNotificationHistory(queryDto);

      expect(notificationLogModel.find).toHaveBeenCalledWith({});
      expect(notificationLogModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      expect(result.items).toEqual([mockNotificationLog]);
    });

    it('should apply search filters', async () => {
      const queryDto: NotificationQueryDto = {
        alertId: 'alert-1',
        channelType: NotificationChannelType.EMAIL,
        status: NotificationStatus.SENT,
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-31T23:59:59Z',
      };

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.skip.mockReturnThis();
      notificationLogModel.limit.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue([mockNotificationLog]);
      notificationLogModel.countDocuments.mockResolvedValue(1);

      await service.queryNotificationHistory(queryDto);

      expect(notificationLogModel.find).toHaveBeenCalledWith({
        alertId: 'alert-1',
        channelType: NotificationChannelType.EMAIL,
        status: NotificationStatus.SENT,
        createdAt: {
          $gte: new Date('2023-01-01T00:00:00Z'),
          $lte: new Date('2023-01-31T23:59:59Z'),
        },
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-31T23:59:59Z');
      const period = 'day';

      const mockStats = [
        {
          _id: { period: '2023-01-15', status: NotificationStatus.SENT },
          count: 10,
        },
        {
          _id: { period: '2023-01-15', status: NotificationStatus.FAILED },
          count: 2,
        },
      ];

      notificationLogModel.aggregate.mockResolvedValue(mockStats);

      const result = await service.getNotificationStats(startTime, endTime, period);

      expect(result.period).toBe(period);
      expect(result.totalNotifications).toBe(12);
      expect(result.successfulNotifications).toBe(10);
      expect(result.failedNotifications).toBe(2);
      expect(result.byStatus).toBeDefined();
    });
  });

  describe('getAlertNotificationHistory', () => {
    it('should return notifications for specific alert', async () => {
      const alertId = 'alert-123';
      const mockNotifications = [mockNotificationLog];

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue(mockNotifications);

      const result = await service.getAlertNotificationHistory(alertId);

      expect(notificationLogModel.find).toHaveBeenCalledWith({ alertId });
      expect(notificationLogModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getChannelNotificationHistory', () => {
    it('should return notifications for specific channel', async () => {
      const channelId = 'channel-123';
      const mockNotifications = [mockNotificationLog];

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue(mockNotifications);

      const result = await service.getChannelNotificationHistory(channelId);

      expect(notificationLogModel.find).toHaveBeenCalledWith({ channelId });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getFailedNotifications', () => {
    it('should return failed notifications from last 24 hours by default', async () => {
      const mockFailedNotifications = [
        { ...mockNotificationLog, status: NotificationStatus.FAILED },
      ];

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue(mockFailedNotifications);

      const result = await service.getFailedNotifications();

      expect(notificationLogModel.find).toHaveBeenCalledWith({
        status: NotificationStatus.FAILED,
        createdAt: { $gte: expect.any(Date) },
      });
      expect(result).toEqual(mockFailedNotifications);
    });

    it('should return failed notifications from custom time period', async () => {
      const hours = 48;
      const mockFailedNotifications = [
        { ...mockNotificationLog, status: NotificationStatus.FAILED },
      ];

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue(mockFailedNotifications);

      await service.getFailedNotifications(hours);

      const expectedDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      expect(notificationLogModel.find).toHaveBeenCalledWith({
        status: NotificationStatus.FAILED,
        createdAt: { $gte: expect.any(Date) },
      });
    });
  });

  describe('cleanupExpiredLogs', () => {
    it('should cleanup logs older than retention days', async () => {
      const retentionDays = 30;
      notificationLogModel.deleteMany.mockResolvedValue({ deletedCount: 150 } as any);

      const result = await service.cleanupExpiredLogs(retentionDays);

      const expectedDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      expect(notificationLogModel.deleteMany).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) },
      });
      expect(result).toBe(150);
    });

    it('should use default retention period when not specified', async () => {
      notificationLogModel.deleteMany.mockResolvedValue({ deletedCount: 50 } as any);

      const result = await service.cleanupExpiredLogs();

      expect(notificationLogModel.deleteMany).toHaveBeenCalled();
      expect(result).toBe(50);
    });
  });

  describe('retryFailedNotification', () => {
    it('should retry failed notification successfully', async () => {
      const notificationId = 'notification-123';
      const mockFailedNotification = {
        ...mockNotification,
        status: NotificationStatus.FAILED,
        retryCount: 1,
      };

      notificationModel.findById.mockResolvedValue(mockFailedNotification);
      notificationModel.findByIdAndUpdate.mockResolvedValue({
        ...mockFailedNotification,
        status: NotificationStatus.PENDING,
        retryCount: 2,
      });

      const result = await service.retryFailedNotification(notificationId);

      expect(notificationModel.findById).toHaveBeenCalledWith(notificationId);
      expect(notificationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        notificationId,
        {
          status: NotificationStatus.PENDING,
          retryCount: 2,
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      notificationModel.findById.mockResolvedValue(null);

      const result = await service.retryFailedNotification('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if notification is not failed', async () => {
      const mockSentNotification = {
        ...mockNotification,
        status: NotificationStatus.SENT,
      };

      notificationModel.findById.mockResolvedValue(mockSentNotification);

      const result = await service.retryFailedNotification('notification-123');

      expect(result).toBe(false);
      expect(notificationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications in batch', async () => {
      const alertId = 'alert-123';
      const channelType = NotificationChannelType.EMAIL;
      const maxRetries = 3;

      const mockFailedNotifications = [
        { ...mockNotification, _id: 'notif-1', status: NotificationStatus.FAILED, retryCount: 1 },
        { ...mockNotification, _id: 'notif-2', status: NotificationStatus.FAILED, retryCount: 2 },
      ];

      notificationModel.find.mockReturnThis();
      notificationModel.exec.mockResolvedValue(mockFailedNotifications);

      // Mock successful retry for first notification
      notificationModel.findByIdAndUpdate
        .mockResolvedValueOnce({ ...mockFailedNotifications[0], status: NotificationStatus.PENDING })
        .mockResolvedValueOnce({ ...mockFailedNotifications[1], status: NotificationStatus.PENDING });

      const result = await service.retryFailedNotifications(alertId, channelType, maxRetries);

      expect(notificationModel.find).toHaveBeenCalledWith({
        alertId,
        channelType,
        status: NotificationStatus.FAILED,
        retryCount: { $lt: maxRetries },
      });
      expect(result.total).toBe(2);
      expect(result.retried).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('createNotificationHistory', () => {
    it('should create notification history entry', async () => {
      const notificationData = {
        notificationId: 'notification-1',
        alertId: 'alert-1',
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        status: NotificationStatus.SENT,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        title: 'Test Alert',
        content: 'Test message',
        sentAt: '2023-01-15T10:00:00Z',
        retryCount: 0,
      };

      notificationLogModel.create = jest.fn().mockResolvedValue({
        id: 'log-1',
        ...notificationData,
      });

      const result = await service.createNotificationHistory(notificationData);

      expect(notificationLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: notificationData.notificationId,
          alertId: notificationData.alertId,
          channelId: notificationData.channelId,
          channelType: notificationData.channelType,
        })
      );
      expect(result.id).toBe('log-1');
      expect(result.notificationId).toBe(notificationData.notificationId);
    });
  });

  describe('updateNotificationHistory', () => {
    it('should update notification history', async () => {
      const historyId = 'history-123';
      const updateData = {
        id: historyId,
        notificationId: 'notification-1',
        alertId: 'alert-1',
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        status: NotificationStatus.SENT,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        title: 'Test Alert',
        content: 'Test message',
        sentAt: new Date('2023-01-15T10:00:00Z'),
        retryCount: 0,
        createdAt: new Date('2023-01-15T10:00:00Z'),
        updatedAt: new Date('2023-01-15T10:00:00Z'),
      };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue({
          id: historyId,
          success: true,
          message: '发送成功',
          ...mockNotificationLog,
        }),
      };

      notificationLogModel.findByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateNotificationHistory(historyId, updateData);

      expect(notificationLogModel.findByIdAndUpdate).toHaveBeenCalledWith(
        historyId,
        expect.objectContaining({
          success: true,
          updatedAt: expect.any(Date),
        }),
        { new: true }
      );
      expect(result.id).toBe(historyId);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      notificationLogModel.countDocuments.mockResolvedValue(1000);
      notificationModel.countDocuments.mockResolvedValue(800);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.serviceName).toBe('NotificationHistoryService');
      expect(health.details.totalLogs).toBe(1000);
      expect(health.details.totalNotifications).toBe(800);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      notificationLogModel.find.mockImplementation(() => {
        throw new Error('Database connection error');
      });

      await expect(service.queryNotificationHistory({})).rejects.toThrow('Database connection error');
    });

    it('should handle invalid date ranges', async () => {
      const invalidQuery: NotificationQueryDto = {
        startTime: '2023-12-31T00:00:00Z',
        endTime: '2023-01-01T00:00:00Z', // End before start
      };

      notificationLogModel.find.mockReturnThis();
      notificationLogModel.sort.mockReturnThis();
      notificationLogModel.skip.mockReturnThis();
      notificationLogModel.limit.mockReturnThis();
      notificationLogModel.exec.mockResolvedValue([]);
      notificationLogModel.countDocuments.mockResolvedValue(0);

      // Should not throw, but return empty results
      const result = await service.queryNotificationHistory(invalidQuery);
      expect(result.items).toEqual([]);
    });
  });
});
