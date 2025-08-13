import { Test, TestingModule } from '@nestjs/testing';
import { FieldMappingService } from '../../../src/core/public/shared/services/field-mapping.service';

describe('FieldMappingService Security', () => {
  let fieldMappingService: FieldMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldMappingService],
    }).compile();

    fieldMappingService = module.get<FieldMappingService>(FieldMappingService);
  });

  it('should be defined', () => {
    expect(fieldMappingService).toBeDefined();
  });
});
