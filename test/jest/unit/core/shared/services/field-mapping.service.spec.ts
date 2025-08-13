/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { FieldMappingService } from '@core/public/shared/services/field-mapping.service';
import {
  ReceiverType,
  StorageClassification,
  QueryTypeFilter,
} from '@core/public/shared/types/field-naming.types';

const mockLogger = {
  warn: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
};

describe('FieldMappingService', () => {
  let service: FieldMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldMappingService],
    })
      .setLogger(mockLogger as unknown as Logger)
      .compile();

    service = module.get<FieldMappingService>(FieldMappingService);

    // Mock the private logger property
    Object.defineProperty(service, 'logger', { 
      value: mockLogger,
      writable: true,
      configurable: true
    });

    jest.clearAllMocks();
  });

  it('服务应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('capabilityToClassification', () => {
    it('应能正确将能力类型转换为数据分类', () => {
      const classification = service.capabilityToClassification('get-stock-quote' as ReceiverType);
      expect(classification).toBe(StorageClassification.STOCK_QUOTE);
    });

    it('对于未知能力类型，应返回默认分类并记录警告', () => {
      const classification = service.capabilityToClassification('UNKNOWN_TYPE' as ReceiverType);
      expect(classification).toBe(StorageClassification.GENERAL);
      expect(mockLogger.warn).toHaveBeenCalledWith('未知的能力类型: UNKNOWN_TYPE，使用默认分类 GENERAL');
    });
  });

  describe('classificationToCapability', () => {
    it('应能正确将数据分类转换为能力类型', () => {
      const capability = service.classificationToCapability(StorageClassification.STOCK_QUOTE);
      expect(capability).toBe('get-stock-quote');
    });

    it('对于未知数据分类，应返回 null 并记录警告', () => {
      const capability = service.classificationToCapability('UNKNOWN_CLASS' as StorageClassification);
      expect(capability).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('未知的数据分类: UNKNOWN_CLASS，无法映射到能力类型');
    });
  });

  describe('filterToClassification', () => {
    it('当过滤器直接匹配数据分类时，应返回该分类', () => {
      const classification = service.filterToClassification(StorageClassification.STOCK_QUOTE as any);
      expect(classification).toBe(StorageClassification.STOCK_QUOTE);
    });

    it('当过滤器是有效的能力类型时，应转换并返回数据分类', () => {
      const classification = service.filterToClassification('get-stock-basic-info' as QueryTypeFilter);
      expect(classification).toBe(StorageClassification.COMPANY_PROFILE);
    });

    it('对于无效的过滤器，应返回 null 并记录警告', () => {
      const classification = service.filterToClassification('INVALID_FILTER' as QueryTypeFilter);
      expect(classification).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('无法将数据类型过滤器转换为数据分类: INVALID_FILTER');
    });
  });

  describe('classificationToFilter', () => {
    it('应能正确将数据分类转换为查询过滤器', () => {
      const filter = service.classificationToFilter(StorageClassification.STOCK_QUOTE);
      expect(filter).toBe(StorageClassification.STOCK_QUOTE.toString());
    });
  });

  describe('validateMappingConfig', () => {
    it('当配置有效时，应返回 _isValid: true', () => {
      const result = service.validateMappingConfig();
      expect(result.isValid).toBe(true);
      expect(result.missingMappings).toHaveLength(0);
      expect(result.redundantMappings).toHaveLength(0);
    });
  });
});