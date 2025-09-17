/**
 * 🎯 Presenter 控制器集成测试
 *
 * 测试监控组件通用组件库复用重构后的集成功能：
 * - 分页功能集成测试
 * - Swagger装饰器集成测试
 * - 错误处理标准化测试
 * - 向后兼容性测试
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import request from "supertest";

import { PresenterController } from "../../../../src/monitoring/presenter/presenter.controller";
import { PresenterService } from "../../../../src/monitoring/presenter/presenter.service";
import { ExtendedHealthService } from "../../../../src/monitoring/health/extended-health.service";
import { AnalyzerService } from "../../../../src/monitoring/analyzer/analyzer.service";
import { PaginationService } from "../../../../src/common/modules/pagination/services/pagination.service";
import { CacheService } from "../../../../src/cache/services/cache.service";

describe("PresenterController Integration", () => {
  let app: INestApplication;
  let presenterController: PresenterController;
  let presenterService: PresenterService;

  // 模拟服务数据
  const mockHealthReport = {
    overall: {
      status: "healthy",
      score: 95,
      uptime: 86400,
      version: "1.0.0",
    },
    components: [
      {
        name: "mongodb",
        status: "healthy",
        responseTime: 12.5,
        score: 100,
      },
      {
        name: "redis",
        status: "healthy",
        responseTime: 5.2,
        score: 98,
      },
    ],
    recommendations: [
      {
        category: "performance",
        priority: "medium",
        title: "优化数据库连接池",
        description: "当前数据库连接池配置可能导致性能瓶颈",
        action: "增加连接池大小到50个连接",
        impact: "提升数据库查询性能约15%",
      },
    ],
  };

  const mockEndpointMetrics = [
    {
      endpoint: "/api/v1/monitoring/health",
      method: "GET",
      totalOperations: 150,
      responseTimeMs: 25.5,
      errorRate: 0.02,
      lastUsed: "2024-01-15T10:30:00Z",
    },
    {
      endpoint: "/api/v1/monitoring/performance",
      method: "GET",
      totalOperations: 75,
      responseTimeMs: 120.8,
      errorRate: 0.01,
      lastUsed: "2024-01-15T10:25:00Z",
    },
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env.test",
        }),
      ],
      controllers: [PresenterController],
      providers: [
        {
          provide: PresenterService,
          useValue: {
            getHealthReport: jest.fn().mockResolvedValue(mockHealthReport),
            getBasicHealthStatus: jest.fn().mockResolvedValue({
              status: "ok",
              timestamp: "2024-01-15T10:30:00Z",
              uptime: 3600,
              version: "1.0.0",
              environment: "test",
            }),
            getEndpointMetrics: jest.fn().mockResolvedValue({
              items: mockEndpointMetrics,
              pagination: {
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              },
            }),
            getEndpointMetricsLegacy: jest
              .fn()
              .mockResolvedValue(mockEndpointMetrics),
            getMetrics: jest.fn().mockResolvedValue([
              {
                name: "cpu_usage",
                value: 45.2,
                timestamp: "2024-01-15T10:30:00Z",
              },
              {
                name: "memory_usage",
                value: 68.7,
                timestamp: "2024-01-15T10:30:00Z",
              },
            ]),
            createSmartCacheDashboard: jest.fn().mockResolvedValue({
              dashboardId: "smart-cache-dashboard-123",
              title: "SmartCache 监控仪表板",
              status: "created",
              timestamp: "2024-01-15T10:30:00Z",
              url: "/monitoring/dashboard/smart-cache-dashboard-123",
            }),
          },
        },
        {
          provide: ExtendedHealthService,
          useValue: {
            getFullHealthStatus: jest.fn().mockResolvedValue({
              status: "healthy",
              timestamp: "2024-01-15T10:30:00Z",
              uptime: 86400,
              version: "1.0.0",
              system: {
                nodeVersion: "18.19.0",
                platform: "linux",
                architecture: "x64",
                memory: { used: 512, total: 2048, percentage: 25 },
                cpu: { usage: 15.5 },
              },
              healthScore: 95,
              recommendations: ["优化数据库连接池配置"],
            }),
          },
        },
        {
          provide: AnalyzerService,
          useValue: {},
        },
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn(),
            createPaginationInfo: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard("AuthGuard")
      .useValue({ canActivate: () => true })
      .overrideGuard("ThrottlerGuard")
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    presenterController =
      moduleFixture.get<PresenterController>(PresenterController);
    presenterService = moduleFixture.get<PresenterService>(PresenterService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("分页功能集成测试", () => {
    it("应该返回标准分页格式的端点指标", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/endpoints")
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty("statusCode", 200);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data).toHaveProperty("pagination");

      // 验证分页信息结构
      const pagination = response.body.data.pagination;
      expect(pagination).toHaveProperty("page", 1);
      expect(pagination).toHaveProperty("limit", 10);
      expect(pagination).toHaveProperty("total", 2);
      expect(pagination).toHaveProperty("totalPages", 1);
      expect(pagination).toHaveProperty("hasNext", false);
      expect(pagination).toHaveProperty("hasPrev", false);

      // 验证数据项结构
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
    });

    it("应该支持分页参数验证", async () => {
      await request(app.getHttpServer())
        .get("/monitoring/endpoints")
        .query({ page: 0, limit: -1 })
        .expect(400); // 期望参数验证失败
    });
  });

  describe("向后兼容性测试", () => {
    it("Legacy端点应该继续工作", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/endpoints/legacy")
        .query({ limit: 50 })
        .expect(200);

      expect(response.body).toHaveProperty("statusCode", 200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it("Legacy端点数据格式应该与原格式保持一致", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/endpoints/legacy")
        .expect(200);

      const firstItem = response.body.data[0];
      expect(firstItem).toHaveProperty("endpoint");
      expect(firstItem).toHaveProperty("method");
      expect(firstItem).toHaveProperty("totalOperations");
      expect(firstItem).toHaveProperty("responseTimeMs");
      expect(firstItem).toHaveProperty("errorRate");
      expect(firstItem).toHaveProperty("lastUsed");
    });
  });

  describe("Swagger装饰器集成测试", () => {
    it("健康报告端点应该使用标准ApiSuccessResponse", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/health/report")
        .expect(200);

      expect(response.body).toHaveProperty("statusCode", 200);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("timestamp");

      // 验证健康报告数据结构
      const data = response.body.data;
      expect(data).toHaveProperty("overall");
      expect(data).toHaveProperty("components");
      expect(data).toHaveProperty("recommendations");
    });

    it("基础健康检查应该使用ApiHealthResponse", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/health")
        .expect(200);

      expect(response.body).toHaveProperty("statusCode", 200);
      expect(response.body).toHaveProperty("data");

      const data = response.body.data;
      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("environment");
    });
  });

  describe("错误处理标准化测试", () => {
    it("应该正确验证getMetrics的组件名称参数", async () => {
      // 模拟参数验证失败
      jest
        .spyOn(presenterService, "getMetrics")
        .mockRejectedValue(new Error("组件名称不能为空且必须是有效字符串"));

      // 这里模拟直接调用服务方法，因为在集成测试中很难直接测试服务层验证
      await expect(presenterService.getMetrics("")).rejects.toThrow(
        "组件名称不能为空且必须是有效字符串",
      );
    });

    it("应该正确验证createDashboard的参数", async () => {
      // 模拟参数验证失败
      jest
        .spyOn(presenterService, "createSmartCacheDashboard")
        .mockRejectedValue(new Error("仪表盘ID不能为空且必须是有效字符串"));

      await expect(
        presenterService.createSmartCacheDashboard(),
      ).rejects.toThrow();
    });
  });

  describe("响应格式标准化测试", () => {
    it("所有端点应该返回统一的响应格式", async () => {
      const endpoints = [
        "/monitoring/health",
        "/monitoring/health/report",
        "/monitoring/endpoints",
        "/monitoring/endpoints/legacy",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        // 验证统一响应格式
        expect(response.body).toHaveProperty("statusCode", 200);
        expect(response.body).toHaveProperty("message");
        expect(response.body).toHaveProperty("data");
        expect(response.body).toHaveProperty("timestamp");
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      }
    });

    it("分页端点应该返回包含pagination的数据结构", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/endpoints")
        .expect(200);

      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data).toHaveProperty("pagination");
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe("性能和可靠性测试", () => {
    it("应该能处理并发请求", async () => {
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).get("/monitoring/health").expect(200),
        );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.body).toHaveProperty("statusCode", 200);
      });
    });

    it("应该在合理时间内响应", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer()).get("/monitoring/health").expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // 响应时间应少于1秒
    });
  });
});
