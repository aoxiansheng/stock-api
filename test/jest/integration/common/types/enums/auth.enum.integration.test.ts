import { Test, TestingModule } from '@nestjs/testing';
import { AuthEnum } from '../../../src/common/types/enums/auth.enum';

describe('AuthEnum Integration', () => {
  let authEnum: AuthEnum;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthEnum],
    }).compile();

    authEnum = module.get<AuthEnum>(AuthEnum);
  });

  it('should be defined', () => {
    expect(authEnum).toBeDefined();
  });
});
