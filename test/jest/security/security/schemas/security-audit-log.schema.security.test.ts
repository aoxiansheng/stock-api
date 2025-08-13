import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditLogSchema } from '../../../src/security/schemas/security-audit-log.schema';

describe('SecurityAuditLogSchema Security', () => {
  let securityAuditLogSchema: SecurityAuditLogSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditLogSchema],
    }).compile();

    securityAuditLogSchema = module.get<SecurityAuditLogSchema>(SecurityAuditLogSchema);
  });

  it('should be defined', () => {
    expect(securityAuditLogSchema).toBeDefined();
  });
});
