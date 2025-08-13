import { Test, TestingModule } from '@nestjs/testing';
import { LongportProvider } from '../../../src/providers/longport/longport.provider';

describe('LongportProvider Integration', () => {
  let longportProvider: LongportProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportProvider],
    }).compile();

    longportProvider = module.get<LongportProvider>(LongportProvider);
  });

  it('should be defined', () => {
    expect(longportProvider).toBeDefined();
  });
});
