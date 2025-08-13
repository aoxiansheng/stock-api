import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceTypeEnum } from '../../../src/core/restapi/query/enums/data-source-type.enum';

describe('DataSourceTypeEnum', () => {
  let dataSourceTypeEnum: DataSourceTypeEnum;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSourceTypeEnum],
    }).compile();

    dataSourceTypeEnum = module.get<DataSourceTypeEnum>(DataSourceTypeEnum);
  });

  it('should be defined', () => {
    expect(dataSourceTypeEnum).toBeDefined();
  });
});
