import { Test, TestingModule } from '@nestjs/testing';
import { Index } from '../../../src/providers/cli/index';

describe('Index Integration', () => {
  let index: Index;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Index],
    }).compile();

    index = module.get<Index>(Index);
  });

  it('should be defined', () => {
    expect(index).toBeDefined();
  });
});
