/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 🎯 Prometheus 指标 E2E 测试
 *
 * 测试 /monitoring/metrics 端点，验证关键指标是否存在且格式正确
 */
import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus, INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../../../../src/app.module";
import { AuthService } from "../../../../../src/auth/services/auth.service";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
import { CreateUserDto } from "../../../../../src/auth/dto/auth.dto";

describe("Prometheus Metrics (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  // 预期的关键指标列表
  const expectedMetrics = [
    "newstock_stream_symbols_processed_total",
    "newstock_stream_processing_time_ms",
    "newstock_stream_cache_hit_rate",
    "newstock_stream_error_rate",
    "newstock_stream_throughput_per_second",
    "newstock_stream_concurrent_connections",
    "newstock_system_cpu_usage_percent",
    "newstock_log_level_switches_total",
  ];

  beforeAll(async () => {
    // 创建测试应用
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取认证服务并生成测试用户令牌
    const authService = app.get<AuthService>(AuthService);

    try {
      // 创建测试管理员用户
      const adminUser: CreateUserDto = {
        username: "admin_test",
        email: "admin@test.com",
        password: "password123",
        role: UserRole.ADMIN,
      };

      await authService.register(adminUser);
    } catch (error) {
      // 忽略用户已存在的错误
      console.log("测试用户可能已经存在:", error._message);
    }

    // 登录并获取令牌
    const loginResult = await authService.login({
      username: "admin_test",
      password: "password123",
    });

    authToken = loginResult.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/monitoring/metrics (GET)", () => {
    it("应返回401状态码当未授权访问时", () => {
      return request(app.getHttpServer())
        .get("/monitoring/metrics")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("应返回200状态码和Prometheus格式指标", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/metrics")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(HttpStatus.OK)
        .expect("Content-Type", /text\/plain/);

      // 验证响应是否为Prometheus格式
      expect(response.text).toContain("# HELP");
      expect(response.text).toContain("# TYPE");

      // 验证是否包含预期的关键指标
      for (const metricName of expectedMetrics) {
        expect(response.text).toContain(metricName);
      }
    });
  });

  describe("/monitoring/dashboard (GET)", () => {
    it("应返回仪表板数据包含正确的指标结构", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/dashboard")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // 验证仪表板数据结构
      expect(response.body).toHaveProperty("overview");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body.overview).toHaveProperty("healthScore");
      expect(response.body.overview).toHaveProperty("cacheHitRate");
    });
  });

  describe("/monitoring/stream-performance (GET)", () => {
    it("应返回流处理性能指标数据", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/stream-performance")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // 验证流处理指标结构
      expect(response.body).toHaveProperty("stats");
      expect(response.body).toHaveProperty("percentiles");
      expect(response.body).toHaveProperty("prometheusMetrics");
      expect(response.body.stats).toHaveProperty("throughputPerSecond");
    });
  });

  describe("/monitoring/metrics/summary (GET)", () => {
    it("应返回指标系统摘要信息", async () => {
      const response = await request(app.getHttpServer())
        .get("/monitoring/metrics/summary")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // 验证指标摘要结构
      expect(response.body).toHaveProperty("metricsSummary");
      expect(response.body).toHaveProperty("healthStatus");
      expect(response.body.metricsSummary).toHaveProperty("totalMetrics");
      expect(response.body.healthStatus).toHaveProperty("status");
    });
  });
});
