import { Test, TestingModule } from '@nestjs/testing';
import { SecurityModule } from '../../../src/security/module/security.module';

describe('SecurityModule Security', () => {
  let securityModule: SecurityModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityModule],
    }).compile();

    securityModule = module.get<SecurityModule>(SecurityModule);
  });

  it('should be defined', () => {
    expect(securityModule).toBeDefined();
  });
});
