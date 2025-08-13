import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceTemplateSchema } from '../../../src/core/public/data-mapper/schemas/data-source-template.schema';

describe('DataSourceTemplateSchema Security', () => {
  let dataSourceTemplateSchema: DataSourceTemplateSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSourceTemplateSchema],
    }).compile();

    dataSourceTemplateSchema = module.get<DataSourceTemplateSchema>(DataSourceTemplateSchema);
  });

  it('should be defined', () => {
    expect(dataSourceTemplateSchema).toBeDefined();
  });
});
