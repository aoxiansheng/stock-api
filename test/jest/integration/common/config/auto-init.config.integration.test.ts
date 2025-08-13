import { Test, TestingModule } from '@nestjs/testing';
import { AutoInitConfig } from '../../../src/common/config/auto-init.config';

describe('AutoInitConfig Integration', () => {
  let autoInitConfig: AutoInitConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoInitConfig],
    }).compile();

    autoInitConfig = module.get<AutoInitConfig>(AutoInitConfig);
  });

  it('should be defined', () => {
    expect(autoInitConfig).toBeDefined();
  });
});
