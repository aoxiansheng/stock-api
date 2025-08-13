/* eslint-disable @typescript-eslint/no-unused-vars */
import { validate } from 'class-validator';
import { DataFetchRequestDto, ApiType, DataFetchMetadataDto } from '../../../../../../../src/core/restapi/data-fetcher/dto/data-fetch-request.dto';

describe('DataFetchRequestDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK', 'AAPL.US'];
      dto.requestId = 'req_123456789';
      dto.apiType = ApiType.REST;
      dto.options = { includeAfterHours: true };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when provider is missing', async () => {
      const dto = new DataFetchRequestDto();
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK'];
      dto.requestId = 'req_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('provider');
    });

    it('should fail validation when capability is missing', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.symbols = ['700.HK'];
      dto.requestId = 'req_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('capability');
    });

    it('should fail validation when symbols array is empty', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = [];
      dto.requestId = 'req_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('symbols');
    });

    it('should fail validation when requestId is missing', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('requestId');
    });

    it('should fail validation with invalid apiType', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK'];
      dto.requestId = 'req_123456789';
      (dto as any).apiType = 'invalid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('apiType');
    });

    it('should use default apiType when not provided', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK'];
      dto.requestId = 'req_123456789';

      expect(dto.apiType).toBe(ApiType.REST);
    });

    it('should accept valid options object', async () => {
      const dto = new DataFetchRequestDto();
      dto.provider = 'longport';
      dto.capability = 'get-stock-quote';
      dto.symbols = ['700.HK'];
      dto.requestId = 'req_123456789';
      dto.options = { timeout: 5000, retries: 3 };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.options).toEqual({ timeout: 5000, retries: 3 });
    });
  });
});

describe('DataFetchMetadataDto', () => {
  describe('constructor', () => {
    it('should create instance with all required fields', () => {
      const metadata = new DataFetchMetadataDto(
        'longport',
        'get-stock-quote',
        150,
        2,
        ['INVALID.XX'],
        ['Symbol not found: INVALID.XX'],
      );

      expect(metadata.provider).toBe('longport');
      expect(metadata.capability).toBe('get-stock-quote');
      expect(metadata.processingTime).toBe(150);
      expect(metadata.symbolsProcessed).toBe(2);
      expect(metadata.failedSymbols).toEqual(['INVALID.XX']);
      expect(metadata.errors).toEqual(['Symbol not found: INVALID.XX']);
    });

    it('should create instance with optional fields as undefined', () => {
      const metadata = new DataFetchMetadataDto(
        'longport',
        'get-stock-quote',
        150,
        2,
      );

      expect(metadata.provider).toBe('longport');
      expect(metadata.capability).toBe('get-stock-quote');
      expect(metadata.processingTime).toBe(150);
      expect(metadata.symbolsProcessed).toBe(2);
      expect(metadata.failedSymbols).toBeUndefined();
      expect(metadata.errors).toBeUndefined();
    });
  });
});