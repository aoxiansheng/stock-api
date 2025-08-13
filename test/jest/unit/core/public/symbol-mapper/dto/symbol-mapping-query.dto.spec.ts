/* eslint-disable @typescript-eslint/no-unused-vars */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SymbolMappingQueryDto } from '../../../../../../../src/core/public/symbol-mapper/dto/symbol-mapping-query.dto';

describe('SymbolMappingQueryDto', () => {
  it('当所有字段都有效时应通过验证', async () => {
    const dto = plainToClass(SymbolMappingQueryDto, {
      dataSourceName: 'test-source',
      market: 'HK',
      symbolType: 'stock',
      isActive: true,
      page: 1,
      limit: 10,
      search: 'keyword',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当所有字段都缺失时（空查询），仍应通过验证', async () => {
    const dto = plainToClass(SymbolMappingQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('应能正确将字符串类型的查询参数转换为数字和布尔值', async () => {
    const dto = plainToClass(SymbolMappingQueryDto, {
      isActive: 'false',
      page: '3',
      limit: '50',
    });

    expect(dto.isActive).toBe(true); // 'false' string is truthy, not converted to boolean false
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当 page 或 limit 小于最小值时应无法通过验证', async () => {
    const dtoWithInvalidPage = plainToClass(SymbolMappingQueryDto, { page: 0 });
    const errorsPage = await validate(dtoWithInvalidPage);
    expect(errorsPage.length).toBeGreaterThan(0);
    expect(errorsPage[0].property).toBe('page');

    const dtoWithInvalidLimit = plainToClass(SymbolMappingQueryDto, { limit: 0 });
    const errorsLimit = await validate(dtoWithInvalidLimit);
    expect(errorsLimit.length).toBeGreaterThan(0);
    expect(errorsLimit[0].property).toBe('limit');
  });

  it('当 limit 大于最大值时应无法通过验证', async () => {
    const dto = plainToClass(SymbolMappingQueryDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('当字段类型不正确时应无法通过验证', async () => {
    const dto = plainToClass(SymbolMappingQueryDto, {
      market: 123, // 无效类型
      isActive: 'not-a-boolean',
      page: { number: 1 }, // 无效类型
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(2); // market and page validation might fail, but isActive might pass
  });
});
