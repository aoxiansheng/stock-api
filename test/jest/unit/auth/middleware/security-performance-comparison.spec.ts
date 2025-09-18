import type { Request, Response, NextFunction } from "express";
import { Test, TestingModule } from "@nestjs/testing";

import { SecurityMiddleware } from "../../../../../src/auth/middleware/security.middleware";
import { AuthConfigService } from "../../../../../src/auth/services/infrastructure/auth-config.service";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";

// Mock dependencies
jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock("@common/utils/http-headers.util");
jest.mock("xss", () => jest.fn((input) => input.replace(/<[^>]*>/g, "")));

describe("SecurityMiddleware Performance Tests", () => {
  let securityMiddleware: SecurityMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: AuthConfigService,
          useValue: {
            getIpRateLimitConfig: jest.fn().mockReturnValue({
              maxRequests: 100,
              windowMs: 60000,
            }),
            getMaxPayloadSizeString: jest.fn().mockReturnValue("10MB"),
            getMaxPayloadSizeBytes: jest.fn().mockReturnValue(10 * 1024 * 1024),
            getMaxStringLengthSanitize: jest.fn().mockReturnValue(10000),
            getMaxObjectDepthComplexity: jest.fn().mockReturnValue(10),
            getMaxObjectFieldsComplexity: jest.fn().mockReturnValue(1000),
            getMaxStringLengthComplexity: jest.fn().mockReturnValue(10000),
            getMaxRecursionDepth: jest.fn().mockReturnValue(50),
            getFindLongStringThreshold: jest.fn().mockReturnValue(5000),
            getMaxQueryParams: jest.fn().mockReturnValue(100),
            isIpRateLimitEnabled: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    securityMiddleware = module.get<SecurityMiddleware>(SecurityMiddleware);

    mockRequest = {
      method: "POST",
      url: "/api/test",
      originalUrl: "/api/test",
      ip: "192.168.1.1",
      headers: {
        "content-type": "application/json",
        "content-length": "1024",
        "user-agent": "Test Browser",
      },
      query: {},
      body: {
        message: "Hello World",
        data: { key: "value" },
        items: ["item1", "item2", "item3"],
      },
      params: {},
    };

    mockResponse = {
      setHeader: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Setup HttpHeadersUtil mocks for successful processing
    (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("1024");
    (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("application/json");
    (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue("192.168.1.1");
    (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue("Test Browser");
    (HttpHeadersUtil.getSafeHeaders as jest.Mock).mockReturnValue({});
    (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("基线性能测试", () => {
    it("正常请求处理应该在合理时间内完成", () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // 平均每个请求处理时间应该 < 1ms
      const avgTimePerRequest = durationMs / iterations;
      console.log(`平均每个请求处理时间: ${avgTimePerRequest.toFixed(3)}ms`);
      console.log(`总处理时间: ${durationMs.toFixed(3)}ms (${iterations} 次请求)`);

      expect(avgTimePerRequest).toBeLessThan(1); // 每个请求 < 1ms
      expect(mockNext).toHaveBeenCalledTimes(iterations);
    });

    it("输入清理功能性能测试", () => {
      const largeBody = {
        text: "A".repeat(1000),
        array: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `value${i}` })),
        nested: {
          level1: {
            level2: {
              level3: { data: "deeply nested data" },
            },
          },
        },
      };

      mockRequest.body = largeBody;
      const iterations = 100;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const avgTimePerRequest = durationMs / iterations;

      console.log(`大数据输入清理平均时间: ${avgTimePerRequest.toFixed(3)}ms`);

      // 即使处理大数据，平均时间也应该 < 5ms
      expect(avgTimePerRequest).toBeLessThan(5);
      expect(mockNext).toHaveBeenCalledTimes(iterations);
    });

    it("多种安全检查综合性能测试", () => {
      const complexRequest = {
        ...mockRequest,
        originalUrl: "/api/complex/endpoint?param1=value1&param2=value2&param3=value3",
        body: {
          userInput: "<script>alert('test')</script>Hello World",
          data: {
            nested: {
              field: "some $where query content",
              items: Array.from({ length: 50 }, (_, i) => `item${i}`),
            },
          },
          sensitiveData: {
            password: "secret123",
            token: "Bearer abc123",
          },
        },
        query: Object.fromEntries(
          Array.from({ length: 20 }, (_, i) => [`param${i}`, `value${i}`])
        ),
      };

      const iterations = 500;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        securityMiddleware.use(complexRequest as Request, mockResponse as Response, mockNext);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const avgTimePerRequest = durationMs / iterations;

      console.log(`复杂安全检查平均时间: ${avgTimePerRequest.toFixed(3)}ms`);

      // 复杂安全检查平均时间应该 < 2ms
      expect(avgTimePerRequest).toBeLessThan(2);
      expect(mockNext).toHaveBeenCalledTimes(iterations);
    });
  });

  describe("异常处理性能测试", () => {
    it("异常抛出不应该显著影响性能", () => {
      // 设置会触发异常的条件
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("20971520"); // 20MB

      const iterations = 100;
      const startTime = process.hrtime.bigint();
      let exceptionCount = 0;

      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        try {
          securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error) {
          exceptionCount++;
        }
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const avgTimePerRequest = durationMs / iterations;

      console.log(`异常处理平均时间: ${avgTimePerRequest.toFixed(3)}ms`);
      console.log(`异常抛出次数: ${exceptionCount}/${iterations}`);

      // 异常处理时间应该 < 1ms
      expect(avgTimePerRequest).toBeLessThan(1);
      expect(exceptionCount).toBe(iterations); // 所有请求都应该触发异常
      expect(mockNext).not.toHaveBeenCalled(); // next不应该被调用
    });

    it("验证重构前后性能一致性", () => {
      // 这个测试验证重构后性能没有显著退化
      const testScenarios = [
        {
          name: "小请求",
          iterations: 1000,
          expectedMaxTime: 0.5, // 0.5ms per request
          body: { message: "hello" },
        },
        {
          name: "中等请求",
          iterations: 500,
          expectedMaxTime: 1.5, // 1.5ms per request
          body: {
            data: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item${i}` })),
          },
        },
        {
          name: "大请求",
          iterations: 100,
          expectedMaxTime: 3, // 3ms per request
          body: {
            largeText: "x".repeat(5000),
            array: Array.from({ length: 200 }, (_, i) => ({ id: i, data: `data${i}` })),
          },
        },
      ];

      testScenarios.forEach((scenario) => {
        mockRequest.body = scenario.body;
        const startTime = process.hrtime.bigint();

        for (let i = 0; i < scenario.iterations; i++) {
          jest.clearAllMocks();
          securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        const avgTimePerRequest = durationMs / scenario.iterations;

        console.log(`${scenario.name} - 平均时间: ${avgTimePerRequest.toFixed(3)}ms`);

        expect(avgTimePerRequest).toBeLessThan(scenario.expectedMaxTime);
        expect(mockNext).toHaveBeenCalledTimes(scenario.iterations);
      });
    });
  });

  describe("内存使用测试", () => {
    it("长期运行不应该出现内存泄漏", () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 2000;

      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        
        // 模拟不同的请求模式
        mockRequest.body = {
          id: i,
          data: `request_${i}`,
          timestamp: new Date().toISOString(),
          payload: Array.from({ length: 10 }, (_, j) => `item_${i}_${j}`),
        };

        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        // 每100次迭代强制垃圾回收
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;

      console.log(`初始内存: ${(initialMemory / 1024).toFixed(2)}KB`);
      console.log(`最终内存: ${(finalMemory / 1024).toFixed(2)}KB`);
      console.log(`内存增加: ${memoryIncreaseKB.toFixed(2)}KB`);

      // 内存增加应该 < 1MB
      expect(memoryIncreaseKB).toBeLessThan(1024);
      expect(mockNext).toHaveBeenCalledTimes(iterations);
    });
  });
});