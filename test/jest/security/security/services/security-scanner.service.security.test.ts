import { Test, TestingModule } from '@nestjs/testing';
import { SecurityScannerService } from '../../../src/security/services/security-scanner.service';

describe('SecurityScannerService Security', () => {
  let securityScannerService: SecurityScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScannerService],
    }).compile();

    securityScannerService = module.get<SecurityScannerService>(SecurityScannerService);
  });

  it('should be defined', () => {
    expect(securityScannerService).toBeDefined();
  });
});
