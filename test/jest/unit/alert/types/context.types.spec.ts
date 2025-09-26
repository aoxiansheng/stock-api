import { AlertContext, NotificationMetadata, StatsMetadata } from '@alert/types/context.types';

describe('Alert Context Types', () => {
  describe('AlertContext Interface', () => {
    it('should create valid AlertContext object with all properties', () => {
      const context: AlertContext = {
        dataSource: 'market-data-service',
        market: 'NASDAQ',
        symbol: 'AAPL',
        triggerValue: 150.50,
        threshold: 145.00,
        operator: '>',
        triggeredAt: new Date(),
        environment: {
          hostname: 'server-01',
          ip: '192.168.1.100',
          region: 'us-east-1'
        },
        customField: 'custom-value'
      };

      expect(context.dataSource).toBe('market-data-service');
      expect(context.market).toBe('NASDAQ');
      expect(context.symbol).toBe('AAPL');
      expect(context.triggerValue).toBe(150.50);
      expect(context.threshold).toBe(145.00);
      expect(context.operator).toBe('>');
      expect(context.triggeredAt).toBeInstanceOf(Date);
      expect(context.environment?.hostname).toBe('server-01');
      expect(context.customField).toBe('custom-value');
    });

    it('should create minimal AlertContext object', () => {
      const context: AlertContext = {};

      expect(context).toBeDefined();
      expect(context.dataSource).toBeUndefined();
      expect(context.market).toBeUndefined();
    });

    it('should handle string timestamps', () => {
      const context: AlertContext = {
        triggeredAt: '2025-09-24T10:00:00Z'
      };

      expect(context.triggeredAt).toBe('2025-09-24T10:00:00Z');
    });

    it('should handle different triggerValue types', () => {
      const numericContext: AlertContext = {
        triggerValue: 123.45
      };

      const stringContext: AlertContext = {
        triggerValue: 'HIGH'
      };

      expect(numericContext.triggerValue).toBe(123.45);
      expect(stringContext.triggerValue).toBe('HIGH');
    });

    it('should handle complex environment objects', () => {
      const context: AlertContext = {
        environment: {
          hostname: 'web-server-01',
          ip: '10.0.0.5',
          region: 'eu-west-1'
        } as any
      };

      expect(context.environment?.hostname).toBe('web-server-01');
      expect(context.environment?.ip).toBe('10.0.0.5');
      expect(context.environment?.region).toBe('eu-west-1');
    });
  });

  describe('NotificationMetadata Interface', () => {
    it('should create valid NotificationMetadata object with all properties', () => {
      const metadata: NotificationMetadata = {
        sendStartTime: new Date('2025-09-24T10:00:00Z'),
        sendEndTime: new Date('2025-09-24T10:00:05Z'),
        sendDuration: 5000,
        retryCount: 2,
        httpStatusCode: 200,
        responseBody: { success: true, messageId: 'msg-123' },
        errorMessage: null,
        errorStack: null,
        channelSpecific: {
          messageId: 'email-456',
          channelId: 'C012AB3CD',
          threadTs: '1234567890.001200',
          phoneNumber: '+1234567890'
        },
        customField: 'notification-custom-value'
      };

      expect(metadata.sendStartTime).toEqual(new Date('2025-09-24T10:00:00Z'));
      expect(metadata.sendEndTime).toEqual(new Date('2025-09-24T10:00:05Z'));
      expect(metadata.sendDuration).toBe(5000);
      expect(metadata.retryCount).toBe(2);
      expect(metadata.httpStatusCode).toBe(200);
      expect(metadata.responseBody).toEqual({ success: true, messageId: 'msg-123' });
      expect(metadata.channelSpecific?.messageId).toBe('email-456');
      expect(metadata.channelSpecific?.channelId).toBe('C012AB3CD');
      expect(metadata.channelSpecific?.phoneNumber).toBe('+1234567890');
      expect(metadata.customField).toBe('notification-custom-value');
    });

    it('should create minimal NotificationMetadata object', () => {
      const metadata: NotificationMetadata = {};

      expect(metadata).toBeDefined();
      expect(metadata.sendStartTime).toBeUndefined();
      expect(metadata.sendDuration).toBeUndefined();
    });

    it('should handle string timestamps', () => {
      const metadata: NotificationMetadata = {
        sendStartTime: '2025-09-24T10:00:00Z',
        sendEndTime: '2025-09-24T10:00:05Z'
      };

      expect(metadata.sendStartTime).toBe('2025-09-24T10:00:00Z');
      expect(metadata.sendEndTime).toBe('2025-09-24T10:00:05Z');
    });

    it('should handle different response body types', () => {
      const stringResponse: NotificationMetadata = {
        responseBody: 'Success'
      };

      const objectResponse: NotificationMetadata = {
        responseBody: { status: 'success', code: 200 }
      };

      expect(stringResponse.responseBody).toBe('Success');
      expect(objectResponse.responseBody).toEqual({ status: 'success', code: 200 });
    });

    it('should handle error information', () => {
      const errorMetadata: NotificationMetadata = {
        errorMessage: 'Connection timeout',
        errorStack: 'Error: Connection timeout\n    at SMTPConnection...'
      };

      expect(errorMetadata.errorMessage).toBe('Connection timeout');
      expect(errorMetadata.errorStack).toBe('Error: Connection timeout\n    at SMTPConnection...');
    });

    it('should handle channel specific metadata for different channels', () => {
      const emailMetadata: NotificationMetadata = {
        channelSpecific: {
          messageId: 'msg-123',
          from: 'alerts@company.com',
          to: ['user@example.com']
        }
      };

      const slackMetadata: NotificationMetadata = {
        channelSpecific: {
          channelId: 'C012AB3CD',
          threadTs: '1234567890.001200',
          user: 'U012AB3CD'
        }
      };

      const smsMetadata: NotificationMetadata = {
        channelSpecific: {
          phoneNumber: '+1234567890',
          carrier: 'Verizon'
        }
      };

      expect(emailMetadata.channelSpecific?.messageId).toBe('msg-123');
      expect(slackMetadata.channelSpecific?.channelId).toBe('C012AB3CD');
      expect(smsMetadata.channelSpecific?.phoneNumber).toBe('+1234567890');
    });
  });

  describe('StatsMetadata Interface', () => {
    it('should create valid StatsMetadata object with all properties', () => {
      const stats: StatsMetadata = {
        calculatedAt: new Date('2025-09-24T10:00:00Z'),
        period: 'daily',
        dataPoints: 1440,
        cacheHitRate: 0.95,
        performance: {
          queryTime: 150,
          processingTimeMs: 300,
          totalTime: 450
        },
        customStat: 'custom-stat-value'
      };

      expect(stats.calculatedAt).toEqual(new Date('2025-09-24T10:00:00Z'));
      expect(stats.period).toBe('daily');
      expect(stats.dataPoints).toBe(1440);
      expect(stats.cacheHitRate).toBe(0.95);
      expect(stats.performance?.queryTime).toBe(150);
      expect(stats.performance?.processingTimeMs).toBe(300);
      expect(stats.performance?.totalTime).toBe(450);
      expect(stats.customStat).toBe('custom-stat-value');
    });

    it('should create minimal StatsMetadata object', () => {
      const stats: StatsMetadata = {};

      expect(stats).toBeDefined();
      expect(stats.calculatedAt).toBeUndefined();
      expect(stats.period).toBeUndefined();
    });

    it('should handle string timestamps', () => {
      const stats: StatsMetadata = {
        calculatedAt: '2025-09-24T10:00:00Z'
      };

      expect(stats.calculatedAt).toBe('2025-09-24T10:00:00Z');
    });

    it('should handle different performance metrics', () => {
      const highPerformanceStats: StatsMetadata = {
        performance: {
          queryTime: 10,
          processingTimeMs: 20,
          totalTime: 30
        }
      };

      const lowPerformanceStats: StatsMetadata = {
        performance: {
          queryTime: 1000,
          processingTimeMs: 2000,
          totalTime: 3000
        }
      };

      expect(highPerformanceStats.performance?.queryTime).toBe(10);
      expect(lowPerformanceStats.performance?.totalTime).toBe(3000);
    });

    it('should handle edge case values', () => {
      const edgeCaseStats: StatsMetadata = {
        dataPoints: 0,
        cacheHitRate: 0,
        performance: {
          queryTime: 0,
          processingTimeMs: 0,
          totalTime: 0
        }
      };

      expect(edgeCaseStats.dataPoints).toBe(0);
      expect(edgeCaseStats.cacheHitRate).toBe(0);
      expect(edgeCaseStats.performance?.queryTime).toBe(0);
    });

    it('should handle missing performance data', () => {
      const partialStats: StatsMetadata = {
        calculatedAt: new Date(),
        period: 'hourly',
        dataPoints: 60
        // performance is optional
      };

      expect(partialStats.dataPoints).toBe(60);
      expect(partialStats.performance).toBeUndefined();
    });
  });

  describe('Interface Relationships and Compatibility', () => {
    it('should allow combining interfaces', () => {
      // Test that interfaces can be used together in a single object
      const combinedContext: AlertContext & NotificationMetadata & StatsMetadata = {
        dataSource: 'market-data-service',
        market: 'NASDAQ',
        symbol: 'AAPL',
        triggerValue: 150.50,
        threshold: 145.00,
        operator: '>',
        triggeredAt: new Date(),
        sendStartTime: new Date(),
        sendDuration: 1200,
        retryCount: 1,
        calculatedAt: new Date(),
        period: 'real-time',
        dataPoints: 100,
        customField: 'combined-value'
      };

      expect(combinedContext.dataSource).toBe('market-data-service');
      expect(combinedContext.sendDuration).toBe(1200);
      expect(combinedContext.period).toBe('real-time');
      expect(combinedContext.customField).toBe('combined-value');
    });

    it('should be compatible with JSON serialization', () => {
      const context: AlertContext = {
        dataSource: 'test-service',
        triggerValue: 42.5,
        triggeredAt: new Date('2025-09-24T10:00:00Z'),
        environment: {
          hostname: 'test-host'
        }
      };

      const serialized = JSON.stringify(context);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.dataSource).toBe('test-service');
      expect(deserialized.triggerValue).toBe(42.5);
      expect(deserialized.environment.hostname).toBe('test-host');
    });

    it('should maintain type safety', () => {
      const createContext = (context: AlertContext): AlertContext => context;
      const createMetadata = (metadata: NotificationMetadata): NotificationMetadata => metadata;
      const createStats = (stats: StatsMetadata): StatsMetadata => stats;

      const validContext: AlertContext = {
        dataSource: 'test',
        triggerValue: 100
      };

      const validMetadata: NotificationMetadata = {
        sendDuration: 5000
      };

      const validStats: StatsMetadata = {
        dataPoints: 1000
      };

      expect(() => createContext(validContext)).not.toThrow();
      expect(() => createMetadata(validMetadata)).not.toThrow();
      expect(() => createStats(validStats)).not.toThrow();
    });
  });
});