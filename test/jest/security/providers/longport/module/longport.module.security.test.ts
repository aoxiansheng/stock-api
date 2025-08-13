import { Test, TestingModule } from '@nestjs/testing';
import { LongportModule } from '../../../src/providers/longport/module/longport.module';

describe('LongportModule Security', () => {
  let longportModule: LongportModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportModule],
    }).compile();

    longportModule = module.get<LongportModule>(LongportModule);
  });

  it('should be defined', () => {
    expect(longportModule).toBeDefined();
  });
});
