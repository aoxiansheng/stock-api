import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditService } from '../../../src/security/services/security-audit.service';

describe('SecurityAuditService Security', () => {
  let securityAuditService: SecurityAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditService],
    }).compile();

    securityAuditService = module.get<SecurityAuditService>(SecurityAuditService);
  });

  it('should be defined', () => {
    expect(securityAuditService).toBeDefined();
  });
});
