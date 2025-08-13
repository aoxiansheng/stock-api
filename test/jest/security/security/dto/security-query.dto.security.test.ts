import { Test, TestingModule } from '@nestjs/testing';
import { SecurityQueryDto } from '../../../src/security/dto/security-query.dto';

describe('SecurityQueryDto Security', () => {
  let securityQueryDto: SecurityQueryDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityQueryDto],
    }).compile();

    securityQueryDto = module.get<SecurityQueryDto>(SecurityQueryDto);
  });

  it('should be defined', () => {
    expect(securityQueryDto).toBeDefined();
  });
});
