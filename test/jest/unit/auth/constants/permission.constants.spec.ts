import { Test, TestingModule } from '@nestjs/testing';
import { PermissionConstants } from '../../../src/auth/constants/permission.constants';

describe('PermissionConstants', () => {
  let permissionConstants: PermissionConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionConstants],
    }).compile();

    permissionConstants = module.get<PermissionConstants>(PermissionConstants);
  });

  it('should be defined', () => {
    expect(permissionConstants).toBeDefined();
  });
});
