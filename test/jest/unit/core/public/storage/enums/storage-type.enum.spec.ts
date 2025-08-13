import { Test, TestingModule } from '@nestjs/testing';
import { StorageTypeEnum } from '../../../src/core/public/storage/enums/storage-type.enum';

describe('StorageTypeEnum', () => {
  let storageTypeEnum: StorageTypeEnum;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageTypeEnum],
    }).compile();

    storageTypeEnum = module.get<StorageTypeEnum>(StorageTypeEnum);
  });

  it('should be defined', () => {
    expect(storageTypeEnum).toBeDefined();
  });
});
