/* eslint-disable @typescript-eslint/no-unused-vars */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  TransformMappingRuleInfoDto,
  TransformFieldMappingPreviewDto,
  TransformPreviewDto,
  BatchTransformOptionsDto,
} from '@core/public/transformer/dto/transform-preview.dto';

// 测试 TransformMappingRuleInfoDto
describe('TransformMappingRuleInfoDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(TransformMappingRuleInfoDto, {
      id: 'rule-123',
      name: 'Test Rule',
      provider: 'TestProvider',
      transDataRuleListType: 'TypeA',
      dataFieldMappingsCount: 10,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当数据类型不正确时应无法通过验证', async () => {
    const dto = plainToClass(TransformMappingRuleInfoDto, {
      id: 123, // 应该是字符串，但传入数字
      name: 'Test Rule',
      provider: 'TestProvider',
      transDataRuleListType: 'TypeA',
      dataFieldMappingsCount: 'invalid', // 应该是数字，但传入字符串
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(2); // 期望 id 和 dataFieldMappingsCount 有错误
  });
});

// 测试 TransformFieldMappingPreviewDto
describe('TransformFieldMappingPreviewDto', () => {
  it('当所有字段都有效时应通过验证', async () => {
    const dto = plainToClass(TransformFieldMappingPreviewDto, {
      sourceField: 'input.name',
      targetField: 'output.fullName',
      sampleSourceValue: 'John',
      expectedTargetValue: 'John Doe',
      transformType: 'concatenation',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当可选字段缺失时仍应通过验证', async () => {
    const dto = plainToClass(TransformFieldMappingPreviewDto, {
      sourceField: 'input.name',
      targetField: 'output.fullName',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误，因为其他字段是可选的
  });
});

// 测试 TransformPreviewDto (包含嵌套验证)
describe('TransformPreviewDto', () => {
  const createValidDto = () => ({
    transformMappingRule: {
      id: 'rule-123',
      name: 'Test Rule',
      provider: 'TestProvider',
      transDataRuleListType: 'TypeA',
      dataFieldMappingsCount: 1,
    },
    sampleInput: { name: 'John', lastName: 'Doe' },
    expectedOutput: { fullName: 'John Doe' },
    sharedDataFieldMappings: [
      {
        sourceField: 'input.name',
        targetField: 'output.fullName',
        sampleSourceValue: 'John',
        expectedTargetValue: 'John Doe',
      },
    ],
  });

  it('当所有数据（包括嵌套对象）有效时应通过验证', async () => {
    const validData = createValidDto();
    const dto = plainToClass(TransformPreviewDto, validData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当嵌套的 transformMappingRule 对象无效时应无法通过验证', async () => {
    const invalidData = createValidDto();
    (invalidData.transformMappingRule as any).id = 123; // 设置无效数据
    const dto = plainToClass(TransformPreviewDto, invalidData);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors[0].property).toBe('transformMappingRule'); // 错误应来自 transformMappingRule 字段
    expect(errors[0].children[0].property).toBe('id'); // 具体的错误字段
  });

  it('当嵌套的 sharedDataFieldMappings 数组中包含无效对象时应无法通过验证', async () => {
    const invalidData = createValidDto();
    (invalidData.sharedDataFieldMappings[0] as any).sourceField = 123; // 设置无效数据
    const dto = plainToClass(TransformPreviewDto, invalidData);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors[0].property).toBe('sharedDataFieldMappings'); // 错误应来自 sharedDataFieldMappings 字段
  });
});

// 测试 BatchTransformOptionsDto
describe('BatchTransformOptionsDto', () => {
  it('当 continueOnError 为布尔值时应通过验证', async () => {
    const dto = plainToClass(BatchTransformOptionsDto, {
      continueOnError: true,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当 continueOnError 字段缺失时仍应通过验证', async () => {
    const dto = plainToClass(BatchTransformOptionsDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误，因为它是可选的
  });
});
