import { Test, TestingModule } from '@nestjs/testing';
import { SecurityConfig } from '../../../src/common/config/security.config';

describe('SecurityConfig Integration', () => {
  let securityConfig: SecurityConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityConfig],
    }).compile();

    securityConfig = module.get<SecurityConfig>(SecurityConfig);
  });

  it('should be defined', () => {
    expect(securityConfig).toBeDefined();
  });
});
