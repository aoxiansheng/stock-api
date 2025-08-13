import { Test, TestingModule } from '@nestjs/testing';
import { SecurityScanResultRepository } from '../../../src/security/repositories/security-scan-result.repository';

describe('SecurityScanResultRepository Integration', () => {
  let securityScanResultRepository: SecurityScanResultRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScanResultRepository],
    }).compile();

    securityScanResultRepository = module.get<SecurityScanResultRepository>(SecurityScanResultRepository);
  });

  it('should be defined', () => {
    expect(securityScanResultRepository).toBeDefined();
  });
});
