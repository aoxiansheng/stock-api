import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../../../src/auth/services/token.service';

describe('TokenService Security', () => {
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });
});
