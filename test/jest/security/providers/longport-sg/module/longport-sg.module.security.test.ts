import { Test, TestingModule } from '@nestjs/testing';
import { LongportSgModule } from '../../../src/providers/longport-sg/module/longport-sg.module';

describe('LongportSgModule Security', () => {
  let longportSgModule: LongportSgModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportSgModule],
    }).compile();

    longportSgModule = module.get<LongportSgModule>(LongportSgModule);
  });

  it('should be defined', () => {
    expect(longportSgModule).toBeDefined();
  });
});
