/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  TransformationMetadataDto,
  TransformResponseDto,
} from '../../../../../../../src/core/public/transformer/dto/transform-response.dto';

// 测试 TransformationMetadataDto
describe('TransformationMetadataDto', () => {
  it('应能正确创建 TransformationMetadataDto 实例', () => {
    // 准备测试数据
    const ruleId = 'rule-001';
    const ruleName = 'Test Rule';
    const provider = 'TestProvider';
    const transDataRuleListType = 'TypeA';
    const recordsProcessed = 100;
    const fieldsTransformed = 50;
    const processingTime = 120.5;
    const transformationsApplied = [
      {
        sourceField: 'a',
        targetField: 'b',
        transformType: 'copy',
      },
    ];

    // 创建实例
    const metadata = new TransformationMetadataDto(
      ruleId,
      ruleName,
      provider,
      transDataRuleListType,
      recordsProcessed,
      fieldsTransformed,
      processingTime,
      transformationsApplied,
    );

    // 断言属性是否被正确赋值
    expect(metadata.ruleId).toBe(ruleId);
    expect(metadata.ruleName).toBe(ruleName);
    expect(metadata.provider).toBe(provider);
    expect(metadata.transDataRuleListType).toBe(transDataRuleListType);
    expect(metadata.recordsProcessed).toBe(recordsProcessed);
    expect(metadata.fieldsTransformed).toBe(fieldsTransformed);
    expect(metadata.processingTime).toBe(processingTime);
    expect(metadata.transformationsApplied).toEqual(transformationsApplied);

    // 断言 timestamp 是否是一个有效的 ISO 字符串
    expect(typeof metadata.timestamp).toBe('string');
    expect(() => new Date(metadata.timestamp)).not.toThrow();
    expect(new Date(metadata.timestamp).toISOString()).toBe(metadata.timestamp);
  });

  it('当 transformationsApplied 未提供时，应为 undefined', () => {
    // 创建实例时省略可选参数
    const metadata = new TransformationMetadataDto(
      'rule-002',
      'Another Rule',
      'ProviderB',
      'TypeB',
      200,
      100,
      250,
    );

    // 断言可选属性为 undefined
    expect(metadata.transformationsApplied).toBeUndefined();
  });
});

// 测试 TransformResponseDto
describe('TransformResponseDto', () => {
  it('应能正确创建 TransformResponseDto 实例', () => {
    // 准备测试数据
    const transformedData = { user: { id: 1, name: 'John Doe' } };
    const metadata = new TransformationMetadataDto(
      'rule-003',
      'User Rule',
      'ProviderC',
      'TypeC',
      1,
      2,
      10,
    );

    // 创建实例
    const responseDto = new TransformResponseDto(transformedData, metadata);

    // 断言属性是否被正确赋值
    expect(responseDto.transformedData).toEqual(transformedData);
    expect(responseDto.metadata).toBe(metadata);
  });

  it('应能处理不同类型的 transformedData', () => {
    // 测试数组类型
    const arrayData = [1, 2, 3];
    const metadata = new TransformationMetadataDto('r','n','p','t',1,1,1);
    const arrayResponse = new TransformResponseDto(arrayData, metadata);
    expect(arrayResponse.transformedData).toEqual(arrayData);

    // 测试字符串类型
    const stringData = 'transformation complete';
    const stringResponse = new TransformResponseDto(stringData, metadata);
    expect(stringResponse.transformedData).toBe(stringData);
  });
});
