import { Test, TestingModule } from '@nestjs/testing';
import { ConstantsVersion } from '../../../src/common/constants/unified/constants-version';

describe('ConstantsVersion Integration', () => {
  let constantsVersion: ConstantsVersion;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConstantsVersion],
    }).compile();

    constantsVersion = module.get<ConstantsVersion>(ConstantsVersion);
  });

  it('should be defined', () => {
    expect(constantsVersion).toBeDefined();
  });
});
