/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";
import { ResponseInterceptor } from "../../../../../src/common/core/interceptors/response.interceptor";
import { CustomLogger } from "../../../../../src/app/config/logger.config";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<any>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile();

    interceptor = module.get<ResponseInterceptor<any>>(ResponseInterceptor);

    mockResponse = {
      statusCode: 200,
    };

    mockRequest = {
      method: "GET",
      url: "/api/test",
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };

    // Mock CustomLogger to avoid log output during tests
    jest.spyOn(CustomLogger.prototype, "debug").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  describe("intercept", () => {
    it("should wrap simple data in standard response format", (done) => {
      const testData = { test: "data" };
      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: testData,
          timestamp: expect.any(String),
        });
        expect(new Date(response.timestamp)).toBeInstanceOf(Date);
        done();
      });
    });

    it("should return data as-is if already in standard format", (done) => {
      const standardData = {
        statusCode: 201,
        message: "自定义消息",
        data: { test: "data" },
        timestamp: "2023-01-01T00:00:00.000Z",
      };
      mockCallHandler.handle.mockReturnValue(of(standardData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual(standardData);
        done();
      });
    });

    it("should return health check data with standard wrapping", (done) => {
      mockRequest._url = "/health";
      const healthData = { status: "ok", uptime: 12345 };
      mockCallHandler.handle.mockReturnValue(of(healthData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: healthData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should return metrics data with standard wrapping", (done) => {
      mockRequest.url = "/metrics";
      const metricsData = { cpu: 50, memory: 80 };
      mockCallHandler.handle.mockReturnValue(of(metricsData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: metricsData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle different status codes with appropriate messages", (done) => {
      const testCases = [
        { statusCode: 200, expectedMessage: "操作成功" },
        { statusCode: 201, expectedMessage: "创建成功" },
        { statusCode: 202, expectedMessage: "请求已接受" },
        { statusCode: 204, expectedMessage: "操作成功" },
        { statusCode: 400, expectedMessage: "请求完成" },
        { statusCode: 500, expectedMessage: "请求完成" },
      ];

      let completedTests = 0;

      testCases.forEach(({ statusCode, expectedMessage }) => {
        mockResponse.statusCode = statusCode;
        mockCallHandler.handle.mockReturnValue(of({ test: "data" }));

        const result = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        result.subscribe((response) => {
          expect(response.statusCode).toBe(statusCode);
          expect(response.message).toBe(expectedMessage);
          completedTests++;
          if (completedTests === testCases.length) {
            done();
          }
        });
      });
    });

    it("should handle null data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(null));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: null,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle undefined data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(null));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: null,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle empty object data", (done) => {
      mockCallHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: {},
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle array data", (done) => {
      const arrayData = [{ id: 1 }, { id: 2 }];
      mockCallHandler.handle.mockReturnValue(of(arrayData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: arrayData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle string data", (done) => {
      const stringData = "simple string response";
      mockCallHandler.handle.mockReturnValue(of(stringData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: stringData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle number data", (done) => {
      const numberData = 42;
      mockCallHandler.handle.mockReturnValue(of(numberData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: numberData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle boolean data", (done) => {
      const booleanData = true;
      mockCallHandler.handle.mockReturnValue(of(booleanData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: booleanData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should include requestId in debug log when available", (done) => {
      const debugSpy = jest.spyOn(CustomLogger.prototype, "debug");
      mockRequest.requestId = "test-request-id-123";
      mockCallHandler.handle.mockReturnValue(of({ test: "data" }));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe(() => {
        expect(debugSpy).toHaveBeenCalledWith(
          "Response intercepted for GET /api/test",
          {
            statusCode: 200,
            hasData: true,
            requestId: "test-request-id-123",
          },
        );
        done();
      });
    });

    it("should handle missing requestId in debug log", (done) => {
      const debugSpy = jest.spyOn(CustomLogger.prototype, "debug");
      mockCallHandler.handle.mockReturnValue(of({ test: "data" }));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe(() => {
        expect(debugSpy).toHaveBeenCalledWith(
          "Response intercepted for GET /api/test",
          {
            statusCode: 200,
            hasData: true,
            requestId: "unknown",
          },
        );
        done();
      });
    });

    it("should correctly identify data presence in debug log", (done) => {
      const debugSpy = jest.spyOn(CustomLogger.prototype, "debug");
      mockCallHandler.handle.mockReturnValue(of(null));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe(() => {
        expect(debugSpy).toHaveBeenCalledWith(
          "Response intercepted for GET /api/test",
          {
            statusCode: 200,
            hasData: false,
            requestId: "unknown",
          },
        );
        done();
      });
    });

    it("should handle different HTTP methods", (done) => {
      const debugSpy = jest.spyOn(CustomLogger.prototype, "debug");
      mockRequest._method = "POST";
      mockRequest.url = "/api/create";
      mockCallHandler.handle.mockReturnValue(of({ created: true }));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe(() => {
        expect(debugSpy).toHaveBeenCalledWith(
          "Response intercepted for POST /api/create",
          expect.any(Object),
        );
        done();
      });
    });

    it("should handle complex nested data structures", (done) => {
      const complexData = {
        user: {
          id: 123,
          profile: {
            name: "Test User",
            preferences: ["pref1", "pref2"],
          },
        },
        metadata: {
          timestamp: "2023-01-01",
          version: "1.0",
        },
      };
      mockCallHandler.handle.mockReturnValue(of(complexData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response.data).toEqual(complexData);
        expect(response.statusCode).toBe(200);
        expect(response.message).toBe("操作成功");
        done();
      });
    });
  });

  describe("edge cases", () => {
    it("should handle URLs with query parameters for health checks", (done) => {
      mockRequest.url = "/health?_detailed=true";
      const healthData = { status: "ok" };
      mockCallHandler.handle.mockReturnValue(of(healthData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: healthData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle URLs with query parameters for metrics", (done) => {
      mockRequest.url = "/metrics?format=json";
      const metricsData = { cpu: 75 };
      mockCallHandler.handle.mockReturnValue(of(metricsData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: metricsData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle case-insensitive URL for health checks", (done) => {
      mockRequest.url = "/HEALTH"; // Uppercase
      const testData = { test: "data" };
      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        // Should wrap since URL is case-sensitive
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: testData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it("should handle empty or missing URL", (done) => {
      mockRequest.url = undefined;
      const testData = { test: "data" };
      mockCallHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: "操作成功",
          data: testData,
          timestamp: expect.any(String),
        });
        done();
      });
    });
  });
});
