import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '@notification/controllers/notification.controller';
import { NotificationService } from '@notification/services/notification.service';
import { NotificationHistoryService } from '@notification/services/notification-history.service';
import { NotificationQueryDto } from '@notification/dto/notification-query.dto';
import {
  NotificationChannelType,
} from '@notification/types/notification.types';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: jest.Mocked<NotificationService>;
  let historyService: jest.Mocked<NotificationHistoryService>;

  beforeEach(async () => {
    const mockNotificationService = {
      testNotificationChannel: jest.fn(),
    };

    const mockHistoryService = {
      queryNotificationHistory: jest.fn(),
      getNotificationStats: jest.fn(),
      getAlertNotificationHistory: jest.fn(),
      getChannelNotificationHistory: jest.fn(),
      getFailedNotifications: jest.fn(),
      retryFailedNotification: jest.fn(),
      retryFailedNotifications: jest.fn(),
      cleanupExpiredLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: NotificationHistoryService, useValue: mockHistoryService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    notificationService = module.get(NotificationService);
    historyService = module.get(NotificationHistoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotificationHistory', () => {
    it('should get notification history with pagination', async () => {
      const query: NotificationQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockHistory = { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
      historyService.queryNotificationHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getNotificationHistory(query);

      expect(result).toEqual(mockHistory);
      expect(historyService.queryNotificationHistory).toHaveBeenCalledWith(query);
    });

    it('should handle service errors', async () => {
      const query: NotificationQueryDto = { page: 1, limit: 10 };
      historyService.queryNotificationHistory.mockRejectedValue(new Error('Database error'));

      await expect(controller.getNotificationHistory(query)).rejects.toThrow('Database error');
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';
      const mockStats = { period: 'day', totalNotifications: 100 };

      historyService.getNotificationStats.mockResolvedValue(mockStats as any);

      const result = await controller.getNotificationStats(startTime, endTime);

      expect(result).toEqual(mockStats);
      expect(historyService.getNotificationStats).toHaveBeenCalledWith(
        new Date(startTime),
        new Date(endTime),
        'day'
      );
    });

    it('should use custom period', async () => {
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-31T23:59:59Z';
      const period = 'hour';

      await controller.getNotificationStats(startTime, endTime, period);

      expect(historyService.getNotificationStats).toHaveBeenCalledWith(
        new Date(startTime),
        new Date(endTime),
        period
      );
    });
  });

  describe('getAlertNotificationHistory', () => {
    it('should return notifications for alert', async () => {
      const alertId = 'alert-123';
      const mockNotifications = [{ id: 'notif-1', alertId }];

      historyService.getAlertNotificationHistory.mockResolvedValue(mockNotifications as any);

      const result = await controller.getAlertNotificationHistory(alertId);

      expect(result).toEqual(mockNotifications);
      expect(historyService.getAlertNotificationHistory).toHaveBeenCalledWith(alertId);
    });
  });

  describe('getChannelNotificationHistory', () => {
    it('should return notifications for channel', async () => {
      const channelId = 'channel-123';
      const mockNotifications = [{ id: 'notif-1', channelId }];

      historyService.getChannelNotificationHistory.mockResolvedValue(mockNotifications as any);

      const result = await controller.getChannelNotificationHistory(channelId);

      expect(result).toEqual(mockNotifications);
      expect(historyService.getChannelNotificationHistory).toHaveBeenCalledWith(channelId);
    });
  });

  describe('getFailedNotifications', () => {
    it('should return failed notifications with default hours', async () => {
      const mockFailedNotifications = [{ id: 'notif-1', status: 'failed' }];

      historyService.getFailedNotifications.mockResolvedValue(mockFailedNotifications as any);

      const result = await controller.getFailedNotifications();

      expect(result).toEqual(mockFailedNotifications);
      expect(historyService.getFailedNotifications).toHaveBeenCalledWith(24);
    });

    it('should use custom hours', async () => {
      const hours = '48';

      await controller.getFailedNotifications(hours);

      expect(historyService.getFailedNotifications).toHaveBeenCalledWith(48);
    });
  });

  describe('testNotificationChannel', () => {
    it('should test channel successfully', async () => {
      const testBody = {
        channelType: 'EMAIL',
        config: { host: 'smtp.example.com' },
        message: 'Test message',
      };

      notificationService.testNotificationChannel.mockResolvedValue(true);

      const result = await controller.testNotificationChannel(testBody);

      expect(result).toEqual({ success: true });
      expect(notificationService.testNotificationChannel).toHaveBeenCalledWith(
        'EMAIL',
        testBody.config,
        testBody.message
      );
    });

    it('should handle test failure', async () => {
      const testBody = { channelType: 'SLACK', config: {} };

      notificationService.testNotificationChannel.mockResolvedValue(false);

      const result = await controller.testNotificationChannel(testBody);

      expect(result).toEqual({ success: false });
    });
  });

  describe('retryNotification', () => {
    it('should retry failed notification', async () => {
      const notificationId = 'notif-123';

      historyService.retryFailedNotification.mockResolvedValue(true);

      const result = await controller.retryNotification(notificationId);

      expect(result).toEqual({ success: true });
      expect(historyService.retryFailedNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should handle retry failure', async () => {
      const notificationId = 'notif-123';

      historyService.retryFailedNotification.mockResolvedValue(false);

      const result = await controller.retryNotification(notificationId);

      expect(result).toEqual({ success: false });
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications in batch', async () => {
      const retryBody = {
        alertId: 'alert-123',
        channelType: 'EMAIL',
        maxRetries: 3,
      };

      const mockResult = { total: 5, retried: 4, failed: 1 };
      historyService.retryFailedNotifications.mockResolvedValue(mockResult);

      const result = await controller.retryFailedNotifications(retryBody);

      expect(result).toEqual(mockResult);
      expect(historyService.retryFailedNotifications).toHaveBeenCalledWith(
        'alert-123',
        'EMAIL',
        3
      );
    });

    it('should handle empty retry body', async () => {
      const retryBody = {};
      const mockResult = { total: 0, retried: 0, failed: 0 };

      historyService.retryFailedNotifications.mockResolvedValue(mockResult);

      const result = await controller.retryFailedNotifications(retryBody);

      expect(result).toEqual(mockResult);
    });
  });

  describe('cleanupExpiredLogs', () => {
    it('should cleanup expired logs', async () => {
      const cleanupBody = { retentionDays: 30 };

      historyService.cleanupExpiredLogs.mockResolvedValue(150);

      const result = await controller.cleanupExpiredLogs(cleanupBody);

      expect(result).toEqual({ deletedCount: 150 });
      expect(historyService.cleanupExpiredLogs).toHaveBeenCalledWith(30);
    });

    it('should handle empty cleanup body', async () => {
      const cleanupBody = {};

      historyService.cleanupExpiredLogs.mockResolvedValue(0);

      const result = await controller.cleanupExpiredLogs(cleanupBody);

      expect(result).toEqual({ deletedCount: 0 });
      expect(historyService.cleanupExpiredLogs).toHaveBeenCalledWith(undefined);
    });
  });


  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const testBody = { channelType: 'EMAIL', config: {} };

      notificationService.testNotificationChannel.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(controller.testNotificationChannel(testBody)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });
});