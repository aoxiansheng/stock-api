import { Test, TestingModule } from '@nestjs/testing';
import { LongportContextService } from '../../../src/providers/longport/services/longport-context.service';

describe('LongportContextService Security', () => {
  let longportContextService: LongportContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportContextService],
    }).compile();

    longportContextService = module.get<LongportContextService>(LongportContextService);
  });

  it('should be defined', () => {
    expect(longportContextService).toBeDefined();
  });
});
