import { Test, TestingModule } from '@nestjs/testing';
import { AuthDto } from '../../../src/auth/dto/auth.dto';

describe('AuthDto Integration', () => {
  let authDto: AuthDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthDto],
    }).compile();

    authDto = module.get<AuthDto>(AuthDto);
  });

  it('should be defined', () => {
    expect(authDto).toBeDefined();
  });
});
