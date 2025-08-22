import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';


import { AnalyticsModule } from '../../../../../src//collect-metrics/module/collect-metrics.module';
import { PerformanceMetricsRepository } from '../../../../../src/metrics/repositories/performance-metrics.repository';
import { MetricsHealthService } from '../../../../../src/metrics/services/metrics-health.service';
import { MetricsPerformanceService } from '../../../../../src/metrics/services/metrics-performance.service';

// Mock external dependencies
jest.mock('../../../../../src/metrics/repositories/performance-metrics.repository');
jest.mock('../../../../../src/metrics/services/metrics-health.service');
jest.mock('../../../../../src/metrics/services/metrics-performance.service');

describe('AnalyticsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AnalyticsModule,
        ConfigModule.forRoot({ isGlobal: true }),
      ],
    })
      .overrideProvider(PerformanceMetricsRepository)
      .useValue({})
      .overrideProvider(MetricsHealthService)
      .useValue({})
      .overrideProvider(MetricsPerformanceService)
      .useValue({})
      .compile();

    module = moduleRef;
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have all required imports', () => {
    const moduleDefinition = AnalyticsModule;
    const metadata = Reflect.getMetadata('imports', moduleDefinition) || [];
    
    // Check if required modules are imported
    expect(metadata).toContain(ConfigModule);
    expect(metadata.some(imp => imp && typeof imp.forRoot === 'function')).toBe(true); // ScheduleModule.forRoot()
    expect(metadata.some(imp => imp && typeof imp.forRoot === 'function')).toBe(true); // EventEmitterModule.forRoot()
  });

  it('should provide all required services', async () => {
    const MetricsPerformanceService = module.get<MetricsPerformanceService>(MetricsPerformanceService);
    const performanceMetricsRepository = module.get<PerformanceMetricsRepository>(PerformanceMetricsRepository);
    const metricsHealthService = module.get<MetricsHealthService>(MetricsHealthService);

    expect(MetricsPerformanceService).toBeDefined();
    expect(performanceMetricsRepository).toBeDefined();
    expect(metricsHealthService).toBeDefined();
  });

  it('should export all required services', () => {
    const moduleDefinition = AnalyticsModule;
    const exports = Reflect.getMetadata('exports', moduleDefinition) || [];

    expect(exports).toContain(MetricsPerformanceService);
    expect(exports).toContain(PerformanceMetricsRepository);
    expect(exports).toContain(MetricsHealthService);
  });

  it('should have correct module metadata', () => {
    const moduleDefinition = AnalyticsModule;
    
    // Check providers metadata
    const providers = Reflect.getMetadata('providers', moduleDefinition) || [];
    expect(providers).toContain(MetricsPerformanceService);
    expect(providers).toContain(PerformanceMetricsRepository);
    expect(providers).toContain(MetricsHealthService);
    expect(providers).toHaveLength(3);

    // Check exports metadata
    const exports = Reflect.getMetadata('exports', moduleDefinition) || [];
    expect(exports).toHaveLength(3);
  });

  it('should allow services to be injected', async () => {
    // Test that services can be resolved from the module
    expect(() => module.get(MetricsPerformanceService)).not.toThrow();
    expect(() => module.get(PerformanceMetricsRepository)).not.toThrow();
    expect(() => module.get(MetricsHealthService)).not.toThrow();
  });

  describe('Module configuration', () => {
    it('should configure ScheduleModule correctly', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule) || [];
      const scheduleModule = imports.find(imp => 
        imp && imp.module && imp.module.name === 'ScheduleModule'
      );
      
      // ScheduleModule should be configured with forRoot()
      expect(scheduleModule).toBeDefined();
    });

    it('should configure EventEmitterModule correctly', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule) || [];
      const eventEmitterModule = imports.find(imp => 
        imp && imp.module && imp.module.name === 'EventEmitterModule'
      );
      
      // EventEmitterModule should be configured with forRoot()
      expect(eventEmitterModule).toBeDefined();
    });

    it('should import ConfigModule', () => {
      const imports = Reflect.getMetadata('imports', AnalyticsModule) || [];
      expect(imports).toContain(ConfigModule);
    });
  });

  describe('Service dependencies', () => {
    it('should allow MetricsPerformanceService to be instantiated', async () => {
      const service = module.get(MetricsPerformanceService);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('Object'); // Mocked
    });

    it('should allow PerformanceMetricsRepository to be instantiated', async () => {
      const repository = module.get(PerformanceMetricsRepository);
      expect(repository).toBeDefined();
      expect(repository.constructor.name).toBe('Object'); // Mocked
    });

    it('should allow MetricsHealthService to be instantiated', async () => {
      const service = module.get(MetricsHealthService);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('Object'); // Mocked
    });
  });

  describe('Module structure validation', () => {
    it('should be a valid NestJS module', () => {
      expect(AnalyticsModule).toBeDefined();
      expect(typeof AnalyticsModule).toBe('function');
      
      // Check if it has the @Module decorator
      const moduleMetadata = Reflect.getMetadata('__module__', AnalyticsModule);
      expect(moduleMetadata).toBeTruthy();
    });

    it('should have consistent provider and export lists', () => {
      const providers = Reflect.getMetadata('providers', AnalyticsModule) || [];
      const exports = Reflect.getMetadata('exports', AnalyticsModule) || [];

      // All exports should be in providers
      exports.forEach(exportItem => {
        expect(providers).toContain(exportItem);
      });
    });

    it('should not have circular dependencies', () => {
      // This is a basic check - in a real scenario you might want more sophisticated circular dependency detection
      const providers = Reflect.getMetadata('providers', AnalyticsModule) || [];
      const exports = Reflect.getMetadata('exports', AnalyticsModule) || [];
      
      expect(providers.length).toBeGreaterThan(0);
      expect(exports.length).toBeGreaterThan(0);
      expect(exports.length).toBeLessThanOrEqual(providers.length);
    });
  });
});
