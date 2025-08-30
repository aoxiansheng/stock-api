import { Test, TestingModule } from '@nestjs/testing';
import { PresenterController } from '@monitoring/presenter/presenter.controller';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { ExtendedHealthService } from '@monitoring/health/extended-health.service';
import { ExtendedHealthStatus } from '@monitoring/health/extended-health.service';

describe('PresenterController - Health Endpoints', () => {
  let controller: PresenterController;
  let presenterService: jest.Mocked<PresenterService>;
  let extendedHealthService: jest.Mocked<ExtendedHealthService>;

  beforeEach(async () => {
    const mockPresenterService = {
      getBasicHealthStatus: jest.fn(),
      getHealthScore: jest.fn(),
      getHealthReport: jest.fn(),
    };

    const mockExtendedHealthService = {
      getFullHealthStatus: jest.fn(),
      getConfigHealthStatus: jest.fn(),
      getDependenciesHealthStatus: jest.fn(),
      performStartupCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenterController],
      providers: [
        {
          provide: PresenterService,
          useValue: mockPresenterService,
        },
        {
          provide: ExtendedHealthService,
          useValue: mockExtendedHealthService,
        },
      ],
    }).compile();

    controller = module.get<PresenterController>(PresenterController);
    presenterService = module.get(PresenterService);
    extendedHealthService = module.get(ExtendedHealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getExtendedHealthStatus', () => {
    it('should return extended health status', async () => {
      const mockHealthStatus: ExtendedHealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 3600,
        version: '1.0.0',
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          memory: {
            used: 100000000,
            total: 500000000,
            percentage: 20,
          },
          cpu: {
            usage: 15,
          },
        },
        configuration: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date().toISOString(),
        },
        dependencies: {
          mongodb: {
            status: 'connected',
            responseTime: 50,
          },
          redis: {
            status: 'connected',
            responseTime: 10,
          },
          externalServices: {
            longport: {
              status: 'available',
            },
          },
        },
        startup: {
          lastCheck: new Date().toISOString(),
          success: true,
          phases: [
            {
              name: '数据库连接',
              success: true,
              duration: 100,
            },
            {
              name: '缓存连接',
              success: true,
              duration: 50,
            },
          ],
        },
        healthScore: 95,
        recommendations: ['System is operating normally'],
      };

      extendedHealthService.getFullHealthStatus.mockResolvedValue(mockHealthStatus);

      const result = await controller.getExtendedHealthStatus();

      expect(result).toEqual(mockHealthStatus);
      expect(extendedHealthService.getFullHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle degraded health status', async () => {
      const mockHealthStatus: ExtendedHealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 3600,
        version: '1.0.0',
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          memory: {
            used: 100000000,
            total: 500000000,
            percentage: 20,
          },
          cpu: {
            usage: 15,
          },
        },
        configuration: {
          isValid: true,
          errors: [],
          warnings: ['配置警告'],
          validatedAt: new Date().toISOString(),
        },
        healthScore: 75,
        recommendations: ['Review configuration warnings for optimal setup'],
      };

      extendedHealthService.getFullHealthStatus.mockResolvedValue(mockHealthStatus);

      const result = await controller.getExtendedHealthStatus();

      expect(result.status).toBe('degraded');
      expect(result.healthScore).toBe(75);
      expect(result.configuration?.warnings).toContain('配置警告');
    });
  });

  describe('getConfigHealthStatus', () => {
    it('should return config health status', async () => {
      const mockConfigHealth = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: new Date().toISOString(),
      };

      extendedHealthService.getConfigHealthStatus.mockResolvedValue(mockConfigHealth);

      const result = await controller.getConfigHealthStatus();

      expect(result).toEqual(mockConfigHealth);
      expect(extendedHealthService.getConfigHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should return config health status with errors', async () => {
      const mockConfigHealth = {
        isValid: false,
        errors: ['配置错误'],
        warnings: ['配置警告'],
        validatedAt: new Date().toISOString(),
      };

      extendedHealthService.getConfigHealthStatus.mockResolvedValue(mockConfigHealth);

      const result = await controller.getConfigHealthStatus();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('配置错误');
      expect(result.warnings).toContain('配置警告');
    });
  });

  describe('getDependenciesHealthStatus', () => {
    it('should return dependencies health status', async () => {
      const mockDependenciesHealth = {
        mongodb: {
          status: 'connected' as const,
          responseTime: 50,
        },
        redis: {
          status: 'connected' as const,
          responseTime: 10,
        },
        externalServices: {
          longport: {
            status: 'available' as const,
          },
        },
      };

      extendedHealthService.getDependenciesHealthStatus.mockResolvedValue(mockDependenciesHealth);

      const result = await controller.getDependenciesHealthStatus();

      expect(result).toEqual(mockDependenciesHealth);
      expect(result.mongodb.status).toBe('connected');
      expect(result.redis.status).toBe('connected');
      expect(result.externalServices.longport.status).toBe('available');
    });

    it('should handle connection errors', async () => {
      const mockDependenciesHealth = {
        mongodb: {
          status: 'error' as const,
          responseTime: 5000,
          error: 'Connection timeout',
        },
        redis: {
          status: 'disconnected' as const,
          error: 'Redis server not found',
        },
        externalServices: {
          longport: {
            status: 'not_configured' as const,
          },
        },
      };

      extendedHealthService.getDependenciesHealthStatus.mockResolvedValue(mockDependenciesHealth);

      const result = await controller.getDependenciesHealthStatus();

      expect(result.mongodb.status).toBe('error');
      expect(result.mongodb.error).toBe('Connection timeout');
      expect(result.redis.status).toBe('disconnected');
      expect(result.externalServices.longport.status).toBe('not_configured');
    });
  });

  describe('performStartupCheck', () => {
    it('should perform startup check successfully', async () => {
      const mockStartupResult = {
        success: true,
        phases: [
          {
            name: '数据库连接',
            success: true,
            duration: 100,
          },
          {
            name: '缓存连接',
            success: true,
            duration: 50,
          },
        ],
        totalDuration: 150,
        validationResult: {
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
        },
      };

      extendedHealthService.performStartupCheck.mockResolvedValue(mockStartupResult);

      const result = await controller.performStartupCheck();

      expect(result).toEqual(mockStartupResult);
      expect(result.success).toBe(true);
      expect(result.phases).toHaveLength(2);
      expect(result.totalDuration).toBe(150);
      expect(extendedHealthService.performStartupCheck).toHaveBeenCalledTimes(1);
    });

    it('should handle startup check failures', async () => {
      const mockStartupResult = {
        success: false,
        phases: [
          {
            name: '数据库连接',
            success: false,
            duration: 5000,
            error: 'Database connection timeout',
          },
          {
            name: '缓存连接',
            success: true,
            duration: 50,
          },
        ],
        totalDuration: 5050,
      };

      extendedHealthService.performStartupCheck.mockResolvedValue(mockStartupResult);

      const result = await controller.performStartupCheck();

      expect(result.success).toBe(false);
      expect(result.phases[0].success).toBe(false);
      expect(result.phases[0].error).toBe('Database connection timeout');
      expect(result.phases[1].success).toBe(true);
    });
  });

  describe('health endpoints integration', () => {
    it('should have all health endpoints defined', () => {
      expect(controller.getExtendedHealthStatus).toBeDefined();
      expect(controller.getConfigHealthStatus).toBeDefined();
      expect(controller.getDependenciesHealthStatus).toBeDefined();
      expect(controller.performStartupCheck).toBeDefined();
    });

    it('should call appropriate service methods', async () => {
      // Test that controller methods call the correct service methods
      await controller.getExtendedHealthStatus();
      expect(extendedHealthService.getFullHealthStatus).toHaveBeenCalled();

      await controller.getConfigHealthStatus();
      expect(extendedHealthService.getConfigHealthStatus).toHaveBeenCalled();

      await controller.getDependenciesHealthStatus();
      expect(extendedHealthService.getDependenciesHealthStatus).toHaveBeenCalled();

      await controller.performStartupCheck();
      expect(extendedHealthService.performStartupCheck).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      extendedHealthService.getFullHealthStatus.mockRejectedValue(error);

      await expect(controller.getExtendedHealthStatus()).rejects.toThrow('Service error');
    });

    it('should handle config validation errors', async () => {
      const error = new Error('Config validation failed');
      extendedHealthService.getConfigHealthStatus.mockRejectedValue(error);

      await expect(controller.getConfigHealthStatus()).rejects.toThrow('Config validation failed');
    });

    it('should handle startup check errors', async () => {
      const error = new Error('Startup check failed');
      extendedHealthService.performStartupCheck.mockRejectedValue(error);

      await expect(controller.performStartupCheck()).rejects.toThrow('Startup check failed');
    });
  });
});