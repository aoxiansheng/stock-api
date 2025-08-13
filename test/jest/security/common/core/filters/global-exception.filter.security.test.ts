import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../../../src/common/core/filters/global-exception.filter';

describe('GlobalExceptionFilter Security', () => {
  let globalExceptionFilter: GlobalExceptionFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    globalExceptionFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
  });

  it('should be defined', () => {
    expect(globalExceptionFilter).toBeDefined();
  });
});
