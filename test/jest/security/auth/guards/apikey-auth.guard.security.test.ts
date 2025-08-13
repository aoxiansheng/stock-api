import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyAuthGuard } from '../../../src/auth/guards/apikey-auth.guard';

describe('ApikeyAuthGuard Security', () => {
  let apikeyAuthGuard: ApikeyAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyAuthGuard],
    }).compile();

    apikeyAuthGuard = module.get<ApikeyAuthGuard>(ApikeyAuthGuard);
  });

  it('should be defined', () => {
    expect(apikeyAuthGuard).toBeDefined();
  });
});
