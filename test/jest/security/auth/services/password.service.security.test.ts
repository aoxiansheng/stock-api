import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '../../../src/auth/services/password.service';

describe('PasswordService Security', () => {
  let passwordService: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    passwordService = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(passwordService).toBeDefined();
  });
});
