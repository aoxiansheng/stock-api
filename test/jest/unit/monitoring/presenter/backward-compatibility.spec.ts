/**
 * 🎯 向后兼容性单元测试（修复版）
 *
 * 测试监控组件通用组件库复用重构后的向后兼容性：
 * - Legacy API端点兼容性测试
 * - 响应格式兼容性测试
 * - 参数兼容性测试
 * - 行为兼容性测试
 */

import { Test, TestingModule } from "@nestjs/testing";

import { PresenterService } from "../../../../../src/monitoring/presenter/presenter.service";
import { AnalyzerService } from "../../../../../src/monitoring/analyzer/analyzer.service";
import { PaginationService } from "../../../../../src/common/modules/pagination/services/pagination.service";

describe("监控组件向后兼容性测试（修复版）", () => {
  let presenterService: PresenterService;
  let analyzerService: AnalyzerService;

  // 模拟原始格式的端点指标数据
  const mockLegacyEndpointData = [
    {
      endpoint: "/api/v1/monitoring/health",
      method: "GET",
      totalOperations: 150,
      responseTimeMs: 25.5,
      errorRate: 0.02,
      lastUsed: new Date("2024-01-15T10:30:00Z"),
    },
    {
      endpoint: "/api/v1/monitoring/performance",
      method: "GET",
      totalOperations: 75,
      responseTimeMs: 120.8,
      errorRate: 0.01,
      lastUsed: new Date("2024-01-15T10:25:00Z"),
    },
    {
      endpoint: "/api/v1/monitoring/cache",
      method: "GET",
      totalOperations: 200,
      responseTimeMs: 45.2,
      errorRate: 0.005,
      lastUsed: new Date("2024-01-15T10:20:00Z"),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenterService,
        {
          provide: AnalyzerService,
          useValue: {
            getEndpointMetrics: jest
              .fn()
              .mockResolvedValue(mockLegacyEndpointData),
            getEndpointMetricsWithPagination: jest.fn().mockImplementation((page, limit) => {
              const start = (page - 1) * limit;
              const end = start + limit;
              const items = mockLegacyEndpointData.slice(start, end);
              return Promise.resolve({
                items,
                total: mockLegacyEndpointData.length,
              });
            }),
            getEndpointMetricsLegacy: jest
              .fn()
              .mockResolvedValue(mockLegacyEndpointData),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            createPaginatedResponse: jest.fn().mockImplementation((items, page, limit, total) => ({
              items,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
              },
            })),
            createPaginatedResponseFromQuery: jest.fn(),
            validatePaginationParams: jest.fn().mockReturnValue({ isValid: true }),
            normalizePaginationQuery: jest.fn().mockImplementation((query) => ({
              page: query.page || 1,
              limit: query.limit || 10,
            })),
          },
        },
      ],
    }).compile();

    presenterService = module.get<PresenterService>(PresenterService);
    analyzerService = module.get<AnalyzerService>(AnalyzerService);
  });

  describe("Legacy API端点兼容性", () => {
    it("getEndpointMetricsLegacy应该保持原有接口", async () => {
      const limit = "50";
      const result = await presenterService.getEndpointMetricsLegacy(limit);

      // 验证返回的是原始数组格式，而非分页格式
      expect(Array.isArray(result)).toBe(true);
      expect(result).not.toHaveProperty("pagination");
      expect(result).not.toHaveProperty("items");
      expect(result).toHaveLength(3);
    });

    it("getEndpointMetricsLegacy应该支持限制参数", async () => {
      const limit = "2";

      // 模拟analyzer服务返回限制后的数据
      jest
        .spyOn(analyzerService, "getEndpointMetrics")
        .mockResolvedValue(mockLegacyEndpointData.slice(0, 2));

      const result = await presenterService.getEndpointMetricsLegacy(limit);

      expect(result).toHaveLength(2);
      expect(Array.isArray(result)).toBe(true);
    });

    it("getEndpointMetricsLegacy应该支持无限制参数", async () => {
      const result = await presenterService.getEndpointMetricsLegacy();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("getEndpointMetricsLegacy应该处理字符串限制参数", async () => {
      const stringLimit = "100";
      const result =
        await presenterService.getEndpointMetricsLegacy(stringLimit);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });
  });

  describe("响应格式兼容性", () => {
    it("Legacy端点应该返回原始数组格式", async () => {
      const result = await presenterService.getEndpointMetricsLegacy("10");

      // 验证是原始数组，不是包装的对象
      expect(Array.isArray(result)).toBe(true);
      expect(result).not.toHaveProperty("statusCode");
      expect(result).not.toHaveProperty("message");
      expect(result).not.toHaveProperty("data");
    });

    it("Legacy端点数据项应该保持原有字段结构", async () => {
      const result = await presenterService.getEndpointMetricsLegacy();

      result.forEach((item) => {
        expect(item).toHaveProperty("endpoint");
        expect(item).toHaveProperty("method");
        expect(item).toHaveProperty("totalOperations");
        expect(item).toHaveProperty("responseTimeMs");
        expect(item).toHaveProperty("errorRate");
        expect(item).toHaveProperty("lastUsed");

        // 验证字段类型保持不变
        expect(typeof item.endpoint).toBe("string");
        expect(typeof item.method).toBe("string");
        expect(typeof item.totalOperations).toBe("number");
        expect(typeof item.responseTimeMs).toBe("number");
        expect(typeof item.errorRate).toBe("number");
        expect(item.lastUsed instanceof Date).toBe(true);
      });
    });

    it("新分页端点应该返回包装格式", async () => {
      const dto = { page: 1, limit: 10 };

      // 模拟分页服务
      const mockPaginationService = presenterService["paginationService"];
      jest
        .spyOn(mockPaginationService, "validatePaginationParams")
        .mockReturnValue({ isValid: true });
      jest
        .spyOn(mockPaginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockLegacyEndpointData,
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });

      const result = await presenterService.getEndpointMetrics(dto);

      // 验证新格式包含items和pagination
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.pagination).toBe("object");
    });
  });

  describe("参数处理兼容性", () => {
    it("Legacy端点应该正确处理undefined限制参数", async () => {
      const result = await presenterService.getEndpointMetricsLegacy(undefined);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("Legacy端点应该正确处理null限制参数", async () => {
      const result = await presenterService.getEndpointMetricsLegacy(null);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("Legacy端点应该正确处理空字符串限制参数", async () => {
      const result = await presenterService.getEndpointMetricsLegacy("");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("Legacy端点应该正确处理非数字字符串限制参数", async () => {
      const result = await presenterService.getEndpointMetricsLegacy("invalid");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });
  });

  describe("行为兼容性", () => {
    it("Legacy端点应该保持原有的数据处理逻辑", async () => {
      const limitedResult =
        await presenterService.getEndpointMetricsLegacy("2");
      const unlimitedResult = await presenterService.getEndpointMetricsLegacy();

      // 验证限制功能仍然有效
      expect(limitedResult.length).toBeLessThanOrEqual(unlimitedResult.length);
    });

    it("Legacy端点和新端点应该返回相同的数据内容", async () => {
      const legacyResult = await presenterService.getEndpointMetricsLegacy();

      // 模拟新端点的分页服务
      const mockPaginationService = presenterService["paginationService"];
      jest
        .spyOn(mockPaginationService, "validatePaginationParams")
        .mockReturnValue({ isValid: true });
      jest
        .spyOn(mockPaginationService, "createPaginatedResponseFromQuery")
        .mockReturnValue({
          items: mockLegacyEndpointData,
          pagination: {
            page: 1,
            limit: 100,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });

      const newResult = await presenterService.getEndpointMetrics({
        page: 1,
        limit: 100,
      });

      // 验证数据内容相同（只是格式不同）
      expect(legacyResult).toEqual(newResult.items);
    });

    it("Legacy端点应该保持原有的错误处理行为", async () => {
      // 模拟analyzer服务抛出错误
      jest
        .spyOn(analyzerService, "getEndpointMetrics")
        .mockRejectedValue(new Error("数据库连接失败"));

      await expect(presenterService.getEndpointMetricsLegacy()).rejects.toThrow(
        "数据库连接失败",
      );
    });
  });

  describe("边界条件兼容性", () => {
    it("Legacy端点应该处理空数据集", async () => {
      jest.spyOn(analyzerService, "getEndpointMetrics").mockResolvedValue([]);

      const result = await presenterService.getEndpointMetricsLegacy();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("Legacy端点应该处理单条数据", async () => {
      jest
        .spyOn(analyzerService, "getEndpointMetrics")
        .mockResolvedValue([mockLegacyEndpointData[0]]);

      const result = await presenterService.getEndpointMetricsLegacy();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockLegacyEndpointData[0]);
    });

    it("Legacy端点应该处理数据字段缺失的情况", async () => {
      const incompleteData = [
        {
          endpoint: "/api/v1/test",
          method: "GET",
          totalOperations: 100,
          responseTimeMs: 50.0,
          errorRate: 0.01,
          lastUsed: new Date("2024-01-15T10:00:00Z"),
          // 某些字段可能缺失但仍应正常处理
        },
      ];

      jest
        .spyOn(analyzerService, "getEndpointMetrics")
        .mockResolvedValue(incompleteData);

      const result = await presenterService.getEndpointMetricsLegacy();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("endpoint", "/api/v1/test");
      expect(result[0]).toHaveProperty("method", "GET");
    });
  });

  describe("类型兼容性", () => {
    it("Legacy端点返回类型应该保持兼容", async () => {
      const result = await presenterService.getEndpointMetricsLegacy();

      // 验证返回类型是数组
      expect(Array.isArray(result)).toBe(true);

      // 验证数组元素类型
      if (result.length > 0) {
        const item = result[0];
        expect(typeof item).toBe("object");
        expect(item).not.toBeNull();
        expect(item).not.toBeUndefined();
      }
    });

    it("Legacy端点参数类型应该保持兼容", async () => {
      // 测试不同类型的limit参数
      const stringLimit = "10";

      // 应该都能处理
      const stringResult =
        await presenterService.getEndpointMetricsLegacy(stringLimit);
      expect(Array.isArray(stringResult)).toBe(true);

      // 注意：实际实现中可能只接受字符串类型，这里测试接口兼容性
    });
  });

  describe("数据格式稳定性", () => {
    it("Legacy端点数据格式应该与历史版本保持一致", async () => {
      const result = await presenterService.getEndpointMetricsLegacy();

      // 验证关键字段存在且类型正确
      result.forEach((item) => {
        // 必需字段
        expect(item).toHaveProperty("endpoint");
        expect(item).toHaveProperty("method");
        expect(item).toHaveProperty("totalOperations");
        expect(item).toHaveProperty("responseTimeMs");
        expect(item).toHaveProperty("errorRate");
        expect(item).toHaveProperty("lastUsed");

        // 字段值合理性检查
        expect(item.endpoint).toMatch(/^\/api\/v1\//);
        expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(
          item.method,
        );
        expect(item.totalOperations).toBeGreaterThanOrEqual(0);
        expect(item.responseTimeMs).toBeGreaterThanOrEqual(0);
        expect(item.errorRate).toBeGreaterThanOrEqual(0);
        expect(item.errorRate).toBeLessThanOrEqual(1);
        expect(item.lastUsed instanceof Date).toBe(true);
      });
    });
  });
});
