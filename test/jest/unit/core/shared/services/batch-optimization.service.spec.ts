import { Test, TestingModule } from '@nestjs/testing';
import { BatchOptimizationService } from '../../../../../../src/core/shared/services/batch-optimization.service';
import { SymbolMapperService } from '../../../../../../src/core/symbol-mapper/services/symbol-mapper.service';
import { DataMapperService } from '../../../../../../src/core/data-mapper/services/data-mapper.service';
import { FeatureFlags } from '@common/config/feature-flags.config';

const mockSymbolMapperService = {
  mapSymbol: jest.fn(),
};

const mockDataMapperService = {};

const mockFeatureFlags = {
  batchProcessingEnabled: true,
};

describe('BatchOptimizationService (unit)', () => {
  let service: BatchOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchOptimizationService,
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: DataMapperService,
          useValue: mockDataMapperService,
        },
        {
          provide: FeatureFlags,
          useValue: mockFeatureFlags,
        },
      ],
    }).compile();

    service = module.get<BatchOptimizationService>(BatchOptimizationService);
  });

  it('应成功实例化', () => {
    expect(service).toBeDefined();
  });
});