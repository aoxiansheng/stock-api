import { Test, TestingModule } from '@nestjs/testing';
import { DataChangeDetectorService } from '../../../src/core/public/shared/services/data-change-detector.service';

describe('DataChangeDetectorService Security', () => {
  let dataChangeDetectorService: DataChangeDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataChangeDetectorService],
    }).compile();

    dataChangeDetectorService = module.get<DataChangeDetectorService>(DataChangeDetectorService);
  });

  it('should be defined', () => {
    expect(dataChangeDetectorService).toBeDefined();
  });
});
