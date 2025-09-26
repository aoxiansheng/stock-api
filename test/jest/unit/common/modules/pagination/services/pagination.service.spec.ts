import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaginationService, PaginationQuery } from '@common/modules/pagination/services/pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values when config is not available', () => {
      configService.get.mockImplementation((key, defaultValue) => defaultValue);

      const newService = new PaginationService(configService);

      expect(newService.getDefaultPage()).toBe(1);
      expect(newService.getDefaultLimit()).toBe(10);
      expect(newService.getMaxLimit()).toBe(100);
    });

    it('should initialize with custom config values', () => {
      configService.get.mockImplementation((key) => {
        switch (key) {
          case 'PAGINATION_DEFAULT_PAGE':
            return 2;
          case 'PAGINATION_DEFAULT_LIMIT':
            return 25;
          case 'PAGINATION_MAX_LIMIT':
            return 200;
          default:
            return undefined;
        }
      });

      const newService = new PaginationService(configService);

      expect(newService.getDefaultPage()).toBe(2);
      expect(newService.getDefaultLimit()).toBe(25);
      expect(newService.getMaxLimit()).toBe(200);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => {
        switch (key) {
          case 'PAGINATION_DEFAULT_PAGE':
            return 1;
          case 'PAGINATION_DEFAULT_LIMIT':
            return 10;
          case 'PAGINATION_MAX_LIMIT':
            return 100;
          default:
            return defaultValue;
        }
      });
    });

    it('should return correct default page', () => {
      expect(service.getDefaultPage()).toBe(1);
    });

    it('should return correct default limit', () => {
      expect(service.getDefaultLimit()).toBe(10);
    });

    it('should return correct max limit', () => {
      expect(service.getMaxLimit()).toBe(100);
    });
  });

  describe('calculateSkip', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => defaultValue);
    });

    it('should calculate skip correctly for first page', () => {
      expect(service.calculateSkip(1, 10)).toBe(0);
    });

    it('should calculate skip correctly for second page', () => {
      expect(service.calculateSkip(2, 10)).toBe(10);
    });

    it('should calculate skip correctly for any page', () => {
      expect(service.calculateSkip(5, 20)).toBe(80);
      expect(service.calculateSkip(10, 15)).toBe(135);
    });

    it('should handle edge cases', () => {
      expect(service.calculateSkip(1, 1)).toBe(0);
      expect(service.calculateSkip(100, 1)).toBe(99);
    });
  });

  describe('normalizePaginationQuery', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => {
        switch (key) {
          case 'PAGINATION_DEFAULT_PAGE':
            return 1;
          case 'PAGINATION_DEFAULT_LIMIT':
            return 10;
          case 'PAGINATION_MAX_LIMIT':
            return 100;
          default:
            return defaultValue;
        }
      });
    });

    it('should normalize empty query to defaults', () => {
      const query: PaginationQuery = {};
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should use provided valid values', () => {
      const query: PaginationQuery = { page: 5, limit: 20 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 5, limit: 20 });
    });

    it('should normalize negative page to 1', () => {
      const query: PaginationQuery = { page: -1, limit: 20 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should normalize zero page to 1', () => {
      const query: PaginationQuery = { page: 0, limit: 20 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should normalize invalid limit to default', () => {
      const testCases = [
        { page: 2, limit: 0 },
        { page: 2, limit: -1 },
        { page: 2, limit: null as any },
        { page: 2, limit: undefined },
      ];

      testCases.forEach(query => {
        const result = service.normalizePaginationQuery(query);
        expect(result).toEqual({ page: 2, limit: 10 });
      });
    });

    it('should cap limit to max limit', () => {
      const query: PaginationQuery = { page: 1, limit: 200 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 1, limit: 100 });
    });

    it('should handle mixed invalid parameters', () => {
      const query: PaginationQuery = { page: -5, limit: 300 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 1, limit: 100 });
    });

    it('should handle decimal page numbers', () => {
      const query: PaginationQuery = { page: 3.7, limit: 15 };
      const result = service.normalizePaginationQuery(query);

      expect(result).toEqual({ page: 3, limit: 15 });
    });
  });

  describe('createPagination', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => defaultValue);
    });

    it('should create correct pagination info for first page', () => {
      const result = service.createPagination(1, 10, 100);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should create correct pagination info for middle page', () => {
      const result = service.createPagination(5, 10, 100);

      expect(result).toEqual({
        page: 5,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should create correct pagination info for last page', () => {
      const result = service.createPagination(10, 10, 100);

      expect(result).toEqual({
        page: 10,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle single page scenario', () => {
      const result = service.createPagination(1, 10, 5);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle zero total records', () => {
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

    it('should handle partial last page', () => {
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

    it('should calculate total pages correctly for different scenarios', () => {
      expect(service.createPagination(1, 10, 99).totalPages).toBe(10);
      expect(service.createPagination(1, 10, 100).totalPages).toBe(10);
      expect(service.createPagination(1, 10, 101).totalPages).toBe(11);
    });
  });

  describe('createPaginatedResponse', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => defaultValue);
    });

    it('should create paginated response with correct structure', () => {
      const items = [1, 2, 3, 4, 5];
      const result = service.createPaginatedResponse(items, 1, 10, 50);

      expect(result.items).toEqual(items);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle empty items array', () => {
      const items: any[] = [];
      const result = service.createPaginatedResponse(items, 1, 10, 0);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should work with different data types', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const result = service.createPaginatedResponse(items, 2, 5, 20);

      expect(result.items).toEqual(items);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(20);
    });
  });

  describe('createPaginatedResponseFromQuery', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => {
        switch (key) {
          case 'PAGINATION_DEFAULT_PAGE':
            return 1;
          case 'PAGINATION_DEFAULT_LIMIT':
            return 10;
          case 'PAGINATION_MAX_LIMIT':
            return 100;
          default:
            return defaultValue;
        }
      });
    });

    it('should create response using normalized query parameters', () => {
      const items = ['a', 'b', 'c'];
      const query: PaginationQuery = { page: 2, limit: 15 };
      const result = service.createPaginatedResponseFromQuery(items, query, 100);

      expect(result.items).toEqual(items);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(15);
      expect(result.pagination.total).toBe(100);
    });

    it('should use defaults for empty query', () => {
      const items = [1, 2, 3];
      const query: PaginationQuery = {};
      const result = service.createPaginatedResponseFromQuery(items, query, 30);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should normalize invalid query parameters', () => {
      const items = ['test'];
      const query: PaginationQuery = { page: -1, limit: 200 };
      const result = service.createPaginatedResponseFromQuery(items, query, 10);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('validatePaginationParams', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => {
        switch (key) {
          case 'PAGINATION_MAX_LIMIT':
            return 100;
          default:
            return defaultValue;
        }
      });
    });

    it('should validate correct parameters', () => {
      const result = service.validatePaginationParams(1, 10, 100);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject negative page', () => {
      const result = service.validatePaginationParams(-1, 10, 100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('页码必须大于0');
    });

    it('should reject zero page', () => {
      const result = service.validatePaginationParams(0, 10, 100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('页码必须大于0');
    });

    it('should reject negative limit', () => {
      const result = service.validatePaginationParams(1, -1, 100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('每页条数必须大于0');
    });

    it('should reject zero limit', () => {
      const result = service.validatePaginationParams(1, 0, 100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('每页条数必须大于0');
    });

    it('should reject limit exceeding max limit', () => {
      const result = service.validatePaginationParams(1, 150, 1000);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('每页条数不能超过100');
    });

    it('should reject page exceeding total pages', () => {
      const result = service.validatePaginationParams(11, 10, 100); // 100/10 = 10 pages max

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('页码不能超过总页数10');
    });

    it('should allow page equal to total pages', () => {
      const result = service.validatePaginationParams(10, 10, 100); // exactly last page

      expect(result.isValid).toBe(true);
    });

    it('should handle zero total records', () => {
      const result = service.validatePaginationParams(1, 10, 0);

      expect(result.isValid).toBe(true); // Page 1 is always valid even with 0 records
    });

    it('should handle page 1 with zero total records', () => {
      const result = service.validatePaginationParams(1, 10, 0);

      expect(result.isValid).toBe(true);
    });

    it('should reject page > 1 with zero total records', () => {
      const result = service.validatePaginationParams(2, 10, 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('页码不能超过总页数0');
    });

    it('should handle negative total (edge case)', () => {
      const result = service.validatePaginationParams(1, 10, -1);

      expect(result.isValid).toBe(true); // Negative total is treated as no validation
    });

    it('should validate boundary cases correctly', () => {
      // Exactly at max limit
      expect(service.validatePaginationParams(1, 100, 1000).isValid).toBe(true);

      // Edge case with partial last page
      expect(service.validatePaginationParams(3, 10, 25).isValid).toBe(true); // 25/10 = 2.5 -> 3 pages total
      expect(service.validatePaginationParams(4, 10, 25).isValid).toBe(false); // Page 4 doesn't exist
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key, defaultValue) => {
        switch (key) {
          case 'PAGINATION_DEFAULT_PAGE':
            return 1;
          case 'PAGINATION_DEFAULT_LIMIT':
            return 20;
          case 'PAGINATION_MAX_LIMIT':
            return 50;
          default:
            return defaultValue;
        }
      });
    });

    it('should handle complete pagination workflow', () => {
      const query: PaginationQuery = { page: 2, limit: 15 };
      const items = Array.from({ length: 15 }, (_, i) => `item-${i + 16}`);
      const total = 100;

      // Normalize query
      const normalized = service.normalizePaginationQuery(query);
      expect(normalized).toEqual({ page: 2, limit: 15 });

      // Validate parameters
      const validation = service.validatePaginationParams(normalized.page, normalized.limit, total);
      expect(validation.isValid).toBe(true);

      // Calculate skip for database query
      const skip = service.calculateSkip(normalized.page, normalized.limit);
      expect(skip).toBe(15);

      // Create response
      const response = service.createPaginatedResponse(items, normalized.page, normalized.limit, total);
      expect(response.items).toEqual(items);
      expect(response.pagination.page).toBe(2);
      expect(response.pagination.totalPages).toBe(7); // Math.ceil(100/15)
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(true);
    });

    it('should handle edge case with custom config', () => {
      const query: PaginationQuery = { page: 1, limit: 100 };
      const normalized = service.normalizePaginationQuery(query);

      // Should be capped to max limit (50)
      expect(normalized.limit).toBe(50);

      const response = service.createPaginatedResponseFromQuery([], normalized, 200);
      expect(response.pagination.limit).toBe(50);
      expect(response.pagination.totalPages).toBe(4); // Math.ceil(200/50)
    });
  });
});