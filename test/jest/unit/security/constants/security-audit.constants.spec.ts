import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditConstants } from '../../../src/security/constants/security-audit.constants';

describe('SecurityAuditConstants', () => {
  let securityAuditConstants: SecurityAuditConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditConstants],
    }).compile();

    securityAuditConstants = module.get<SecurityAuditConstants>(SecurityAuditConstants);
  });

  it('should be defined', () => {
    expect(securityAuditConstants).toBeDefined();
  });
});
