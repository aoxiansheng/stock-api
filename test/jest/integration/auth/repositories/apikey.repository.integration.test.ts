import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyRepository } from '../../../src/auth/repositories/apikey.repository';

describe('ApikeyRepository Integration', () => {
  let apikeyRepository: ApikeyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyRepository],
    }).compile();

    apikeyRepository = module.get<ApikeyRepository>(ApikeyRepository);
  });

  it('should be defined', () => {
    expect(apikeyRepository).toBeDefined();
  });
});
