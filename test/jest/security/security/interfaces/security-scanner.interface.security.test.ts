import { Test, TestingModule } from '@nestjs/testing';
import { SecurityScannerInterface } from '../../../src/security/interfaces/security-scanner.interface';

describe('SecurityScannerInterface Security', () => {
  let securityScannerInterface: SecurityScannerInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScannerInterface],
    }).compile();

    securityScannerInterface = module.get<SecurityScannerInterface>(SecurityScannerInterface);
  });

  it('should be defined', () => {
    expect(securityScannerInterface).toBeDefined();
  });
});
