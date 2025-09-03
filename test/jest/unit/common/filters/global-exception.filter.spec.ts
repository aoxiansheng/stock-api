/* eslint-disable @typescript-eslint/no-unused-vars */
import { GlobalExceptionFilter } from "../../../../../src/common/core/filters/global-exception.filter";
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: jest.Mocked<Logger>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
  let mockResponse: any;
  let mockRequest: any;
  let mockEventEmitter: EventEmitter2;

  beforeEach(() => {
    mockEventEmitter = new EventEmitter2();
    filter = new GlobalExceptionFilter(new EventEmitter2());
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  describe("catch", () => {
    it("should handle HttpException properly", () => {
      const httpException = new HttpException(
        {
          statusCode: 400,
          message: "参数验证失败",
          error: "Bad Request",
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: "参数验证失败",
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "BAD_REQUEST",
          details: {
            type: "Bad Request",
            path: "/api/v1/test",
            requestId: "req-123",
          },
        },
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle HttpException with string message", () => {
      const httpException = new HttpException(
        "简单错误信息",
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: "未授权访问",
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "UNAUTHORIZED",
          details: {
            type: "AuthenticationError",
            path: "/api/v1/test",
            requestId: "req-123",
          },
        },
      });
    });

    it("should handle ValidationPipe errors", () => {
      const validationException = new HttpException(
        {
          statusCode: 400,
          message: [
            "username should not be empty",
            "email must be a valid email",
          ],
          error: "Bad Request",
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(validationException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message:
            "验证失败:username should not be empty, email must be a valid email",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "VALIDATION_ERROR",
            details: {
              type: "ValidationError",
              fields: [
                { field: "unknown", message: "username should not be empty" },
                { field: "unknown", message: "email must be a valid email" },
              ],
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle generic Error with proper fallback", () => {
      const genericError = new Error("数据库连接失败");

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: "数据库连接失败", // 开发环境显示原始错误消息
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "INTERNAL_SERVER_ERROR",
          details: {
            type: "InternalServerError",
            path: "/api/v1/test",
            requestId: "req-123",
          },
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("未知异常"),
        expect.any(Object),
      );
    });

    it("should handle unknown error types", () => {
      const unknownError = "string error";

      filter.catch(unknownError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: "服务器内部错误",
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "INTERNAL_SERVER_ERROR",
          details: {
            type: "UnknownError",
            path: "/api/v1/test",
            requestId: "req-123",
          },
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle null/undefined errors", () => {
      filter.catch(null as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: "服务器内部错误",
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "INTERNAL_SERVER_ERROR",
          details: {
            type: "UnknownError",
            path: "/api/v1/test",
            requestId: "req-123",
          },
        },
      });
    });

    it("should handle MongoDB duplicate key error", () => {
      const mongoError = {
        name: "MongoError",
        code: 11000,
        message: "E11000 duplicate key error",
        keyPattern: { username: 1 },
        keyValue: { username: "testuser" },
      };

      filter.catch(mongoError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: "数据已存在，无法重复创建",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "RESOURCE_CONFLICT",
            details: {
              type: "DatabaseError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle JWT token errors", () => {
      const jwtError = {
        name: "JsonWebTokenError",
        message: "invalid token",
      };

      filter.catch(jwtError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "token无效",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "INVALID_TOKEN",
            details: {
              type: "AuthenticationError",
              tokenType: "JWT",
              errorName: "JsonWebTokenError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle JWT token expired errors", () => {
      const jwtExpiredError = {
        name: "TokenExpiredError",
        message: "jwt expired",
        expiredAt: new Date(),
      };

      filter.catch(jwtExpiredError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "token已过期",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "TOKEN_EXPIRED",
            details: {
              type: "AuthenticationError",
              tokenType: "JWT",
              errorName: "TokenExpiredError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle rate limiting errors", () => {
      const rateLimitError = new HttpException(
        {
          statusCode: 429,
          message: "Too Many Requests",
          error: "Rate Limit Exceeded",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      filter.catch(rateLimitError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: "请求频率超出限制",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            details: {
              type: "Rate Limit Exceeded",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should include request details in error log", () => {
      const error = new Error("Test error for logging");

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("POST /api/v1/test - 500"),
        expect.objectContaining({
          message: "Test error for logging",
          statusCode: 500,
          error: "InternalServerError",
        }),
      );
    });

    it("should handle errors without request context", () => {
      const mockArgsHostWithoutRequest = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getType: jest.fn().mockReturnValue("http"),
      } as any;

      const error = new Error("No request context");

      filter.catch(error, mockArgsHostWithoutRequest);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "No request context",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: {
              type: "InternalServerError",
            },
          },
        }),
      );
    });

    it("should handle errors with sensitive data filtering", () => {
      const requestWithSensitiveData = {
        ...mockRequest,
        body: {
          password: "secret123",
          apiKey: "sk-1234567890",
          normalData: "safe",
        },
        headers: {
          ...mockRequest.headers,
          authorization: "Bearer token123",
        },
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(
        requestWithSensitiveData,
      );

      const error = new Error("Error with sensitive data");

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalled();
      const logCall = JSON.stringify(mockLogger.error.mock.calls[0]);

      // Should not contain sensitive data in logs
      expect(logCall).not.toContain("secret123");
      expect(logCall).not.toContain("sk-1234567890");
      expect(logCall).not.toContain("Bearer token123");
    });

    it("should preserve error stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODEENV = "development";

      const error = new Error("Development error");
      error.stack = "Error: Development error\n    at Test.spec.ts:123:45";

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("POST /api/v1/test - 500"),
        expect.objectContaining({
          message: "Development error",
          statusCode: 500,
          error: "InternalServerError",
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle circular reference in error objects", () => {
      const circularError: any = new Error("Circular reference error");
      circularError._self = circularError;

      filter.catch(circularError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle database connection errors", () => {
      const dbError = {
        name: "MongoNetworkError",
        message: "Connection failed",
        code: "ECONNREFUSED",
      };

      filter.catch(dbError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: "数据库服务暂时不可用，请稍后重试",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "SERVICE_UNAVAILABLE",
            details: {
              type: "DatabaseConnectionError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle timeout errors", () => {
      const timeoutError = {
        name: "TimeoutError",
        message: "Request timeout",
        code: "ETIMEDOUT",
      };

      filter.catch(timeoutError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          message: "请求超时，请稍后重试",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "REQUEST_TIMEOUT",
            details: {
              type: "TimeoutError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should include correlation ID if present", () => {
      const requestWithCorrelationId = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          "x-correlation-id": "corr-123",
        },
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(
        requestWithCorrelationId,
      );

      const error = new Error("Error with correlation ID");

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: expect.objectContaining({
              correlationId: "corr-123",
            }),
          },
        }),
      );
    });

    it("should handle errors during response writing", () => {
      mockResponse.json.mockImplementation(() => {
        throw new Error("Response write failed");
      });

      const originalError = new Error("Original error");

      // Should not throw, but should log the secondary error
      expect(() => {
        filter.catch(originalError, mockArgumentsHost);
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should format timestamp correctly", () => {
      const error = new Error("Timestamp test");

      filter.catch(error, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should handle different HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      methods.forEach((method) => {
        const requestWithMethod = { ...mockRequest, method };
        mockHttpArgumentsHost.getRequest.mockReturnValue(requestWithMethod);

        const error = new Error(`${method} error`);
        filter.catch(error, mockArgumentsHost);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining(`${method} /api/v1/test - 500`),
          expect.objectContaining({
            message: `${method} error`,
            statusCode: 500,
            error: "InternalServerError",
          }),
        );
      });
    });

    it("should handle errors with custom error codes", () => {
      const customError = {
        name: "CustomBusinessError",
        code: "BUSINESS_RULE_VIOLATION",
        message: "业务规则违反",
        statusCode: 422,
      };

      filter.catch(customError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: "业务规则违反",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "UNKNOWN_ERROR",
            details: {
              type: "CustomBusinessError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle JSON parsing errors", () => {
      const jsonError = new SyntaxError(
        "Unexpected token at position 5 in JSON",
      );
      (jsonError as any).name = "SyntaxError";

      filter.catch(jsonError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "JSON格式错误",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "BAD_REQUEST",
            details: {
              type: "InvalidJSON",
              originalMessage: "Unexpected token at position 5 in JSON",
              position: 5,
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle JWT NotBeforeError", () => {
      const notBeforeError = {
        name: "NotBeforeError",
        message: "jwt not active",
        date: new Date(),
      };

      filter.catch(notBeforeError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "token尚未生效",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "TOKEN_NOT_ACTIVE",
            details: {
              type: "AuthenticationError",
              tokenType: "JWT",
              errorName: "NotBeforeError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle MongoDB specific error codes", () => {
      const validationError = {
        name: "MongoError",
        code: 121,
        message: "Document failed validation",
      };

      filter.catch(validationError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "数据格式不符合要求",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: {
              type: "DatabaseError",
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle MongoDB BadValue error", () => {
      const badValueError = {
        name: "MongoError",
        code: 2,
        message: "BadValue: invalid query",
      };

      filter.catch(badValueError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "数据库查询条件错误",
          data: null,
        }),
      );
    });

    it("should handle MongoDB Unauthorized error", () => {
      const authError = {
        name: "MongoError",
        code: 13,
        message: "not authorized on admin to execute command",
      };

      filter.catch(authError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "数据库权限不足",
          data: null,
        }),
      );
    });

    it("should handle ValidationError array", () => {
      const validationErrors = [
        {
          property: "username",
          const_raints: {
            isNotEmpty: "username should not be empty",
            minLength: "username must be longer than 3 characters",
          },
          children: [],
        },
        {
          property: "email",
          const_raints: {
            isEmail: "email must be an email",
          },
          children: [
            {
              property: "domain",
              const_raints: {
                isString: "domain must be a string",
              },
              children: [],
            },
          ],
        },
      ];

      filter.catch(validationErrors as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message:
            "username should not be empty, username must be longer than 3 characters, email must be an email",
          data: null,
          timestamp: expect.any(String),
          error: {
            code: "VALIDATION_ERROR",
            details: {
              type: "ValidationError",
              fields: [
                { field: "username", code: "isNotEmpty", message: "不能为空" },
                {
                  field: "username",
                  code: "minLength",
                  message: "长度不能少于 3 characters",
                },
                {
                  field: "email",
                  code: "isEmail",
                  message: "必须是有效的邮箱地址",
                },
                {
                  field: "email.domain",
                  code: "isString",
                  message: "必须是字符串",
                },
              ],
              path: "/api/v1/test",
              requestId: "req-123",
            },
          },
        }),
      );
    });

    it("should handle path sanitization for XSS attempts", () => {
      const maliciousRequest = {
        ...mockRequest,
        url: '/api/test?param=<script>alert("xss")</script>',
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(maliciousRequest);

      const error = new Error("XSS attempt error");

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: expect.objectContaining({
              path: "/api/test?param=[FILTERED]",
            }),
          },
        }),
      );
    });

    it("should handle path sanitization for SQL injection attempts", () => {
      const maliciousRequest = {
        ...mockRequest,
        url: "/api/test?id=1 UNION SELECT * FROM users",
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(maliciousRequest);

      const error = new Error("SQL injection attempt");

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: expect.objectContaining({
              path: "/api/test?id=1 [FILTERED]",
            }),
          },
        }),
      );
    });

    it("should handle very long paths by truncating", () => {
      const longPath = "/api/" + "a".repeat(300);
      const longPathRequest = {
        ...mockRequest,
        url: longPath,
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(longPathRequest);

      const error = new Error("Long path error");

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            details: expect.objectContaining({
              path: expect.stringContaining("[TRUNCATED]"),
            }),
          },
        }),
      );
    });

    it("should handle 401 errors with API key context", () => {
      const apiKeyRequest = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          "x-app-key": "ak_test_12345",
        },
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(apiKeyRequest);

      const unauthorizedError = new HttpException(
        "无效的API凭证",
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(unauthorizedError, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "INVALID_API_KEY",
            details: expect.objectContaining({
              providedKey: "ak_test_12345",
            }),
          },
        }),
      );
    });

    it("should handle different unauthorized message translations", () => {
      const unauthorizedMessages = [
        { input: "缺少认证token", expected: "未授权访问" },
        { input: "JWT认证失败", expected: "JWT认证失败" },
        { input: "无效的token", expected: "token无效" },
        { input: "token已过期", expected: "token已过期" },
        { input: "token尚未生效", expected: "token尚未生效" },
        { input: "缺少API凭证", expected: "缺少API凭证" },
        { input: "API凭证无效", expected: "API凭证无效" },
        { input: "API凭证已过期", expected: "API凭证已过期" },
        { input: "用户名或密码错误", expected: "用户名或密码错误" },
      ];

      unauthorizedMessages.forEach(({ input, expected }) => {
        const unauthorizedError = new HttpException(
          input,
          HttpStatus.UNAUTHORIZED,
        );

        filter.catch(unauthorizedError, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: expected,
          }),
        );
      });
    });

    it("should handle route not found errors with proper translation", () => {
      const routeNotFoundMessages = [
        "Cannot GET /api/nonexistent",
        "Cannot POST /api/invalid",
        "Cannot PUT /api/missing",
        "Cannot DELETE /api/unknown",
        "Cannot PATCH /api/void",
      ];

      routeNotFoundMessages.forEach((message) => {
        const notFoundError = new HttpException(message, HttpStatus.NOT_FOUND);

        filter.catch(notFoundError, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "请求的接口不存在",
          }),
        );
      });
    });

    it("should handle HTTP standard error message translations", () => {
      const standardErrorMappings = [
        {
          input: "Bad Request",
          expected: "请求参数错误",
          status: HttpStatus.BAD_REQUEST,
        },
        {
          input: "Unauthorized",
          expected: "未授权访问",
          status: HttpStatus.UNAUTHORIZED,
        },
        {
          input: "Forbidden",
          expected: "访问被禁止",
          status: HttpStatus.FORBIDDEN,
        },
        {
          input: "Not Found",
          expected: "资源不存在",
          status: HttpStatus.NOT_FOUND,
        },
        {
          input: "Method Not Allowed",
          expected: "请求方法不允许",
          status: HttpStatus.METHOD_NOT_ALLOWED,
        },
        {
          input: "Internal Server Error",
          expected: "服务器内部错误",
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        {
          input: "Service Unavailable",
          expected: "服务暂时不可用",
          status: HttpStatus.SERVICE_UNAVAILABLE,
        },
        {
          input: "Gateway Timeout",
          expected: "网关超时",
          status: HttpStatus.GATEWAY_TIMEOUT,
        },
        {
          input: "Too Many Requests",
          expected: "请求频率超出限制",
          status: HttpStatus.TOO_MANY_REQUESTS,
        },
      ];

      standardErrorMappings.forEach(({ input, expected, status }) => {
        const httpError = new HttpException(input, status);

        filter.catch(httpError, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: expected,
          }),
        );
      });
    });

    it("should handle validation error message parsing for different field types", () => {
      const validationMessages = [
        "股票代码不能为空",
        "数据类型不支持的数据类型",
        "提供商必须是有效的提供商",
      ];

      const validationException = new HttpException(
        {
          statusCode: 400,
          message: validationMessages,
          error: "Bad Request",
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(validationException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: "VALIDATION_ERROR",
            details: expect.objectContaining({
              fields: [
                { field: "symbols", message: "不能为空", code: "REQUIRED" },
                {
                  field: "dataTypeRelated",
                  message: "数据类型不支持的数据类型",
                  code: "INVALID_TYPE",
                },
                {
                  field: "provider",
                  message: "提供商必须是有效的提供商",
                  code: "INVALID_FORMAT",
                },
              ],
            }),
          },
        }),
      );
    });

    it("should handle MongoServerError type", () => {
      const mongoServerError = {
        name: "MongoServerError",
        code: 11000,
        message: "Duplicate key error",
      };

      filter.catch(mongoServerError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: "数据已存在，无法重复创建",
        }),
      );
    });

    it("should handle database connection with ENOTFOUND error", () => {
      const connectionError = {
        name: "DatabaseConnectionError",
        code: "ENOTFOUND",
        message: "getaddrinfo ENOTFOUND mongodb",
      };

      filter.catch(connectionError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: "数据库服务暂时不可用，请稍后重试",
        }),
      );
    });

    it('should handle timeout error with message containing "timeout"', () => {
      const timeoutError = {
        name: "GenericError",
        message: "Connection timeout after 5000ms",
      };

      filter.catch(timeoutError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          message: "请求超时，请稍后重试",
        }),
      );
    });

    it("should handle error when setHeader fails", () => {
      mockResponse.setHeader.mockImplementation(() => {
        throw new Error("Header already sent");
      });

      const error = new Error("Error with header failure");

      // Should not throw when setHeader fails
      expect(() => {
        filter.catch(error, mockArgumentsHost);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should handle production environment error messages", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Sensitive development info");

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "服务器内部错误", // 生产环境应该隐藏错误详情
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle MongoDB error in production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const mongoError = {
        name: "MongoError",
        code: 999, // 未知错误码
        message: "Sensitive mongo error details",
      };

      filter.catch(mongoError as any, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "数据库操作失败", // 生产环境通用消息
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle nested validation errors", () => {
      const validationError = [
        {
          property: "user",
          children: [
            {
              property: "profile",
              children: [
                {
                  property: "name",
                  const_raints: { isNotEmpty: "name should not be empty" },
                },
              ],
            },
          ],
        },
      ];

      // This setup is to simulate a ValidationError object
      const mockValidationError = (error) => {
        const err = new (class ValidationError {})();
        Object.assign(err, error);
        if (error.children) {
          (err as any).children = error.children.map(mockValidationError);
        }
        return err;
      };
      const exception = validationError.map(mockValidationError);

      filter.catch(exception as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  field: "user.profile.name",
                  message: "不能为空",
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it("should return correct error code for FORBIDDEN status", () => {
      const forbiddenException = new HttpException(
        "Forbidden",
        HttpStatus.FORBIDDEN,
      );
      filter.catch(forbiddenException, mockArgumentsHost);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        }),
      );
    });

    it("should return correct error code for NOT_FOUND status", () => {
      const notFoundException = new HttpException(
        "Not Found",
        HttpStatus.NOT_FOUND,
      );
      filter.catch(notFoundException, mockArgumentsHost);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        }),
      );
    });

    it("should return correct error code for PAYLOAD_TOO_LARGE status", () => {
      const payloadTooLargeException = new HttpException(
        "Payload Too Large",
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
      filter.catch(payloadTooLargeException, mockArgumentsHost);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "PAYLOAD_TOO_LARGE" }),
        }),
      );
    });

    it("should return correct error code for GATEWAY_TIMEOUT status", () => {
      const gatewayTimeoutException = new HttpException(
        "Gateway Timeout",
        HttpStatus.GATEWAY_TIMEOUT,
      );
      filter.catch(gatewayTimeoutException, mockArgumentsHost);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "GATEWAY_TIMEOUT" }),
        }),
      );
    });
  });
});
