/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { FeatureFlags } from '@config/feature-flags.config';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: FeatureFlags,
          useValue: {
            symbolMappingCacheEnabled: true,
            dataTransformCacheEnabled: true,
            batchProcessingEnabled: true,
            objectPoolEnabled: true,
            ruleCompilationEnabled: true,
            dynamicLogLevelEnabled: true,
            metricsLegacyModeEnabled: true,
            symbolCacheMaxSize: 2000,
            symbolCacheTtl: 5 * 60 * 1000,
            ruleCacheMaxSize: 100,
            ruleCacheTtl: 10 * 60 * 1000,
            objectPoolSize: 100,
            batchSizeThreshold: 10,
            batchTimeWindowMs: 1,
            getAllFlags: jest.fn().mockReturnValue({
              symbolMappingCacheEnabled: true,
              dataTransformCacheEnabled: true,
              batchProcessingEnabled: true,
              objectPoolEnabled: true,
              ruleCompilationEnabled: true,
              dynamicLogLevelEnabled: true,
              metricsLegacyModeEnabled: true,
            }),
            isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
            isPerformanceOptimizationEnabled: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSkip', () => {
    it('should calculate skip correctly for first page', () => {
      const result = service.calculateSkip(1, 10);
      expect(result).toBe(0);
    });

    it('should calculate skip correctly for second page', () => {
      const result = service.calculateSkip(2, 10);
      expect(result).toBe(10);
    });

    it('should calculate skip correctly for different page sizes', () => {
      expect(service.calculateSkip(3, 20)).toBe(40);
      expect(service.calculateSkip(5, 5)).toBe(20);
    });
  });

  describe('normalizePaginationQuery', () => {
    it('should use default values when no query provided', () => {
      const result = service.normalizePaginationQuery({});
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should use provided values when valid', () => {
      const result = service.normalizePaginationQuery({ page: 2, limit: 20 });
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should normalize invalid page to 1', () => {
      const result = service.normalizePaginationQuery({ page: 0 });
      expect(result.page).toBe(1);
      
      const result2 = service.normalizePaginationQuery({ page: -1 });
      expect(result2.page).toBe(1);
    });

    it('should normalize invalid limit to default and cap at max', () => {
      const result = service.normalizePaginationQuery({ limit: 0 });
      expect(result.limit).toBe(10); // DEFAULT_LIMIT

      const result2 = service.normalizePaginationQuery({ limit: -5 });
      expect(result2.limit).toBe(10); // DEFAULT_LIMIT

      const result3 = service.normalizePaginationQuery({ limit: 200 });
      expect(result3.limit).toBe(100); // MAX_LIMIT
    });
  });

  describe('createPagination', () => {
    it('should create pagination info correctly', () => {
      const result = service.createPagination(1, 10, 25);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle last page correctly', () => {
      const result = service.createPagination(3, 10, 25);
      expect(result).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle middle page correctly', () => {
      const result = service.createPagination(2, 10, 50);
      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle empty results', () => {
      const result = service.createPagination(1, 10, 0);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle exact page fit', () => {
      const result = service.createPagination(2, 10, 20);
      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response correctly', () => {
      const items = ['item1', 'item2', 'item3'];
      const result = service.createPaginatedResponse(items, 1, 10, 25);

      expect(result).toBeInstanceOf(PaginatedDataDto);
      expect(result.items).toEqual(items);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });
  });

  describe('createPaginatedResponseFromQuery', () => {
    it('should create paginated response from query correctly', () => {
      const items = ['item1', 'item2'];
      const query = { page: 2, limit: 5 };
      const result = service.createPaginatedResponseFromQuery(items, query, 15);

      expect(result).toBeInstanceOf(PaginatedDataDto);
      expect(result.items).toEqual(items);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle empty query', () => {
      const items = ['item1'];
      const result = service.createPaginatedResponseFromQuery(items, {}, 1);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate correct parameters', () => {
      const result = service.validatePaginationParams(1, 10, 100);
      expect(result).toEqual({ isValid: true });
    });

    it('should reject invalid page', () => {
      const result = service.validatePaginationParams(0, 10, 100);
      expect(result).toEqual({
        isValid: false,
        error: '页码必须大于0',
      });

      const result2 = service.validatePaginationParams(-1, 10, 100);
      expect(result2).toEqual({
        isValid: false,
        error: '页码必须大于0',
      });
    });

    it('should reject invalid limit', () => {
      const result = service.validatePaginationParams(1, 0, 100);
      expect(result).toEqual({
        isValid: false,
        error: '每页条数必须大于0',
      });

      const result2 = service.validatePaginationParams(1, -5, 100);
      expect(result2).toEqual({
        isValid: false,
        error: '每页条数必须大于0',
      });
    });

    it('should reject limit exceeding maximum', () => {
      const result = service.validatePaginationParams(1, 150, 100);
      expect(result).toEqual({
        isValid: false,
        error: '每页条数不能超过100',
      });
    });

    it('should reject page exceeding total pages', () => {
      const result = service.validatePaginationParams(6, 10, 50); // total pages = 5
      expect(result).toEqual({
        isValid: false,
        error: '页码不能超过总页数5',
      });
    });

    it('should handle edge case with zero total', () => {
      const result = service.validatePaginationParams(1, 10, 0);
      expect(result).toEqual({ isValid: true });
    });

    it('should allow page 1 when total is 0', () => {
      const result = service.validatePaginationParams(1, 10, 0);
      expect(result).toEqual({ isValid: true });
    });
  });
});