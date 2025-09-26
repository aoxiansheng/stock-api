import { Test, TestingModule } from '@nestjs/testing';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';
import { performanceDecoratorBus } from '@monitoring/infrastructure/decorators/infrastructure-database.decorator';

// Mock the performance decorator bus
jest.mock('@monitoring/infrastructure/decorators/infrastructure-database.decorator', () => ({
  performanceDecoratorBus: {
    emit: jest.fn(),
  },
}));

describe('AuthPerformanceService', () => {
  let service: AuthPerformanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthPerformanceService],
    }).compile();

    service = module.get<AuthPerformanceService>(AuthPerformanceService);
    jest.clearAllMocks();
  });

  describe('recordAuthFlowPerformance', () => {
    it('should emit a performance metric', async () => {
      const data = { startTime: 1000, endTime: 1050, guardName: 'JwtAuthGuard', endpoint: '/test', method: 'GET', success: true };
      await new Promise(resolve => {
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => resolve(null));
        service.recordAuthFlowPerformance(data);
      });
      expect(performanceDecoratorBus.emit).toHaveBeenCalledWith('performance-metric', expect.any(Object));
    });

    it('should log a warning for slow operations', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      const data = { startTime: 1000, endTime: 1100, guardName: 'JwtAuthGuard', endpoint: '/test', method: 'GET', success: true };
      service.recordAuthFlowPerformance(data);
      expect(loggerSpy).toHaveBeenCalledWith('慢认证操作检测', expect.any(Object));
    });

    it('should handle errors gracefully', () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => { throw new Error('emit error'); });
        const data = { startTime: 1000, endTime: 1050, guardName: 'JwtAuthGuard', endpoint: '/test', method: 'GET', success: true };
        service.recordAuthFlowPerformance(data);
        expect(loggerSpy).toHaveBeenCalledWith('记录认证流程性能失败', expect.any(Object));
    });
  });

  describe('recordAuthCachePerformance', () => {
    it('should emit a cache performance metric', async () => {
      const data = { operation: 'get', duration: 10, hit: true, keyType: 'user' };
      await new Promise(resolve => {
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => resolve(null));
        service.recordAuthCachePerformance(data);
      });
      expect(performanceDecoratorBus.emit).toHaveBeenCalledWith('performance-metric', expect.any(Object));
    });

    it('should handle errors gracefully', () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => { throw new Error('emit error'); });
        const data = { operation: 'get', duration: 10, hit: true, keyType: 'user' };
        service.recordAuthCachePerformance(data);
        expect(loggerSpy).toHaveBeenCalledWith('记录认证缓存性能失败', expect.any(Object));
    });
  });

  describe('recordAuthFlowStats', () => {
    it('should emit auth flow stats', async () => {
      const data = { totalGuards: 3, executedGuards: 2, skippedGuards: 1, totalDuration: 120, endpoint: '/test', method: 'GET', authenticated: true, authType: 'jwt' };
      await new Promise(resolve => {
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => resolve(null));
        service.recordAuthFlowStats(data);
      });
      expect(performanceDecoratorBus.emit).toHaveBeenCalledWith('performance-metric', expect.any(Object));
    });

    it('should handle errors gracefully', () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        (performanceDecoratorBus.emit as jest.Mock).mockImplementation(() => { throw new Error('emit error'); });
        const data = { totalGuards: 3, executedGuards: 2, skippedGuards: 1, totalDuration: 120, endpoint: '/test', method: 'GET', authenticated: true, authType: 'jwt' };
        service.recordAuthFlowStats(data);
        expect(loggerSpy).toHaveBeenCalledWith('记录认证流程统计失败', expect.any(Object));
    });
  });
});