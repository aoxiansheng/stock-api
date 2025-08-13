import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePerformanceDecorator } from '../../../src/metrics/decorators/database-performance.decorator';

describe('DatabasePerformanceDecorator Security', () => {
  let databasePerformanceDecorator: DatabasePerformanceDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabasePerformanceDecorator],
    }).compile();

    databasePerformanceDecorator = module.get<DatabasePerformanceDecorator>(DatabasePerformanceDecorator);
  });

  it('should be defined', () => {
    expect(databasePerformanceDecorator).toBeDefined();
  });
});
