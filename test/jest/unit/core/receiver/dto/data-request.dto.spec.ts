
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DataRequestDto } from '../../../../../../src/core/receiver/dto/data-request.dto';
import { SUPPORTED_CAPABILITY_TYPES } from '../../../../../../src/core/receiver/constants/receiver.constants';

describe('DataRequestDto', () => {
  // 创建一个有效的请求体
  const createValidDto = () => ({
    symbols: ['700.HK', 'AAPL.US'],
    receiverType: SUPPORTED_CAPABILITY_TYPES[0], // 使用支持的第一个类型
    options: {
      preferredProvider: 'test',
      realtime: true,
      fields: ['lastPrice'],
      market: 'HK',
    },
  });

  it('当所有字段都有效时应通过验证', async () => {
    const dto = plainToClass(DataRequestDto, createValidDto());
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当可选的 options 缺失时仍应通过验证', async () => {
    const validDto = createValidDto();
    delete validDto.options;
    const dto = plainToClass(DataRequestDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('symbols validation', () => {
    it('当 symbols 列表为空时应无法通过验证', async () => {
      const invalidDto = { ...createValidDto(), symbols: [] };
      const dto = plainToClass(DataRequestDto, invalidDto);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('symbols');
    });

    it('当 symbols 包含无效格式时应无法通过验证', async () => {
      const invalidDto = { ...createValidDto(), symbols: ['INVALID-SYMBOL'] };
      const dto = plainToClass(DataRequestDto, invalidDto);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('当 symbols 列表过长时应无法通过验证', async () => {
        const longList = Array(101).fill('700.HK');
        const invalidDto = { ...createValidDto(), symbols: longList };
        const dto = plainToClass(DataRequestDto, invalidDto);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('symbols');
        expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
      });
  });

  describe('receiverType validation', () => {
    it('当 receiverType 缺失时应无法通过验证', async () => {
      const invalidDto = createValidDto();
      delete invalidDto.receiverType;
      const dto = plainToClass(DataRequestDto, invalidDto);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('receiverType');
    });

    it('当 receiverType 为不支持的类型时应无法通过验证', async () => {
      const invalidDto = { ...createValidDto(), receiverType: 'unsupported-type' };
      const dto = plainToClass(DataRequestDto, invalidDto);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('receiverType');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });
  });

  describe('options validation', () => {
    it('当嵌套的 options 字段类型不正确时应无法通过验证', async () => {
      const invalidDto = createValidDto();
      invalidDto.options.realtime = 'not-a-boolean' as any;
      const dto = plainToClass(DataRequestDto, invalidDto);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('options');
      expect(errors[0].children[0].property).toBe('realtime');
    });
  });
});
