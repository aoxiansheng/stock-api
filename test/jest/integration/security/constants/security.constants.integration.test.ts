import { Test, TestingModule } from '@nestjs/testing';
import { SecurityConstants } from '../../../src/security/constants/security.constants';

describe('SecurityConstants Integration', () => {
  let securityConstants: SecurityConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityConstants],
    }).compile();

    securityConstants = module.get<SecurityConstants>(SecurityConstants);
  });

  it('should be defined', () => {
    expect(securityConstants).toBeDefined();
  });
});
