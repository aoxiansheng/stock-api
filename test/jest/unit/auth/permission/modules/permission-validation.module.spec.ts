import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationModule } from '@auth/permission/modules/permission-validation.module';
import { PermissionDecoratorValidator } from '@auth/permission/validators/permission-decorator.validator';
import { PermissionValidationService } from '@auth/permission/services/permission-validation.service';
import { AuthPermissionValidationService } from '@auth/permission/adapters/auth-permission.adapter';
import { DiscoveryModule } from '@nestjs/core';

describe('PermissionValidationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PermissionValidationModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should import DiscoveryModule', () => {
    const discoveryModule = module.get(DiscoveryModule);
    expect(discoveryModule).toBeDefined();
  });

  describe('providers', () => {
    it('should provide PermissionDecoratorValidator', () => {
      const validator = module.get(PermissionDecoratorValidator);
      expect(validator).toBeDefined();
      expect(validator).toBeInstanceOf(PermissionDecoratorValidator);
    });

    it('should provide PermissionValidationService', () => {
      const service = module.get(PermissionValidationService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PermissionValidationService);
    });

    it('should provide AuthPermissionValidationService', () => {
      const service = module.get(AuthPermissionValidationService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuthPermissionValidationService);
    });
  });

  describe('exports', () => {
    it('should export PermissionDecoratorValidator', () => {
      const validator = module.get(PermissionDecoratorValidator);
      expect(validator).toBeDefined();
    });

    it('should export PermissionValidationService', () => {
      const service = module.get(PermissionValidationService);
      expect(service).toBeDefined();
    });

    it('should export AuthPermissionValidationService', () => {
      const service = module.get(AuthPermissionValidationService);
      expect(service).toBeDefined();
    });
  });
});