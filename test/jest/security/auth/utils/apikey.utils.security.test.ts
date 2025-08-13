import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyUtils } from '../../../src/auth/utils/apikey.utils';

describe('ApikeyUtils Security', () => {
  let apikeyUtils: ApikeyUtils;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyUtils],
    }).compile();

    apikeyUtils = module.get<ApikeyUtils>(ApikeyUtils);
  });

  it('should be defined', () => {
    expect(apikeyUtils).toBeDefined();
  });
});
