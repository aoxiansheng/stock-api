import { Test, TestingModule } from '@nestjs/testing';
import { SmartErrorHandler } from '../../../src/providers/utils/smart-error-handler';

describe('SmartErrorHandler Integration', () => {
  let smartErrorHandler: SmartErrorHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartErrorHandler],
    }).compile();

    smartErrorHandler = module.get<SmartErrorHandler>(SmartErrorHandler);
  });

  it('should be defined', () => {
    expect(smartErrorHandler).toBeDefined();
  });
});
