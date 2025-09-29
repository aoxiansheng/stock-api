import { Test, TestingModule } from '@nestjs/testing';
import { LogSender } from '@notification/services/senders/log.sender';
import { NotificationChannelType, NotificationPriority, NotificationStatus } from '@notification/types/notification.types';

// Mock logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('LogSender', () => {
  let sender: LogSender;

  const mockNotification = {
    id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'log-channel-1',
    title: 'Test Alert',
    content: 'This is a test alert message',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipient: 'log-system',
    channelType: NotificationChannelType.LOG,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
      environment: 'development',
    },
  };

  const mockChannelConfig = {
    logLevel: 'info',
    format: 'json',
    includeSensitiveData: true,
    maxContentLength: 500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSender],
    }).compile();

    sender = module.get<LogSender>(LogSender);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send log notification successfully with HIGH priority', async () => {
      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: true,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.LOG,
        message: '通知已记录到warn日志',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        deliveryId: expect.stringMatching(/^log_\d+$/),
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[通知] Test Alert'),
        expect.objectContaining({
          notificationId: mockNotification.id,
          alertId: mockNotification.alertId,
          channelId: mockNotification.channelId,
          priority: mockNotification.priority,
          status: mockNotification.status,
          recipient: mockNotification.recipient,
          metadata: mockNotification.metadata,
        }),
      );
    });

    it('should send log notification with CRITICAL priority using error level', async () => {
      const criticalNotification = {
        ...mockNotification,
        priority: NotificationPriority.CRITICAL,
      };

      const result = await sender.send(criticalNotification, mockChannelConfig);

      expect(result.message).toBe('通知已记录到error日志');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should send log notification with NORMAL priority using info level', async () => {
      const normalNotification = {
        ...mockNotification,
        priority: NotificationPriority.NORMAL,
      };

      const result = await sender.send(normalNotification, mockChannelConfig);

      expect(result.message).toBe('通知已记录到info日志');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should send log notification with LOW priority using debug level', async () => {
      const lowNotification = {
        ...mockNotification,
        priority: NotificationPriority.LOW,
      };

      const result = await sender.send(lowNotification, mockChannelConfig);

      expect(result.message).toBe('通知已记录到debug日志');
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should include sensitive data when configured', async () => {
      await sender.send(mockNotification, mockChannelConfig);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('扩展数据'),
        expect.any(Object),
      );
    });

    it('should not include sensitive data when not configured', async () => {
      const configWithoutSensitive = {
        ...mockChannelConfig,
        includeSensitiveData: false,
      };

      await sender.send(mockNotification, configWithoutSensitive);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.not.stringContaining('扩展数据'),
        expect.any(Object),
      );
    });

    it('should truncate content when exceeding maxContentLength', async () => {
      const configWithShortLength = {
        ...mockChannelConfig,
        maxContentLength: 50,
      };

      await sender.send(mockNotification, configWithShortLength);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\.\.\.$/),
        expect.any(Object),
      );
    });

    it('should handle logging error', async () => {
      // Mock logger to throw an error
      mockLogger.warn.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.LOG,
        error: 'Logger error',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        '日志记录失败',
        expect.objectContaining({
          notificationId: mockNotification.id,
          error: 'Logger error',
        }),
      );
    });

    it('should build correct log content format', async () => {
      await sender.send(mockNotification, mockChannelConfig);

      const logCall = mockLogger.warn.mock.calls[0];
      const logContent = logCall[0];

      expect(logContent).toContain('[通知] Test Alert');
      expect(logContent).toContain('内容: This is a test alert message');
      expect(logContent).toContain('通知ID: notification-1');
      expect(logContent).toContain('警告ID: alert-1');
      expect(logContent).toContain('优先级: HIGH');
      expect(logContent).toContain('状态: PENDING');
      expect(logContent).toContain('接收者: log-system');
      expect(logContent).toContain('创建时间: 2023-01-15T10:00:00.000Z');
    });
  });

  describe('test', () => {
    it('should test log configuration successfully', async () => {
      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '日志通知配置测试',
        expect.objectContaining({
          config: mockChannelConfig,
          testTime: expect.any(String),
        }),
      );
    });

    it('should return false when test throws error', async () => {
      // Mock logger to throw an error
      mockLogger.log.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('日志配置测试失败'),
      );
    });
  });

  describe('validateConfig', () => {
    it('should validate log configuration successfully', () => {
      const result = sender.validateConfig(mockChannelConfig);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should validate empty configuration successfully', () => {
      const result = sender.validateConfig({});

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return validation errors for invalid log level', () => {
      const invalidConfig = {
        logLevel: 'invalid-level',
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        '日志级别必须是以下之一: error, warn, info, debug',
      ]);
    });

    it('should return validation errors for invalid format', () => {
      const invalidConfig = {
        format: 'xml',
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        "日志格式必须是 'json' 或 'text'",
      ]);
    });

    it('should return validation errors for invalid includeSensitiveData type', () => {
      const invalidConfig = {
        includeSensitiveData: 'yes',
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        'includeSensitiveData 必须是布尔值',
      ]);
    });

    it('should return multiple validation errors', () => {
      const invalidConfig = {
        logLevel: 'invalid',
        format: 'xml',
        includeSensitiveData: 'yes',
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          '日志级别必须是以下之一: error, warn, info, debug',
          "日志格式必须是 'json' 或 'text'",
          'includeSensitiveData 必须是布尔值',
        ]),
      );
    });

    it('should validate valid log levels', () => {
      const validLevels = ['error', 'warn', 'info', 'debug'];

      validLevels.forEach((level) => {
        const config = { logLevel: level };
        const result = sender.validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate valid formats', () => {
      const validFormats = ['json', 'text'];

      validFormats.forEach((format) => {
        const config = { format };
        const result = sender.validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getConfigSchema', () => {
    it('should return valid config schema', () => {
      const schema = sender.getConfigSchema();

      expect(schema).toEqual({
        type: 'object',
        properties: {
          logLevel: {
            type: 'string',
            enum: ['error', 'warn', 'info', 'debug'],
            description: '日志级别（可选，默认根据优先级自动选择）',
          },
          format: {
            type: 'string',
            enum: ['json', 'text'],
            default: 'json',
            description: '日志格式',
          },
          includeSensitiveData: {
            type: 'boolean',
            default: false,
            description: '是否包含敏感数据',
          },
          maxContentLength: {
            type: 'number',
            default: 1000,
            minimum: 100,
            maximum: 10000,
            description: '日志内容最大长度',
          },
        },
      });
    });
  });

  describe('getLogLevel', () => {
    it('should map priorities to correct log levels', () => {
      // Test through the send method since getLogLevel is private
      const testCases = [
        { priority: NotificationPriority.CRITICAL, expectedLevel: 'error' },
        { priority: NotificationPriority.URGENT, expectedLevel: 'error' },
        { priority: NotificationPriority.HIGH, expectedLevel: 'warn' },
        { priority: NotificationPriority.NORMAL, expectedLevel: 'info' },
        { priority: NotificationPriority.LOW, expectedLevel: 'debug' },
      ];

      testCases.forEach(async ({ priority, expectedLevel }) => {
        const testNotification = { ...mockNotification, priority };
        await sender.send(testNotification, mockChannelConfig);

        expect(mockLogger[expectedLevel]).toHaveBeenCalled();
      });
    });
  });

  it('should have correct type property', () => {
    expect(sender.type).toBe(NotificationChannelType.LOG);
  });
});