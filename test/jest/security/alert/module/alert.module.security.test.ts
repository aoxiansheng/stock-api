import { Test, TestingModule } from '@nestjs/testing';
import { AlertModule } from '../../../src/alert/module/alert.module';

describe('AlertModule Security', () => {
  let alertModule: AlertModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertModule],
    }).compile();

    alertModule = module.get<AlertModule>(AlertModule);
  });

  it('should be defined', () => {
    expect(alertModule).toBeDefined();
  });
});
