/* eslint-disable @typescript-eslint/no-unused-vars */

import { ValidationPipe } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateSymbolMappingDto, SymbolMappingRuleDto } from '@core/public/symbol-mapper/dto/create-symbol-mapping.dto';

describe('SymbolMappingRuleDto', () => {
  // 创建一个验证管道实例，用于后续的验证操作
  const validator = new ValidationPipe({
    transform: true, // 自动将普通对象转换为 DTO 类的实例
    whitelist: true, // 自动移除 DTO 中未定义的属性
    forbidNonWhitelisted: true, // 如果存在未在 DTO 中定义的属性，则抛出错误
  });

  // 测试当所有字段都有效时的情况
  it('应该在所有字段都有效时验证通过', async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(SymbolMappingRuleDto, {
      standardSymbol: 'AAPL.US',
      sdkSymbol: 'AAPL',
      market: 'US',
      symbolType: 'Stock',
      isActive: true,
      description: 'Apple Inc.',
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, { metatype: SymbolMappingRuleDto, type: 'body' });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当缺少必需字段 standardSymbol 时的情况
  it('当缺少必需字段 standardSymbol 时，应该验证失败', async () => {
    // 创建一个缺少 standardSymbol 字段的 DTO 实例
    const dto = plainToClass(SymbolMappingRuleDto, {
      sdkSymbol: 'AAPL',
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(validator.transform(dto, { metatype: SymbolMappingRuleDto, type: 'body' })).rejects.toThrow();
  });

  // 测试当 standardSymbol 长度过长时的情况
  it('当 standardSymbol 长度过长时，应该验证失败', async () => {
    // 创建一个 standardSymbol 长度过长的 DTO 实例
    const dto = plainToClass(SymbolMappingRuleDto, {
      standardSymbol: 'A'.repeat(21),
      sdkSymbol: 'AAPL',
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(validator.transform(dto, { metatype: SymbolMappingRuleDto, type: 'body' })).rejects.toThrow();
  });
});

describe('CreateSymbolMappingDto', () => {
  // 创建一个验证管道实例
  const validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  // 测试当所有字段都有效时的情况
  it('应该在所有字段都有效时验证通过', async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(CreateSymbolMappingDto, {
      dataSourceName: 'test-source',
      SymbolMappingRule: [
        {
          standardSymbol: 'AAPL.US',
          sdkSymbol: 'AAPL',
        },
      ],
      description: 'Test mapping',
      version: '1.0.0',
      isActive: true,
      createdBy: 'test-user',
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, { metatype: CreateSymbolMappingDto, type: 'body' });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当 dataSourceName 无效时的情况
  it('当 dataSourceName 无效时，应该验证失败', async () => {
    // 创建一个 dataSourceName 无效的 DTO 实例
    const dto = plainToClass(CreateSymbolMappingDto, {
      dataSourceName: 'invalid name',
      SymbolMappingRule: [
        {
          standardSymbol: 'AAPL.US',
          sdkSymbol: 'AAPL',
        },
      ],
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(validator.transform(dto, { metatype: CreateSymbolMappingDto, type: 'body' })).rejects.toThrow();
  });

  // 测试当 SymbolMappingRule 为空数组时的情况
  it('当 SymbolMappingRule 为空数组时，应该验证失败', async () => {
    // 创建一个 SymbolMappingRule 为空数组的 DTO 实例
    const dto = plainToClass(CreateSymbolMappingDto, {
      dataSourceName: 'test-source',
      SymbolMappingRule: [],
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(validator.transform(dto, { metatype: CreateSymbolMappingDto, type: 'body' })).rejects.toThrow();
  });

  // 测试当 version 格式无效时的情况
  it('当 version 格式无效时，应该验证失败', async () => {
    // 创建一个 version 格式无效的 DTO 实例
    const dto = plainToClass(CreateSymbolMappingDto, {
      dataSourceName: 'test-source',
      SymbolMappingRule: [
        {
          standardSymbol: 'AAPL.US',
          sdkSymbol: 'AAPL',
        },
      ],
      version: '1.0',
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(validator.transform(dto, { metatype: CreateSymbolMappingDto, type: 'body' })).rejects.toThrow();
  });
});
