import { Test, TestingModule } from '@nestjs/testing';
import { AuthTypeEnum } from '../../../src/metrics/enums/auth-type.enum';

describe('AuthTypeEnum', () => {
  let authTypeEnum: AuthTypeEnum;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthTypeEnum],
    }).compile();

    authTypeEnum = module.get<AuthTypeEnum>(AuthTypeEnum);
  });

  it('should be defined', () => {
    expect(authTypeEnum).toBeDefined();
  });
});
