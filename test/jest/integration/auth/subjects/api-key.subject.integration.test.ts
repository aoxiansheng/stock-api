import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeySubject } from '../../../src/auth/subjects/api-key.subject';

describe('ApiKeySubject Integration', () => {
  let apiKeySubject: ApiKeySubject;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeySubject],
    }).compile();

    apiKeySubject = module.get<ApiKeySubject>(ApiKeySubject);
  });

  it('should be defined', () => {
    expect(apiKeySubject).toBeDefined();
  });
});
