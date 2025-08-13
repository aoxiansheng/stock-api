import { Test, TestingModule } from '@nestjs/testing';
import { AutoInitOnStartupService } from '../../../src/scripts/services/auto-init-on-startup.service';

describe('AutoInitOnStartupService Security', () => {
  let autoInitOnStartupService: AutoInitOnStartupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoInitOnStartupService],
    }).compile();

    autoInitOnStartupService = module.get<AutoInitOnStartupService>(AutoInitOnStartupService);
  });

  it('should be defined', () => {
    expect(autoInitOnStartupService).toBeDefined();
  });
});
