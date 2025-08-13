import { Test, TestingModule } from '@nestjs/testing';
import { OperationsConstants } from '../../../src/common/constants/unified/operations.constants';

describe('OperationsConstants Integration', () => {
  let operationsConstants: OperationsConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OperationsConstants],
    }).compile();

    operationsConstants = module.get<OperationsConstants>(OperationsConstants);
  });

  it('should be defined', () => {
    expect(operationsConstants).toBeDefined();
  });
});
