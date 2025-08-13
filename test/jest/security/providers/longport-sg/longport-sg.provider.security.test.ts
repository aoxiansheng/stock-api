import { Test, TestingModule } from '@nestjs/testing';
import { LongportSgProvider } from '../../../src/providers/longport-sg/longport-sg.provider';

describe('LongportSgProvider Security', () => {
  let longportSgProvider: LongportSgProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportSgProvider],
    }).compile();

    longportSgProvider = module.get<LongportSgProvider>(LongportSgProvider);
  });

  it('should be defined', () => {
    expect(longportSgProvider).toBeDefined();
  });
});
