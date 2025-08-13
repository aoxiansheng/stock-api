import { Test, TestingModule } from '@nestjs/testing';
import { SecurityScanResultSchema } from '../../../src/security/schemas/security-scan-result.schema';

describe('SecurityScanResultSchema Security', () => {
  let securityScanResultSchema: SecurityScanResultSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScanResultSchema],
    }).compile();

    securityScanResultSchema = module.get<SecurityScanResultSchema>(SecurityScanResultSchema);
  });

  it('should be defined', () => {
    expect(securityScanResultSchema).toBeDefined();
  });
});
