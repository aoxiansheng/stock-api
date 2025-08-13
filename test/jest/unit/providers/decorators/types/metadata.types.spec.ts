import { Test, TestingModule } from '@nestjs/testing';
import { MetadataTypes } from '../../../src/providers/decorators/types/metadata.types';

describe('MetadataTypes', () => {
  let metadataTypes: MetadataTypes;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetadataTypes],
    }).compile();

    metadataTypes = module.get<MetadataTypes>(MetadataTypes);
  });

  it('should be defined', () => {
    expect(metadataTypes).toBeDefined();
  });
});
