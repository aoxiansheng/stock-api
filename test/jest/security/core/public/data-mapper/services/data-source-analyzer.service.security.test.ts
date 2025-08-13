import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceAnalyzerService } from '../../../src/core/public/data-mapper/services/data-source-analyzer.service';

describe('DataSourceAnalyzerService Security', () => {
  let dataSourceAnalyzerService: DataSourceAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSourceAnalyzerService],
    }).compile();

    dataSourceAnalyzerService = module.get<DataSourceAnalyzerService>(DataSourceAnalyzerService);
  });

  it('should be defined', () => {
    expect(dataSourceAnalyzerService).toBeDefined();
  });
});
