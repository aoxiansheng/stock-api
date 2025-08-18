/* eslint-disable @typescript-eslint/no-unused-vars */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TransformRequestDto } from '@core/02-processing/transformer/dto/transform-request.dto';

// 由于 TransformOptionsDto 是 TransformRequestDto 的一部分，我们将通过测试 TransformRequestDto 来间接测试它。

describe('TransformRequestDto', () => {
  // 创建一个有效的请求体
  const createValidRequest = () => ({
    provider: 'longport',
    apiType: 'rest',
    transDataRuleListType: 'quote_fields',
    rawData: { price: 100, volume: 1000 },
    mappingOutRuleId: 'specific-rule-123',
    options: {
      validateOutput: true,
      includeMetadata: true,
      context: { userId: 'user-abc' },
    },
  });

  it('当所有字段都有效时应通过验证', async () => {
    const request = createValidRequest();
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当可选字段缺失时仍应通过验证', async () => {
    const request = createValidRequest();
    delete request.mappingOutRuleId;
    delete request.options;
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当必填字段 provider 缺失时应无法通过验证', async () => {
    const request = createValidRequest();
    delete request.provider;
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors.some(error => error.property === 'provider')).toBe(true); // 验证是 provider 字段的错误
  });

  it('当必填字段 transDataRuleListType 缺失时应无法通过验证', async () => {
    const request = createValidRequest();
    delete request.transDataRuleListType;
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors.some(error => error.property === 'transDataRuleListType')).toBe(true); // 验证是 transDataRuleListType 字段的错误
  });

  it('当必填字段 rawData 缺失时应无法通过验证', async () => {
    const request = createValidRequest();
    delete request.rawData;
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors.some(error => error.property === 'rawData')).toBe(true); // 验证是 rawData 字段的错误
  });

  it('当字段类型不正确时应无法通过验证', async () => {
    const request = {
      provider: 123, // 无效类型
      transDataRuleListType: true, // 无效类型
      rawData: 'not-an-object', // 无效类型
    };
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    expect(errors.some(error => error.property === 'provider')).toBe(true);
    expect(errors.some(error => error.property === 'transDataRuleListType')).toBe(true);
    expect(errors.some(error => error.property === 'rawData')).toBe(true);
  });

  it('当嵌套的 options 对象无效时应无法通过验证', async () => {
    const request = createValidRequest();
    request.options.validateOutput = 'not-a-boolean' as any; // 设置无效数据
    const dto = plainToClass(TransformRequestDto, request);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // 期望有验证错误
    const optionsError = errors.find(error => error.property === 'options');
    expect(optionsError).toBeDefined(); // 错误应来自 options 字段
    if (optionsError?.children) {
      expect(optionsError.children.some(child => child.property === 'validateOutput')).toBe(true); // 具体的错误字段
    }
  });
});
