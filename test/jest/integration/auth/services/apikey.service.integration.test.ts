import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyService } from '../../../src/auth/services/apikey.service';

describe('ApikeyService Integration', () => {
  let apikeyService: ApikeyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyService],
    }).compile();

    apikeyService = module.get<ApikeyService>(ApikeyService);
  });

  it('should be defined', () => {
    expect(apikeyService).toBeDefined();
  });
});
