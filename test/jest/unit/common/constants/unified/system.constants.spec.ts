import { Test, TestingModule } from '@nestjs/testing';
import { SystemConstants } from '../../../src/common/constants/unified/system.constants';

describe('SystemConstants', () => {
  let systemConstants: SystemConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemConstants],
    }).compile();

    systemConstants = module.get<SystemConstants>(SystemConstants);
  });

  it('should be defined', () => {
    expect(systemConstants).toBeDefined();
  });
});
