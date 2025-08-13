import { Test, TestingModule } from '@nestjs/testing';
import { SmartPathResolver } from '../../../src/providers/utils/smart-path-resolver';

describe('SmartPathResolver Integration', () => {
  let smartPathResolver: SmartPathResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartPathResolver],
    }).compile();

    smartPathResolver = module.get<SmartPathResolver>(SmartPathResolver);
  });

  it('should be defined', () => {
    expect(smartPathResolver).toBeDefined();
  });
});
