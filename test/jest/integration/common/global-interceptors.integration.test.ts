/**
 * 全局拦截器集成测试
 * 测试 ResponseInterceptor 和 GlobalExceptionFilter 的集成功能
 */

import {
  INestApplication,
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Module,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { ResponseInterceptor } from "../../../../src/common/interceptors/response.interceptor";
import { GlobalExceptionFilter } from "../../../../src/common/filters/global-exception.filter";
import { RateLimitGuard } from "../../../../src/auth/guards/rate-limit.guard";

// 测试用的控制器
@Controller("test-global-interceptors")
class TestController {
  @Get("success")
  getSuccess() {
    return { message: "测试成功", data: "success-data" };
  }

  @Get("success-raw")
  getSuccessRaw() {
    return "raw-string-response";
  }

  @Get("success-null")
  getSuccessNull() {
    return null;
  }

  @Get("success-undefined")
  getSuccessUndefined() {
    return undefined;
  }

  @Get("success-already-formatted")
  getSuccessAlreadyFormatted() {
    return {
      statusCode: 200,
      message: "已格式化响应",
      data: { custom: "data" },
      timestamp: new Date().toISOString(),
    };
  }

  @Post("created")
  postCreated(@Body() body: any) {
    return { id: "new-id", ...body };
  }

  @Get("bad-request")
  getBadRequest() {
    throw new HttpException("请求参数错误", HttpStatus.BAD_REQUEST);
  }

  @Get("unauthorized")
  getUnauthorized() {
    throw new HttpException("未授权访问", HttpStatus.UNAUTHORIZED);
  }

  @Get("forbidden")
  getForbidden() {
    throw new HttpException("访问被禁止", HttpStatus.FORBIDDEN);
  }

  @Get("not-found")
  getNotFound() {
    throw new HttpException("资源不存在", HttpStatus.NOT_FOUND);
  }

  @Get("internal-error")
  getInternalError() {
    throw new Error("服务器内部错误");
  }

  @Get("custom-error")
  getCustomError() {
    const error = new Error("自定义错误") as any;
    error.statusCode = 422;
    error.name = "CustomBusinessError";
    throw error;
  }

  @Get("complex-error")
  getComplexError() {
    throw new HttpException(
      {
        message: ["字段1验证失败", "字段2验证失败"],
        error: "ValidationError",
        details: {
          field1: "invalid format",
          field2: "required but missing",
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Get("database-error")
  getDatabaseError() {
    const mongoError = new Error("重复键错误") as any;
    mongoError.name = "MongoError";
    mongoError.code = 11000;
    throw mongoError;
  }

  @Get("jwt-expired")
  getJWTExpired() {
    const jwtError = new Error("JWT token expired") as any;
    jwtError.name = "TokenExpiredError";
    throw jwtError;
  }

  @Get("timeout-error")
  getTimeoutError() {
    const timeoutError = new Error("Request timeout") as any;
    timeoutError.name = "TimeoutError";
    timeoutError.code = "ETIMEDOUT";
    throw timeoutError;
  }

  @Get("health")
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe("Global Interceptors Integration", () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    console.log("【beforeAll】开始创建Nest应用");
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    })
      .overrideProvider(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    // 配置全局拦截器和过滤器
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("ResponseInterceptor 响应拦截器", () => {
    it("应该包装普通对象响应为标准格式", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "操作成功",
        data: {
          message: "测试成功",
          data: "success-data",
        },
        timestamp: expect.any(String),
      });

      // 验证时间戳格式
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("应该包装字符串响应为标准格式", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success-raw")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "操作成功",
        data: "raw-string-response",
        timestamp: expect.any(String),
      });
    });

    it("应该处理 null 响应", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success-null")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "操作成功",
        data: null,
        timestamp: expect.any(String),
      });
    });

    it("应该处理 undefined 响应", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success-undefined")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "操作成功",
        data: null,
        timestamp: expect.any(String),
      });
    });

    it("应该保持已格式化的响应不变", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success-already-formatted")
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "已格式化响应",
        data: { custom: "data" },
        timestamp: expect.any(String),
      });
    });

    it("应该为 POST 请求返回正确的状态码和消息", async () => {
      const testData = { name: "测试数据", value: 123 };

      const response = await request(httpServer)
        .post("/test-global-interceptors/created")
        .send(testData)
        .expect(201);

      expect(response.body).toMatchObject({
        statusCode: 201,
        message: "创建成功",
        data: {
          id: "new-id",
          ...testData,
        },
        timestamp: expect.any(String),
      });
    });

    it("应该将健康检查端点的响应包装为标准格式", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/health")
        .expect(200);

      // 健康检查应该被包装为标准响应格式
      expect(response.body).toMatchObject({
        statusCode: 200,
        message: "操作成功",
        data: {
          status: "ok",
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        },
        timestamp: expect.any(String),
      });

      // 确保原始健康检查数据在 data 字段中
      expect(response.body.data.status).toBe("ok");
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });
  });

  describe("GlobalExceptionFilter 异常过滤器", () => {
    it("应该处理 HTTP 异常 - Bad Request", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/bad-request")
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: "请求参数错误",
        error: {
          code: "BAD_REQUEST",
          details: {
            type: "HttpException",
            path: "/test-global-interceptors/bad-request",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理 HTTP 异常 - Unauthorized", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/unauthorized")
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: "未授权访问",
        error: {
          code: "UNAUTHORIZED",
          details: {
            type: "AuthenticationError",
            path: "/test-global-interceptors/unauthorized",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理 HTTP 异常 - Forbidden", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/forbidden")
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: "访问被禁止",
        error: {
          code: "FORBIDDEN",
          details: {
            type: "ForbiddenException",
            path: "/test-global-interceptors/forbidden",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理 HTTP 异常 - Not Found", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/not-found")
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: "资源不存在",
        error: {
          code: "NOT_FOUND",
          details: {
            type: "HttpException",
            path: "/test-global-interceptors/not-found",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理普通 Error 异常", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/internal-error")
        .expect(500);

      expect(response.body).toMatchObject({
        statusCode: 500,
        message: expect.any(String), // 可能是 '服务器内部错误' 或原始错误消息
        error: {
          code: "INTERNAL_SERVER_ERROR",
          details: {
            type: "InternalServerError",
            path: "/test-global-interceptors/internal-error",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理自定义状态码异常", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/custom-error")
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message: "自定义错误",
        error: {
          code: "UNKNOWN_ERROR",
          details: {
            type: "CustomBusinessError",
            path: "/test-global-interceptors/custom-error",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理复杂的 HTTP 异常响应", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/complex-error")
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("验证失败"),
        error: {
          code: "VALIDATION_ERROR",
          details: {
            type: "ValidationError",
            path: "/test-global-interceptors/complex-error",
            fields: expect.arrayContaining([
              expect.objectContaining({ message: "字段1验证失败" }),
              expect.objectContaining({ message: "字段2验证失败" }),
            ]),
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理 MongoDB 异常 - 重复键", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/database-error")
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: "数据已存在，无法重复创建",
        error: {
          code: "RESOURCE_CONFLICT",
          details: {
            type: "DatabaseError",
            path: "/test-global-interceptors/database-error",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理 JWT 异常 - Token 过期", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/jwt-expired")
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: "token已过期",
        error: {
          code: "TOKEN_EXPIRED",
          details: {
            type: "AuthenticationError",
            path: "/test-global-interceptors/jwt-expired",
            errorName: "TokenExpiredError",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理超时异常", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/timeout-error")
        .expect(408);

      expect(response.body).toMatchObject({
        statusCode: 408,
        message: "请求超时，请稍后重试",
        error: {
          code: "REQUEST_TIMEOUT",
          details: {
            type: "TimeoutError",
            path: "/test-global-interceptors/timeout-error",
          },
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("协作测试 - 拦截器和异常过滤器配合", () => {
    it("应该确保异常响应也符合标准格式", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/bad-request")
        .expect(400);

      // 验证基础结构
      expect(response.body).toHaveProperty("statusCode", 400);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("data", null);

      // 验证 path 已被移到 error.details 中
      expect(response.body).not.toHaveProperty("path");
      expect(response.body.error.details).toHaveProperty(
        "path",
        "/test-global-interceptors/bad-request",
      );

      // 验证时间戳格式
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(isNaN(new Date(response.body.timestamp).getTime())).toBe(false);
    });

    it("应该在响应头中保持 Content-Type", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/success")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("应该在错误响应中保持 Content-Type", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/bad-request")
        .expect(400);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("边界条件测试", () => {
    it("应该处理不存在的路由", async () => {
      const response = await request(httpServer)
        .get("/test-global-interceptors/non-existent-route")
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: "请求的接口不存在",
        error: {
          code: "NOT_FOUND",
          details: {
            type: "Not Found",
            path: "/test-global-interceptors/non-existent-route",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("应该处理不支持的 HTTP 方法", async () => {
      const response = await request(httpServer)
        .patch("/test-global-interceptors/bad-request")
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        timestamp: expect.any(String),
      });
    });

    it("应该处理空请求体的 POST 请求", async () => {
      const response = await request(httpServer)
        .post("/test-global-interceptors/created")
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        statusCode: 201,
        message: "创建成功",
        data: {
          id: "new-id",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("性能测试", () => {
    it.skip("应该在合理时间内处理大量并发请求", async () => {
      const startTime = Date.now();
      const concurrentRequests = 20;

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(httpServer)
          .get("/test-global-interceptors/success")
          .expect(200),
      );

      const responses = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有请求都成功
      responses.forEach((response) => {
        expect(response.body).toHaveProperty("statusCode", 200);
        expect(response.body).toHaveProperty("message", "操作成功");
      });

      // 验证性能（20个并发请求应在5秒内完成）
      expect(duration).toBeLessThan(5000);

      console.log(
        `并发测试完成: ${concurrentRequests} 个请求耗时 ${duration}ms`,
      );
    });
  });
});
