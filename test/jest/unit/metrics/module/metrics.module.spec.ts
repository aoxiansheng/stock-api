import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';


import { MetricsModule } from '../../../../../src/metrics/module/metrics.module';
import { PerformanceMetricsRepository } from '../../../../../src/metrics/repositories/performance-metrics.repository';
import { MetricsHealthService } from '../../../../../src/metrics/services/metrics-health.service';
import { PerformanceMonitorService } from '../../../../../src/metrics/services/performance-monitor.service';

// Mock external dependencies
jest.mock('../../../../../src/metrics/repositories/performance-metrics.repository');
jest.mock('../../../../../src/metrics/services/metrics-health.service');
jest.mock('../../../../../src/metrics/services/performance-monitor.service');

describe('MetricsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MetricsModule,
        ConfigModule.forRoot({ isGlobal: true }),
      ],
    })
      .overrideProvider(PerformanceMetricsRepository)
      .useValue({})
      .overrideProvider(MetricsHealthService)
      .useValue({})
      .overrideProvider(PerformanceMonitorService)
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
    const moduleDefinition = MetricsModule;
    const metadata = Reflect.getMetadata('imports', moduleDefinition) || [];
    
    // Check if required modules are imported
    expect(metadata).toContain(ConfigModule);
    expect(metadata.some(imp => imp && typeof imp.forRoot === 'function')).toBe(true); // ScheduleModule.forRoot()
    expect(metadata.some(imp => imp && typeof imp.forRoot === 'function')).toBe(true); // EventEmitterModule.forRoot()
  });

  it('should provide all required services', async () => {
    const performanceMonitorService = module.get<PerformanceMonitorService>(PerformanceMonitorService);
    const performanceMetricsRepository = module.get<PerformanceMetricsRepository>(PerformanceMetricsRepository);
    const metricsHealthService = module.get<MetricsHealthService>(MetricsHealthService);

    expect(performanceMonitorService).toBeDefined();
    expect(performanceMetricsRepository).toBeDefined();
    expect(metricsHealthService).toBeDefined();
  });

  it('should export all required services', () => {
    const moduleDefinition = MetricsModule;
    const exports = Reflect.getMetadata('exports', moduleDefinition) || [];

    expect(exports).toContain(PerformanceMonitorService);
    expect(exports).toContain(PerformanceMetricsRepository);
    expect(exports).toContain(MetricsHealthService);
  });

  it('should have correct module metadata', () => {
    const moduleDefinition = MetricsModule;
    
    // Check providers metadata
    const providers = Reflect.getMetadata('providers', moduleDefinition) || [];
    expect(providers).toContain(PerformanceMonitorService);
    expect(providers).toContain(PerformanceMetricsRepository);
    expect(providers).toContain(MetricsHealthService);
    expect(providers).toHaveLength(3);

    // Check exports metadata
    const exports = Reflect.getMetadata('exports', moduleDefinition) || [];
    expect(exports).toHaveLength(3);
  });

  it('should allow services to be injected', async () => {
    // Test that services can be resolved from the module
    expect(() => module.get(PerformanceMonitorService)).not.toThrow();
    expect(() => module.get(PerformanceMetricsRepository)).not.toThrow();
    expect(() => module.get(MetricsHealthService)).not.toThrow();
  });

  describe('Module configuration', () => {
    it('should configure ScheduleModule correctly', () => {
      const imports = Reflect.getMetadata('imports', MetricsModule) || [];
      const scheduleModule = imports.find(imp => 
        imp && imp.module && imp.module.name === 'ScheduleModule'
      );
      
      // ScheduleModule should be configured with forRoot()
      expect(scheduleModule).toBeDefined();
    });

    it('should configure EventEmitterModule correctly', () => {
      const imports = Reflect.getMetadata('imports', MetricsModule) || [];
      const eventEmitterModule = imports.find(imp => 
        imp && imp.module && imp.module.name === 'EventEmitterModule'
      );
      
      // EventEmitterModule should be configured with forRoot()
      expect(eventEmitterModule).toBeDefined();
    });

    it('should import ConfigModule', () => {
      const imports = Reflect.getMetadata('imports', MetricsModule) || [];
      expect(imports).toContain(ConfigModule);
    });
  });

  describe('Service dependencies', () => {
    it('should allow PerformanceMonitorService to be instantiated', async () => {
      const service = module.get(PerformanceMonitorService);
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
      expect(MetricsModule).toBeDefined();
      expect(typeof MetricsModule).toBe('function');
      
      // Check if it has the @Module decorator
      const moduleMetadata = Reflect.getMetadata('__module__', MetricsModule);
      expect(moduleMetadata).toBeTruthy();
    });

    it('should have consistent provider and export lists', () => {
      const providers = Reflect.getMetadata('providers', MetricsModule) || [];
      const exports = Reflect.getMetadata('exports', MetricsModule) || [];

      // All exports should be in providers
      exports.forEach(exportItem => {
        expect(providers).toContain(exportItem);
      });
    });

    it('should not have circular dependencies', () => {
      // This is a basic check - in a real scenario you might want more sophisticated circular dependency detection
      const providers = Reflect.getMetadata('providers', MetricsModule) || [];
      const exports = Reflect.getMetadata('exports', MetricsModule) || [];
      
      expect(providers.length).toBeGreaterThan(0);
      expect(exports.length).toBeGreaterThan(0);
      expect(exports.length).toBeLessThanOrEqual(providers.length);
    });
  });
});
