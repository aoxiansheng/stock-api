import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedData } from '../../../src/common/modules/pagination/dto/paginated-data';

describe('PaginatedData Security', () => {
  let paginatedData: PaginatedData;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginatedData],
    }).compile();

    paginatedData = module.get<PaginatedData>(PaginatedData);
  });

  it('should be defined', () => {
    expect(paginatedData).toBeDefined();
  });
});
