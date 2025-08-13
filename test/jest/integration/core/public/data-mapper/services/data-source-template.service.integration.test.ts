import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceTemplateService } from '../../../src/core/public/data-mapper/services/data-source-template.service';

describe('DataSourceTemplateService Integration', () => {
  let dataSourceTemplateService: DataSourceTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSourceTemplateService],
    }).compile();

    dataSourceTemplateService = module.get<DataSourceTemplateService>(DataSourceTemplateService);
  });

  it('should be defined', () => {
    expect(dataSourceTemplateService).toBeDefined();
  });
});
