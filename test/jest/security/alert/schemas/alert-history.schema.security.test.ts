import { Test, TestingModule } from '@nestjs/testing';
import { AlertHistorySchema } from '../../../src/alert/schemas/alert-history.schema';

describe('AlertHistorySchema Security', () => {
  let alertHistorySchema: AlertHistorySchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertHistorySchema],
    }).compile();

    alertHistorySchema = module.get<AlertHistorySchema>(AlertHistorySchema);
  });

  it('should be defined', () => {
    expect(alertHistorySchema).toBeDefined();
  });
});
