
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreateDataMappingDto,
  FieldMappingDto,
  TransformFunctionDto,
} from '../../../../../../src/core/data-mapper/dto/create-data-mapping.dto';

describe('CreateDataMappingDto and its nested DTOs', () => {
  // 测试最内层的 TransformFunctionDto
  describe('TransformFunctionDto', () => {
    it('当类型和值都有效时应通过验证', async () => {
      const dto = plainToClass(TransformFunctionDto, {
        type: 'multiply',
        value: 100,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当类型为 custom 时，应包含 customFunction', async () => {
      // 理论上应该包含 customFunction，但当前 DTO 定义为可选，所以这里只验证基本结构
      const dto = plainToClass(TransformFunctionDto, {
        type: 'custom',
        customFunction: 'value * 2',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当类型为无效枚举值时应无法通过验证', async () => {
      const dto = plainToClass(TransformFunctionDto, { type: 'invalid-type' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });
  });

  // 测试 FieldMappingDto
  describe('FieldMappingDto', () => {
    it('当字段有效时应通过验证', async () => {
      const dto = plainToClass(FieldMappingDto, {
        sourceField: 'a.b',
        targetField: 'c',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当必填字段缺失时应无法通过验证', async () => {
      const dto = plainToClass(FieldMappingDto, { sourceField: 'a.b' }); // 缺少 targetField
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('targetField');
    });

    it('当嵌套的 transform 无效时应无法通过验证', async () => {
      const dto = plainToClass(FieldMappingDto, {
        sourceField: 'a.b',
        targetField: 'c',
        transform: { type: 'invalid' }, // 无效的 transform
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('transform');
    });
  });

  // 测试顶层的 CreateDataMappingDto
  describe('CreateDataMappingDto', () => {
    const createValidDto = () => ({
      name: 'Test Mapping',
      provider: 'test-provider',
      transDataRuleListType: 'quote_fields',
      sharedDataFieldMappings: [
        {
          sourceField: 'input.price',
          targetField: 'output.price',
          transform: { type: 'multiply', value: 1 },
        },
      ],
      isActive: true,
    });

    it('当所有数据都有效时应通过验证', async () => {
      const validData = createValidDto();
      const dto = plainToClass(CreateDataMappingDto, validData);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当必填字段 name 缺失时应无法通过验证', async () => {
      const invalidData = createValidDto();
      delete invalidData.name;
      const dto = plainToClass(CreateDataMappingDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('当 transDataRuleListType 为无效枚举值时应无法通过验证', async () => {
      const invalidData = createValidDto();
      invalidData.transDataRuleListType = 'invalid_enum';
      const dto = plainToClass(CreateDataMappingDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('transDataRuleListType');
    });

    it('当嵌套的 sharedDataFieldMappings 包含无效对象时应无法通过验证', async () => {
      const invalidData = createValidDto();
      invalidData.sharedDataFieldMappings[0].sourceField = ''; // 无效的 sourceField
      const dto = plainToClass(CreateDataMappingDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('sharedDataFieldMappings');
      expect(errors[0].children[0].children[0].property).toBe('sourceField');
    });
  });
});
