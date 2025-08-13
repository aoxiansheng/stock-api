import { Test, TestingModule } from '@nestjs/testing';
import { DataFetchingService } from '../../../src/core/public/shared/services/data-fetching.service';

describe('DataFetchingService', () => {
  let dataFetchingService: DataFetchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetchingService],
    }).compile();

    dataFetchingService = module.get<DataFetchingService>(DataFetchingService);
  });

  it('should be defined', () => {
    expect(dataFetchingService).toBeDefined();
  });
});
