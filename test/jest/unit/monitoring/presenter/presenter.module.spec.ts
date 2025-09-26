/**
 * PresenterModule Unit Tests
 * 测试监控展示层模块的配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PresenterModule } from '@monitoring/presenter/presenter.module';
import { PresenterController } from '@monitoring/presenter/presenter.controller';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { PaginationModule } from '@common/modules/pagination/modules/pagination.module';
import { AnalyzerModule } from '@monitoring/analyzer/analyzer.module';
import { HealthModule } from '@monitoring/health/health.module';

describe('PresenterModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PresenterModule],
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
      const imports = Reflect.getMetadata('imports', PresenterModule) || [];

      expect(imports).toContain(PaginationModule);
      expect(imports).toContain(AnalyzerModule);
      expect(imports).toContain(HealthModule);
    });

    it('should configure required controllers', () => {
      const controllers = Reflect.getMetadata('controllers', PresenterModule) || [];

      expect(controllers).toContain(PresenterController);
    });

    it('should configure required providers', () => {
      const providers = Reflect.getMetadata('providers', PresenterModule) || [];

      expect(providers).toContain(PresenterService);
    });

    it('should export required services', () => {
      const exports = Reflect.getMetadata('exports', PresenterModule) || [];

      expect(exports).toContain(PresenterService);
    });
  });

  describe('Module Integration', () => {
    it('should successfully compile the module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [PresenterModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should allow getting PresenterController from providers', async () => {
      const testModule = await Test.createTestingModule({
        imports: [PresenterModule],
      }).compile();

      expect(() => testModule.get(PresenterController)).not.toThrow();
      await testModule.close();
    });

    it('should allow getting PresenterService from providers', async () => {
      const testModule = await Test.createTestingModule({
        imports: [PresenterModule],
      }).compile();

      expect(() => testModule.get(PresenterService)).not.toThrow();
      await testModule.close();
    });
  });
});