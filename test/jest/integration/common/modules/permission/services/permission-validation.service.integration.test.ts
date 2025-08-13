import { Test, TestingModule } from '@nestjs/testing';
import { PermissionValidationService } from '../../../src/common/modules/permission/services/permission-validation.service';

describe('PermissionValidationService Integration', () => {
  let permissionValidationService: PermissionValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionValidationService],
    }).compile();

    permissionValidationService = module.get<PermissionValidationService>(PermissionValidationService);
  });

  it('should be defined', () => {
    expect(permissionValidationService).toBeDefined();
  });
});
