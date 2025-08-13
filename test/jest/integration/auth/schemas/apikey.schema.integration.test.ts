import { Test, TestingModule } from '@nestjs/testing';
import { ApikeySchema } from '../../../src/auth/schemas/apikey.schema';

describe('ApikeySchema Integration', () => {
  let apikeySchema: ApikeySchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeySchema],
    }).compile();

    apikeySchema = module.get<ApikeySchema>(ApikeySchema);
  });

  it('should be defined', () => {
    expect(apikeySchema).toBeDefined();
  });
});
