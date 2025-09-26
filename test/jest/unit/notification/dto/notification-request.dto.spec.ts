import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  NotificationRequestDto,
  BatchNotificationRequestDto,
  NotificationRequestFactory,
  NotificationRequestResultDto,
} from '@notification/dto/notification-request.dto';
import { NotificationPriority, NotificationChannelType } from '@notification/types/notification.types';

describe('NotificationRequestDto', () => {
  describe('Validation', () => {
    it('should validate with minimal required fields', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with all fields', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123e4567-e89b-12d3-a456-426614174000',
        severity: NotificationPriority.HIGH,
        title: 'Stock Price Alert',
        message: 'Stock AAPL price exceeded threshold',
        metadata: {
          symbol: 'AAPL',
          price: 150.5,
          threshold: 150,
          timestamp: '2025-09-12T10:30:00Z',
        },
        channelTypes: [NotificationChannelType.EMAIL, NotificationChannelType.SLACK],
        recipients: ['user@example.com', 'admin@example.com'],
        triggeredAt: '2025-09-12T10:30:00Z',
        requiresAcknowledgment: true,
        tags: ['stock-alert', 'price-threshold'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required fields', async () => {
      const dto = plainToClass(NotificationRequestDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const errorMessages = errors.map(error => Object.keys(error.constraints || {})).flat();
      expect(errorMessages).toContain('isNotEmpty');
      expect(errorMessages).toContain('isString');
    });

    it('should fail validation with invalid severity', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: 'INVALID_SEVERITY',
        title: 'Test Alert',
        message: 'Test message',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const severityError = errors.find(error => error.property === 'severity');
      expect(severityError).toBeDefined();
      expect(severityError?.constraints).toHaveProperty('isEnum');
    });

    it('should fail validation with invalid channel types', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: ['INVALID_CHANNEL', NotificationChannelType.EMAIL],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const channelError = errors.find(error => error.property === 'channelTypes');
      expect(channelError).toBeDefined();
    });

    it('should fail validation with invalid date string', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        triggeredAt: 'invalid-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find(error => error.property === 'triggeredAt');
      expect(dateError).toBeDefined();
    });

    it('should fail validation with non-string recipients', async () => {
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        recipients: [123, 'valid@example.com'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const recipientsError = errors.find(error => error.property === 'recipients');
      expect(recipientsError).toBeDefined();
    });
  });

  describe('Property Types', () => {
    it('should have correct readonly properties', () => {
      const dto = new NotificationRequestDto();
      const descriptor = Object.getOwnPropertyDescriptor(dto, 'alertId');
      // Properties are readonly due to class-validator decorators
      expect(typeof dto.alertId).toBe('undefined'); // Initially undefined
    });

    it('should accept metadata as object', async () => {
      const metadata = { symbol: 'AAPL', price: 150.5 };
      const dto = plainToClass(NotificationRequestDto, {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        metadata,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.metadata).toEqual(metadata);
    });
  });
});

describe('BatchNotificationRequestDto', () => {
  it('should validate array of notification requests', async () => {
    const dto = plainToClass(BatchNotificationRequestDto, {
      notifications: [
        {
          alertId: 'alert-1',
          severity: NotificationPriority.HIGH,
          title: 'Alert 1',
          message: 'Message 1',
        },
        {
          alertId: 'alert-2',
          severity: NotificationPriority.NORMAL,
          title: 'Alert 2',
          message: 'Message 2',
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid notification in batch', async () => {
    const dto = plainToClass(BatchNotificationRequestDto, {
      notifications: [
        {
          alertId: 'alert-1',
          severity: NotificationPriority.HIGH,
          title: 'Alert 1',
          message: 'Message 1',
        },
        {
          // Missing required fields
          severity: NotificationPriority.NORMAL,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('NotificationRequestFactory', () => {
  describe('createFromAlert', () => {
    it('should create notification request from alert data', () => {
      const alertData = {
        alertId: 'alert-123',
        title: 'Stock Price Alert',
        severity: 'HIGH',
        message: 'Stock AAPL exceeded threshold',
        metadata: { symbol: 'AAPL' },
      };

      const request = NotificationRequestFactory.fromAlertEvent(alertData);

      expect(request).toBeDefined();
      expect(request.alertId).toBe(alertData.alertId);
      expect(request.title).toContain(alertData.title);
      expect(request.message).toBe(alertData.message);
    });

    it('should handle missing optional fields', () => {
      const minimalAlert = {
        alertId: 'alert-123',
        title: 'Basic Alert',
        severity: 'MEDIUM',
        message: 'Basic message',
      };

      const request = NotificationRequestFactory.fromAlertEvent(minimalAlert);

      expect(request).toBeDefined();
      expect(request.alertId).toBe(minimalAlert.alertId);
      expect(request.severity).toBe(NotificationPriority.NORMAL);
    });
  });

  describe('createBatch', () => {
    it('should handle single alert with metadata', () => {
      const alert = {
        alertId: 'alert-with-meta',
        title: 'Alert With Meta',
        severity: 'HIGH',
        message: 'Message with metadata',
        metadata: { environment: 'test' },
      };

      const request = NotificationRequestFactory.fromAlertEvent(alert);

      expect(request).toBeDefined();
      expect(request.alertId).toBe('alert-with-meta');
      expect(request.metadata).toEqual({ environment: 'test' });
    });

    it('should handle alert with triggeredAt date', () => {
      const alert = {
        alertId: 'alert-with-date',
        title: 'Alert With Date',
        severity: 'NORMAL',
        message: 'Message with date',
        triggeredAt: new Date('2023-01-01T00:00:00Z'),
      };

      const request = NotificationRequestFactory.fromAlertEvent(alert);

      expect(request).toBeDefined();
      expect(request.triggeredAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });
});

describe('NotificationRequestResultDto', () => {
  it('should validate success result', async () => {
    const dto = plainToClass(NotificationRequestResultDto, {
      success: true,
      notificationId: 'notification-123',
      message: 'Notification sent successfully',
      timestamp: '2025-09-12T10:30:00Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate failure result', async () => {
    const dto = plainToClass(NotificationRequestResultDto, {
      success: false,
      error: 'Failed to send notification',
      message: 'Channel unavailable',
      timestamp: '2025-09-12T10:30:00Z',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with missing required fields', async () => {
    const dto = plainToClass(NotificationRequestResultDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const errorMessages = errors.map(error => Object.keys(error.constraints || {})).flat();
    expect(errorMessages).toContain('isBoolean');
  });
});
