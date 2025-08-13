import { Test, TestingModule } from '@nestjs/testing';
import { DynamicLogLevelService } from '../../../src/core/public/shared/services/dynamic-log-level.service';

describe('DynamicLogLevelService Integration', () => {
  let dynamicLogLevelService: DynamicLogLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicLogLevelService],
    }).compile();

    dynamicLogLevelService = module.get<DynamicLogLevelService>(DynamicLogLevelService);
  });

  it('should be defined', () => {
    expect(dynamicLogLevelService).toBeDefined();
  });
});
