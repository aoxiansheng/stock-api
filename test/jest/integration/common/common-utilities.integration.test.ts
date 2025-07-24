/**
 * common 常量和工具函数集成测试
 * 测试 common 模块中的常量、工具函数和装饰器
 */

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Controller, Get, UseInterceptors, Req } from "@nestjs/common";
import { Module } from "@nestjs/common";
import * as request from "supertest";

import {
  Market,
  MARKETS,
  MARKET_NAMES,
  MARKET_TIMEZONES,
} from "../../../../src/common/constants/market.constants";
import { HttpHeadersUtil } from "../../../../src/common/utils/http-headers.util";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
} from "../../../../src/common/decorators/swagger-responses.decorator";
import { ResponseInterceptor } from "../../../../src/common/interceptors/response.interceptor";
import { GlobalExceptionFilter } from "../../../../src/common/filters/global-exception.filter";

// 测试控制器
@Controller("test-common-utilities")
@UseInterceptors(ResponseInterceptor)
class TestcommonUtilitiesController {
  @Get("market-test")
  @ApiSuccessResponse({ description: "市场测试成功" })
  @ApiStandardResponses()
  getMarketTest() {
    return {
      markets: Object.values(Market),
      marketNames: MARKET_NAMES,
      timezones: MARKET_TIMEZONES,
    };
  }

  @Get("headers-test")
  @ApiSuccessResponse({ description: "Headers 测试成功" })
  @ApiStandardResponses()
  getHeadersTest(@Req() req: any) {
    return {
      clientIP: HttpHeadersUtil.getClientIP(req),
      userAgent: HttpHeadersUtil.getUserAgent(req),
      contentType: HttpHeadersUtil.getContentType(req),
      isJsonContent: HttpHeadersUtil.isJsonContent(req),
      safeHeaders: HttpHeadersUtil.getSafeHeaders(req),
    };
  }

