/**
 * Monitoring Events Configuration Unit Tests
 * 测试监控统一事件配置的验证、环境适配和计算逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MonitoringEventsConfig,
  AlertFrequencyConfig,
  EventRetryConfig,
  EventCollectionConfig,
  EventNotificationConfig,
  EventStorageConfig,
  AlertEscalationConfig,
  monitoringEventsConfig,
  MonitoringEventsUtils,
  AlertLevel,
  EventPriority,
  NotificationChannel,
} from '@monitoring/config/unified/monitoring-events.config';

describe('AlertFrequencyConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new AlertFrequencyConfig();

      expect(config.maxAlertsPerMinute).toBe(5);
      expect(config.maxAlertsPerHour).toBe(60);
      expect(config.maxAlertsPerDay).toBe(500);
      expect(config.cooldownEmergencySeconds).toBe(60);
      expect(config.cooldownCriticalSeconds).toBe(300);
      expect(config.cooldownWarningSeconds).toBe(900);
      expect(config.cooldownInfoSeconds).toBe(1800);
      expect(config.consecutiveThreshold).toBe(3);
    });

    it('should validate default configuration', async () => {
      const config = new AlertFrequencyConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Alert Limits Validation', () => {
    it('should accept valid alert limits', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { 
        maxAlertsPerMinute: 10,
        maxAlertsPerHour: 100,
        maxAlertsPerDay: 1000
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.maxAlertsPerMinute).toBe(10);
      expect(config.maxAlertsPerHour).toBe(100);
      expect(config.maxAlertsPerDay).toBe(1000);
    });

    it('should reject alert limits below minimum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { maxAlertsPerMinute: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('每分钟最大告警数最小值为1');
    });

    it('should reject alert limits above maximum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { maxAlertsPerMinute: 101 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('每分钟最大告警数最大值为100');
    });
  });

  describe('Cooldown Time Validation', () => {
    it('should accept valid cooldown times', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { 
        cooldownEmergencySeconds: 30,
        cooldownCriticalSeconds: 150,
        cooldownWarningSeconds: 600,
        cooldownInfoSeconds: 1200
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.cooldownEmergencySeconds).toBe(30);
      expect(config.cooldownCriticalSeconds).toBe(150);
      expect(config.cooldownWarningSeconds).toBe(600);
      expect(config.cooldownInfoSeconds).toBe(1200);
    });

    it('should reject cooldown time below minimum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { cooldownEmergencySeconds: 5 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('紧急告警冷却时间最小值为10秒');
    });

    it('should reject cooldown time above maximum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { cooldownEmergencySeconds: 301 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('紧急告警冷却时间最大值为300秒');
    });
  });

  describe('Consecutive Threshold Validation', () => {
    it('should accept valid consecutive threshold values', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { consecutiveThreshold: 5 });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.consecutiveThreshold).toBe(5);
    });

    it('should reject consecutive threshold below minimum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { consecutiveThreshold: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('连续触发告警阈值最小值为1');
    });

    it('should reject consecutive threshold above maximum', async () => {
      const config = plainToInstance(AlertFrequencyConfig, { consecutiveThreshold: 21 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('连续触发告警阈值最大值为20');
    });
  });
});

describe('EventRetryConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new EventRetryConfig();

      expect(config.maxRetryAttempts).toBe(3);
      expect(config.initialRetryDelayMs).toBe(1000);
      expect(config.backoffMultiplier).toBe(2.0);
      expect(config.maxRetryDelayMs).toBe(30000);
      expect(config.retryTimeoutMs).toBe(60000);
      expect(config.jitterEnabled).toBe(true);
      expect(config.jitterRange).toBe(0.1);
    });

    it('should validate default configuration', async () => {
      const config = new EventRetryConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Retry Attempts Validation', () => {
    it('should accept valid retry attempts', async () => {
      const config = plainToInstance(EventRetryConfig, { maxRetryAttempts: 5 });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.maxRetryAttempts).toBe(5);
    });

    it('should accept zero retry attempts', async () => {
      const config = plainToInstance(EventRetryConfig, { maxRetryAttempts: 0 });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.maxRetryAttempts).toBe(0);
    });

    it('should reject retry attempts above maximum', async () => {
      const config = plainToInstance(EventRetryConfig, { maxRetryAttempts: 11 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('最大重试次数最大值为10');
    });
  });

  describe('Retry Delay Validation', () => {
    it('should accept valid retry delay values', async () => {
      const config = plainToInstance(EventRetryConfig, { 
        initialRetryDelayMs: 500,
        backoffMultiplier: 1.5,
        maxRetryDelayMs: 15000,
        retryTimeoutMs: 30000
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.initialRetryDelayMs).toBe(500);
      expect(config.backoffMultiplier).toBe(1.5);
      expect(config.maxRetryDelayMs).toBe(15000);
      expect(config.retryTimeoutMs).toBe(30000);
    });

    it('should reject retry delay below minimum', async () => {
      const config = plainToInstance(EventRetryConfig, { initialRetryDelayMs: 50 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('初始重试延迟最小值为100毫秒');
    });

    it('should reject retry delay above maximum', async () => {
      const config = plainToInstance(EventRetryConfig, { initialRetryDelayMs: 30001 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('初始重试延迟最大值为30000毫秒');
    });
  });

  describe('Jitter Validation', () => {
    it('should accept valid jitter values', async () => {
      const config = plainToInstance(EventRetryConfig, { 
        jitterEnabled: false,
        jitterRange: 0.2
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.jitterEnabled).toBe(false);
      expect(config.jitterRange).toBe(0.2);
    });

    it('should reject jitter range below minimum', async () => {
      const config = plainToInstance(EventRetryConfig, { jitterRange: -0.1 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('抖动范围最小值为0.0');
    });

    it('should reject jitter range above maximum', async () => {
      const config = plainToInstance(EventRetryConfig, { jitterRange: 1.1 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('抖动范围最大值为1.0');
    });
  });
});

describe('EventCollectionConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new EventCollectionConfig();

      expect(config.realtimeIntervalSeconds).toBe(1);
      expect(config.highFrequencyIntervalSeconds).toBe(5);
      expect(config.normalIntervalSeconds).toBe(30);
      expect(config.lowFrequencyIntervalSeconds).toBe(300);
      expect(config.bufferSize).toBe(1000);
      expect(config.bufferFlushIntervalMs).toBe(5000);
      expect(config.aggregationEnabled).toBe(true);
      expect(config.aggregationWindowSeconds).toBe(60);
    });

    it('should validate default configuration', async () => {
      const config = new EventCollectionConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Collection Interval Validation', () => {
    it('should accept valid collection intervals', async () => {
      const config = plainToInstance(EventCollectionConfig, { 
        realtimeIntervalSeconds: 2,
        highFrequencyIntervalSeconds: 10,
        normalIntervalSeconds: 60,
        lowFrequencyIntervalSeconds: 600
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.realtimeIntervalSeconds).toBe(2);
      expect(config.highFrequencyIntervalSeconds).toBe(10);
      expect(config.normalIntervalSeconds).toBe(60);
      expect(config.lowFrequencyIntervalSeconds).toBe(600);
    });

    it('should reject collection interval below minimum', async () => {
      const config = plainToInstance(EventCollectionConfig, { realtimeIntervalSeconds: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('实时事件收集间隔最小值为1秒');
    });

    it('should reject collection interval above maximum', async () => {
      const config = plainToInstance(EventCollectionConfig, { realtimeIntervalSeconds: 61 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('实时事件收集间隔最大值为60秒');
    });
  });

  describe('Buffer Configuration Validation', () => {
    it('should accept valid buffer configuration', async () => {
      const config = plainToInstance(EventCollectionConfig, { 
        bufferSize: 5000,
        bufferFlushIntervalMs: 10000,
        aggregationEnabled: false,
        aggregationWindowSeconds: 120
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.bufferSize).toBe(5000);
      expect(config.bufferFlushIntervalMs).toBe(10000);
      expect(config.aggregationEnabled).toBe(false);
      expect(config.aggregationWindowSeconds).toBe(120);
    });

    it('should reject buffer size below minimum', async () => {
      const config = plainToInstance(EventCollectionConfig, { bufferSize: 99 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('事件缓冲区大小最小值为100');
    });

    it('should reject buffer size above maximum', async () => {
      const config = plainToInstance(EventCollectionConfig, { bufferSize: 10001 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('事件缓冲区大小最大值为10000');
    });
  });
});

describe('EventNotificationConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new EventNotificationConfig();

      expect(config.emailEnabled).toBe(true);
      expect(config.smsEnabled).toBe(false);
      expect(config.webhookEnabled).toBe(true);
      expect(config.slackEnabled).toBe(false);
      expect(config.dingtalkEnabled).toBe(false);
      expect(config.notificationTimeoutMs).toBe(10000);
      expect(config.notificationRetryAttempts).toBe(2);
      expect(config.templateCacheSeconds).toBe(3600);
      expect(config.quietHoursStart).toBe(22);
      expect(config.quietHoursEnd).toBe(8);
      expect(config.emergencyDuringQuietHours).toBe(true);
    });

    it('should validate default configuration', async () => {
      const config = new EventNotificationConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Notification Channel Validation', () => {
    it('should accept valid notification channel configuration', async () => {
      const config = plainToInstance(EventNotificationConfig, { 
        emailEnabled: false,
        smsEnabled: true,
        webhookEnabled: false,
        slackEnabled: true,
        dingtalkEnabled: true
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.emailEnabled).toBe(false);
      expect(config.smsEnabled).toBe(true);
      expect(config.webhookEnabled).toBe(false);
      expect(config.slackEnabled).toBe(true);
      expect(config.dingtalkEnabled).toBe(true);
    });
  });

  describe('Notification Timeout Validation', () => {
    it('should accept valid notification timeout values', async () => {
      const config = plainToInstance(EventNotificationConfig, { 
        notificationTimeoutMs: 5000,
        notificationRetryAttempts: 3,
        templateCacheSeconds: 7200
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.notificationTimeoutMs).toBe(5000);
      expect(config.notificationRetryAttempts).toBe(3);
      expect(config.templateCacheSeconds).toBe(7200);
    });

    it('should reject notification timeout below minimum', async () => {
      const config = plainToInstance(EventNotificationConfig, { notificationTimeoutMs: 999 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('通知超时时间最小值为1000毫秒');
    });

    it('should reject notification timeout above maximum', async () => {
      const config = plainToInstance(EventNotificationConfig, { notificationTimeoutMs: 60001 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('通知超时时间最大值为60000毫秒');
    });
  });

  describe('Quiet Hours Validation', () => {
    it('should accept valid quiet hours configuration', async () => {
      const config = plainToInstance(EventNotificationConfig, { 
        quietHoursStart: 20,
        quietHoursEnd: 6,
        emergencyDuringQuietHours: false
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.quietHoursStart).toBe(20);
      expect(config.quietHoursEnd).toBe(6);
      expect(config.emergencyDuringQuietHours).toBe(false);
    });

    it('should reject quiet hours start below minimum', async () => {
      const config = plainToInstance(EventNotificationConfig, { quietHoursStart: -1 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('静默时间开始最小值为0');
    });

    it('should reject quiet hours start above maximum', async () => {
      const config = plainToInstance(EventNotificationConfig, { quietHoursStart: 24 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('静默时间开始最大值为23');
    });
  });
});

describe('EventStorageConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new EventStorageConfig();

      expect(config.realtimeRetentionHours).toBe(1);
      expect(config.hourlyRetentionHours).toBe(168);
      expect(config.dailyRetentionHours).toBe(720);
      expect(config.monthlyRetentionHours).toBe(8760);
      expect(config.compressionThresholdBytes).toBe(2048);
      expect(config.compressionEnabled).toBe(true);
      expect(config.cleanupBatchSize).toBe(1000);
      expect(config.cleanupIntervalHours).toBe(24);
    });

    it('should validate default configuration', async () => {
      const config = new EventStorageConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Retention Time Validation', () => {
    it('should accept valid retention times', async () => {
      const config = plainToInstance(EventStorageConfig, { 
        realtimeRetentionHours: 2,
        hourlyRetentionHours: 336,
        dailyRetentionHours: 1440,
        monthlyRetentionHours: 17520
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.realtimeRetentionHours).toBe(2);
      expect(config.hourlyRetentionHours).toBe(336);
      expect(config.dailyRetentionHours).toBe(1440);
      expect(config.monthlyRetentionHours).toBe(17520);
    });

    it('should reject retention time below minimum', async () => {
      const config = plainToInstance(EventStorageConfig, { realtimeRetentionHours: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('实时事件保留时间最小值为1小时');
    });

    it('should reject retention time above maximum', async () => {
      const config = plainToInstance(EventStorageConfig, { realtimeRetentionHours: 169 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('实时事件保留时间最大值为168小时');
    });
  });

  describe('Compression Configuration Validation', () => {
    it('should accept valid compression configuration', async () => {
      const config = plainToInstance(EventStorageConfig, { 
        compressionThresholdBytes: 4096,
        compressionEnabled: false,
        cleanupBatchSize: 5000,
        cleanupIntervalHours: 12
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.compressionThresholdBytes).toBe(4096);
      expect(config.compressionEnabled).toBe(false);
      expect(config.cleanupBatchSize).toBe(5000);
      expect(config.cleanupIntervalHours).toBe(12);
    });

    it('should reject compression threshold below minimum', async () => {
      const config = plainToInstance(EventStorageConfig, { compressionThresholdBytes: 511 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('事件压缩阈值最小值为512字节');
    });

    it('should reject compression threshold above maximum', async () => {
      const config = plainToInstance(EventStorageConfig, { compressionThresholdBytes: 1048577 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('事件压缩阈值最大值为1048576字节');
    });
  });
});

describe('AlertEscalationConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new AlertEscalationConfig();

      expect(config.escalationEnabled).toBe(true);
      expect(config.level1EscalationMinutes).toBe(15);
      expect(config.level2EscalationMinutes).toBe(30);
      expect(config.level3EscalationMinutes).toBe(60);
      expect(config.maxEscalationLevels).toBe(3);
      expect(config.autoResolveHours).toBe(24);
      expect(config.businessHoursOnly).toBe(false);
      expect(config.businessHoursStart).toBe(9);
      expect(config.businessHoursEnd).toBe(18);
    });

    it('should validate default configuration', async () => {
      const config = new AlertEscalationConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Escalation Time Validation', () => {
    it('should accept valid escalation times', async () => {
      const config = plainToInstance(AlertEscalationConfig, { 
        level1EscalationMinutes: 10,
        level2EscalationMinutes: 20,
        level3EscalationMinutes: 40,
        maxEscalationLevels: 5
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.level1EscalationMinutes).toBe(10);
      expect(config.level2EscalationMinutes).toBe(20);
      expect(config.level3EscalationMinutes).toBe(40);
      expect(config.maxEscalationLevels).toBe(5);
    });

    it('should reject escalation time below minimum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { level1EscalationMinutes: 4 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('第一级升级时间最小值为5分钟');
    });

    it('should reject escalation time above maximum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { level1EscalationMinutes: 121 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('第一级升级时间最大值为120分钟');
    });
  });

  describe('Auto Resolve Validation', () => {
    it('should accept valid auto resolve time', async () => {
      const config = plainToInstance(AlertEscalationConfig, { autoResolveHours: 48 });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.autoResolveHours).toBe(48);
    });

    it('should reject auto resolve time below minimum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { autoResolveHours: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('自动解决告警时间最小值为1小时');
    });

    it('should reject auto resolve time above maximum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { autoResolveHours: 169 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('自动解决告警时间最大值为168小时');
    });
  });

  describe('Business Hours Validation', () => {
    it('should accept valid business hours configuration', async () => {
      const config = plainToInstance(AlertEscalationConfig, { 
        businessHoursStart: 8,
        businessHoursEnd: 17,
        businessHoursOnly: true
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.businessHoursStart).toBe(8);
      expect(config.businessHoursEnd).toBe(17);
      expect(config.businessHoursOnly).toBe(true);
    });

    it('should reject business hours start below minimum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { businessHoursStart: -1 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('工作时间开始最小值为0');
    });

    it('should reject business hours start above maximum', async () => {
      const config = plainToInstance(AlertEscalationConfig, { businessHoursStart: 24 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('工作时间开始最大值为23');
    });
  });
});

describe('MonitoringEventsConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Default Configuration', () => {
    it('should initialize with default nested configurations', () => {
      const config = new MonitoringEventsConfig();

      expect(config.alertFrequency).toBeInstanceOf(AlertFrequencyConfig);
      expect(config.eventRetry).toBeInstanceOf(EventRetryConfig);
      expect(config.eventCollection).toBeInstanceOf(EventCollectionConfig);
      expect(config.eventNotification).toBeInstanceOf(EventNotificationConfig);
      expect(config.eventStorage).toBeInstanceOf(EventStorageConfig);
      expect(config.alertEscalation).toBeInstanceOf(AlertEscalationConfig);

      expect(config.enableAutoAnalysis).toBe(true);
      expect(config.processingConcurrency).toBe(10);
      expect(config.maxQueueSize).toBe(10000);
      expect(config.processingTimeoutMs).toBe(30000);
    });

    it('should validate default configuration', async () => {
      const config = new MonitoringEventsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Environment Adjustment', () => {
    describe('Production Environment', () => {
      it('should adjust configuration for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringEventsConfig();

        config.adjustForEnvironment();

        expect(config.alertFrequency.maxAlertsPerMinute).toBe(3);
        expect(config.alertFrequency.maxAlertsPerHour).toBe(30);
        expect(config.alertFrequency.cooldownEmergencySeconds).toBe(30);
        expect(config.alertFrequency.cooldownCriticalSeconds).toBe(180);
        expect(config.alertFrequency.consecutiveThreshold).toBe(2);
        expect(config.eventRetry.maxRetryAttempts).toBe(5);
        expect(config.eventRetry.initialRetryDelayMs).toBe(2000);
        expect(config.eventRetry.maxRetryDelayMs).toBe(60000);
        expect(config.eventCollection.realtimeIntervalSeconds).toBe(1);
        expect(config.eventCollection.highFrequencyIntervalSeconds).toBe(3);
        expect(config.eventCollection.bufferSize).toBe(2000);
        expect(config.eventNotification.notificationTimeoutMs).toBe(15000);
        expect(config.eventStorage.realtimeRetentionHours).toBe(2);
        expect(config.eventStorage.hourlyRetentionHours).toBe(336);
        expect(config.alertEscalation.level1EscalationMinutes).toBe(10);
        expect(config.processingConcurrency).toBe(20);
        expect(config.maxQueueSize).toBe(20000);
      });
    });

    describe('Test Environment', () => {
      it('should adjust configuration for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringEventsConfig();

        config.adjustForEnvironment();

        expect(config.alertFrequency.maxAlertsPerMinute).toBe(20);
        expect(config.alertFrequency.maxAlertsPerHour).toBe(200);
        expect(config.alertFrequency.cooldownEmergencySeconds).toBe(5);
        expect(config.alertFrequency.cooldownCriticalSeconds).toBe(30);
        expect(config.alertFrequency.consecutiveThreshold).toBe(1);
        expect(config.eventRetry.maxRetryAttempts).toBe(1);
        expect(config.eventRetry.initialRetryDelayMs).toBe(100);
        expect(config.eventRetry.maxRetryDelayMs).toBe(1000);
        expect(config.eventCollection.realtimeIntervalSeconds).toBe(1);
        expect(config.eventCollection.highFrequencyIntervalSeconds).toBe(2);
        expect(config.eventCollection.bufferSize).toBe(100);
        expect(config.eventNotification.notificationTimeoutMs).toBe(3000);
        expect(config.eventStorage.realtimeRetentionHours).toBe(1);
        expect(config.eventStorage.hourlyRetentionHours).toBe(24);
        expect(config.alertEscalation.level1EscalationMinutes).toBe(1);
        expect(config.alertEscalation.level2EscalationMinutes).toBe(2);
        expect(config.alertEscalation.level3EscalationMinutes).toBe(5);
        expect(config.processingConcurrency).toBe(5);
        expect(config.maxQueueSize).toBe(1000);
        expect(config.processingTimeoutMs).toBe(5000);
      });
    });

    describe('Development Environment', () => {
      it('should not modify configuration for development environment', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringEventsConfig();
        const originalValues = {
          alertFrequency: { ...config.alertFrequency },
          eventRetry: { ...config.eventRetry },
          eventCollection: { ...config.eventCollection }
        };

        config.adjustForEnvironment();

        expect(config.alertFrequency).toEqual(originalValues.alertFrequency);
        expect(config.eventRetry).toEqual(originalValues.eventRetry);
        expect(config.eventCollection).toEqual(originalValues.eventCollection);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration consistency', () => {
      const config = new MonitoringEventsConfig();
      const result = config.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect alert frequency inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.alertFrequency.maxAlertsPerMinute = 100; // Greater than per hour
      config.alertFrequency.maxAlertsPerHour = 50;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('每分钟最大告警数与每小时最大告警数不一致'))).toBe(true);
    });

    it('should detect cooldown time inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.alertFrequency.cooldownEmergencySeconds = 300; // Greater than critical
      config.alertFrequency.cooldownCriticalSeconds = 180;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('紧急告警冷却时间应小于严重告警冷却时间'))).toBe(true);
    });

    it('should detect retry delay inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.eventRetry.initialRetryDelayMs = 5000; // Greater than max
      config.eventRetry.maxRetryDelayMs = 3000;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('初始重试延迟应小于最大重试延迟'))).toBe(true);
    });

    it('should detect escalation time inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.alertEscalation.level1EscalationMinutes = 30; // Greater than level 2
      config.alertEscalation.level2EscalationMinutes = 20;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('第一级升级时间应小于第二级升级时间'))).toBe(true);
    });

    it('should detect business hours inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.alertEscalation.businessHoursStart = 18; // Greater than end
      config.alertEscalation.businessHoursEnd = 9;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('工作时间开始应早于工作时间结束'))).toBe(true);
    });

    it('should detect quiet hours inconsistencies', () => {
      const config = new MonitoringEventsConfig();
      config.eventNotification.quietHoursStart = 12; // Same as end
      config.eventNotification.quietHoursEnd = 12;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('静默时间开始和结束时间不能相同'))).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    let config: MonitoringEventsConfig;

    beforeEach(() => {
      config = new MonitoringEventsConfig();
    });

    describe('getAlertCooldown', () => {
      it('should return correct cooldown time for each alert level', () => {
        expect(config.getAlertCooldown(AlertLevel.EMERGENCY)).toBe(60);
        expect(config.getAlertCooldown(AlertLevel.CRITICAL)).toBe(300);
        expect(config.getAlertCooldown(AlertLevel.WARNING)).toBe(900);
        expect(config.getAlertCooldown(AlertLevel.INFO)).toBe(1800);
      });

      it('should return default cooldown for unknown level', () => {
        expect(config.getAlertCooldown('unknown' as AlertLevel)).toBe(1800);
      });
    });

    describe('getCollectionInterval', () => {
      it('should return correct collection interval for each priority', () => {
        expect(config.getCollectionInterval(EventPriority.REALTIME)).toBe(1);
        expect(config.getCollectionInterval(EventPriority.HIGH)).toBe(5);
        expect(config.getCollectionInterval(EventPriority.NORMAL)).toBe(30);
        expect(config.getCollectionInterval(EventPriority.LOW)).toBe(300);
      });

      it('should return default interval for unknown priority', () => {
        expect(config.getCollectionInterval('unknown' as EventPriority)).toBe(30);
      });
    });

    describe('getDataRetention', () => {
      it('should return correct retention time for each data type', () => {
        expect(config.getDataRetention('realtime')).toBe(1);
        expect(config.getDataRetention('hourly')).toBe(168);
        expect(config.getDataRetention('daily')).toBe(720);
        expect(config.getDataRetention('monthly')).toBe(8760);
      });

      it('should return default retention for unknown data type', () => {
        expect(config.getDataRetention('unknown' as any)).toBe(720);
      });
    });

    describe('canSendAlert', () => {
      it('should determine if alert can be sent based on recent count', () => {
        expect(config.canSendAlert(AlertLevel.INFO, 3, 1)).toBe(true); // Below limit
        expect(config.canSendAlert(AlertLevel.INFO, 7, 1)).toBe(false); // Above limit
        expect(config.canSendAlert(AlertLevel.INFO, 30, 60)).toBe(true); // Below hourly limit
        expect(config.canSendAlert(AlertLevel.INFO, 70, 60)).toBe(false); // Above hourly limit
      });
    });

    describe('isQuietHours', () => {
      it('should determine if current time is within quiet hours (cross-night)', () => {
        // Mock date to test quiet hours logic
        const config = new MonitoringEventsConfig();
        config.eventNotification.quietHoursStart = 22;
        config.eventNotification.quietHoursEnd = 8;

        // Test during quiet hours (early morning)
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-01T06:00:00Z').valueOf());

        expect(config.isQuietHours()).toBe(true);

        // Test during quiet hours (late night)
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-01T23:00:00Z').valueOf());

        expect(config.isQuietHours()).toBe(true);

        // Test during non-quiet hours
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-01T12:00:00Z').valueOf());

        expect(config.isQuietHours()).toBe(false);
      });

      it('should determine if current time is within quiet hours (same day)', () => {
        const config = new MonitoringEventsConfig();
        config.eventNotification.quietHoursStart = 12;
        config.eventNotification.quietHoursEnd = 14;

        // Test during quiet hours
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-01T13:00:00Z').valueOf());

        expect(config.isQuietHours()).toBe(true);

        // Test during non-quiet hours
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-01T15:00:00Z').valueOf());

        expect(config.isQuietHours()).toBe(false);
      });
    });

    describe('isBusinessHours', () => {
      it('should determine if current time is within business hours', () => {
        const config = new MonitoringEventsConfig();
        config.alertEscalation.businessHoursStart = 9;
        config.alertEscalation.businessHoursEnd = 17;

        // Test during business hours on weekday
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-02T10:00:00Z').valueOf()); // Monday

        expect(config.isBusinessHours()).toBe(true);

        // Test outside business hours on weekday
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-02T18:00:00Z').valueOf()); // Monday

        expect(config.isBusinessHours()).toBe(false);

        // Test during weekend
        jest
          .spyOn(global.Date, 'now')
          .mockImplementation(() => new Date('2023-01-07T10:00:00Z').valueOf()); // Saturday

        expect(config.isBusinessHours()).toBe(false);
      });
    });
  });
});

describe('monitoringEventsConfig Factory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should create configuration with default values', () => {
    const config = monitoringEventsConfig();

    expect(config.alertFrequency.maxAlertsPerMinute).toBe(5);
    expect(config.alertFrequency.maxAlertsPerHour).toBe(60);
    expect(config.eventRetry.maxRetryAttempts).toBe(3);
    expect(config.eventCollection.realtimeIntervalSeconds).toBe(1);
    expect(config.eventNotification.emailEnabled).toBe(true);
    expect(config.eventStorage.realtimeRetentionHours).toBe(1);
    expect(config.alertEscalation.escalationEnabled).toBe(true);
  });

  it('should create configuration with environment variables', () => {
    process.env.MONITORING_MAX_ALERTS_PER_MINUTE = '10';
    process.env.MONITORING_EVENT_MAX_RETRY_ATTEMPTS = '5';
    process.env.MONITORING_EVENT_REALTIME_INTERVAL_SEC = '2';
    process.env.MONITORING_NOTIFICATION_EMAIL_ENABLED = 'false';
    process.env.MONITORING_EVENT_REALTIME_RETENTION_HOURS = '3';
    process.env.MONITORING_ALERT_ESCALATION_ENABLED = 'false';

    const config = monitoringEventsConfig();

    expect(config.alertFrequency.maxAlertsPerMinute).toBe(10);
    expect(config.eventRetry.maxRetryAttempts).toBe(5);
    expect(config.eventCollection.realtimeIntervalSeconds).toBe(2);
    expect(config.eventNotification.emailEnabled).toBe(false);
    expect(config.eventStorage.realtimeRetentionHours).toBe(3);
    expect(config.alertEscalation.escalationEnabled).toBe(false);
  });

  it('should adjust configuration for environment after creation', () => {
    process.env.NODE_ENV = 'production';

    const config = monitoringEventsConfig();

    // Should be adjusted for production
    expect(config.alertFrequency.maxAlertsPerMinute).toBe(3);
    expect(config.alertFrequency.cooldownEmergencySeconds).toBe(30);
    expect(config.eventRetry.maxRetryAttempts).toBe(5);
    expect(config.processingConcurrency).toBe(20);
  });
});

describe('MonitoringEventsUtils', () => {
  describe('calculateRetryDelay', () => {
    it('should calculate retry delay with exponential backoff', () => {
      const config = new EventRetryConfig();
      config.initialRetryDelayMs = 1000;
      config.backoffMultiplier = 2.0;
      config.maxRetryDelayMs = 30000;
      config.jitterEnabled = false;

      expect(MonitoringEventsUtils.calculateRetryDelay(0, config)).toBe(1000); // 1000 * 2^0
      expect(MonitoringEventsUtils.calculateRetryDelay(1, config)).toBe(2000); // 1000 * 2^1
      expect(MonitoringEventsUtils.calculateRetryDelay(2, config)).toBe(4000); // 1000 * 2^2
      expect(MonitoringEventsUtils.calculateRetryDelay(5, config)).toBe(30000); // Capped at max
    });

    it('should calculate retry delay with jitter', () => {
      const config = new EventRetryConfig();
      config.initialRetryDelayMs = 1000;
      config.backoffMultiplier = 2.0;
      config.maxRetryDelayMs = 30000;
      config.jitterEnabled = true;
      config.jitterRange = 0.1;

      // With jitter, the value should be within ±10% of the base delay
      const delay = MonitoringEventsUtils.calculateRetryDelay(1, config);
      expect(delay).toBeGreaterThanOrEqual(1800); // 2000 - 10%
      expect(delay).toBeLessThanOrEqual(2200); // 2000 + 10%
    });
  });

  describe('shouldAggregateEvent', () => {
    it('should determine if events should be aggregated', () => {
      const config = new EventCollectionConfig();
      config.aggregationEnabled = true;
      config.aggregationWindowSeconds = 60;

      const event1 = { type: 'ERROR', source: 'API', timestamp: Date.now() };
      const event2 = { type: 'ERROR', source: 'API', timestamp: Date.now() + 30000 };
      const event3 = { type: 'WARNING', source: 'API', timestamp: Date.now() };
      const event4 = { type: 'ERROR', source: 'DB', timestamp: Date.now() };

      expect(MonitoringEventsUtils.shouldAggregateEvent(event1, event2, config)).toBe(true); // Same type and source within window
      expect(MonitoringEventsUtils.shouldAggregateEvent(event1, event3, config)).toBe(false); // Different type
      expect(MonitoringEventsUtils.shouldAggregateEvent(event1, event4, config)).toBe(false); // Different source
    });

    it('should not aggregate when aggregation is disabled', () => {
      const config = new EventCollectionConfig();
      config.aggregationEnabled = false;

      const event1 = { type: 'ERROR', source: 'API', timestamp: Date.now() };
      const event2 = { type: 'ERROR', source: 'API', timestamp: Date.now() };

      expect(MonitoringEventsUtils.shouldAggregateEvent(event1, event2, config)).toBe(false);
    });
  });

  describe('getEnabledNotificationChannels', () => {
    it('should return list of enabled notification channels', () => {
      const config = new EventNotificationConfig();
      config.emailEnabled = true;
      config.smsEnabled = false;
      config.webhookEnabled = true;
      config.slackEnabled = true;
      config.dingtalkEnabled = false;

      const channels = MonitoringEventsUtils.getEnabledNotificationChannels(config);
      expect(channels).toContain(NotificationChannel.EMAIL);
      expect(channels).not.toContain(NotificationChannel.SMS);
      expect(channels).toContain(NotificationChannel.WEBHOOK);
      expect(channels).toContain(NotificationChannel.SLACK);
      expect(channels).not.toContain(NotificationChannel.DINGTALK);
      expect(channels.length).toBe(3);
    });
  });

  describe('getEscalationTime', () => {
    it('should return correct escalation time for each level', () => {
      const config = new AlertEscalationConfig();
      config.level1EscalationMinutes = 15;
      config.level2EscalationMinutes = 30;
      config.level3EscalationMinutes = 60;

      expect(MonitoringEventsUtils.getEscalationTime(1, config)).toBe(15 * 60 * 1000);
      expect(MonitoringEventsUtils.getEscalationTime(2, config)).toBe(30 * 60 * 1000);
      expect(MonitoringEventsUtils.getEscalationTime(3, config)).toBe(60 * 60 * 1000);
      expect(MonitoringEventsUtils.getEscalationTime(4, config)).toBe(60 * 60 * 1000); // Default to level 3
    });
  });

  describe('shouldSendNotification', () => {
    it('should determine if notification should be sent based on alert level and quiet hours', () => {
      const config = new MonitoringEventsConfig();
      config.eventNotification.quietHoursStart = 22;
      config.eventNotification.quietHoursEnd = 8;
      config.eventNotification.emergencyDuringQuietHours = true;

      // Mock date to be during quiet hours
      jest
        .spyOn(global.Date, 'now')
        .mockImplementation(() => new Date('2023-01-01T02:00:00Z').valueOf());

      expect(MonitoringEventsUtils.shouldSendNotification(AlertLevel.EMERGENCY, config)).toBe(true); // Emergency always sent
      expect(MonitoringEventsUtils.shouldSendNotification(AlertLevel.CRITICAL, config)).toBe(true); // Emergency during quiet hours enabled
    });

    it('should not send non-emergency notifications during quiet hours when disabled', () => {
      const config = new MonitoringEventsConfig();
      config.eventNotification.quietHoursStart = 22;
      config.eventNotification.quietHoursEnd = 8;
      config.eventNotification.emergencyDuringQuietHours = false;

      // Mock date to be during quiet hours
      jest
        .spyOn(global.Date, 'now')
        .mockImplementation(() => new Date('2023-01-01T02:00:00Z').valueOf());

      expect(MonitoringEventsUtils.shouldSendNotification(AlertLevel.CRITICAL, config)).toBe(false);
    });
  });

  describe('getEnvironmentVariableMapping', () => {
    it('should return correct environment variable mapping', () => {
      const mapping = MonitoringEventsUtils.getEnvironmentVariableMapping();

      expect(mapping['alertFrequency.maxAlertsPerMinute']).toBe('MONITORING_MAX_ALERTS_PER_MINUTE');
      expect(mapping['eventRetry.maxRetryAttempts']).toBe('MONITORING_EVENT_MAX_RETRY_ATTEMPTS');
      expect(mapping['eventCollection.realtimeIntervalSeconds']).toBe('MONITORING_EVENT_REALTIME_INTERVAL_SEC');
      expect(mapping['eventNotification.emailEnabled']).toBe('MONITORING_NOTIFICATION_EMAIL_ENABLED');
      expect(mapping['eventStorage.realtimeRetentionHours']).toBe('MONITORING_EVENT_REALTIME_RETENTION_HOURS');
      expect(mapping['alertEscalation.escalationEnabled']).toBe('MONITORING_ALERT_ESCALATION_ENABLED');
    });
  });
});

describe('Type Exports', () => {
  it('should export MonitoringEventsType correctly', () => {
    const configType: import('@monitoring/config/unified/monitoring-events.config').MonitoringEventsType = 
      new MonitoringEventsConfig();

    expect(configType.alertFrequency).toBeDefined();
    expect(configType.eventRetry).toBeDefined();
    expect(configType.eventCollection).toBeDefined();
    expect(configType.eventNotification).toBeDefined();
    expect(configType.eventStorage).toBeDefined();
    expect(configType.alertEscalation).toBeDefined();
  });

  it('should export AlertLevel enum correctly', () => {
    expect(AlertLevel.INFO).toBe('info');
    expect(AlertLevel.WARNING).toBe('warning');
    expect(AlertLevel.CRITICAL).toBe('critical');
    expect(AlertLevel.EMERGENCY).toBe('emergency');
  });

  it('should export EventPriority enum correctly', () => {
    expect(EventPriority.LOW).toBe('low');
    expect(EventPriority.NORMAL).toBe('normal');
    expect(EventPriority.HIGH).toBe('high');
    expect(EventPriority.REALTIME).toBe('realtime');
  });

  it('should export NotificationChannel enum correctly', () => {
    expect(NotificationChannel.EMAIL).toBe('email');
    expect(NotificationChannel.SMS).toBe('sms');
    expect(NotificationChannel.WEBHOOK).toBe('webhook');
    expect(NotificationChannel.SLACK).toBe('slack');
    expect(NotificationChannel.DINGTALK).toBe('dingtalk');
  });

  it('should export DataRetentionType correctly', () => {
    const retentionType: import('@monitoring/config/unified/monitoring-events.config').DataRetentionType = 'realtime';
    expect(['realtime', 'hourly', 'daily', 'monthly']).toContain(retentionType);
  });
});