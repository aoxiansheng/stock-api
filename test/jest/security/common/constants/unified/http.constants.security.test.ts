import { Test, TestingModule } from '@nestjs/testing';
import { HttpConstants } from '../../../src/common/constants/unified/http.constants';

describe('HttpConstants Security', () => {
  let httpConstants: HttpConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpConstants],
    }).compile();

    httpConstants = module.get<HttpConstants>(HttpConstants);
  });

  it('should be defined', () => {
    expect(httpConstants).toBeDefined();
  });
});
