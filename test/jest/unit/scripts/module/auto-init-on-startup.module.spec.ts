import { Test, TestingModule } from '@nestjs/testing';
import { AutoInitOnStartupModule } from '../../../src/scripts/module/auto-init-on-startup.module';

describe('AutoInitOnStartupModule', () => {
  let autoInitOnStartupModule: AutoInitOnStartupModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoInitOnStartupModule],
    }).compile();

    autoInitOnStartupModule = module.get<AutoInitOnStartupModule>(AutoInitOnStartupModule);
  });

  it('should be defined', () => {
    expect(autoInitOnStartupModule).toBeDefined();
  });
});
