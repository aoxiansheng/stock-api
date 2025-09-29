/**
 * DataFetchRequestDto 单元测试
 * 测试数据获取请求DTO的验证和属性
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DataFetchRequestDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-request.dto';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';
import { API_TYPE_VALUES } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';

describe('DataFetchRequestDto', () => {
  describe('valid request creation', () => {
    it('should create valid DTO with all required fields', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, 'AAPL.US'],
        requestId: 'req_123456789',
        apiType: 'rest' as const,
        options: { timeout: 5000 }
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(dto.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(dto.symbols).toEqual([REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, 'AAPL.US']);
      expect(dto.requestId).toBe('req_123456789');
      expect(dto.apiType).toBe('rest');
      expect(dto.options).toEqual({ timeout: 5000 });
    });

    it('should create valid DTO without optional fields', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_987654321'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.apiType).toBeUndefined();
      expect(dto.options).toBeUndefined();
    });

    it('should accept stream apiType', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_stream_123',
        apiType: 'stream' as const
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.apiType).toBe('stream');
    });
  });

  describe('validation errors', () => {
    it('should fail with empty provider', async () => {
      const requestData = {
        provider: '',
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_123'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('provider');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail with missing provider', async () => {
      const requestData = {
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_123'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('provider');
    });

    it('should fail with empty capability', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: '',
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_123'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('capability');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail with empty symbols array', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [],
        requestId: 'req_123'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail with non-string symbols', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: ['AAPL.US', 123, null],
        requestId: 'req_123'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail with missing requestId', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT]
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('requestId');
    });

    it('should fail with invalid apiType', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_123',
        apiType: 'invalid_type'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('apiType');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail with non-object options', async () => {
      const requestData = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'req_123',
        options: 'invalid_options'
      };

      const dto = plainToClass(DataFetchRequestDto, requestData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('options');
      expect(errors[0].constraints).toHaveProperty('isObject');
    });
  });

  describe('API type constants validation', () => {
    it('should validate against API_TYPE_VALUES', () => {
      expect(API_TYPE_VALUES).toContain('rest');
      expect(API_TYPE_VALUES).toContain('stream');
    });
  });
});
