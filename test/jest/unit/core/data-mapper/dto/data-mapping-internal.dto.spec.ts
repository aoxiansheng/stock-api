
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  DataMappingTestResultDto,
  DataMappingStatisticsDto,
  FieldExtractionResultDto,
  TransformationInputDto,
  MappingRuleApplicationDto,
  
  FieldSuggestionItemDto,
  TransformationResultDto,
  PathResolutionResultDto,
} from '../../../../../../src/core/data-mapper/dto/data-mapping-internal.dto';

// 由于 DTO 众多，我们将为每个 DTO 创建一个 describe 块

describe('DataMappingInternal DTOs', () => {

  describe('DataMappingTestResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(DataMappingTestResultDto, {
        ruleId: '1', ruleName: 'Test', provider: 'p', transDataRuleListType: 't',
        originalData: {}, transformedData: [], success: true, message: 'OK'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('DataMappingStatisticsDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(DataMappingStatisticsDto, {
        totalRules: 10, activeRules: 8, inactiveRules: 2, providers: 3,
        transDataRuleListTypesNum: 4, providerList: ['p1'], transDataRuleListTypeList: ['t1']
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('FieldExtractionResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(FieldExtractionResultDto, { fields: ['a.b'], structure: {} });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('TransformationInputDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(TransformationInputDto, { value: 1, transform: { type: 'multiply' } });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('MappingRuleApplicationDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(MappingRuleApplicationDto, {
        ruleId: '1', sourceData: {}, transformedResult: [], processingTime: 10, isSlowMapping: false
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('FieldSuggestionItemDto', () => {
    it('当数据有效时（包括嵌套的 FieldMatchDto）应通过验证', async () => {
      const dto = plainToClass(FieldSuggestionItemDto, {
        sourceField: 'a',
        suggestions: [{ field: 'b', score: 0.9 }]
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当嵌套的 suggestions 无效时应无法通过验证', async () => {
        const dto = plainToClass(FieldSuggestionItemDto, {
            sourceField: 'a',
            suggestions: [{ field: 'b', score: 'high' }] // score 应该是数字
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        // The error might be on the suggestions property itself or nested within
        const hasValidationError = errors.some(error => 
          error.property === 'suggestions' || 
          (error.children && error.children.length > 0)
        );
        expect(hasValidationError).toBe(true);
    });
  });

  describe('TransformationResultDto', () => {
    it('当转换成功时应通过验证', async () => {
      const dto = plainToClass(TransformationResultDto, { transformedValue: 123, success: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当转换失败时（包含错误消息）应通过验证', async () => {
        const dto = plainToClass(TransformationResultDto, { transformedValue: null, success: false, error: 'Failed' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
  });

  describe('PathResolutionResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(PathResolutionResultDto, { value: 'test', success: true, path: 'a.b' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

});
