
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  UpdateDataMappingDto,
  ParseJsonDto,
  FieldSuggestionDto,
  ApplyMappingDto,
  TestMappingDto,
} from '../../../../../../src/core/data-mapper/dto/update-data-mapping.dto';

describe('UpdateDataMappingDto and related DTOs', () => {
  // 测试 UpdateDataMappingDto
  describe('UpdateDataMappingDto', () => {
    it('当只提供部分字段时应通过验证', async () => {
      const dto = plainToClass(UpdateDataMappingDto, {
        name: 'Updated Name',
        isActive: false,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0); // 期望没有验证错误
    });

    it('当提供无效类型字段时应无法通过验证', async () => {
      const dto = plainToClass(UpdateDataMappingDto, { name: 123 }); // name 应该是字符串
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });
  });

  // 测试 ParseJsonDto
  describe('ParseJsonDto', () => {
    it('当提供 jsonData 时应通过验证', async () => {
      const dto = plainToClass(ParseJsonDto, { jsonData: { key: 'value' } });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当提供 jsonString 时应通过验证', async () => {
      const dto = plainToClass(ParseJsonDto, { jsonString: '{ "key": "value" }' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当两个字段都缺失时仍应通过验证', async () => {
      const dto = plainToClass(ParseJsonDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // 测试 FieldSuggestionDto
  describe('FieldSuggestionDto', () => {
    it('当字段都有效时应通过验证', async () => {
      const dto = plainToClass(FieldSuggestionDto, {
        sourceFields: ['a', 'b'],
        targetFields: ['c', 'd'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当必填字段缺失时应无法通过验证', async () => {
      const dto = plainToClass(FieldSuggestionDto, { sourceFields: ['a', 'b'] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('targetFields');
    });
  });

  // 测试 ApplyMappingDto
  describe('ApplyMappingDto', () => {
    it('当字段都有效时应通过验证', async () => {
      const dto = plainToClass(ApplyMappingDto, {
        ruleId: 'some-rule-id',
        sourceData: { key: 'value' },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当必填字段 ruleId 缺失时应无法通过验证', async () => {
      const dto = plainToClass(ApplyMappingDto, { sourceData: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('ruleId');
    });
  });

  // 测试 TestMappingDto
  describe('TestMappingDto', () => {
    it('当字段都有效时应通过验证', async () => {
      const dto = plainToClass(TestMappingDto, {
        ruleId: 'some-rule-id',
        testData: { key: 'value' },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当必填字段 testData 缺失时应无法通过验证', async () => {
      const dto = plainToClass(TestMappingDto, { ruleId: 'some-rule-id' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('testData');
    });
  });
});
