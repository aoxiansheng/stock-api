import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditInterface } from '../../../src/security/interfaces/security-audit.interface';

describe('SecurityAuditInterface Security', () => {
  let securityAuditInterface: SecurityAuditInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditInterface],
    }).compile();

    securityAuditInterface = module.get<SecurityAuditInterface>(SecurityAuditInterface);
  });

  it('should be defined', () => {
    expect(securityAuditInterface).toBeDefined();
  });
});
