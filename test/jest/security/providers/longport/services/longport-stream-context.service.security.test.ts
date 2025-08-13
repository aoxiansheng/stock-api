import { Test, TestingModule } from '@nestjs/testing';
import { LongportStreamContextService } from '../../../src/providers/longport/services/longport-stream-context.service';

describe('LongportStreamContextService Security', () => {
  let longportStreamContextService: LongportStreamContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportStreamContextService],
    }).compile();

    longportStreamContextService = module.get<LongportStreamContextService>(LongportStreamContextService);
  });

  it('should be defined', () => {
    expect(longportStreamContextService).toBeDefined();
  });
});
