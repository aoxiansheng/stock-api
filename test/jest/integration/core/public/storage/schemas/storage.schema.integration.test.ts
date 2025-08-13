import { Test, TestingModule } from '@nestjs/testing';
import { StorageSchema } from '../../../src/core/public/storage/schemas/storage.schema';

describe('StorageSchema Integration', () => {
  let storageSchema: StorageSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageSchema],
    }).compile();

    storageSchema = module.get<StorageSchema>(StorageSchema);
  });

  it('should be defined', () => {
    expect(storageSchema).toBeDefined();
  });
});
