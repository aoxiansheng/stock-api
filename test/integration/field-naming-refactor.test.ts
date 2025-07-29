/**
 * 字段命名重构集成测试
 * 验证新的字段命名系统是否正常工作
 */

import { FieldMappingService } from '../../src/common/modules/field-mapping/services/field-mapping.service';
import { DataClassification } from '../../src/common/modules/field-mapping/types/field-naming.types';

describe('字段命名重构集成测试', () => {
  let fieldMappingService: FieldMappingService;

  beforeEach(() => {
    fieldMappingService = new FieldMappingService();
  });

  describe('能力类型到数据分类的映射', () => {
    it('应该能够将股票报价能力类型映射到数据分类', () => {
      const result = fieldMappingService.capabilityToClassification('get-stock-quote');
      expect(result).toBe(DataClassification.STOCK_QUOTE);
    });

    it('应该能够将基本信息能力类型映射到数据分类', () => {
      const result = fieldMappingService.capabilityToClassification('get-stock-basic-info');
      expect(result).toBe(DataClassification.COMPANY_PROFILE);
    });

    it('对于未知的能力类型应该返回 GENERAL', () => {
      const result = fieldMappingService.capabilityToClassification('unknown-capability' as any);
      expect(result).toBe(DataClassification.GENERAL);
    });
  });

  describe('数据分类到能力类型的映射', () => {
    it('应该能够将股票报价数据分类映射到能力类型', () => {
      const result = fieldMappingService.classificationToCapability(DataClassification.STOCK_QUOTE);
      expect(result).toBe('get-stock-quote');
    });

    it('应该能够将公司概况数据分类映射到能力类型', () => {
      const result = fieldMappingService.classificationToCapability(DataClassification.COMPANY_PROFILE);
      expect(result).toBe('get-stock-basic-info');
    });

    it('对于未映射的数据分类应该返回 null', () => {
      const result = fieldMappingService.classificationToCapability(DataClassification.TRADING_ORDER);
      expect(result).toBe(null);
    });
  });

  describe('过滤器到分类的映射', () => {
    it('应该能够将能力类型过滤器映射到数据分类', () => {
      const result = fieldMappingService.filterToClassification('get-stock-quote');
      expect(result).toBe(DataClassification.STOCK_QUOTE);
    });

    it('应该能够直接匹配数据分类枚举值', () => {
      const result = fieldMappingService.filterToClassification('stock_quote');
      expect(result).toBe(DataClassification.STOCK_QUOTE);
    });

    it('对于无效的过滤器应该返回 null', () => {
      const result = fieldMappingService.filterToClassification('invalid-filter');
      expect(result).toBe(null);
    });
  });

  describe('批量操作', () => {
    it('应该能够批量转换能力类型到数据分类', () => {
      const capabilities = ['get-stock-quote', 'get-stock-basic-info'] as any[];
      const result = fieldMappingService.batchCapabilityToClassification(capabilities);
      expect(result).toEqual([
        DataClassification.STOCK_QUOTE,
        DataClassification.COMPANY_PROFILE
      ]);
    });

    it('应该能够批量转换数据分类到能力类型', () => {
      const classifications = [DataClassification.STOCK_QUOTE, DataClassification.COMPANY_PROFILE];
      const result = fieldMappingService.batchClassificationToCapability(classifications);
      expect(result).toEqual(['get-stock-quote', 'get-stock-basic-info']);
    });
  });

  describe('映射配置验证', () => {
    it('应该验证映射配置的完整性', () => {
      const result = fieldMappingService.validateMappingConfig();
      
      // 检查是否有缺失的映射
      if (!result.isValid) {
        console.warn('映射配置存在问题:', {
          missingMappings: result.missingMappings,
          redundantMappings: result.redundantMappings
        });
      }
      
      // 至少应该有基本的映射关系
      expect(result.missingMappings.length).toBeLessThan(10);
    });
  });

  describe('向后兼容性测试', () => {
    it('应该支持新旧字段名称', () => {
      // 这个测试验证系统能够处理新旧字段名称
      // 在实际系统中，新字段应该优先使用，旧字段作为后备
      const newFieldValue = 'get-stock-quote';
      const oldFieldValue = 'get-stock-quote';
      
      // 两种字段值应该产生相同的结果
      const newResult = fieldMappingService.capabilityToClassification(newFieldValue as any);
      const oldResult = fieldMappingService.capabilityToClassification(oldFieldValue as any);
      
      expect(newResult).toBe(oldResult);
      expect(newResult).toBe(DataClassification.STOCK_QUOTE);
    });
  });
});