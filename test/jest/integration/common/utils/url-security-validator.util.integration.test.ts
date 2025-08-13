import { Test, TestingModule } from '@nestjs/testing';
import { UrlSecurityValidatorUtil } from '../../../src/common/utils/url-security-validator.util';

describe('UrlSecurityValidatorUtil Integration', () => {
  let urlSecurityValidatorUtil: UrlSecurityValidatorUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrlSecurityValidatorUtil],
    }).compile();

    urlSecurityValidatorUtil = module.get<UrlSecurityValidatorUtil>(UrlSecurityValidatorUtil);
  });

  it('should be defined', () => {
    expect(urlSecurityValidatorUtil).toBeDefined();
  });
});
