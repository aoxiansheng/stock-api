import { Test, TestingModule } from '@nestjs/testing';
import { AuthDecorator } from '../../../src/auth/decorators/auth.decorator';

describe('AuthDecorator Integration', () => {
  let authDecorator: AuthDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthDecorator],
    }).compile();

    authDecorator = module.get<AuthDecorator>(AuthDecorator);
  });

  it('should be defined', () => {
    expect(authDecorator).toBeDefined();
  });
});
