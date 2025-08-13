import { Test, TestingModule } from '@nestjs/testing';
import { ResponseInterceptor } from '../../../src/common/core/interceptors/response.interceptor';

describe('ResponseInterceptor Security', () => {
  let responseInterceptor: ResponseInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile();

    responseInterceptor = module.get<ResponseInterceptor>(ResponseInterceptor);
  });

  it('should be defined', () => {
    expect(responseInterceptor).toBeDefined();
  });
});
