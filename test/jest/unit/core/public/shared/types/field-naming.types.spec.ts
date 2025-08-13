import { Test, TestingModule } from '@nestjs/testing';
import { FieldNamingTypes } from '../../../src/core/public/shared/types/field-naming.types';

describe('FieldNamingTypes', () => {
  let fieldNamingTypes: FieldNamingTypes;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldNamingTypes],
    }).compile();

    fieldNamingTypes = module.get<FieldNamingTypes>(FieldNamingTypes);
  });

  it('should be defined', () => {
    expect(fieldNamingTypes).toBeDefined();
  });
});
