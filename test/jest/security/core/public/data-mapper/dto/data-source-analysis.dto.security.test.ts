import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceAnalysisDto } from '../../../src/core/public/data-mapper/dto/data-source-analysis.dto';

describe('DataSourceAnalysisDto Security', () => {
  let dataSourceAnalysisDto: DataSourceAnalysisDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSourceAnalysisDto],
    }).compile();

    dataSourceAnalysisDto = module.get<DataSourceAnalysisDto>(DataSourceAnalysisDto);
  });

  it('should be defined', () => {
    expect(dataSourceAnalysisDto).toBeDefined();
  });
});
