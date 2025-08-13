import { Test, TestingModule } from '@nestjs/testing';
import { AlertInterface } from '../../../src/alert/interfaces/alert.interface';

describe('AlertInterface Security', () => {
  let alertInterface: AlertInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertInterface],
    }).compile();

    alertInterface = module.get<AlertInterface>(AlertInterface);
  });

  it('should be defined', () => {
    expect(alertInterface).toBeDefined();
  });
});
