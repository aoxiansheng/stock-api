import { Test, TestingModule } from '@nestjs/testing';
import { PaginationModule } from '../../../src/common/modules/pagination/modules/pagination.module';

describe('PaginationModule Integration', () => {
  let paginationModule: PaginationModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationModule],
    }).compile();

    paginationModule = module.get<PaginationModule>(PaginationModule);
  });

  it('should be defined', () => {
    expect(paginationModule).toBeDefined();
  });
});
