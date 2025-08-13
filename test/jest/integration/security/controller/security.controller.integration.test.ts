import { Test, TestingModule } from '@nestjs/testing';
import { SecurityController } from '../../../src/security/controller/security.controller';

describe('SecurityController Integration', () => {
  let securityController: SecurityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityController],
    }).compile();

    securityController = module.get<SecurityController>(SecurityController);
  });

  it('should be defined', () => {
    expect(securityController).toBeDefined();
  });
});
