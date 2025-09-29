import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationConfigService } from '@notification/services/notification-config.service';

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

describe('NotificationConfigService', () => {
  let service: NotificationConfigService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    notification: {
      batch: {
        defaultSize: 10,
        maxSize: 100,
        timeout: 5000,
        maxConcurrency: 5,
      },
      timeout: {
        default: 30000,
        email: 60000,
        sms: 15000,
        webhook: 10000,
      },
      retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
        jitterFactor: 0.1,
      },
      validation: {
        variableName: {
          minLength: 2,
          maxLength: 50,
        },
        template: {
          minLength: 10,
          maxLength: 5000,
        },
        title: {
          maxLength: 200,
        },
        content: {
          maxLength: 10000,
        },
      },
      features: {
        batchProcessing: true,
        retryMechanism: true,
        priorityQueue: true,
        metricsCollection: true,
      },
      templates: {
        defaultEmailSubject: 'Notification: {{title}}',
        defaultText: '{{content}}',
      },
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationConfigService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationConfigService>(NotificationConfigService);
    configService = module.get(ConfigService);

    // Setup default mock returns
    configService.get.mockImplementation((path: string, defaultValue?: any) => {
      if (path === 'notification') {
        return mockConfig.notification;
      }

      const keys = path.split('.');
      let current = mockConfig;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return defaultValue;
        }
      }

      return current;
    });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Batch Configuration', () => {
    describe('getDefaultBatchSize', () => {
      it('should return default batch size', () => {
        const result = service.getDefaultBatchSize();
        expect(result).toBe(10);
        expect(configService.get).toHaveBeenCalledWith('notification.batch.defaultSize', 10);
      });

      it('should return default when config is missing', () => {
        configService.get.mockReturnValue(undefined);
        const result = service.getDefaultBatchSize();
        expect(result).toBe(10);
      });
    });

    describe('getMaxBatchSize', () => {
      it('should return max batch size', () => {
        const result = service.getMaxBatchSize();
        expect(result).toBe(100);
        expect(configService.get).toHaveBeenCalledWith('notification.batch.maxSize', 100);
      });
    });

    describe('getMaxConcurrency', () => {
      it('should return max concurrency', () => {
        const result = service.getMaxConcurrency();
        expect(result).toBe(5);
        expect(configService.get).toHaveBeenCalledWith('notification.batch.maxConcurrency', 3);
      });
    });

    describe('getBatchTimeout', () => {
      it('should return batch timeout', () => {
        const result = service.getBatchTimeout();
        expect(result).toBe(5000);
        expect(configService.get).toHaveBeenCalledWith('notification.batch.timeout', 5000);
      });
    });

    describe('getBatchConfig', () => {
      it('should return complete batch config', () => {
        const result = service.getBatchConfig();
        expect(result).toEqual(mockConfig.notification.batch);
        expect(configService.get).toHaveBeenCalledWith('notification.batch');
      });
    });
  });

  describe('Timeout Configuration', () => {
    describe('getDefaultTimeout', () => {
      it('should return default timeout', () => {
        const result = service.getDefaultTimeout();
        expect(result).toBe(30000);
        expect(configService.get).toHaveBeenCalledWith('notification.timeout.default', 30000);
      });
    });

    describe('getEmailTimeout', () => {
      it('should return email timeout', () => {
        const result = service.getEmailTimeout();
        expect(result).toBe(60000);
        expect(configService.get).toHaveBeenCalledWith('notification.timeout.email', 30000);
      });
    });

    describe('getSmsTimeout', () => {
      it('should return SMS timeout', () => {
        const result = service.getSmsTimeout();
        expect(result).toBe(15000);
        expect(configService.get).toHaveBeenCalledWith('notification.timeout.sms', 30000);
      });
    });

    describe('getWebhookTimeout', () => {
      it('should return webhook timeout', () => {
        const result = service.getWebhookTimeout();
        expect(result).toBe(10000);
        expect(configService.get).toHaveBeenCalledWith('notification.timeout.webhook', 30000);
      });
    });

    describe('getTimeoutConfig', () => {
      it('should return complete timeout config', () => {
        const result = service.getTimeoutConfig();
        expect(result).toEqual(mockConfig.notification.timeout);
        expect(configService.get).toHaveBeenCalledWith('notification.timeout');
      });
    });

    describe('getChannelTimeout', () => {
      it('should return email channel timeout', () => {
        const result = service.getChannelTimeout('email');
        expect(result).toBe(60000);
      });

      it('should return sms channel timeout', () => {
        const result = service.getChannelTimeout('sms');
        expect(result).toBe(15000);
      });

      it('should return webhook channel timeout', () => {
        const result = service.getChannelTimeout('webhook');
        expect(result).toBe(10000);
      });

      it('should return default timeout for unknown channel', () => {
        const result = service.getChannelTimeout('unknown' as any);
        expect(result).toBe(30000);
      });
    });
  });

  describe('Retry Configuration', () => {
    describe('getMaxRetryAttempts', () => {
      it('should return max retry attempts', () => {
        const result = service.getMaxRetryAttempts();
        expect(result).toBe(3);
        expect(configService.get).toHaveBeenCalledWith('notification.retry.maxAttempts', 3);
      });
    });

    describe('getInitialRetryDelay', () => {
      it('should return initial retry delay', () => {
        const result = service.getInitialRetryDelay();
        expect(result).toBe(1000);
        expect(configService.get).toHaveBeenCalledWith('notification.retry.initialDelay', 1000);
      });
    });

    describe('getRetryBackoffMultiplier', () => {
      it('should return retry backoff multiplier', () => {
        const result = service.getRetryBackoffMultiplier();
        expect(result).toBe(2);
        expect(configService.get).toHaveBeenCalledWith('notification.retry.backoffMultiplier', 2);
      });
    });

    describe('getMaxRetryDelay', () => {
      it('should return max retry delay', () => {
        const result = service.getMaxRetryDelay();
        expect(result).toBe(30000);
        expect(configService.get).toHaveBeenCalledWith('notification.retry.maxDelay', 30000);
      });
    });

    describe('getJitterFactor', () => {
      it('should return jitter factor', () => {
        const result = service.getJitterFactor();
        expect(result).toBe(0.1);
        expect(configService.get).toHaveBeenCalledWith('notification.retry.jitterFactor', 0.1);
      });
    });

    describe('getRetryConfig', () => {
      it('should return complete retry config', () => {
        const result = service.getRetryConfig();
        expect(result).toEqual(mockConfig.notification.retry);
        expect(configService.get).toHaveBeenCalledWith('notification.retry');
      });
    });

    describe('calculateRetryDelay', () => {
      it('should calculate retry delay with exponential backoff', () => {
        const result = service.calculateRetryDelay(1);
        expect(result).toBe(2000); // 1000 * 2^1
      });

      it('should not exceed max delay', () => {
        const result = service.calculateRetryDelay(10);
        expect(result).toBeLessThanOrEqual(30000);
      });

      it('should apply jitter factor', () => {
        const result1 = service.calculateRetryDelay(1);
        const result2 = service.calculateRetryDelay(1);
        // Due to jitter, results might be slightly different
        expect(Math.abs(result1 - result2)).toBeLessThanOrEqual(200); // 10% of 2000
      });
    });
  });

  describe('Validation Configuration', () => {
    describe('getVariableNameMinLength', () => {
      it('should return variable name min length', () => {
        const result = service.getVariableNameMinLength();
        expect(result).toBe(2);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.variableName.minLength', 2);
      });
    });

    describe('getVariableNameMaxLength', () => {
      it('should return variable name max length', () => {
        const result = service.getVariableNameMaxLength();
        expect(result).toBe(50);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.variableName.maxLength', 50);
      });
    });

    describe('getMinTemplateLength', () => {
      it('should return min template length', () => {
        const result = service.getMinTemplateLength();
        expect(result).toBe(10);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.template.minLength', 10);
      });
    });

    describe('getMaxTemplateLength', () => {
      it('should return max template length', () => {
        const result = service.getMaxTemplateLength();
        expect(result).toBe(5000);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.template.maxLength', 5000);
      });
    });

    describe('getTitleMaxLength', () => {
      it('should return title max length', () => {
        const result = service.getTitleMaxLength();
        expect(result).toBe(200);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.title.maxLength', 200);
      });
    });

    describe('getContentMaxLength', () => {
      it('should return content max length', () => {
        const result = service.getContentMaxLength();
        expect(result).toBe(10000);
        expect(configService.get).toHaveBeenCalledWith('notification.validation.content.maxLength', 10000);
      });
    });

    describe('getValidationConfig', () => {
      it('should return complete validation config', () => {
        const result = service.getValidationConfig();
        expect(result).toEqual(mockConfig.notification.validation);
        expect(configService.get).toHaveBeenCalledWith('notification.validation');
      });
    });
  });

  describe('Feature Flags', () => {
    describe('isBatchProcessingEnabled', () => {
      it('should return batch processing flag', () => {
        const result = service.isBatchProcessingEnabled();
        expect(result).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('notification.features.batchProcessing', true);
      });
    });

    describe('isRetryMechanismEnabled', () => {
      it('should return retry mechanism flag', () => {
        const result = service.isRetryMechanismEnabled();
        expect(result).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('notification.features.retryMechanism', true);
      });
    });

    describe('isPriorityQueueEnabled', () => {
      it('should return priority queue flag', () => {
        const result = service.isPriorityQueueEnabled();
        expect(result).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('notification.features.priorityQueue', false);
      });
    });

    describe('isMetricsCollectionEnabled', () => {
      it('should return metrics collection flag', () => {
        const result = service.isMetricsCollectionEnabled();
        expect(result).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('notification.features.metricsCollection', true);
      });
    });

    describe('getFeatureConfig', () => {
      it('should return complete feature config', () => {
        const result = service.getFeatureConfig();
        expect(result).toEqual(mockConfig.notification.features);
        expect(configService.get).toHaveBeenCalledWith('notification.features');
      });
    });
  });

  describe('Template Configuration', () => {
    describe('getDefaultTextTemplate', () => {
      it('should return default text template', () => {
        const result = service.getDefaultTextTemplate();
        expect(result).toBe('{{content}}');
        expect(configService.get).toHaveBeenCalledWith('notification.templates.defaultText', expect.any(String));
      });
    });

    describe('getDefaultEmailSubjectTemplate', () => {
      it('should return default email subject template', () => {
        const result = service.getDefaultEmailSubjectTemplate();
        expect(result).toBe('Notification: {{title}}');
        expect(configService.get).toHaveBeenCalledWith('notification.templates.defaultEmailSubject', expect.any(String));
      });
    });

    describe('getTemplateConfig', () => {
      it('should return complete template config', () => {
        const result = service.getTemplateConfig();
        expect(result).toEqual(mockConfig.notification.templates);
        expect(configService.get).toHaveBeenCalledWith('notification.templates');
      });
    });
  });

  describe('Validation Methods', () => {
    describe('isValidBatchSize', () => {
      it('should validate valid batch size', () => {
        expect(service.isValidBatchSize(50)).toBe(true);
      });

      it('should reject batch size below 1', () => {
        expect(service.isValidBatchSize(0)).toBe(false);
      });

      it('should reject batch size above max', () => {
        expect(service.isValidBatchSize(150)).toBe(false);
      });
    });

    describe('isValidConcurrency', () => {
      it('should validate valid concurrency', () => {
        expect(service.isValidConcurrency(3)).toBe(true);
      });

      it('should reject concurrency below 1', () => {
        expect(service.isValidConcurrency(0)).toBe(false);
      });

      it('should reject concurrency above max', () => {
        expect(service.isValidConcurrency(10)).toBe(false);
      });
    });

    describe('isValidRetryCount', () => {
      it('should validate valid retry count', () => {
        expect(service.isValidRetryCount(2)).toBe(true);
      });

      it('should reject negative retry count', () => {
        expect(service.isValidRetryCount(-1)).toBe(false);
      });

      it('should reject retry count above max', () => {
        expect(service.isValidRetryCount(5)).toBe(false);
      });
    });

    describe('isValidVariableName', () => {
      it('should validate valid variable name', () => {
        expect(service.isValidVariableName('title')).toBe(true);
      });

      it('should reject variable name too short', () => {
        expect(service.isValidVariableName('a')).toBe(false);
      });

      it('should reject variable name too long', () => {
        const longName = 'a'.repeat(51);
        expect(service.isValidVariableName(longName)).toBe(false);
      });

      it('should reject variable name with invalid characters', () => {
        expect(service.isValidVariableName('title-with-dashes')).toBe(false);
      });
    });

    describe('isValidTemplate', () => {
      it('should validate valid template', () => {
        const template = 'Hello {{name}}, this is a test message.';
        expect(service.isValidTemplate(template)).toBe(true);
      });

      it('should reject template too short', () => {
        expect(service.isValidTemplate('short')).toBe(false);
      });

      it('should reject template too long', () => {
        const longTemplate = 'a'.repeat(5001);
        expect(service.isValidTemplate(longTemplate)).toBe(false);
      });
    });

    describe('isValidTitle', () => {
      it('should validate valid title', () => {
        expect(service.isValidTitle('Test Title')).toBe(true);
      });

      it('should reject title too long', () => {
        const longTitle = 'a'.repeat(201);
        expect(service.isValidTitle(longTitle)).toBe(false);
      });
    });

    describe('isValidContent', () => {
      it('should validate valid content', () => {
        expect(service.isValidContent('Test content')).toBe(true);
      });

      it('should reject content too long', () => {
        const longContent = 'a'.repeat(10001);
        expect(service.isValidContent(longContent)).toBe(false);
      });
    });
  });

  describe('Safe Methods', () => {
    describe('getSafeBatchSize', () => {
      it('should return valid batch size', () => {
        expect(service.getSafeBatchSize(50)).toBe(50);
      });

      it('should return default for invalid batch size', () => {
        expect(service.getSafeBatchSize(150)).toBe(10);
      });
    });

    describe('getSafeConcurrency', () => {
      it('should return valid concurrency', () => {
        expect(service.getSafeConcurrency(3)).toBe(3);
      });

      it('should return default for invalid concurrency', () => {
        expect(service.getSafeConcurrency(10)).toBe(5);
      });
    });
  });

  describe('getAllConfig', () => {
    it('should return complete notification config', () => {
      const result = service.getAllConfig();
      expect(result).toEqual(mockConfig.notification);
      expect(configService.get).toHaveBeenCalledWith('notification');
    });
  });
});