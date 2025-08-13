import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedPermissionsGuard } from '../../../src/auth/guards/unified-permissions.guard';

describe('UnifiedPermissionsGuard Integration', () => {
  let unifiedPermissionsGuard: UnifiedPermissionsGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnifiedPermissionsGuard],
    }).compile();

    unifiedPermissionsGuard = module.get<UnifiedPermissionsGuard>(UnifiedPermissionsGuard);
  });

  it('should be defined', () => {
    expect(unifiedPermissionsGuard).toBeDefined();
  });
});
