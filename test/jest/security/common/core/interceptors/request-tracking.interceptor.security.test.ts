import { Test, TestingModule } from '@nestjs/testing';
import { RequestTrackingInterceptor } from '../../../src/common/core/interceptors/request-tracking.interceptor';

describe('RequestTrackingInterceptor Security', () => {
  let requestTrackingInterceptor: RequestTrackingInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestTrackingInterceptor],
    }).compile();

    requestTrackingInterceptor = module.get<RequestTrackingInterceptor>(RequestTrackingInterceptor);
  });

  it('should be defined', () => {
    expect(requestTrackingInterceptor).toBeDefined();
  });
});
