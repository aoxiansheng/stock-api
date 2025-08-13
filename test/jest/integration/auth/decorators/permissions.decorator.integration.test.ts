import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsDecorator } from '../../../src/auth/decorators/permissions.decorator';

describe('PermissionsDecorator Integration', () => {
  let permissionsDecorator: PermissionsDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsDecorator],
    }).compile();

    permissionsDecorator = module.get<PermissionsDecorator>(PermissionsDecorator);
  });

  it('should be defined', () => {
    expect(permissionsDecorator).toBeDefined();
  });
});
