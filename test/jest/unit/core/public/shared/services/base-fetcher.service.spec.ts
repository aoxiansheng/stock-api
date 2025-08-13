import { Test, TestingModule } from '@nestjs/testing';
import { BaseFetcherService } from '../../../src/core/public/shared/services/base-fetcher.service';

describe('BaseFetcherService', () => {
  let baseFetcherService: BaseFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseFetcherService],
    }).compile();

    baseFetcherService = module.get<BaseFetcherService>(BaseFetcherService);
  });

  it('should be defined', () => {
    expect(baseFetcherService).toBeDefined();
  });
});
