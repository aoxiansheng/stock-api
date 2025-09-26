/**
 * MonitoringModule Unit Tests
 * 测试监控模块的完整配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { MonitoringModule } from '@monitoring/monitoring.module';
import { CacheModule } from '@cache/module/cache.module';
import { PaginationModule } from '@common/modules/pagination/modules/pagination.module';
import { RequestTrackingInterceptor } from '@common/core/interceptors/request-tracking.interceptor';
import { ResponseInterceptor } from '@common/core/interceptors/response.interceptor';
import { GlobalExceptionFilter } from '@common/core/filters/global-exception.filter';
import { InfrastructureModule } from '@monitoring/infrastructure/infrastructure.module';
import { CollectorModule } from '@monitoring/collector/collector.module';
import { AnalyzerModule } from '@monitoring/analyzer/analyzer.module';
import { PresenterModule } from '@monitoring/presenter/presenter.module';
import { HealthModule } from '@monitoring/health/health.module';

// Mock external modules
jest.mock('@cache/module/cache.module');
jest.mock('@common/modules/pagination/modules/pagination.module');
jest.mock('@common/core/interceptors/request-tracking.interceptor');
jest.mock('@common/core/interceptors/response.interceptor');
jest.mock('@common/core/filters/global-exception.filter');
jest.mock('@monitoring/infrastructure/infrastructure.module');
jest.mock('@monitoring/collector/collector.module');
jest.mock('@monitoring/analyzer/analyzer.module');
jest.mock('@monitoring/presenter/presenter.module');
jest.mock('@monitoring/health/health.module');

describe('MonitoringModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MonitoringModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should import required modules', () => {
      const imports = Reflect.getMetadata('imports', MonitoringModule) || [];

      expect(imports).toContain(CacheModule);
      expect(imports).toContain(PaginationModule);
      expect(imports).toContain(InfrastructureModule);
      expect(imports).toContain(CollectorModule);
      expect(imports).toContain(AnalyzerModule);
      expect(imports).toContain(PresenterModule);
      expect(imports).toContain(HealthModule);
    });

    it('should export required modules', () => {
      const exports = Reflect.getMetadata('exports', MonitoringModule) || [];

      expect(exports).toContain(CacheModule);
      expect(exports).toContain(PaginationModule);
      expect(exports).toContain(InfrastructureModule);
      expect(exports).toContain(CollectorModule);
      expect(exports).toContain(AnalyzerModule);
      expect(exports).toContain(PresenterModule);
      expect(exports).toContain(HealthModule);
    });
  });

  describe('Global Providers Configuration', () => {
    it('should configure RequestTrackingInterceptor as APP_INTERCEPTOR', () => {
      const providers = Reflect.getMetadata('providers', MonitoringModule) || [];
      const requestTrackingProvider = providers.find(
        (p: any) => p.provide === APP_INTERCEPTOR && p.useClass === RequestTrackingInterceptor
      );

      expect(requestTrackingProvider).toBeDefined();
      expect(requestTrackingProvider.provide).toBe(APP_INTERCEPTOR);
      expect(requestTrackingProvider.useClass).toBe(RequestTrackingInterceptor);
    });

    it('should configure ResponseInterceptor as APP_INTERCEPTOR', () => {
      const providers = Reflect.getMetadata('providers', MonitoringModule) || [];
      const responseProvider = providers.find(
        (p: any) => p.provide === APP_INTERCEPTOR && p.useClass === ResponseInterceptor
      );

      expect(responseProvider).toBeDefined();
      expect(responseProvider.provide).toBe(APP_INTERCEPTOR);
      expect(responseProvider.useClass).toBe(ResponseInterceptor);
    });

    it('should configure GlobalExceptionFilter as APP_FILTER', () => {
      const providers = Reflect.getMetadata('providers', MonitoringModule) || [];
      const exceptionFilterProvider = providers.find(
        (p: any) => p.provide === APP_FILTER && p.useClass === GlobalExceptionFilter
      );

      expect(exceptionFilterProvider).toBeDefined();
      expect(exceptionFilterProvider.provide).toBe(APP_FILTER);
      expect(exceptionFilterProvider.useClass).toBe(GlobalExceptionFilter);
    });

    it('should have exactly 3 providers configured', () => {
      const providers = Reflect.getMetadata('providers', MonitoringModule) || [];
      expect(providers).toHaveLength(3);
    });
  });

  describe('Module Integration', () => {
    it('should successfully compile the module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should allow getting CacheModule from exports', async () => {
      const testModule = await Test.createTestingModule({
        imports: [MonitoringModule],
      }).compile();

      expect(() => testModule.get(CacheModule)).not.toThrow();
      await testModule.close();
    });

    it('should integrate with EventEmitter module', () => {
      const imports = Reflect.getMetadata('imports', MonitoringModule) || [];
      const eventEmitterImport = imports.find((imp: any) =>
        imp && imp.module === EventEmitterModule
      );

      expect(eventEmitterImport).toBeDefined();
    });
  });

  describe('Configuration Module Integration', () => {
    it('should import ConfigModule with monitoring TTL configuration', () => {
      const imports = Reflect.getMetadata('imports', MonitoringModule) || [];
      const configImport = imports.find((imp: any) =>
        imp && imp.module === ConfigModule
      );

      expect(configImport).toBeDefined();
    });
  });
});
