import { Test, TestingModule } from '@nestjs/testing';
import { PermissionUtils } from '../../../src/auth/utils/permission.utils';

describe('PermissionUtils Security', () => {
  let permissionUtils: PermissionUtils;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionUtils],
    }).compile();

    permissionUtils = module.get<PermissionUtils>(PermissionUtils);
  });

  it('should be defined', () => {
    expect(permissionUtils).toBeDefined();
  });
});
