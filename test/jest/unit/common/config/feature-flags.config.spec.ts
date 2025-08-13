import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsConfig } from '../../../src/common/config/feature-flags.config';

describe('FeatureFlagsConfig', () => {
  let featureFlagsConfig: FeatureFlagsConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureFlagsConfig],
    }).compile();

    featureFlagsConfig = module.get<FeatureFlagsConfig>(FeatureFlagsConfig);
  });

  it('should be defined', () => {
    expect(featureFlagsConfig).toBeDefined();
  });
});
