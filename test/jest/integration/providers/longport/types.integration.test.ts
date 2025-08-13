import { Test, TestingModule } from '@nestjs/testing';
import { Types } from '../../../src/providers/longport/types';

describe('Types Integration', () => {
  let types: Types;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Types],
    }).compile();

    types = module.get<Types>(Types);
  });

  it('should be defined', () => {
    expect(types).toBeDefined();
  });
});
