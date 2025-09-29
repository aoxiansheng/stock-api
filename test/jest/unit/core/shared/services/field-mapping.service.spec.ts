import { Test, TestingModule } from '@nestjs/testing';
import { FieldMappingService } from '@core/shared/services/field-mapping.service';
import { UnitTestSetup } from '../../../../../testbasic/setup/unit-test-setup';
import { StorageClassification } from '@core/shared/types/storage-classification.enum';

describe('FieldMappingService', () => {
  let service: FieldMappingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await UnitTestSetup.createBasicTestModule({
      providers: [FieldMappingService],
    });

    service = module.get<FieldMappingService>(FieldMappingService);
  });

  afterEach(async () => {
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of FieldMappingService', () => {
      expect(service).toBeInstanceOf(FieldMappingService);
    });
  });

  describe('capabilityToClassification', () => {
    it('should convert valid capability types to classifications', () => {
      const result = service.capabilityToClassification('get-stock-quote' as any);
      expect(typeof result).toBe('string');
      expect(Object.values(StorageClassification)).toContain(result);
    });

    it('should return GENERAL for unknown capability types', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      const result = service.capabilityToClassification('unknown-capability' as any);

      expect(result).toBe(StorageClassification.GENERAL);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('未知的能力类型: unknown-capability')
      );

      loggerWarnSpy.mockRestore();
    });

    it('should handle null/undefined input gracefully', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      const result = service.capabilityToClassification(null as any);

      expect(result).toBe(StorageClassification.GENERAL);
      expect(loggerWarnSpy).toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });
  });

  describe('classificationToCapability', () => {
    it('should convert valid classifications to capability types', () => {
      const result = service.classificationToCapability(StorageClassification.STOCK_QUOTE);
      expect(result).toBeDefined();
    });



    it('should handle invalid classification input', () => {
      const result = service.classificationToCapability('invalid-classification' as any);
      expect(result).toBeNull();
    });
  });

  describe('filterToClassification', () => {
    it('should convert query type filters to classifications', () => {
      const result = service.filterToClassification('get-stock-quote' as any);
      expect(result).toBeDefined();
    });

    it('should return null for unmapped filter types', () => {
      const result = service.filterToClassification('unknown-filter' as any);
      expect(result).toBeNull();
    });

    it('should handle null input gracefully', () => {
      const result = service.filterToClassification(null as any);
      expect(result).toBeNull();
    });
  });

  describe('classificationToFilter', () => {
    it('should convert classifications to query type filters', () => {
      const result = service.classificationToFilter(StorageClassification.STOCK_QUOTE);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle GENERAL classification', () => {
      const result = service.classificationToFilter(StorageClassification.GENERAL);
      expect(result).toBeDefined();
    });

    it('should handle invalid classification input', () => {
      const result = service.classificationToFilter('invalid-classification' as any);
      expect(result).toBeDefined();
    });
  });

  describe('Cross-mapping Consistency', () => {
    it('should maintain bidirectional mapping consistency for classification and capability', () => {
      const classification = StorageClassification.STOCK_QUOTE;
      const capability = service.classificationToCapability(classification);

      if (capability) {
        const backToClassification = service.capabilityToClassification(capability);
        expect(backToClassification).toBe(classification);
      }
    });

    it('should maintain consistency between filter and classification mappings', () => {
      const classification = StorageClassification.STOCK_QUOTE;
      const filter = service.classificationToFilter(classification);

      if (filter) {
        const backToClassification = service.filterToClassification(filter);
        expect(backToClassification).toBe(classification);
      }
    });
  });

  describe('Logging Behavior', () => {
    it('should log warnings for unknown capability types', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.capabilityToClassification('unknown' as any);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('未知的能力类型')
      );

      loggerWarnSpy.mockRestore();
    });

    it('should have logger instance', () => {
      expect(service['logger']).toBeDefined();
      expect(typeof service['logger'].warn).toBe('function');
      expect(typeof service['logger'].log).toBe('function');
      expect(typeof service['logger'].error).toBe('function');
    });
  });

  describe('Service Methods Availability', () => {
    it('should have all required mapping methods', () => {
      expect(typeof service.capabilityToClassification).toBe('function');
      expect(typeof service.classificationToCapability).toBe('function');
      expect(typeof service.filterToClassification).toBe('function');
      expect(typeof service.classificationToFilter).toBe('function');
      expect(typeof service.getSupportedReceiverTypes).toBe('function');
      expect(typeof service.getSupportedStorageClassifications).toBe('function');
    });

    it('should handle method chaining scenarios', () => {
      const receiverType = 'get-stock-quote' as any;
      const classification = service.capabilityToClassification(receiverType);
      const filter = service.classificationToFilter(classification);

      expect(classification).toBeDefined();
      expect(Object.values(StorageClassification)).toContain(classification);

      if (filter) {
        expect(typeof filter).toBe('string');
      }
    });

    it('should provide utility methods for getting supported types', () => {
      const receiverTypes = service.getSupportedReceiverTypes();
      const classifications = service.getSupportedStorageClassifications();

      expect(Array.isArray(receiverTypes)).toBe(true);
      expect(Array.isArray(classifications)).toBe(true);
      expect(classifications.length).toBeGreaterThan(0);
    });
  });
});
