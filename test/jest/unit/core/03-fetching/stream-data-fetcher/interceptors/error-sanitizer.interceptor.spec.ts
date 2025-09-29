import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, BadRequestException, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { ErrorSanitizerInterceptor } from '@core/03-fetching/stream-data-fetcher/interceptors/error-sanitizer.interceptor';

describe('ErrorSanitizerInterceptor', () => {
  let interceptor: ErrorSanitizerInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  const createMockRequest = (overrides: any = {}): any => ({
    url: '/api/stream-data',
    method: 'GET',
    headers: {
      'user-agent': 'test-agent',
      ...(overrides.headers || {})
    },
    connection: {
      remoteAddress: '192.168.1.100'
    },
    socket: {
      remoteAddress: '192.168.1.100'
    },
    ...overrides
  });

  const createMockExecutionContext = (request = createMockRequest()): ExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn()
  });

  const createMockCallHandler = (observable: Observable<any>): CallHandler => ({
    handle: jest.fn().mockReturnValue(observable)
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorSanitizerInterceptor]
    }).compile();

    interceptor = module.get<ErrorSanitizerInterceptor>(ErrorSanitizerInterceptor);

    mockRequest = createMockRequest();
    mockExecutionContext = createMockExecutionContext(mockRequest);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Interceptor Initialization', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should implement NestInterceptor', () => {
      expect(interceptor.intercept).toBeDefined();
      expect(typeof interceptor.intercept).toBe('function');
    });
  });

  describe('Successful Request Flow', () => {
    it('should pass through successful responses without modification', () => {
      const successData = { message: 'success', data: { symbol: 'AAPL', price: 150 } };
      mockCallHandler = createMockCallHandler(of(successData));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: (data) => {
          expect(data).toEqual(successData);
        },
        error: () => {
          fail('Should not have thrown an error');
        }
      });

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should not interfere with valid data responses', () => {
      const validResponse = {
        statusCode: 200,
        message: '成功',
        data: {
          quotes: [
            { symbol: 'AAPL', price: 150.25, volume: 1000000 },
            { symbol: 'GOOGL', price: 2800.50, volume: 500000 }
          ]
        }
      };

      mockCallHandler = createMockCallHandler(of(validResponse));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: (data) => {
          expect(data).toEqual(validResponse);
          expect(data.data.quotes).toHaveLength(2);
        }
      });
    });
  });

  describe('Error Sanitization', () => {
    describe('Client Error Classification', () => {
      it('should sanitize BadRequestException', () => {
        const originalError = new BadRequestException('Invalid parameter: API key abc123def456 is malformed');
        mockCallHandler = createMockCallHandler(throwError(() => originalError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(BadRequestException);
            expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
          }
        });
      });

      it('should classify permission errors as client errors', () => {
        const permissionError = new Error('User does not have permission to access this resource');
        mockCallHandler = createMockCallHandler(throwError(() => permissionError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(BadRequestException);
            expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
          }
        });
      });

      it('should classify unauthorized errors as client errors', () => {
        const unauthorizedError = new Error('Unauthorized access to 192.168.1.50 with token xyz789abc123');
        mockCallHandler = createMockCallHandler(throwError(() => unauthorizedError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(BadRequestException);
            expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
          }
        });
      });

      it('should classify Chinese permission errors as client errors', () => {
        const chinesePermissionError = new Error('用户权限不足，无法访问该资源');
        mockCallHandler = createMockCallHandler(throwError(() => chinesePermissionError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(BadRequestException);
            expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
          }
        });
      });

      it('should classify invalid parameter errors as client errors', () => {
        const invalidParamError = new Error('Invalid 参数: symbol must be a valid ticker');
        mockCallHandler = createMockCallHandler(throwError(() => invalidParamError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(BadRequestException);
            expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
          }
        });
      });
    });

    describe('Connection Error Classification', () => {
      it('should classify connection failures as service unavailable', () => {
        const connectionError = new Error('Failed to establish connection to data provider at 10.0.0.50:8080');
        mockCallHandler = createMockCallHandler(throwError(() => connectionError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
          }
        });
      });

      it('should classify Chinese connection errors correctly', () => {
        const chineseConnectionError = new Error('无法连接到数据服务器');
        mockCallHandler = createMockCallHandler(throwError(() => chineseConnectionError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
          }
        });
      });

      it('should classify connect-related errors correctly', () => {
        const connectError = new Error('Unable to connect to upstream server');
        mockCallHandler = createMockCallHandler(throwError(() => connectError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
          }
        });
      });
    });

    describe('Timeout Error Classification', () => {
      it('should classify timeout errors as service unavailable', () => {
        const timeoutError = new Error('Request timeout after 30000ms to mongodb://user:pass@db.example.com:27017');
        mockCallHandler = createMockCallHandler(throwError(() => timeoutError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('请求超时，请稍后重试');
          }
        });
      });

      it('should classify Chinese timeout errors correctly', () => {
        const chineseTimeoutError = new Error('请求超时，服务器响应时间过长');
        mockCallHandler = createMockCallHandler(throwError(() => chineseTimeoutError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('请求超时，请稍后重试');
          }
        });
      });
    });

    describe('Provider Error Classification', () => {
      it('should classify provider errors as service unavailable', () => {
        const providerError = new Error('Data provider API returned 500: Internal server error at /home/app/src/provider.js:123');
        mockCallHandler = createMockCallHandler(throwError(() => providerError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('数据提供商服务异常，请稍后重试');
          }
        });
      });

      it('should classify Chinese provider errors correctly', () => {
        const chineseProviderError = new Error('数据提供商服务异常，无法获取实时行情');
        mockCallHandler = createMockCallHandler(throwError(() => chineseProviderError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('数据提供商服务异常，请稍后重试');
          }
        });
      });

      it('should classify data source errors correctly', () => {
        const dataSourceError = new Error('Data source unavailable: redis://localhost:6379 connection failed');
        mockCallHandler = createMockCallHandler(throwError(() => dataSourceError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('数据提供商服务异常，请稍后重试');
          }
        });
      });

      it('should classify Chinese data source errors correctly', () => {
        const chineseDataSourceError = new Error('数据源连接失败，请检查配置');
        mockCallHandler = createMockCallHandler(throwError(() => chineseDataSourceError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('数据提供商服务异常，请稍后重试');
          }
        });
      });
    });

    describe('Server Error Classification', () => {
      it('should classify unknown errors as server errors', () => {
        const unknownError = new Error('Something went wrong in the internal process');
        mockCallHandler = createMockCallHandler(throwError(() => unknownError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should classify internal server errors correctly', () => {
        const internalError = new InternalServerErrorException('Database query failed with error 500');
        mockCallHandler = createMockCallHandler(throwError(() => internalError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should handle errors without messages', () => {
        const errorWithoutMessage = new Error();
        mockCallHandler = createMockCallHandler(throwError(() => errorWithoutMessage));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should handle null or undefined errors', () => {
        const nullError = null;
        mockCallHandler = createMockCallHandler(throwError(() => nullError));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });
    });
  });

  describe('Sensitive Information Sanitization', () => {
    describe('Database Connection Strings', () => {
      it('should sanitize MongoDB connection strings', () => {
        const errorWithMongoDB = new Error('Failed to connect to mongodb://user:password@cluster.mongodb.net:27017/database');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithMongoDB));

        const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: () => {
            // Check that original error is logged (with sensitive info for debugging)
            expect(loggerSpy).toHaveBeenCalledWith(
              'StreamDataFetcher错误详情',
              expect.objectContaining({
                error: expect.stringContaining('mongodb://'),
                url: '/api/stream-data',
                method: 'GET'
              })
            );
          }
        });
      });

      it('should sanitize Redis connection strings', () => {
        const errorWithRedis = new Error('Connection failed to redis://user:secret@cache.example.com:6379/0');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithRedis));

        const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: () => {
            expect(loggerSpy).toHaveBeenCalledWith(
              'StreamDataFetcher错误详情',
              expect.objectContaining({
                error: expect.stringContaining('redis://'),
                clientIP: '192.168.1.100'
              })
            );
          }
        });
      });
    });

    describe('API Keys and Tokens', () => {
      it('should sanitize long API keys', () => {
        const errorWithAPIKey = new Error('Authentication failed with API key: abcdef1234567890abcdef1234567890');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithAPIKey));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            // The user-facing error should not contain the API key
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should sanitize JWT tokens', () => {
        const errorWithJWT = new Error('Invalid JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithJWT));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should sanitize multiple long strings in single error', () => {
        const errorWithMultipleSecrets = new Error('Failed with key1: abc123def456ghi789jkl012mno345pqr and key2: xyz789abc123def456ghi789jkl012mno');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithMultipleSecrets));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });
    });

    describe('Internal Network IPs', () => {
      it('should sanitize 192.168.x.x addresses', () => {
        const errorWith192 = new Error('Connection failed to database server at 192.168.1.50');
        mockCallHandler = createMockCallHandler(throwError(() => errorWith192));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
          }
        });
      });

      it('should sanitize 10.x.x.x addresses', () => {
        const errorWith10 = new Error('Timeout connecting to 10.0.0.100:5432');
        mockCallHandler = createMockCallHandler(throwError(() => errorWith10));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('请求超时，请稍后重试');
          }
        });
      });

      it('should sanitize 172.16-31.x.x addresses', () => {
        const errorWith172 = new Error('Failed to reach service at 172.20.1.100:8080');
        mockCallHandler = createMockCallHandler(throwError(() => errorWith172));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
          }
        });
      });
    });

    describe('File System Paths', () => {
      it('should sanitize Unix file paths', () => {
        const errorWithPath = new Error('Failed to read config from /home/app/config/database.json');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithPath));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should sanitize Windows file paths', () => {
        const errorWithWindowsPath = new Error('Cannot access C:\\Program Files\\App\\config\\settings.xml');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithWindowsPath));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });

      it('should sanitize multiple paths in error message', () => {
        const errorWithMultiplePaths = new Error('Config conflict between /app/config/dev.json and /app/config/prod.json');
        mockCallHandler = createMockCallHandler(throwError(() => errorWithMultiplePaths));

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: (sanitizedError) => {
            expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
          }
        });
      });
    });

    describe('Stack Trace Information', () => {
      it('should sanitize stack trace information', () => {
        const errorWithStack = new Error('Database error occurred');
        errorWithStack.stack = `Error: Database error occurred
    at DatabaseService.query (/home/app/src/database.service.ts:45:12)
    at StreamService.fetchData (/home/app/src/stream.service.ts:78:25)
    at Object.<anonymous> (/home/app/dist/main.js:123:45)`;

        mockCallHandler = createMockCallHandler(throwError(() => errorWithStack));

        const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: () => {
            // Original stack should be logged for debugging
            expect(loggerSpy).toHaveBeenCalledWith(
              'StreamDataFetcher错误详情',
              expect.objectContaining({
                stack: expect.stringContaining('at DatabaseService.query'),
                error: 'Database error occurred'
              })
            );
          }
        });
      });

      it('should handle errors without stack traces', () => {
        const errorWithoutStack = new Error('Simple error message');
        delete errorWithoutStack.stack;

        mockCallHandler = createMockCallHandler(throwError(() => errorWithoutStack));

        const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

        const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result$.subscribe({
          next: () => fail('Should have thrown an error'),
          error: () => {
            expect(loggerSpy).toHaveBeenCalledWith(
              'StreamDataFetcher错误详情',
              expect.objectContaining({
                error: 'Simple error message',
                stack: undefined
              })
            );
          }
        });
      });
    });
  });

  describe('Client IP Extraction', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const requestWithForwarded = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          'user-agent': 'test-agent'
        }
      });
      const contextWithForwarded = createMockExecutionContext(requestWithForwarded);

      const testError = new Error('Test error for IP extraction');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithForwarded, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              clientIP: '203.0.113.1'
            })
          );
        }
      });
    });

    it('should extract IP from X-Real-IP header when X-Forwarded-For is not present', () => {
      const requestWithRealIP = createMockRequest({
        headers: {
          'x-real-ip': '203.0.113.2',
          'user-agent': 'test-agent'
        }
      });
      const contextWithRealIP = createMockExecutionContext(requestWithRealIP);

      const testError = new Error('Test error for IP extraction');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithRealIP, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              clientIP: '203.0.113.2'
            })
          );
        }
      });
    });

    it('should fall back to connection remote address', () => {
      const requestWithoutHeaders = createMockRequest({
        headers: {
          'user-agent': 'test-agent'
        },
        connection: {
          remoteAddress: '192.168.1.200'
        }
      });
      const contextWithoutHeaders = createMockExecutionContext(requestWithoutHeaders);

      const testError = new Error('Test error for IP extraction');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithoutHeaders, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              clientIP: '192.168.1.200'
            })
          );
        }
      });
    });

    it('should fall back to socket remote address when connection is unavailable', () => {
      const requestWithSocketOnly = createMockRequest({
        headers: { 'user-agent': 'test-agent' },
        connection: null,
        socket: {
          remoteAddress: '192.168.1.250'
        }
      });
      const contextWithSocketOnly = createMockExecutionContext(requestWithSocketOnly);

      const testError = new Error('Test error for IP extraction');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithSocketOnly, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              clientIP: '192.168.1.250'
            })
          );
        }
      });
    });

    it('should return unknown when no IP sources are available', () => {
      const requestWithNoIP = createMockRequest({
        headers: { 'user-agent': 'test-agent' },
        connection: null,
        socket: null
      });
      const contextWithNoIP = createMockExecutionContext(requestWithNoIP);

      const testError = new Error('Test error for IP extraction');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithNoIP, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              clientIP: 'unknown'
            })
          );
        }
      });
    });
  });

  describe('Logging Functionality', () => {
    it('should log complete error details for debugging', () => {
      const detailedError = new Error('Detailed error with sensitive info mongodb://user:pass@db:27017');
      detailedError.stack = 'Error stack trace here';

      mockCallHandler = createMockCallHandler(throwError(() => detailedError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              url: '/api/stream-data',
              method: 'GET',
              userAgent: 'test-agent',
              clientIP: '192.168.1.100',
              error: 'Detailed error with sensitive info mongodb://user:pass@db:27017',
              stack: 'Error stack trace here',
              timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            })
          );
        }
      });
    });

    it('should include user agent in logs', () => {
      const requestWithCustomUA = createMockRequest({
        headers: {
          'user-agent': 'Custom-Agent/1.0 (Testing)'
        }
      });
      const contextWithCustomUA = createMockExecutionContext(requestWithCustomUA);

      const testError = new Error('Test error for user agent logging');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithCustomUA, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              userAgent: 'Custom-Agent/1.0 (Testing)'
            })
          );
        }
      });
    });

    it('should handle missing user agent gracefully', () => {
      const requestWithoutUA = createMockRequest({
        headers: {}
      });
      const contextWithoutUA = createMockExecutionContext(requestWithoutUA);

      const testError = new Error('Test error without user agent');
      mockCallHandler = createMockCallHandler(throwError(() => testError));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      const result$ = interceptor.intercept(contextWithoutUA, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'StreamDataFetcher错误详情',
            expect.objectContaining({
              userAgent: undefined
            })
          );
        }
      });
    });
  });

  describe('Error Message Generation', () => {
    it('should return correct generic messages for each error type', () => {
      // Access private method for testing
      const getGenericMessage = (interceptor as any).getGenericMessage.bind(interceptor);

      expect(getGenericMessage('client_error')).toBe('请求参数有误或权限不足，请检查后重试');
      expect(getGenericMessage('connection_error')).toBe('连接服务失败，请稍后重试');
      expect(getGenericMessage('timeout')).toBe('请求超时，请稍后重试');
      expect(getGenericMessage('provider_error')).toBe('数据提供商服务异常，请稍后重试');
      expect(getGenericMessage('server_error')).toBe('服务暂时不可用，请稍后重试');
    });

    it('should return default server error message for unknown error types', () => {
      const getGenericMessage = (interceptor as any).getGenericMessage.bind(interceptor);

      expect(getGenericMessage('unknown_error_type')).toBe('服务暂时不可用，请稍后重试');
      expect(getGenericMessage('')).toBe('服务暂时不可用，请稍后重试');
      expect(getGenericMessage(null)).toBe('服务暂时不可用，请稍后重试');
    });
  });

  describe('Complex Error Scenarios', () => {
    it('should handle errors with mixed sensitive and non-sensitive content', () => {
      const mixedError = new Error('User authentication failed: invalid token abc123def456ghi789jkl012 for user at IP 192.168.1.100 connecting to mongodb://admin:secret@prod-db:27017/auth_db. Stack trace: at AuthService.validateToken (/app/src/auth/auth.service.ts:45:12)');
      mockCallHandler = createMockCallHandler(throwError(() => mixedError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          // Should classify as client error due to "authentication" and "invalid"
          expect(sanitizedError).toBeInstanceOf(BadRequestException);
          expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
        }
      });
    });

    it('should handle errors that match multiple classification patterns', () => {
      // Error that could be classified as both connection and provider error
      const ambiguousError = new Error('Provider connection failed: unable to connect to data source');
      mockCallHandler = createMockCallHandler(throwError(() => ambiguousError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          // Should classify as connection error (checked first)
          expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
          expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
        }
      });
    });

    it('should preserve error classification priority order', () => {
      // Test that classification follows the expected priority:
      // 1. Client errors (bad request, permission, etc.)
      // 2. Connection errors
      // 3. Timeout errors
      // 4. Provider errors
      // 5. Server errors (fallback)

      const clientAndConnectionError = new Error('Invalid connection parameter specified');
      mockCallHandler = createMockCallHandler(throwError(() => clientAndConnectionError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          // Should be classified as client error (higher priority than connection)
          expect(sanitizedError).toBeInstanceOf(BadRequestException);
          expect(sanitizedError.message).toBe('请求参数有误或权限不足，请检查后重试');
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000) + ' with sensitive info mongodb://user:pass@host:27017';
      const longError = new Error(longMessage);
      mockCallHandler = createMockCallHandler(throwError(() => longError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
          expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
        }
      });
    });

    it('should handle errors with special characters', () => {
      const specialCharError = new Error('Error with unicode: 测试错误 connection failed to 数据库服务器');
      mockCallHandler = createMockCallHandler(throwError(() => specialCharError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
          expect(sanitizedError.message).toBe('连接服务失败，请稍后重试');
        }
      });
    });

    it('should handle circular reference errors gracefully', () => {
      const circularError: any = new Error('Circular reference error');
      circularError.circular = circularError; // Create circular reference

      mockCallHandler = createMockCallHandler(throwError(() => circularError));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: () => fail('Should have thrown an error'),
        error: (sanitizedError) => {
          expect(sanitizedError).toBeInstanceOf(ServiceUnavailableException);
          expect(sanitizedError.message).toBe('服务暂时不可用，请稍后重试');
        }
      });
    });
  });
});
