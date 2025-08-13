import { Test, TestingModule } from '@nestjs/testing';
import { LoggerConfig } from '../../../src/common/config/logger.config';

describe('LoggerConfig Security', () => {
  let loggerConfig: LoggerConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerConfig],
    }).compile();

    loggerConfig = module.get<LoggerConfig>(LoggerConfig);
  });

  it('should be defined', () => {
    expect(loggerConfig).toBeDefined();
  });
});
