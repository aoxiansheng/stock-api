import { Test, TestingModule } from '@nestjs/testing';
import { AlertConfig } from '../../../src/common/config/alert.config';

describe('AlertConfig Security', () => {
  let alertConfig: AlertConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertConfig],
    }).compile();

    alertConfig = module.get<AlertConfig>(AlertConfig);
  });

  it('should be defined', () => {
    expect(alertConfig).toBeDefined();
  });
});
