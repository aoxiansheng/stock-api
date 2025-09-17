/**
 * Cache模块分页DTO测试
 * 🎯 Phase 5: DTO标准化 - 验证分页查询DTO的功能和类型安全性
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

import {
  CacheKeyPatternAnalysisQueryDto,
  CacheKeyPatternAnalysisDto,
  CachePerformanceMonitoringQueryDto,
  CachePerformanceMonitoringDto,
} from "../../../../../src/cache/dto/cache-internal.dto";
import { BaseQueryDto } from "../../../../../src/common/dto/base-query.dto";
import { PaginatedDataDto } from "../../../../../src/common/modules/pagination/dto/paginated-data";
import { PaginationService } from "../../../../../src/common/modules/pagination/services/pagination.service";

describe("Cache模块分页DTO测试", () => {
  let paginationService: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [PaginationService],
    }).compile();

    paginationService = module.get<PaginationService>(PaginationService);
  });

  describe("CacheKeyPatternAnalysisQueryDto", () => {
    it("应该正确继承BaseQueryDto", () => {
      const queryDto = new CacheKeyPatternAnalysisQueryDto();
      expect(queryDto).toBeInstanceOf(BaseQueryDto);
      
      // 验证继承的分页属性
      expect(queryDto.page).toBeDefined();
      expect(queryDto.limit).toBeDefined();
    });

    it("应该正确验证基础分页参数", async () => {
      const validQueryData = {
        page: 1,
        limit: 10,
        pattern: "user:*",
        minHits: 100,
      };

      const queryDto = plainToClass(CacheKeyPatternAnalysisQueryDto, validQueryData);
      const errors = await validate(queryDto);
      
      expect(errors).toHaveLength(0);
      expect(queryDto.page).toBe(1);
      expect(queryDto.limit).toBe(10);
      expect(queryDto.pattern).toBe("user:*");
      expect(queryDto.minHits).toBe(100);
    });

    it("应该正确验证无效的分页参数", async () => {
      const invalidQueryData = {
        page: 0, // 无效：页码不能为0
        limit: -1, // 无效：每页条数不能为负数
        minHits: "invalid", // 无效：应该是数字
      };

      const queryDto = plainToClass(CacheKeyPatternAnalysisQueryDto, invalidQueryData);
      const errors = await validate(queryDto);
      
      expect(errors.length).toBeGreaterThan(0);
      
      // 验证具体的错误类型
      const pageErrors = errors.find(error => error.property === "page");
      expect(pageErrors).toBeDefined();
      
      const limitErrors = errors.find(error => error.property === "limit");
      expect(limitErrors).toBeDefined();
    });

    it("应该正确处理可选参数", async () => {
      const minimalQueryData = {
        page: 2,
        limit: 20,
      };

      const queryDto = plainToClass(CacheKeyPatternAnalysisQueryDto, minimalQueryData);
      const errors = await validate(queryDto);
      
      expect(errors).toHaveLength(0);
      expect(queryDto.page).toBe(2);
      expect(queryDto.limit).toBe(20);
      expect(queryDto.pattern).toBeUndefined();
      expect(queryDto.minHits).toBeUndefined();
    });
  });

  describe("CachePerformanceMonitoringQueryDto", () => {
    it("应该正确继承BaseQueryDto", () => {
      const queryDto = new CachePerformanceMonitoringQueryDto();
      expect(queryDto).toBeInstanceOf(BaseQueryDto);
    });

    it("应该正确验证时间范围参数", async () => {
      const validQueryData = {
        page: 1,
        limit: 50,
        operation: "get",
        startTime: "2023-12-01T00:00:00Z",
        endTime: "2023-12-31T23:59:59Z",
        slowOperationsOnly: true,
      };

      const queryDto = plainToClass(CachePerformanceMonitoringQueryDto, validQueryData);
      const errors = await validate(queryDto);
      
      expect(errors).toHaveLength(0);
      expect(queryDto.operation).toBe("get");
      expect(queryDto.startTime).toBe("2023-12-01T00:00:00Z");
      expect(queryDto.endTime).toBe("2023-12-31T23:59:59Z");
      expect(queryDto.slowOperationsOnly).toBe(true);
    });

    it("应该正确验证无效的日期格式", async () => {
      const invalidQueryData = {
        page: 1,
        limit: 10,
        startTime: "invalid-date", // 无效的ISO 8601格式
        endTime: "2023-13-32T25:70:70Z", // 无效的日期时间
      };

      const queryDto = plainToClass(CachePerformanceMonitoringQueryDto, invalidQueryData);
      const errors = await validate(queryDto);
      
      expect(errors.length).toBeGreaterThan(0);
      
      const startTimeErrors = errors.find(error => error.property === "startTime");
      expect(startTimeErrors).toBeDefined();
    });
  });

  describe("PaginatedDataDto集成测试", () => {
    it("应该能正确创建分页的键模式分析响应", () => {
      const mockAnalysisData: CacheKeyPatternAnalysisDto[] = [
        {
          pattern: "user:*",
          hits: 1250,
          misses: 150,
          hitRate: 0.89,
          totalRequests: 1400,
          lastAccessTime: Date.now(),
        },
        {
          pattern: "config:*",
          hits: 850,
          misses: 50,
          hitRate: 0.94,
          totalRequests: 900,
          lastAccessTime: Date.now(),
        },
      ];

      const paginatedResponse = paginationService.createPaginatedResponse(
        mockAnalysisData,
        1,
        10,
        25
      );

      expect(paginatedResponse).toBeInstanceOf(PaginatedDataDto);
      expect(paginatedResponse.items).toHaveLength(2);
      expect(paginatedResponse.pagination.page).toBe(1);
      expect(paginatedResponse.pagination.limit).toBe(10);
      expect(paginatedResponse.pagination.total).toBe(25);
      expect(paginatedResponse.pagination.totalPages).toBe(3);
      expect(paginatedResponse.pagination.hasNext).toBe(true);
      expect(paginatedResponse.pagination.hasPrev).toBe(false);

      // 验证数据结构
      expect(paginatedResponse.items[0]).toEqual(
        expect.objectContaining({
          pattern: "user:*",
          hits: 1250,
          hitRate: 0.89,
        })
      );
    });

    it("应该能正确创建分页的性能监控响应", () => {
      const mockPerformanceData: CachePerformanceMonitoringDto[] = [
        {
          operation: "get",
          processingTimeMs: 2.5,
          timestamp: Date.now(),
          isSlowOperation: false,
          slowOperationThreshold: 100,
          additionalMetrics: { keySize: 15 },
        },
      ];

      const paginatedResponse = paginationService.createPaginatedResponse(
        mockPerformanceData,
        2,
        5,
        12
      );

      expect(paginatedResponse).toBeInstanceOf(PaginatedDataDto);
      expect(paginatedResponse.items).toHaveLength(1);
      expect(paginatedResponse.pagination.page).toBe(2);
      expect(paginatedResponse.pagination.limit).toBe(5);
      expect(paginatedResponse.pagination.total).toBe(12);
      expect(paginatedResponse.pagination.totalPages).toBe(3);
      expect(paginatedResponse.pagination.hasNext).toBe(true);
      expect(paginatedResponse.pagination.hasPrev).toBe(true);

      // 验证数据结构
      expect(paginatedResponse.items[0]).toEqual(
        expect.objectContaining({
          operation: "get",
          processingTimeMs: 2.5,
          isSlowOperation: false,
        })
      );
    });

    it("应该正确处理空结果的分页", () => {
      const emptyData: CacheKeyPatternAnalysisDto[] = [];

      const paginatedResponse = paginationService.createPaginatedResponse(
        emptyData,
        1,
        10,
        0
      );

      expect(paginatedResponse.items).toHaveLength(0);
      expect(paginatedResponse.pagination.total).toBe(0);
      expect(paginatedResponse.pagination.totalPages).toBe(0);
      expect(paginatedResponse.pagination.hasNext).toBe(false);
      expect(paginatedResponse.pagination.hasPrev).toBe(false);
    });
  });

  describe("分页参数标准化测试", () => {
    it("应该正确标准化分页查询参数", () => {
      const query = { page: 3, limit: 25 };
      const normalized = paginationService.normalizePaginationQuery(query);

      expect(normalized.page).toBe(3);
      expect(normalized.limit).toBe(25);
    });

    it("应该正确处理无效的分页参数", () => {
      const invalidQuery = { page: -1, limit: 0 };
      const normalized = paginationService.normalizePaginationQuery(invalidQuery);

      expect(normalized.page).toBe(1); // 默认值
      expect(normalized.limit).toBeGreaterThan(0); // 使用默认值
    });

    it("应该正确限制最大分页大小", () => {
      const largeQuery = { page: 1, limit: 99999 };
      const normalized = paginationService.normalizePaginationQuery(largeQuery);

      expect(normalized.limit).toBeLessThanOrEqual(100); // 最大限制
    });
  });
});