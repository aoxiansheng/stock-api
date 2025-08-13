import { Test, TestingModule } from '@nestjs/testing';
import { GetStockBasicInfo } from '../../../src/providers/longport/capabilities/get-stock-basic-info';

describe('GetStockBasicInfo Integration', () => {
  let getStockBasicInfo: GetStockBasicInfo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetStockBasicInfo],
    }).compile();

    getStockBasicInfo = module.get<GetStockBasicInfo>(GetStockBasicInfo);
  });

  it('should be defined', () => {
    expect(getStockBasicInfo).toBeDefined();
  });
});
