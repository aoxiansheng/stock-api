import { Test, TestingModule } from '@nestjs/testing';
import { SecurityScannerConstants } from '../../../src/security/constants/security-scanner.constants';

describe('SecurityScannerConstants Security', () => {
  let securityScannerConstants: SecurityScannerConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScannerConstants],
    }).compile();

    securityScannerConstants = module.get<SecurityScannerConstants>(SecurityScannerConstants);
  });

  it('should be defined', () => {
    expect(securityScannerConstants).toBeDefined();
  });
});
