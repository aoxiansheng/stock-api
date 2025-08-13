import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMiddleware } from '../../../src/security/middleware/security.middleware';

describe('SecurityMiddleware Security', () => {
  let securityMiddleware: SecurityMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityMiddleware],
    }).compile();

    securityMiddleware = module.get<SecurityMiddleware>(SecurityMiddleware);
  });

  it('should be defined', () => {
    expect(securityMiddleware).toBeDefined();
  });
});
