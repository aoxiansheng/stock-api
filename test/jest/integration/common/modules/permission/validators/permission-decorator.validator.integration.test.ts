import { Test, TestingModule } from '@nestjs/testing';
import { PermissionDecoratorValidator } from '../../../src/common/modules/permission/validators/permission-decorator.validator';

describe('PermissionDecoratorValidator Integration', () => {
  let permissionDecoratorValidator: PermissionDecoratorValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionDecoratorValidator],
    }).compile();

    permissionDecoratorValidator = module.get<PermissionDecoratorValidator>(PermissionDecoratorValidator);
  });

  it('should be defined', () => {
    expect(permissionDecoratorValidator).toBeDefined();
  });
});
