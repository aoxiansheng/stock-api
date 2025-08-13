import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditLogRepository } from '../../../src/security/repositories/security-audit-log.repository';

describe('SecurityAuditLogRepository Security', () => {
  let securityAuditLogRepository: SecurityAuditLogRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditLogRepository],
    }).compile();

    securityAuditLogRepository = module.get<SecurityAuditLogRepository>(SecurityAuditLogRepository);
  });

  it('should be defined', () => {
    expect(securityAuditLogRepository).toBeDefined();
  });
});
