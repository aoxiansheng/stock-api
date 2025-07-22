import { Test, TestingModule } from '@nestjs/testing';
import { LogSender } from '../../../../../../src/alert/services/notification-senders/log.sender';
import { Alert, AlertRule, NotificationChannelType } from '../../../../../../src/alert/types/alert.types';

// Mock the logger factory to control logger instances
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('LogSender', () => {
  let sender: LogSender;

  const mockRule: AlertRule = {
    id: 'rule-1',
    name: 'High CPU Rule',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 90,
    duration: 60,
    severity: 'critical',
    enabled: true,
    channels: [],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlert: Alert = {
    id: 'alert-1',
    ruleId: mockRule.id,
    ruleName: mockRule.name,
    message: 'CPU usage is high',
    metric: 'cpu_usage',
    value: 95,
    threshold: 90,
    severity: 'critical',
    status: 'firing',
    startTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSender],
    }).compile();

    sender = module.get<LogSender>(LogSender);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
    expect(sender.type).toBe(NotificationChannelType.LOG);
  });

  describe('send', () => {
    it('should call logger.log for default/info level', async () => {
      const result = await sender.send(mockAlert, mockRule, { level: 'info' });
      expect(mockLogger.log).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should call logger.error for error level', async () => {
      await sender.send(mockAlert, mockRule, { level: 'error' });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should call logger.warn for warn level', async () => {
      await sender.send(mockAlert, mockRule, { level: 'warn' });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should call logger.debug for debug level', async () => {
      await sender.send(mockAlert, mockRule, { level: 'debug' });
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle exceptions and return a failed result', async () => {
      const error = new Error('Logging system failed');
      mockLogger.log.mockImplementation(() => {
        throw error;
      });
      const result = await sender.send(mockAlert, mockRule, { level: 'info' });
      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });
  });

  describe('test', () => {
    it('should return true for valid levels', async () => {
      await expect(sender.test({ level: 'error' })).resolves.toBe(true);
      await expect(sender.test({ level: 'info' })).resolves.toBe(true);
    });

    it('should return false for invalid levels', async () => {
      await expect(sender.test({ level: 'invalid' })).resolves.toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid for a correct config', () => {
      const result = sender.validateConfig({ level: 'warn' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid if level is missing', () => {
      const result = sender.validateConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Log level is required');
    });

    it('should return invalid if level is not a string', () => {
      const result = sender.validateConfig({ level: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Log level must be a string');
    });

    it('should return invalid if level is not a valid choice', () => {
      const result = sender.validateConfig({ level: 'critical' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Log level must be one of/);
    });

    it('should return invalid if id is not a string', () => {
        const result = sender.validateConfig({ level: 'info', id: 123 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Channel ID must be a string');
    });
  });
}); 