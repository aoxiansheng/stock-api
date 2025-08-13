import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyConstants } from '../../../src/auth/constants/apikey.constants';

describe('ApikeyConstants Integration', () => {
  let apikeyConstants: ApikeyConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyConstants],
    }).compile();

    apikeyConstants = module.get<ApikeyConstants>(ApikeyConstants);
  });

  it('should be defined', () => {
    expect(apikeyConstants).toBeDefined();
  });
});
