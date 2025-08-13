import { Test, TestingModule } from '@nestjs/testing';
import { HttpHeadersUtil } from '../../../src/common/utils/http-headers.util';

describe('HttpHeadersUtil Security', () => {
  let httpHeadersUtil: HttpHeadersUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpHeadersUtil],
    }).compile();

    httpHeadersUtil = module.get<HttpHeadersUtil>(HttpHeadersUtil);
  });

  it('should be defined', () => {
    expect(httpHeadersUtil).toBeDefined();
  });
});
