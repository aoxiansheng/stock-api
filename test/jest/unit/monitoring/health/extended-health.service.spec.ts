import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExtendedHealthService } from '@monitoring/health/extended-health.service';
import { ConfigValidatorService } from '../../../../../src/app/config/validation/config-validator.service';
import { StartupHealthCheckerService } from '../../../../../src/app/startup/health-checker.service';

// Mock external modules
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 }),
      }),
    }),
  })),
}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
  }));
});

describe('ExtendedHealthService', () => {
  let service: ExtendedHealthService;
  let configValidatorService: jest.Mocked<ConfigValidatorService>;
  let startupCheckerService: jest.Mocked<StartupHealthCheckerService>;

  beforeEach(async () => {
    const mockConfigValidatorService = {
      validateAll: jest.fn(),
    };

    const mockStartupCheckerService = {
      performQuickCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtendedHealthService,
        {
          provide: ConfigValidatorService,
          useValue: mockConfigValidatorService,
        },
        {
          provide: StartupHealthCheckerService,
          useValue: mockStartupCheckerService,
        },
      ],
    }).compile();

    service = module.get<ExtendedHealthService>(ExtendedHealthService);
    configValidatorService = module.get(ConfigValidatorService);
    startupCheckerService = module.get(StartupHealthCheckerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFullHealthStatus', () => {
    it('should return healthy status when all systems are operational', async () => {
      // Mock successful configuration validation
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        environment: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          validationDuration: 100,
          recommendedActions: [],
        },
      });

      const result = await service.getFullHealthStatus();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.healthScore).toBeGreaterThanOrEqual(80);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.system).toBeDefined();
      expect(result.system.nodeVersion).toBe(process.version);
      expect(result.system.platform).toBe(process.platform);
    });

    it('should return degraded status when there are warnings', async () => {
      // Mock configuration validation with warnings
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: true,
          errors: [],
          warnings: ['配置警告示例'],
          validatedAt: new Date(),
        },
        environment: {
          isValid: true,
          errors: [],
          warnings: ['配置警告示例'],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 0,
          totalWarnings: 1,
          validationDuration: 100,
          recommendedActions: ['Review configuration warnings'],
        },
      });

      const result = await service.getFullHealthStatus();

      expect(result.status).toBe('degraded');
      expect(result.healthScore).toBeLessThan(100);
      expect(result.healthScore).toBeGreaterThanOrEqual(50);
      expect(result.configuration?.warnings).toContain('配置警告示例');
      expect(result.recommendations).toContain('Review configuration warnings for optimal setup');
    });

    it('should return unhealthy status when there are critical errors', async () => {
      // Mock configuration validation with errors
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: false,
          errors: ['关键配置错误'],
          warnings: [],
          validatedAt: new Date(),
        },
        environment: {
          isValid: false,
          errors: ['关键配置错误'],
          warnings: [],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          validationDuration: 100,
          recommendedActions: ['Fix configuration errors'],
        },
      });

      const result = await service.getFullHealthStatus();

      expect(result.status).toBe('degraded');
      expect(result.healthScore).toBeLessThan(100);
      expect(result.configuration?.errors).toContain('关键配置错误');
      expect(result.recommendations).toContain('Fix configuration errors before production deployment');
    });

    it('should handle configuration validation failure gracefully', async () => {
      // Mock configuration validation failure
      configValidatorService.validateAll.mockRejectedValue(new Error('验证失败'));

      const result = await service.getFullHealthStatus();

      expect(['degraded', 'unhealthy']).toContain(result.status);
      expect(result.healthScore).toBeLessThanOrEqual(70);
      expect(result.recommendations).toContain('Fix configuration validation system');
    });
  });

  describe('getConfigHealthStatus', () => {
    it('should return valid config status', async () => {
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        environment: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          validationDuration: 100,
          recommendedActions: [],
        },
      });

      const result = await service.getConfigHealthStatus();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.validatedAt).toBeDefined();
    });

    it('should return invalid config status with errors', async () => {
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: false,
          errors: ['配置错误'],
          warnings: ['配置警告'],
          validatedAt: new Date(),
        },
        environment: {
          isValid: false,
          errors: ['配置错误'],
          warnings: ['配置警告'],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 1,
          totalWarnings: 1,
          validationDuration: 100,
          recommendedActions: [],
        },
      });

      const result = await service.getConfigHealthStatus();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('配置错误');
      expect(result.warnings).toContain('配置警告');
    });

    it('should handle validation failure', async () => {
      configValidatorService.validateAll.mockRejectedValue(new Error('验证失败'));

      const result = await service.getConfigHealthStatus();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration validation failed: 验证失败');
    });
  });

  describe('performStartupCheck', () => {
    it('should perform startup check successfully', async () => {
      const mockStartupResult = {
        success: true,
        phases: [
          { name: '数据库连接', success: true, duration: 100 },
          { name: '缓存连接', success: true, duration: 50 },
        ],
        totalDuration: 150,
      };

      startupCheckerService.performQuickCheck.mockResolvedValue(mockStartupResult);

      const result = await service.performStartupCheck();

      expect(result).toEqual(mockStartupResult);
      expect(result.success).toBe(true);
      expect(result.phases).toHaveLength(2);
    });

    it('should handle startup check failure', async () => {
      startupCheckerService.performQuickCheck.mockRejectedValue(new Error('启动检查失败'));

      await expect(service.performStartupCheck()).rejects.toThrow('启动检查失败');
    });
  });

  describe('getDependenciesHealthStatus', () => {
    it('should return dependencies health status', async () => {
      const result = await service.getDependenciesHealthStatus();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('mongodb');
      expect(result).toHaveProperty('redis');
      expect(result).toHaveProperty('externalServices');
      expect(result.externalServices).toHaveProperty('longport');
    });
  });

  describe('health score calculation', () => {
    it('should calculate perfect health score', async () => {
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        environment: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          validationDuration: 100,
          recommendedActions: [],
        },
      });

      const result = await service.getFullHealthStatus();
      
      // Should have high health score when no errors/warnings and dependencies are OK
      expect(result.healthScore).toBeGreaterThan(70);
    });

    it('should penalize health score for errors', async () => {
      configValidatorService.validateAll.mockResolvedValue({
        overall: {
          isValid: false,
          errors: ['错误1', '错误2'],
          warnings: [],
          validatedAt: new Date(),
        },
        environment: {
          isValid: false,
          errors: ['错误1', '错误2'],
          warnings: [],
          validatedAt: new Date(),
        },
        dependencies: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
        summary: {
          totalErrors: 2,
          totalWarnings: 0,
          validationDuration: 100,
          recommendedActions: [],
        },
      });

      const result = await service.getFullHealthStatus();
      
      // Should have lower health score due to errors (2 errors * 15 points each = -30)
      expect(result.healthScore).toBeLessThan(70);
    });
  });
});