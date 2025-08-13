import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../../../src/auth/services/permission.service';

describe('PermissionService Security', () => {
  let permissionService: PermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionService],
    }).compile();

    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(permissionService).toBeDefined();
  });
});
