import { Test, TestingModule } from '@nestjs/testing';
import { LongportSgContextService } from '../../../src/providers/longport-sg/services/longport-sg-context.service';

describe('LongportSgContextService Security', () => {
  let longportSgContextService: LongportSgContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportSgContextService],
    }).compile();

    longportSgContextService = module.get<LongportSgContextService>(LongportSgContextService);
  });

  it('should be defined', () => {
    expect(longportSgContextService).toBeDefined();
  });
});
