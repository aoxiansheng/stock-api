import { Test, TestingModule } from '@nestjs/testing';
import { AlertHistoryRepository } from '../../../src/alert/repositories/alert-history.repository';

describe('AlertHistoryRepository Integration', () => {
  let alertHistoryRepository: AlertHistoryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertHistoryRepository],
    }).compile();

    alertHistoryRepository = module.get<AlertHistoryRepository>(AlertHistoryRepository);
  });

  it('should be defined', () => {
    expect(alertHistoryRepository).toBeDefined();
  });
});