  @Get("api-credentials-test")
  @ApiSuccessResponse({ description: "API 凭证测试成功" })
  @ApiStandardResponses()
  getApiCredentialsTest(@Req() req: any) {
    try {
      const credentials = HttpHeadersUtil.validateApiCredentials(req);
      return { success: true, credentials };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

@Module({
  controllers: [TestcommonUtilitiesController],
})
class TestcommonUtilitiesModule {}

describe("common Utilities Integration", () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestcommonUtilitiesModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 配置全局拦截器
    app.useGlobalInterceptors(new ResponseInterceptor());

    // 配置全局异常过滤器
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Market 常量集成测试", () => {
    it("应该正确定义所有市场枚举", () => {
      expect(Market.HK).toBe("HK");
      expect(Market.US).toBe("US");
      expect(Market.SZ).toBe("SZ");
      expect(Market.SH).toBe("SH");
      expect(Market.CN).toBe("CN");
      expect(Market.CRYPTO).toBe("CRYPTO");
    });

    it("MARKETS 常量应该与 Market 枚举保持一致", () => {
      expect(MARKETS.HK).toBe(Market.HK);
      expect(MARKETS.US).toBe(Market.US);
      expect(MARKETS.SZ).toBe(Market.SZ);
      expect(MARKETS.SH).toBe(Market.SH);
      expect(MARKETS.CRYPTO).toBe(Market.CRYPTO);
    });

    it("市场名称映射应该包含中文名称", () => {
      expect(MARKET_NAMES[Market.HK]).toBe("香港市场");
      expect(MARKET_NAMES[Market.US]).toBe("美国市场");
      expect(MARKET_NAMES[Market.SZ]).toBe("深圳市场");
      expect(MARKET_NAMES[Market.SH]).toBe("上海市场");
      expect(MARKET_NAMES[Market.CN]).toBe("中国A股市场");
      expect(MARKET_NAMES[Market.CRYPTO]).toBe("加密货币市场");
    });

    it("时区映射应该正确配置", () => {
      expect(MARKET_TIMEZONES[Market.HK]).toBe("Asia/Hong_Kong");
      expect(MARKET_TIMEZONES[Market.US]).toBe("America/New_York");
      expect(MARKET_TIMEZONES[Market.SZ]).toBe("Asia/Shanghai");
      expect(MARKET_TIMEZONES[Market.SH]).toBe("Asia/Shanghai");
      expect(MARKET_TIMEZONES[Market.CN]).toBe("Asia/Shanghai");
      expect(MARKET_TIMEZONES[Market.CRYPTO]).toBe("UTC");
    });

    it("应该在实际 API 响应中正确使用市场常量", async () => {
      const response = await request(httpServer)
        .get("/test-common-utilities/market-test")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: expect.any(String),
        data: {
          markets: expect.arrayContaining([
            "HK",
            "US",
            "SZ",
            "SH",
            "CN",
            "CRYPTO",
          ]),
          marketNames: expect.objectContaining({
            HK: "香港市场",
            US: "美国市场",
            SZ: "深圳市场",
            SH: "上海市场",
            CN: "中国A股市场",
            CRYPTO: "加密货币市场",
          }),
          timezones: expect.objectContaining({
            HK: "Asia/Hong_Kong",
            US: "America/New_York",
            SZ: "Asia/Shanghai",
            SH: "Asia/Shanghai",
            CN: "Asia/Shanghai",
            CRYPTO: "UTC",
          }),
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("HttpHeadersUtil 工具函数集成测试", () => {
    describe("基础 Header 处理", () => {
      it("应该正确获取标准 headers", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/headers-test")
          .set("User-Agent", "Test-Agent/1.0")
          .set("Content-Type", "application/json")
          .expect(200);

        expect(response.body.data.userAgent).toBe("Test-Agent/1.0");
        expect(response.body.data.contentType).toBe("application/json");
        expect(response.body.data.isJsonContent).toBe(true);
      });

      it("应该正确识别客户端 IP", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/headers-test")
          .set("X-Forwarded-For", "192.168.1.100, 10.0.0.1")
          .set("X-Real-IP", "172.16.0.1")
          .expect(200);

        // 应该取 X-Forwarded-For 的第一个 IP
        expect(response.body.data.clientIP).toBe("192.168.1.100");
      });

      it("应该过滤敏感 headers", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/headers-test")
          .set("Authorization", "Bearer secret-token")
          .set("X-Access-Token", "secret-access-token")
          .set("X-API-Key", "secret-api-key")
          .set("Custom-Header", "safe-value")
          .expect(200);

        const safeHeaders = response.body.data.safeHeaders;

        expect(safeHeaders.authorization).toBe("[FILTERED]");
        expect(safeHeaders["x-access-token"]).toBe("[FILTERED]");
        expect(safeHeaders["x-api-key"]).toBe("[FILTERED]");
        expect(safeHeaders["custom-header"]).toBe("safe-value");
      });
    });

    describe("API 凭证验证", () => {
      it("应该验证有效的 API 凭证", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/api-credentials-test")
          .set("X-App-Key", "valid-app-key")
          .set("X-Access-Token", "valid-access-token")
          .expect(200);

        expect(response.body.data.success).toBe(true);
        expect(response.body.data.credentials).toEqual({
          appKey: "valid-app-key",
          accessToken: "valid-access-token",
        });
      });

      it("应该拒绝缺少凭证的请求", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/api-credentials-test")
          .expect(200);

        expect(response.body.data.success).toBe(false);
        expect(response.body.data.error).toBe("缺少API凭证");
      });

      it("应该拒绝包含空格的凭证", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/api-credentials-test")
          .set("X-App-Key", "invalid app key") // 包含空格
          .set("X-Access-Token", "valid-access-token")
          .expect(200);

        expect(response.body.data.success).toBe(false);
        expect(response.body.data.error).toContain("API凭证格式无效");
        expect(response.body.data.error).toContain("App Key包含空格");
      });

      it("应该拒绝包含制表符的凭证", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/api-credentials-test")
          .set("X-App-Key", "valid-app-key")
          .set("X-Access-Token", "invalid\taccess\ttoken") // 包含制表符
          .expect(200);

        expect(response.body.data.success).toBe(false);
        expect(response.body.data.error).toContain("API凭证格式无效");
        expect(response.body.data.error).toContain("Access Token包含空格");
      });
    });

    describe("Header 大小写不敏感性", () => {
      it("应该处理不同大小写的 headers", async () => {
        const response = await request(httpServer)
          .get("/test-common-utilities/headers-test")
          .set("user-agent", "lowercase-agent")
          .set("USER-AGENT", "uppercase-agent")
          .set("User-Agent", "mixedcase-agent")
          .expect(200);

        // 应该获取到其中一个值（Express 会处理大小写）
        expect(response.body.data.userAgent).toMatch(/agent/);
      });
    });
  });

  describe("Swagger 装饰器集成测试", () => {
    it("ApiSuccessResponse 装饰器应该正常工作", async () => {
      // 这个测试主要验证装饰器不会破坏正常的响应流程
      const response = await request(httpServer)
        .get("/test-common-utilities/market-test")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: expect.any(String),
        data: expect.any(Object),
        timestamp: expect.any(String),
      });
    });

    it("ApiStandardResponses 装饰器应该正常工作", async () => {
      // 此测试验证装饰器是否正确应用了 Swagger 注解。
      // 我们通过访问一个不存在的端点来触发一个标准的404错误，
      // 并检查响应格式是否符合预期，间接验证过滤器和拦截器是否正常工作。
      const response = await request(httpServer)
        .get("/test-common-utilities/nonexistent-endpoint")
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.any(String),
        error: {
          code: "NOT_FOUND",
          details: {
            type: "Not Found",
            path: "/test-common-utilities/nonexistent-endpoint",
          },
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("边界条件和错误处理", () => {
    it("应该处理空的 User-Agent", async () => {
      const response = await request(httpServer)
        .get("/test-common-utilities/headers-test")
        .set("User-Agent", "")
        .expect(200);

      expect(response.body.data.userAgent).toBe("Unknown");
    });

    it("应该处理缺失的 Content-Type", async () => {
      const response = await request(httpServer)
        .get("/test-common-utilities/headers-test")
        .expect(200);

      expect(response.body.data.contentType).toBeUndefined();
      expect(response.body.data.isJsonContent).toBe(false);
    });

    it("应该处理无效的 IP 地址格式", async () => {
      const response = await request(httpServer)
        .get("/test-common-utilities/headers-test")
        .set("X-Forwarded-For", "invalid-ip-format")
        .expect(200);

      // 应该回退到其他 IP 获取方式或默认值
      expect(response.body.data.clientIP).toBeDefined();
    });

    it("应该处理多层代理的 X-Forwarded-For", async () => {
      const response = await request(httpServer)
        .get("/test-common-utilities/headers-test")
        .set("X-Forwarded-For", "203.0.113.1, 192.168.1.1, 10.0.0.1")
        .expect(200);

      // 应该取第一个（最原始的）IP
      expect(response.body.data.clientIP).toBe("203.0.113.1");
    });
  });

  describe("性能测试", () => {
    it.skip("Header 处理应该在大量并发下保持性能", async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(httpServer)
          .get("/test-common-utilities/headers-test")
          .set("User-Agent", `Test-Agent-${i}`)
          .set("X-Forwarded-For", `192.168.1.${i % 255}`)
          .set("Custom-Header-" + i, `value-${i}`)
          .expect(200),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 50个并发请求应该在3秒内完成
      expect(duration).toBeLessThan(3000);

      // 验证所有响应都成功
      responses.forEach((response, i) => {
        expect(response.body.data.userAgent).toBe(`Test-Agent-${i}`);
        expect(response.body.data.clientIP).toBe(`192.168.1.${i % 255}`);
      });

      console.log(
        `并发 Header 处理测试完成: ${concurrentRequests} 个请求耗时 ${duration}ms`,
      );
    });

    it("市场常量访问应该高效", () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        // 模拟频繁访问市场常量的场景
        const market = Object.values(Market)[i % Object.values(Market).length];
        const name = MARKET_NAMES[market as Market];
        const timezone = MARKET_TIMEZONES[market as Market];

        expect(name).toBeDefined();
        expect(timezone).toBeDefined();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 10000次访问应该在300ms内完成
      expect(duration).toBeLessThan(300);

      console.log(
        `市场常量性能测试完成: ${iterations} 次访问耗时 ${duration}ms`,
      );
    });
  });

  describe("类型安全性测试", () => {
    it("Market 枚举应该保持类型安全", () => {
      // TypeScript 编译时检查
      const validMarkets: Market[] = [
        Market.HK,
        Market.US,
        Market.SZ,
        Market.SH,
        Market.CN,
        Market.CRYPTO,
      ];

      validMarkets.forEach((market) => {
        expect(typeof market).toBe("string");
        expect(MARKET_NAMES[market]).toBeDefined();
        expect(MARKET_TIMEZONES[market]).toBeDefined();
      });
    });

    it("常量对象应该是只读的", () => {
      // 使用 Object.freeze() 冻结的对象在尝试添加属性时会抛出 TypeError
      expect(() => {
        (MARKETS as any).NEW_MARKET = "NEW";
      }).toThrow(TypeError); // 期望抛出 TypeError

      // 由于对象被冻结，新属性添加失败，应该仍然是 undefined
      expect((MARKETS as any).NEW_MARKET).toBeUndefined();
    });
  });

  describe("国际化支持", () => {
    it("市场名称应该支持中文", () => {
      Object.values(MARKET_NAMES).forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
        // 验证包含中文字符
        expect(name).toMatch(/[\u4e00-\u9fff]/);
      });
    });

    it("时区配置应该使用标准 IANA 时区标识符", () => {
      const validTimezonePattern = /^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/;

      Object.values(MARKET_TIMEZONES).forEach((timezone) => {
        expect(timezone).toMatch(validTimezonePattern);
      });
    });
  });
});
