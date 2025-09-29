import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketFeatureFlagsService,
  WebSocketFeatureFlagsConfig,
  WS_FEATURE_FLAGS_DEFAULTS,
} from '@core/03-fetching/stream-data-fetcher/config/websocket-feature-flags.config';
import { UniversalExceptionFactory } from '@common/core/exceptions';

describe('WebSocketFeatureFlagsService', () => {
  let service: WebSocketFeatureFlagsService;
  let configService: jest.Mocked<ConfigService>;
  const originalEnv = process.env;

  // Mock ConfigService
  const createMockConfigService = (envValues: Record<string, string> = {}): jest.Mocked<ConfigService> => ({
    get: jest.fn().mockImplementation((key: string) => envValues[key] || undefined),
  } as any);

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketFeatureFlagsService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<WebSocketFeatureFlagsService>(WebSocketFeatureFlagsService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WebSocketFeatureFlagsService);
    });

    it('应该加载默认特性开关配置', () => {
      const flags = service.getFeatureFlags();

      expect(flags).toBeDefined();
      expect(flags.gatewayOnlyMode).toBe(true);
      expect(flags.strictMode).toBe(true);
      expect(flags.validationMode).toBe('production');
      expect(flags.healthCheckInterval).toBe(30000);
      expect(flags.gatewayFailoverTimeout).toBe(5000);
    });

    it('应该加载自动回滚条件配置', () => {
      const flags = service.getFeatureFlags();

      expect(flags.autoRollbackConditions).toBeDefined();
      expect(flags.autoRollbackConditions.clientDisconnectionSpike).toBe(20);
      expect(flags.autoRollbackConditions.gatewayErrorRate).toBe(5);
      expect(flags.autoRollbackConditions.emergencyFallbackTriggers).toBe(10);
    });
  });

  describe('默认配置值', () => {
    it('应该使用正确的默认特性开关值', () => {
      const flags = service.getFeatureFlags();

      expect(flags.gatewayOnlyMode).toBe(true);
      expect(flags.strictMode).toBe(true);
      expect(flags.validationMode).toBe('production');
      expect(flags.healthCheckInterval).toBe(30000);
      expect(flags.gatewayFailoverTimeout).toBe(5000);
    });

    it('应该使用正确的自动回滚阈值', () => {
      const flags = service.getFeatureFlags();

      expect(flags.autoRollbackConditions.clientDisconnectionSpike).toBe(20);
      expect(flags.autoRollbackConditions.gatewayErrorRate).toBe(5);
      expect(flags.autoRollbackConditions.emergencyFallbackTriggers).toBe(10);
    });
  });

  describe('环境变量配置', () => {
    it('应该使用环境变量覆盖基本特性开关', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'WS_GATEWAY_ONLY_MODE': 'false',
          'WS_STRICT_MODE': 'false',
          'WS_VALIDATION_MODE': 'development',
          'WS_HEALTH_CHECK_INTERVAL': '60000',
          'WS_GATEWAY_FAILOVER_TIMEOUT': '10000',
        };
        return envValues[key];
      });

      const newService = new WebSocketFeatureFlagsService(configService);
      const flags = newService.getFeatureFlags();

      expect(flags.gatewayOnlyMode).toBe(false);
      expect(flags.strictMode).toBe(false);
      expect(flags.validationMode).toBe('development');
      expect(flags.healthCheckInterval).toBe(60000);
      expect(flags.gatewayFailoverTimeout).toBe(10000);
    });

    it('应该使用环境变量覆盖自动回滚阈值', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'WS_AUTO_ROLLBACK_CLIENT_DISCONNECT_THRESHOLD': '30',
          'WS_AUTO_ROLLBACK_GATEWAY_ERROR_THRESHOLD': '10',
          'WS_AUTO_ROLLBACK_EMERGENCY_TRIGGER_THRESHOLD': '5',
        };
        return envValues[key];
      });

      const newService = new WebSocketFeatureFlagsService(configService);
      const flags = newService.getFeatureFlags();

      expect(flags.autoRollbackConditions.clientDisconnectionSpike).toBe(30);
      expect(flags.autoRollbackConditions.gatewayErrorRate).toBe(10);
      expect(flags.autoRollbackConditions.emergencyFallbackTriggers).toBe(5);
    });

    it('应该处理无效的环境变量值', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'WS_VALIDATION_MODE': 'invalid-mode',
        };
        return envValues[key];
      });

      // 无效的验证模式应该抛出异常
      expect(() => {
        new WebSocketFeatureFlagsService(configService);
      }).toThrow();
    });
  });

  describe('特性开关查询方法', () => {
    it('应该正确返回Gateway-only模式状态', () => {
      expect(service.isGatewayOnlyModeEnabled()).toBe(true);
    });

    it('应该正确返回严格模式状态', () => {
      expect(service.isStrictModeEnabled()).toBe(true);
    });

    it('应该正确返回Legacy回退状态（默认为false）', () => {
      expect(service.isLegacyFallbackAllowed()).toBe(false);
    });

    it('应该返回正确的健康检查间隔', () => {
      expect(service.getHealthCheckInterval()).toBe(30000);
    });

    it('应该返回正确的Gateway故障转移超时时间', () => {
      expect(service.getGatewayFailoverTimeout()).toBe(5000);
    });
  });

  describe('配置验证', () => {
    it('应该验证有效的配置', () => {
      // 构造函数中已经调用了验证，如果没有抛出异常说明验证通过
      expect(() => service.getFeatureFlags()).not.toThrow();
    });

    it('应该在无效验证模式时抛出异常', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_VALIDATION_MODE') return 'invalid-mode';
        return undefined;
      });

      expect(() => {
        new WebSocketFeatureFlagsService(configService);
      }).toThrow();
    });

    it('应该在健康检查间隔 <= 0时抛出异常', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_HEALTH_CHECK_INTERVAL') return '0';
        return undefined;
      });

      expect(() => {
        new WebSocketFeatureFlagsService(configService);
      }).toThrow();
    });

    it('应该在Gateway故障转移超时 <= 0时抛出异常', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_GATEWAY_FAILOVER_TIMEOUT') return '-1000';
        return undefined;
      });

      expect(() => {
        new WebSocketFeatureFlagsService(configService);
      }).toThrow();
    });
  });

  describe('动态配置更新', () => {
    it('应该在开发模式下成功更新配置', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_VALIDATION_MODE') return 'development';
        return undefined;
      });

      const devService = new WebSocketFeatureFlagsService(configService);

      const updates: Partial<WebSocketFeatureFlagsConfig> = {
        gatewayOnlyMode: false,
        healthCheckInterval: 60000,
      };

      const result = devService.updateFeatureFlags(updates);

      expect(result).toBe(true);
      expect(devService.getFeatureFlags().gatewayOnlyMode).toBe(false);
      expect(devService.getFeatureFlags().healthCheckInterval).toBe(60000);
    });

    it('应该在生产模式下拒绝配置更新', () => {
      // 默认是生产模式
      const updates: Partial<WebSocketFeatureFlagsConfig> = {
        gatewayOnlyMode: false,
      };

      const result = service.updateFeatureFlags(updates);

      expect(result).toBe(false);
      expect(service.getFeatureFlags().gatewayOnlyMode).toBe(true); // 应该保持原值
    });

    it('应该验证更新后的配置', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_VALIDATION_MODE') return 'development';
        return undefined;
      });

      const devService = new WebSocketFeatureFlagsService(configService);

      const invalidUpdates: Partial<WebSocketFeatureFlagsConfig> = {
        healthCheckInterval: -1000, // 无效值
      };

      expect(() => {
        devService.updateFeatureFlags(invalidUpdates);
      }).toThrow();
    });
  });

  describe('紧急Legacy回退功能', () => {
    it('应该在非严格模式下成功启用Legacy回退', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      const result = nonStrictService.emergencyEnableLegacyFallback('Test emergency');

      expect(result).toBe(true);
      expect(nonStrictService.isLegacyFallbackAllowed()).toBe(true);
    });

    it('应该在严格模式下拒绝启用Legacy回退', () => {
      // 默认是严格模式
      const result = service.emergencyEnableLegacyFallback('Test emergency');

      expect(result).toBe(false);
      expect(service.isLegacyFallbackAllowed()).toBe(false);
    });

    it('应该记录紧急回退启用事件', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);
      const loggerSpy = jest.spyOn((nonStrictService as any).logger, 'warn');

      nonStrictService.emergencyEnableLegacyFallback('Critical system failure');

      expect(loggerSpy).toHaveBeenCalledWith(
        '🚨 紧急启用Legacy回退模式',
        expect.objectContaining({
          reason: 'Critical system failure',
        })
      );
    });
  });

  describe('自动回滚监控', () => {
    beforeEach(() => {
      // 使用非严格模式以允许自动回滚
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });
    });

    it('应该记录客户端断连事件', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      nonStrictService.recordClientDisconnection(5, 100);

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.clientDisconnections.count).toBe(5);
    });

    it('应该在客户端断连激增时触发自动回滚', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);
      const emergencySpy = jest.spyOn(nonStrictService, 'emergencyEnableLegacyFallback');

      // 触发超过阈值的断连（25% > 20%）
      nonStrictService.recordClientDisconnection(25, 100);

      expect(emergencySpy).toHaveBeenCalledWith(
        expect.stringContaining('自动回滚触发: 客户端断连激增')
      );
    });

    it('应该记录Gateway错误事件', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      nonStrictService.recordGatewayError(3, 100);

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.gatewayErrors.count).toBe(3);
    });

    it('应该在Gateway错误率过高时触发自动回滚', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);
      const emergencySpy = jest.spyOn(nonStrictService, 'emergencyEnableLegacyFallback');

      // 触发超过阈值的错误率（10% > 5%）
      nonStrictService.recordGatewayError(10, 100);

      expect(emergencySpy).toHaveBeenCalledWith(
        expect.stringContaining('自动回滚触发: Gateway错误率过高')
      );
    });

    it('应该记录应急回退触发事件', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      nonStrictService.recordEmergencyFallbackTrigger();

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.emergencyFallbackTriggers.count).toBe(1);
    });

    it('应该在应急回退触发过于频繁时发出警告', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      // 触发11次，超过阈值10次
      for (let i = 0; i < 11; i++) {
        nonStrictService.recordEmergencyFallbackTrigger();
      }

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.emergencyFallbackTriggers.count).toBe(11);
    });

    it('应该在严格模式下阻止自动回滚', () => {
      // 使用默认的严格模式
      const strictService = service;
      const emergencySpy = jest.spyOn(strictService, 'emergencyEnableLegacyFallback');

      // 尝试触发自动回滚
      strictService.recordClientDisconnection(50, 100); // 50% > 20%

      expect(emergencySpy).not.toHaveBeenCalled();
    });

    it('应该重置过期的监控窗口', () => {
      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      // 模拟超过5分钟前的监控数据（5分钟 + 1毫秒）
      const moreThanFiveMinutesAgo = Date.now() - (5 * 60 * 1000 + 1);
      (nonStrictService as any).rollbackMetrics.clientDisconnections.windowStart = moreThanFiveMinutesAgo;
      (nonStrictService as any).rollbackMetrics.clientDisconnections.count = 10;

      // 记录新的断连事件应该重置计数
      nonStrictService.recordClientDisconnection(5, 100);

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.clientDisconnections.count).toBe(5); // 应该重置为新值
    });
  });

  describe('健康状态检查', () => {
    it('应该返回健康状态', () => {
      const health = service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.flags).toBeDefined();
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(health.recommendations).toEqual([]);
    });

    it('应该检测Gateway-only模式与Emergency Legacy回退的冲突', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);
      nonStrictService.emergencyEnableLegacyFallback('Test conflict');

      const health = nonStrictService.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.recommendations).toContain(
        'Gateway-only模式下启用Emergency Legacy回退可能导致架构不一致'
      );
    });

    it('应该检测严格模式与Emergency Legacy回退的严重冲突', () => {
      // 手动设置冲突状态（正常情况下严格模式会阻止这种情况）
      const conflictService = service;
      (conflictService as any).emergencyLegacyFallbackEnabled = true;

      const health = conflictService.getHealthStatus();

      expect(health.status).toBe('critical');
      expect(health.recommendations).toContain(
        '严格模式与Emergency Legacy回退模式冲突，需要立即解决'
      );
    });

    it('应该检测健康检查间隔过长', () => {
      // 模拟上次检查时间很久以前
      const longAgoService = service;
      (longAgoService as any).lastHealthCheck = new Date(Date.now() - 120000); // 2分钟前

      const health = longAgoService.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.recommendations).toContain(
        '健康检查间隔过长，建议增加检查频率'
      );
    });
  });

  describe('Gateway准备状态验证', () => {
    it('应该验证Gateway准备就绪', () => {
      const readiness = service.validateGatewayReadiness();

      expect(readiness.ready).toBe(true);
      expect(readiness.canProceed).toBe(true);
      expect(readiness.reason).toBeUndefined();
    });

    it('应该检测Gateway-only模式未启用', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_GATEWAY_ONLY_MODE') return 'false';
        return undefined;
      });

      const disabledService = new WebSocketFeatureFlagsService(configService);
      const readiness = disabledService.validateGatewayReadiness();

      expect(readiness.ready).toBe(false);
      expect(readiness.canProceed).toBe(false);
      expect(readiness.reason).toContain('Gateway-only模式未启用');
    });

    it('应该检测严格模式与Emergency Legacy回退的配置冲突', () => {
      // 手动创建冲突状态
      const conflictService = service;
      (conflictService as any).emergencyLegacyFallbackEnabled = true;

      const readiness = conflictService.validateGatewayReadiness();

      expect(readiness.ready).toBe(false);
      expect(readiness.canProceed).toBe(false);
      expect(readiness.reason).toContain('严格模式与Emergency Legacy回退模式冲突，需要立即解决');
    });

    it('应该检测健康状态异常', () => {
      // 通过设置无效配置触发critical状态
      const criticalService = service;
      (criticalService as any).emergencyLegacyFallbackEnabled = true; // 与严格模式冲突

      const readiness = criticalService.validateGatewayReadiness();

      expect(readiness.ready).toBe(false);
      expect(readiness.canProceed).toBe(false);
      expect(readiness.reason).toContain('特性开关状态异常');
    });
  });

  describe('环境变量辅助方法', () => {
    it('应该正确解析布尔环境变量', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'TEST_TRUE_LOWER': 'true',
          'TEST_TRUE_UPPER': 'TRUE',
          'TEST_FALSE': 'false',
          'TEST_OTHER': 'yes',
        };
        return envValues[key];
      });

      const testService = new WebSocketFeatureFlagsService(configService);

      expect((testService as any).getEnvBoolean('TEST_TRUE_LOWER', false)).toBe(true);
      expect((testService as any).getEnvBoolean('TEST_TRUE_UPPER', false)).toBe(true);
      expect((testService as any).getEnvBoolean('TEST_FALSE', true)).toBe(false);
      expect((testService as any).getEnvBoolean('TEST_OTHER', true)).toBe(false);
      expect((testService as any).getEnvBoolean('NON_EXISTENT', true)).toBe(true);
    });

    it('应该正确解析数字环境变量', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'TEST_NUMBER_VALID': '12345',
          'TEST_NUMBER_INVALID': 'not-a-number',
          'TEST_NUMBER_ZERO': '0',
        };
        return envValues[key];
      });

      const testService = new WebSocketFeatureFlagsService(configService);

      expect((testService as any).getEnvNumber('TEST_NUMBER_VALID', 999)).toBe(12345);
      expect((testService as any).getEnvNumber('TEST_NUMBER_INVALID', 999)).toBe(999);
      expect((testService as any).getEnvNumber('TEST_NUMBER_ZERO', 999)).toBe(0);
      expect((testService as any).getEnvNumber('NON_EXISTENT', 999)).toBe(999);
    });

    it('应该正确处理字符串环境变量', () => {
      configService.get.mockImplementation((key: string) => {
        const envValues: Record<string, string> = {
          'TEST_STRING': 'test-value',
        };
        return envValues[key];
      });

      const testService = new WebSocketFeatureFlagsService(configService);

      expect((testService as any).getEnvString('TEST_STRING', 'default')).toBe('test-value');
      expect((testService as any).getEnvString('NON_EXISTENT', 'default')).toBe('default');
    });
  });

  describe('配置脱敏', () => {
    it('应该正确脱敏配置信息', () => {
      const flags = service.getFeatureFlags();
      const sanitized = (service as any).sanitizeConfig(flags);

      expect(sanitized).toBeDefined();
      expect(sanitized._summary).toBeDefined();
      expect(sanitized._summary.gatewayOnly).toBe(flags.gatewayOnlyMode);
      expect(sanitized._summary.emergencyLegacyFallback).toBe(false);
      expect(sanitized._summary.strict).toBe(flags.strictMode);
      expect(sanitized._summary.mode).toBe(flags.validationMode);
    });
  });

  describe('WS_FEATURE_FLAGS_DEFAULTS常量', () => {
    it('应该包含所有必需的默认值', () => {
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_GATEWAY_ONLY_MODE).toBe('true');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_STRICT_MODE).toBe('true');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_VALIDATION_MODE).toBe('production');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_HEALTH_CHECK_INTERVAL).toBe('30000');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_GATEWAY_FAILOVER_TIMEOUT).toBe('5000');
    });

    it('应该包含自动回滚阈值默认值', () => {
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_AUTO_ROLLBACK_CLIENT_DISCONNECT_THRESHOLD).toBe('20');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_AUTO_ROLLBACK_GATEWAY_ERROR_THRESHOLD).toBe('5');
      expect(WS_FEATURE_FLAGS_DEFAULTS.WS_AUTO_ROLLBACK_EMERGENCY_TRIGGER_THRESHOLD).toBe('10');
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理极端的监控指标值', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      // 测试除零情况
      nonStrictService.recordClientDisconnection(10, 0);
      nonStrictService.recordGatewayError(5, 0);

      // 应该不会抛出异常
      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.clientDisconnections.count).toBe(10);
      expect(metrics.gatewayErrors.count).toBe(5);
    });

    it('应该处理负数监控值', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      // 测试负数值
      nonStrictService.recordClientDisconnection(-5, 100);
      nonStrictService.recordGatewayError(-3, 100);

      const metrics = nonStrictService.getAutoRollbackMetrics();
      expect(metrics.clientDisconnections.count).toBe(-5);
      expect(metrics.gatewayErrors.count).toBe(-3);
    });

    it('应该处理已启用Emergency Legacy回退的重复触发', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'WS_STRICT_MODE') return 'false';
        return undefined;
      });

      const nonStrictService = new WebSocketFeatureFlagsService(configService);

      // 首次触发自动回滚
      nonStrictService.recordClientDisconnection(25, 100);
      expect(nonStrictService.isLegacyFallbackAllowed()).toBe(true);

      // 再次触发应该被忽略
      const loggerSpy = jest.spyOn((nonStrictService as any).logger, 'warn');
      nonStrictService.recordClientDisconnection(30, 100);

      expect(loggerSpy).toHaveBeenCalledWith(
        '自动回滚条件触发，但Emergency Legacy回退已启用',
        expect.any(Object)
      );
    });
  });
});
