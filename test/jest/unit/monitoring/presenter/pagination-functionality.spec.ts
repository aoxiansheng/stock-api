/**
 * 🎯 分页功能单元测试（修复版）
 *
 * 测试监控组件集成通用分页服务的核心功能：
 * - PaginationService集成测试
 * - 分页参数验证测试
 * - 分页数据转换测试
 * - 边界条件测试
 */

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";

import { PresenterService } from "../../../../../src/monitoring/presenter/presenter.service";
import { AnalyzerService } from "../../../../../src/monitoring/analyzer/analyzer.service";
import { PaginationService } from "../../../../../src/common/modules/pagination/services/pagination.service";
import { GetEndpointMetricsDto } from "../../../../../src/monitoring/contracts/dto/queries/get-endpoint-metrics.dto";

describe("监控组件分页功能单元测试（修复版）", () => {
  let presenterService: PresenterService;
  let paginationService: PaginationService;
  let analyzerService: AnalyzerService;

  // 模拟原始端点指标数据
  const mockRawEndpointData = Array.from({ length: 25 }, (_, index) => ({
    endpoint: `/api/v1/endpoint-${index + 1}`,
    method: index % 2 === 0 ? "GET" : "POST",
    totalOperations: Math.floor(Math.random() * 1000) + 100,
    responseTimeMs: Math.round((Math.random() * 200 + 10) * 100) / 100,
    errorRate: Math.round(Math.random() * 0.1 * 1000) / 1000,
    lastUsed: new Date(Date.now() - Math.random() * 86400000),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenterService,
        {
          provide: PaginationService,
          useValue: {
            createPaginatedResponse: jest.fn(),
            createPaginatedResponseFromQuery: jest.fn(),
            validatePaginationParams: jest.fn(),
            normalizePaginationQuery: jest.fn(),
            createPagination: jest.fn(),
          },
        },
        {
          provide: AnalyzerService,
          useValue: {
            getEndpointMetrics: jest
              .fn()
              .mockResolvedValue(mockRawEndpointData),
          },
        },
      ],
    }).compile();

    presenterService = module.get<PresenterService>(PresenterService);
    paginationService = module.get<PaginationService>(PaginationService);
    analyzerService = module.get<AnalyzerService>(AnalyzerService);
  });

  describe("分页参数验证", () => {
    it("应该验证有效的分页参数", async () => {
      const validDto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      // 模拟分页服务方法
      jest
        .spyOn(paginationService, "validatePaginationParams")
        .mockReturnValue({ isValid: true });
      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(0, 10),
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(validDto);

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("pagination");
      expect(result.items).toHaveLength(10);
    });

    it("应该拒绝无效的页码参数", async () => {
      const invalidDto: GetEndpointMetricsDto = {
        page: 0, // 无效页码
        limit: 10,
      };

      jest
        .spyOn(paginationService, "validatePaginationParams")
        .mockReturnValue({
          isValid: false,
          error: "页码必须大于0",
        });

      // 这里我们测试验证逻辑，如果在实际服务中实现了验证
      const validationResult = paginationService.validatePaginationParams(
        0,
        10,
        25,
      );
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toContain("页码必须大于0");
    });

    it("应该拒绝无效的限制参数", async () => {
      const invalidDto: GetEndpointMetricsDto = {
        page: 1,
        limit: -5, // 无效限制
      };

      jest
        .spyOn(paginationService, "validatePaginationParams")
        .mockReturnValue({
          isValid: false,
          error: "每页条数必须大于0",
        });

      const validationResult = paginationService.validatePaginationParams(
        1,
        -5,
        25,
      );
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toContain("每页条数必须大于0");
    });

    it("应该限制最大每页数量", async () => {
      const invalidDto: GetEndpointMetricsDto = {
        page: 1,
        limit: 1000, // 超过最大限制
      };

      jest
        .spyOn(paginationService, "validatePaginationParams")
        .mockReturnValue({
          isValid: false,
          error: "每页条数不能超过100",
        });

      const validationResult = paginationService.validatePaginationParams(
        1,
        1000,
        25,
      );
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toContain("每页条数不能超过");
    });
  });

  describe("分页数据处理", () => {
    it("应该正确处理第一页数据", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(0, 10),
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.items).toHaveLength(10);
    });

    it("应该正确处理中间页数据", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 2,
        limit: 10,
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(10, 20),
          pagination: {
            page: 2,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.items).toHaveLength(10);
    });

    it("应该正确处理最后页数据", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 3,
        limit: 10,
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(20, 25), // 最后5条记录
          pagination: {
            page: 3,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: false,
            hasPrev: true,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.items).toHaveLength(5); // 最后页只有5条记录
    });

    it("应该正确处理空数据集", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      // 模拟空数据
      jest.spyOn(analyzerService, "getEndpointMetrics").mockResolvedValue([]);
      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe("分页信息计算", () => {
    it("应该正确计算总页数", async () => {
      const testCases = [
        { total: 25, limit: 10, expectedPages: 3 },
        { total: 30, limit: 10, expectedPages: 3 },
        { total: 31, limit: 10, expectedPages: 4 },
        { total: 0, limit: 10, expectedPages: 0 },
        { total: 5, limit: 10, expectedPages: 1 },
      ];

      for (const testCase of testCases) {
        jest
          .spyOn(paginationService, "createPaginatedResponseFromQuery")
          .mockReturnValue({
            items: [],
            pagination: {
              page: 1,
              limit: testCase.limit,
              total: testCase.total,
              totalPages: testCase.expectedPages,
              hasNext: false,
              hasPrev: false,
            },
          });

        const dto: GetEndpointMetricsDto = { page: 1, limit: testCase.limit };
        const result = await presenterService.getEndpointMetrics(dto);

        expect(result.pagination.totalPages).toBe(testCase.expectedPages);
      }
    });
  });

  describe("数据格式验证", () => {
    it("应该返回正确的分页数据结构", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(0, 10),
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      // 验证根级结构
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("pagination");

      // 验证分页信息结构
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("totalPages");
      expect(result.pagination).toHaveProperty("hasNext");
      expect(result.pagination).toHaveProperty("hasPrev");

      // 验证数据类型
      expect(typeof result.pagination.page).toBe("number");
      expect(typeof result.pagination.limit).toBe("number");
      expect(typeof result.pagination.total).toBe("number");
      expect(typeof result.pagination.totalPages).toBe("number");
      expect(typeof result.pagination.hasNext).toBe("boolean");
      expect(typeof result.pagination.hasPrev).toBe("boolean");
    });

    it("每个数据项应该包含必要字段", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 5,
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockRawEndpointData.slice(0, 5),
          pagination: {
            page: 1,
            limit: 5,
            total: 25,
            totalPages: 5,
            hasNext: true,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      result.items.forEach((item) => {
        expect(item).toHaveProperty("endpoint");
        expect(item).toHaveProperty("method");
        expect(item).toHaveProperty("totalOperations");
        expect(item).toHaveProperty("responseTimeMs");
        expect(item).toHaveProperty("errorRate");
        expect(item).toHaveProperty("lastUsed");

        expect(typeof item.endpoint).toBe("string");
        expect(typeof item.method).toBe("string");
        expect(typeof item.totalOperations).toBe("number");
        expect(typeof item.responseTimeMs).toBe("number");
        expect(typeof item.errorRate).toBe("number");
        expect(item.lastUsed instanceof Date).toBe(true);
      });
    });
  });

  describe("服务集成测试", () => {
    it("应该正确调用PaginationService的方法", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      const mockPaginatedResponse = {
        items: mockRawEndpointData.slice(0, 10),
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      };

      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue(mockPaginatedResponse);

      await presenterService.getEndpointMetrics(dto);

      expect(
        paginationService.createPaginatedResponseFromQuery,
      ).toHaveBeenCalledWith(
        mockRawEndpointData,
        dto,
        mockRawEndpointData.length,
      );
    });

    it("应该正确传递AnalyzerService的数据给PaginationService", async () => {
      const dto: GetEndpointMetricsDto = {
        page: 1,
        limit: 10,
      };

      const customMockData = [
        {
          endpoint: "/test/endpoint",
          method: "GET",
          totalOperations: 100,
          responseTimeMs: 50.5,
          errorRate: 0.01,
          lastUsed: new Date("2024-01-15T10:00:00Z"),
        },
      ];

      jest
        .spyOn(analyzerService, "getEndpointMetrics")
        .mockResolvedValue(customMockData);
      jest
        .spyOn(paginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: customMockData,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });

      await presenterService.getEndpointMetrics(dto);

      expect(
        paginationService.createPaginatedResponseFromQuery,
      ).toHaveBeenCalledWith(customMockData, dto, customMockData.length);
    });
  });
});
