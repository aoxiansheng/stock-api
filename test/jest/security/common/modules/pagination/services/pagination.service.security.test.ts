import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '../../../src/common/modules/pagination/services/pagination.service';

describe('PaginationService Security', () => {
  let paginationService: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    paginationService = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(paginationService).toBeDefined();
  });
});
