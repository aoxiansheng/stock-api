import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundTaskService } from '../../../src/core/public/shared/services/background-task.service';

describe('BackgroundTaskService', () => {
  let backgroundTaskService: BackgroundTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackgroundTaskService],
    }).compile();

    backgroundTaskService = module.get<BackgroundTaskService>(BackgroundTaskService);
  });

  it('should be defined', () => {
    expect(backgroundTaskService).toBeDefined();
  });
});
