import { Test, TestingModule } from '@nestjs/testing';
import { StartupOrchestratorService } from '../../../../../src/app/bootstrap/startup-orchestrator.service';
import { EnvironmentValidationPhase } from '../../../../../src/app/bootstrap/phases/environment-validation.phase';
import { DependenciesCheckPhase } from '../../../../../src/app/bootstrap/phases/dependencies-check.phase';
import { HealthCheckPhase } from '../../../../../src/app/bootstrap/phases/health-check.phase';

describe('StartupOrchestratorService', () => {
  let service: StartupOrchestratorService;
  let environmentPhase: EnvironmentValidationPhase;
  let dependenciesPhase: DependenciesCheckPhase;
  let healthCheckPhase: HealthCheckPhase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupOrchestratorService,
        {
          provide: EnvironmentValidationPhase,
          useValue: {
            getName: jest.fn().mockReturnValue('EnvironmentValidation'),
            getTimeout: jest.fn().mockReturnValue(5000),
            execute: jest.fn().mockResolvedValue({ success: true, message: 'Environment validation passed' }),
          },
        },
        {
          provide: DependenciesCheckPhase,
          useValue: {
            getName: jest.fn().mockReturnValue('DependenciesCheck'),
            getTimeout: jest.fn().mockReturnValue(10000),
            execute: jest.fn().mockResolvedValue({ success: true, message: 'Dependencies check passed' }),
          },
        },
        {
          provide: HealthCheckPhase,
          useValue: {
            getName: jest.fn().mockReturnValue('HealthCheck'),
            getTimeout: jest.fn().mockReturnValue(15000),
            execute: jest.fn().mockResolvedValue({ success: true, message: 'Health check passed' }),
          },
        },
      ],
    }).compile();

    service = module.get<StartupOrchestratorService>(StartupOrchestratorService);
    environmentPhase = module.get<EnvironmentValidationPhase>(EnvironmentValidationPhase);
    dependenciesPhase = module.get<DependenciesCheckPhase>(DependenciesCheckPhase);
    healthCheckPhase = module.get<HealthCheckPhase>(HealthCheckPhase);
  });

  describe('基本功能', () => {
    it('应该能够实例化', () => {
      expect(service).toBeDefined();
    });

    it('应该依赖于所有启动阶段', () => {
      expect(environmentPhase).toBeDefined();
      expect(dependenciesPhase).toBeDefined();
      expect(healthCheckPhase).toBeDefined();
    });
  });

  describe('executeStartupPhases()', () => {
    it('应该按顺序执行所有启动阶段', async () => {
      const result = await service.executeStartupPhases();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.phases).toHaveLength(3);

      // 验证执行顺序
      expect(environmentPhase.execute).toHaveBeenCalledBefore(dependenciesPhase.execute as jest.Mock);
      expect(dependenciesPhase.execute).toHaveBeenCalledBefore(healthCheckPhase.execute as jest.Mock);
    });

    it('应该返回完整的执行结果', async () => {
      const result = await service.executeStartupPhases();

      expect(result.success).toBe(true);
      expect(result.phases).toEqual([
        expect.objectContaining({
          name: 'EnvironmentValidation',
          success: true,
          message: 'Environment validation passed',
          duration: expect.any(Number),
        }),
        expect.objectContaining({
          name: 'DependenciesCheck',
          success: true,
          message: 'Dependencies check passed',
          duration: expect.any(Number),
        }),
        expect.objectContaining({
          name: 'HealthCheck',
          success: true,
          message: 'Health check passed',
          duration: expect.any(Number),
        }),
      ]);
      expect(typeof result.totalDuration).toBe('number');
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('应该记录执行时间', async () => {
      const result = await service.executeStartupPhases();

      expect(result.totalDuration).toBeGreaterThan(0);
      result.phases.forEach(phase => {
        expect(phase.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('异常处理', () => {
    it('应该处理单个阶段执行失败', async () => {
      (dependenciesPhase.execute as jest.Mock).mockRejectedValue(
        new Error('Dependencies check failed')
      );

      const result = await service.executeStartupPhases();

      expect(result.success).toBe(false);
      expect(result.phases).toHaveLength(3);
      
      // 第一个阶段应该成功
      expect(result.phases[0].success).toBe(true);
      
      // 第二个阶段应该失败
      expect(result.phases[1].success).toBe(false);
      expect(result.phases[1].error).toBe('Dependencies check failed');
      
      // 第三个阶段应该成功（继续执行）
      expect(result.phases[2].success).toBe(true);
    });

    it('应该处理多个阶段执行失败', async () => {
      (environmentPhase.execute as jest.Mock).mockRejectedValue(
        new Error('Environment validation failed')
      );
      (healthCheckPhase.execute as jest.Mock).mockRejectedValue(
        new Error('Health check failed')
      );

      const result = await service.executeStartupPhases();

      expect(result.success).toBe(false);
      expect(result.phases.filter(phase => !phase.success)).toHaveLength(2);
    });

    it('应该在阶段超时时继续执行', async () => {
      // 模拟超时
      (dependenciesPhase.execute as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'Late success' }), 20000))
      );

      const result = await service.executeStartupPhases();

      expect(result.phases).toHaveLength(3);
      // 超时的阶段应该被标记为失败
      expect(result.phases[1].success).toBe(false);
      expect(result.phases[1].error).toContain('timeout');
    });
  });

  describe('状态管理', () => {
    it('应该在执行过程中正确更新状态', async () => {
      let executionCount = 0;
      
      (environmentPhase.execute as jest.Mock).mockImplementation(async () => {
        executionCount++;
        return { success: true, message: `Execution ${executionCount}` };
      });

      const result = await service.executeStartupPhases();

      expect(result.phases[0].message).toBe('Execution 1');
      expect(executionCount).toBe(1);
    });

    it('应该能够重复执行启动阶段', async () => {
      const firstResult = await service.executeStartupPhases();
      const secondResult = await service.executeStartupPhases();

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      
      // 每个阶段都应该被调用两次
      expect(environmentPhase.execute).toHaveBeenCalledTimes(2);
      expect(dependenciesPhase.execute).toHaveBeenCalledTimes(2);
      expect(healthCheckPhase.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('性能验证', () => {
    it('应该在合理时间内完成启动', async () => {
      const startTime = Date.now();
      await service.executeStartupPhases();
      const duration = Date.now() - startTime;

      // 启动应该在5秒内完成（正常情况下）
      expect(duration).toBeLessThan(5000);
    });
  });
});