import { Test, TestingModule } from '@nestjs/testing';

import { FieldMappingService } from '../../../../../../src/core/shared/services/field-mapping.service';
import { CollectorService } from '@monitoring/collector/collector.service';

describe('FieldMappingService', () => {
  let service: FieldMappingService;
  let mockCollectorService: jest.Mocked<CollectorService>;

  beforeEach(async () => {
    mockCollectorService = {
      recordRequest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldMappingService,
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<FieldMappingService>(FieldMappingService);

    // Mock logger to avoid console output during tests
    jest.spyOn(service['logger'], 'warn').mockImplementation();

    jest.clearAllMocks();
  });

  describe('capabilityToClassification', () => {
    it('should convert valid receiver type to storage classification', () => {
      // Test with a known mapping - this will depend on actual FIELD_MAPPING_CONFIG
      const result = service.capabilityToClassification('get-stock-quote' as any);
      expect(result).toBeDefined();
    });

    it('should handle unknown receiver type with default', () => {
      const result = service.capabilityToClassification('unknown-type' as any);
      expect(result).toBe('general'); // StorageClassification.GENERAL
      expect(service['logger'].warn).toHaveBeenCalledWith(
        '未知的能力类型: unknown-type，使用默认分类 GENERAL'
      );
    });
  });

  describe('classificationToCapability', () => {
    it('should convert valid storage classification to receiver type', () => {
      const result = service.classificationToCapability('stock_quote' as any);
      expect(result).toBeDefined();
    });

    it('should handle unknown classification', () => {
      const result = service.classificationToCapability('unknown-classification' as any);
      expect(result).toBeNull();
      expect(service['logger'].warn).toHaveBeenCalledWith(
        '未知的数据分类: unknown-classification，无法映射到能力类型'
      );
    });
  });

  describe('filterToClassification', () => {
    it('should handle direct classification match', () => {
      const result = service.filterToClassification('stock_quote');
      expect(result).toBe('stock_quote');
    });

    it('should handle unknown filter', () => {
      const result = service.filterToClassification('unknown-filter');
      expect(result).toBeNull();
      expect(service['logger'].warn).toHaveBeenCalledWith(
        '无法将数据类型过滤器转换为数据分类: unknown-filter'
      );
    });
  });

  describe('classificationToFilter', () => {
    it('should convert classification to filter format', () => {
      const result = service.classificationToFilter('stock_quote' as any);
      expect(result).toBeDefined();
    });
  });

  describe('getSupportedReceiverTypes', () => {
    it('should return array of supported receiver types', () => {
      const result = service.getSupportedReceiverTypes();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSupportedStorageClassifications', () => {
    it('should return array of supported storage classifications', () => {
      const result = service.getSupportedStorageClassifications();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('batch operations', () => {
    it('should batch convert capabilities to classifications', () => {
      const receiverTypes = ['get-stock-quote', 'get-stock-info'] as any[];
      const result = service.batchCapabilityToClassification(receiverTypes);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should batch convert classifications to capabilities', () => {
      const classifications = ['stock_quote', 'stock_info'] as any[];
      const result = service.batchClassificationToCapability(classifications);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('validateMappingConfig', () => {
    it('should validate mapping configuration', () => {
      const result = service.validateMappingConfig();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('missingMappings');
      expect(result).toHaveProperty('redundantMappings');
      expect(Array.isArray(result.missingMappings)).toBe(true);
      expect(Array.isArray(result.redundantMappings)).toBe(true);
    });
  });
});