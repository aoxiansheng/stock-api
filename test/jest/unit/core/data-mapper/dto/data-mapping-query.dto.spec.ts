
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DataMappingQueryDto } from '../../../../../../src/core/data-mapper/dto/data-mapping-query.dto';

describe('DataMappingQueryDto', () => {
  it('当所有字段都有效时应通过验证', async () => {
    const dto = plainToClass(DataMappingQueryDto, {
      provider: 'test-provider',
      transDataRuleListType: 'test-type',
      isActive: true,
      page: 1,
      limit: 10,
      search: 'keyword',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误
  });

  it('当所有字段都缺失时（空查询），仍应通过验证', async () => {
    const dto = plainToClass(DataMappingQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望没有验证错误，因为所有字段都是可选的
  });

  it('应能正确将字符串类型的查询参数转换为数字和布尔值', async () => {
    const dto = plainToClass(DataMappingQueryDto, {
      isActive: 'true', // 字符串 'true'
      page: '2',       // 字符串 '2'
      limit: '20',      // 字符串 '20'
    });

    // 验证转换后的类型
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);

    const errors = await validate(dto);
    expect(errors.length).toBe(0); // 期望验证通过
  });

  it('当 page 或 limit 小于最小值时应无法通过验证', async () => {
    const dtoWithInvalidPage = plainToClass(DataMappingQueryDto, { page: 0 });
    const errorsPage = await validate(dtoWithInvalidPage);
    expect(errorsPage.length).toBeGreaterThan(0);
    expect(errorsPage[0].property).toBe('page');

    const dtoWithInvalidLimit = plainToClass(DataMappingQueryDto, { limit: 0 });
    const errorsLimit = await validate(dtoWithInvalidLimit);
    expect(errorsLimit.length).toBeGreaterThan(0);
    expect(errorsLimit[0].property).toBe('limit');
  });

  it('当 limit 大于最大值时应无法通过验证', async () => {
    const dto = plainToClass(DataMappingQueryDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('当字段类型不正确时应无法通过验证', async () => {
    const dto = plainToClass(DataMappingQueryDto, {
      provider: 123, // 无效类型
      isActive: 'not-a-boolean', // 由于类型转换，非空字符串会转为true，所以不会验证失败
      page: 'not-a-number', // 无效类型
    });
    const errors = await validate(dto);
    // 期望 provider 和 page 有错误，isActive 因为被转换为布尔值true所以不会产生验证错误
    expect(errors.length).toBe(2);
  });
});
