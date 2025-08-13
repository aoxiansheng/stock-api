import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationModule } from '../../../src/common/modules/permission/modules/permission-validation.module';

describe('PermissionValidationModule', () => {
  let permissionValidationModule: PermissionValidationModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionValidationModule],
    }).compile();

    permissionValidationModule = module.get<PermissionValidationModule>(PermissionValidationModule);
  });

  it('should be defined', () => {
    expect(permissionValidationModule).toBeDefined();
  });
});
