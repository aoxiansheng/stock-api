/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { LogSender } from '../../../../../../src/alert/services/notification-senders/log.sender';
import { NotificationChannelType, AlertSeverity, AlertStatus } from '../../../../../../src/alert/types/alert.types';

// Mock the createLogger function
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@app/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('LogSender', () => {
  let sender: LogSender;

  const mockAlert = {
    id: 'alert123',
    ruleId: 'rule123',
    severity: AlertSeverity.CRITICAL,
    metric: 'CPU Usage',
    value: 95,
    threshold: 90,
    status: AlertStatus.FIRING,
    startTime: new Date('2023-01-_01T10:_00:00Z'),
    endTime: null,
    message: 'CPU usage is too high',
    ruleName: 'Test Rule',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRule = {
    id: 'rule123',
    name: 'High CPU Alert',
    description: 'Alert when CPU usage exceeds 90%',
    metric: 'cpu_usage',
    operator: 'gt' as const,
    threshold: 90,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSender],
    }).compile();

    sender = module.get<LogSender>(LogSender);
    // Clear mock calls before each test
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have the correct type', () => {
    expect(sender.type).toEqual(NotificationChannelType.LOG);
  });

  describe('send', () => {
    it('should log with default level (log) if config.level is not specified', async () => {
      const config = { id: 'log-channel-1' };
      const result = await sender.send(mockAlert, mockRule, config);

      expect(result.success).toBe(true);
      expect(result.channelType).toEqual(NotificationChannelType.LOG);
      expect(result.message).toEqual('日志记录成功');
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: mockAlert.id,
          ruleId: mockRule.id,
        }),
        `[ALERT] ${mockRule.name}: ${mockAlert.message}`,
      );
    });

    it('should log with error level', async () => {
      const config = { id: 'log-channel-1', level: 'error' };
      await sender.send(mockAlert, mockRule, config);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should log with warn level', async () => {
      const config = { id: 'log-channel-1', level: 'warn' };
      await sender.send(mockAlert, mockRule, config);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should log with debug level', async () => {
      const config = { id: 'log-channel-1', level: 'debug' };
      await sender.send(mockAlert, mockRule, config);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should return success: false if an error occurs during logging', async () => {
      mockLogger.log.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      const config = { id: 'log-channel-1' };
      const result = await sender.send(mockAlert, mockRule, config);

      expect(result.success).toBe(false);
      expect(result.error).toEqual('Logging failed');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('test', () => {
    it('should return true if config.level is a valid log level', async () => {
      expect(await sender.test({ level: 'info' })).toBe(true);
      expect(await sender.test({ level: 'error' })).toBe(true);
      expect(await sender.test({ level: 'warn' })).toBe(true);
      expect(await sender.test({ level: 'debug' })).toBe(true);
      expect(await sender.test({ level: 'log' })).toBe(true);
    });

    it('should return false if config.level is an invalid log level', async () => {
      expect(await sender.test({ level: 'invalid' })).toBe(false);
      expect(await sender.test({})).toBe(false);
      expect(await sender.test({ level: 123 })).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid: true for a valid configuration', () => {
      const config = { level: 'info', id: 'my-log-channel' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid: false if level is missing', () => {
      const config = {};
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Log level is required');
    });

    it('should return valid: false if level is not a string', () => {
      const config = { level: 123 };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Log level must be a string');
    });

    it('should return valid: false if level is not a valid log level', () => {
      const config = { level: 'unknown' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Log level must be one of: error, warn, info, debug, log');
    });

    it('should return valid: false if id is present but not a string', () => {
      const config = { level: 'info', id: 123 };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Channel ID must be a string');
    });
  });
});