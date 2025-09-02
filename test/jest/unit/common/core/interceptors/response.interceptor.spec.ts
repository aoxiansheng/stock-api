/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { Response } from "express";
import { of } from "rxjs";
import { ResponseInterceptor } from "../../../../../../src/common/core/interceptors/response.interceptor";
import { EventEmitter2 } from '@nestjs/event-emitter';

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<any>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: any;
  let mockEventEmitter: EventEmitter2;

  beforeEach(() => {
    mockEventEmitter = new EventEmitter2();
    interceptor = new ResponseInterceptor(new EventEmitter2());

    mockRequest = {
      method: "GET",
      url: "/api/test",
      requestId: "test-request-id",
    };

    mockResponse = {
      statusCode: 200,
    } as jest.Mocked<Response>;

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;

    // Mock console.time and console.timeEnd to avoid output during tests
    jest.spyOn(console, "time").mockImplementation();
    jest.spyOn(console, "timeEnd").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("intercept", () => {
    it("should wrap simple data in standard response format", (done) => {
      const testData = { id: 1, name: "test" };
      mockCallHandler.handle.mockReturnValue(of(testData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: testData,
            timestamp: expect.any(String),
          });
          expect(new Date(result.timestamp)).toBeInstanceOf(Date);
          done();
        });
    });

    it("should return data as-is if already in standard format", (done) => {
      const standardData = {
        statusCode: 200,
        message: "�I�o",
        data: { id: 1 },
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      mockCallHandler.handle.mockReturnValue(of(standardData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual(standardData);
          done();
        });
    });

    it("should handle null data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(null));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: null,
            timestamp: expect.any(String),
          });
          done();
        });
    });

    it("should handle undefined data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(undefined));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: null,
            timestamp: expect.any(String),
          });
          done();
        });
    });

    it("should handle empty string data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(""));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: "",
            timestamp: expect.any(String),
          });
          done();
        });
    });

    it("should handle empty array data", (done) => {
      mockCallHandler.handle.mockReturnValue(of([]));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: [],
            timestamp: expect.any(String),
          });
          done();
        });
    });

    it("should handle empty object data", (done) => {
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: "操作成功",
            data: {},
            timestamp: expect.any(String),
          });
          done();
        });
    });

    it("should use correct status code from response", (done) => {
      mockResponse.statusCode = 201;
      mockCallHandler.handle.mockReturnValue(of({ created: true }));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.statusCode).toBe(201);
          expect(result.message).toBe("创建成功");
          done();
        });
    });

    it("should handle different HTTP methods", (done) => {
      mockRequest._method = "POST";
      mockRequest._url = "/api/users";
      mockCallHandler.handle.mockReturnValue(of({ user: "created" }));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toBeDefined();
          expect(console.time).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-POST /api/users",
          );
          expect(console.timeEnd).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-POST /api/users",
          );
          done();
        });
    });

    it("should handle request without requestId", (done) => {
      delete mockRequest.requestId;
      mockCallHandler.handle.mockReturnValue(of({ test: "data" }));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toBeDefined();
          // Should not throw error even without requestId
          done();
        });
    });

    it("should handle complex nested data structures", (done) => {
      const complexData = {
        users: [
          { id: 1, name: "User 1", roles: ["admin", "user"] },
          { id: 2, name: "User 2", roles: ["user"] },
        ],
        metadata: {
          total: 2,
          page: 1,
          limit: 10,
        },
        timestamps: {
          created: new Date(),
          updated: new Date(),
        },
      };
      mockCallHandler.handle.mockReturnValue(of(complexData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toEqual(complexData);
          expect(result.statusCode).toBe(200);
          done();
        });
    });

    it("should measure execution time", (done) => {
      mockCallHandler.handle.mockReturnValue(of({ test: "data" }));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(() => {
          expect(console.time).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-GET /api/test",
          );
          expect(console.timeEnd).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-GET /api/test",
          );
          done();
        });
    });
  });

  describe("getDefaultMessage", () => {
    it("should return correct message for status 200", (done) => {
      mockResponse.statusCode = 200;
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.message).toBe("操作成功");
          done();
        });
    });

    it("should return correct message for status 201", (done) => {
      mockResponse.statusCode = 201;
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.message).toBe("创建成功");
          done();
        });
    });

    it("should return correct message for status 202", (done) => {
      mockResponse.statusCode = 202;
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.message).toBe("请求已接受");
          done();
        });
    });

    it("should return correct message for status 204", (done) => {
      mockResponse.statusCode = 204;
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.message).toBe("操作成功");
          done();
        });
    });

    it("should return default message for unknown status codes", (done) => {
      mockResponse.statusCode = 299;
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.message).toBe("请求完成");
          done();
        });
    });
  });

  describe("edge cases", () => {
    it("should handle boolean data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(true));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toBe(true);
          done();
        });
    });

    it("should handle number data", (done) => {
      mockCallHandler.handle.mockReturnValue(of(42));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toBe(42);
          done();
        });
    });

    it("should handle string data", (done) => {
      mockCallHandler.handle.mockReturnValue(of("test string"));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toBe("test string");
          done();
        });
    });

    it("should handle data with statusCode property but wrong type", (done) => {
      const dataWithStatusCode = {
        statusCode: "not-a-number", // Wrong type
        someData: "value",
      };
      mockCallHandler.handle.mockReturnValue(of(dataWithStatusCode));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          // Should wrap it because statusCode is not a number
          expect(result.statusCode).toBe(200);
          expect(result.data).toEqual(dataWithStatusCode);
          done();
        });
    });

    it("should handle arrays as data", (done) => {
      const arrayData = [1, 2, 3, "test", { id: 1 }];
      mockCallHandler.handle.mockReturnValue(of(arrayData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toEqual(arrayData);
          done();
        });
    });

    it("should preserve object properties when wrapping", (done) => {
      const dataWithSpecialChars = {
        chinese: "中文测试",
        unicode: "🚀 emoji",
        special: "line\nbreak\ttab",
      };
      mockCallHandler.handle.mockReturnValue(of(dataWithSpecialChars));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toEqual(dataWithSpecialChars);
          done();
        });
    });

    it("should handle Date objects in data", (done) => {
      const now = new Date();
      const dataWithDate = {
        timestamp: now,
        id: 1,
      };
      mockCallHandler.handle.mockReturnValue(of(dataWithDate));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data.timestamp).toEqual(now);
          done();
        });
    });

    it("should handle circular references gracefully", (done) => {
      const circularObj: any = { id: 1 };
      circularObj._self = circularObj;

      mockCallHandler.handle.mockReturnValue(of(circularObj));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.data).toBe(circularObj);
          expect(result.statusCode).toBe(200);
          done();
        });
    });
  });

  describe("timing functionality", () => {
    it("should call console.time and console.timeEnd with correct labels", (done) => {
      mockRequest.method = "DELETE";
      mockRequest.url = "/api/items/123";
      mockCallHandler.handle.mockReturnValue(of(null));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(() => {
          expect(console.time).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-DELETE /api/items/123",
          );
          expect(console.timeEnd).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-DELETE /api/items/123",
          );
          done();
        });
    });

    it("should handle URL with query parameters", (done) => {
      mockRequest.url = "/api/users?page=1&limit=10";
      mockCallHandler.handle.mockReturnValue(of({}));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(() => {
          expect(console.time).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-GET /api/users?page=1&limit=10",
          );
          expect(console.timeEnd).toHaveBeenCalledWith(
            "ResponseInterceptor耗时-GET /api/users?page=1&limit=10",
          );
          done();
        });
    });
  });
});
