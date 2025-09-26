import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { AuthFlowPerformanceInterceptor } from '@auth/interceptors/auth-flow-performance.interceptor';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { REQUIRE_API_KEY } from '@auth/decorators/require-apikey.decorator';

describe('AuthFlowPerformanceInterceptor', () => {
  let interceptor: AuthFlowPerformanceInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let authPerformanceService: jest.Mocked<AuthPerformanceService>;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  const mockRequest = {
    url: '/api/v1/test',
    method: 'GET',
    headers: {},
  };

  const mockAuthPerformanceService = {
    recordAuthFlowStats: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthFlowPerformanceInterceptor,
        {
          provide: AuthPerformanceService,
          useValue: mockAuthPerformanceService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuthFlowPerformanceInterceptor>(AuthFlowPerformanceInterceptor);
    reflector = module.get(Reflector);
    authPerformanceService = module.get(AuthPerformanceService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock behaviors
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
  });

  describe('intercept', () => {
    it('should intercept the request and return an observable', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(false); // requireApiKey
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(result).toBeInstanceOf(Observable);
    });

    describe('public endpoints', () => {
      it('should record performance for public endpoints', (done) => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(true) // isPublic = true
          .mockReturnValueOnce(false); // requireApiKey
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 1, // Only ThrottlerGuard
              skippedGuards: 4,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: false,
              authType: 'public',
            });
            done();
          },
        });
      });
    });

    describe('API key authentication', () => {
      it('should record performance for API key required endpoints', (done) => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 4, // All except JWT guard
              skippedGuards: 1,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'api_key',
            });
            done();
          },
        });
      });

      it('should record performance for endpoints with API key headers', (done) => {
        const requestWithApiKeyHeaders = {
          ...mockRequest,
          headers: {
            'x-app-key': 'test-app-key',
            'x-access-token': 'test-access-token',
          },
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithApiKeyHeaders);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 4, // All except JWT guard
              skippedGuards: 1,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'api_key',
            });
            done();
          },
        });
      });
    });

    describe('JWT authentication', () => {
      it('should record performance for JWT authenticated endpoints', (done) => {
        const requestWithJwtHeader = {
          ...mockRequest,
          headers: {
            'authorization': 'Bearer test-jwt-token',
          },
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithJwtHeader);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 3, // All except API Key related guards
              skippedGuards: 2,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'jwt',
            });
            done();
          },
        });
      });
    });

    describe('no authentication', () => {
      it('should record performance for endpoints with no authentication', (done) => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5, // All guards executed
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'none',
            });
            done();
          },
        });
      });
    });

    describe('error handling', () => {
      it('should record performance when request fails', (done) => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(throwError(() => new Error('Test error')));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          error: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5,
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: false,
              authType: 'none',
            });
            done();
          },
        });
      });
    });

    describe('edge cases', () => {
      it('should handle missing request headers', (done) => {
        const requestWithoutHeaders = {
          ...mockRequest,
          headers: undefined,
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithoutHeaders);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5,
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'none',
            });
            done();
          },
        });
      });

      it('should handle empty request headers', (done) => {
        const requestWithEmptyHeaders = {
          ...mockRequest,
          headers: {},
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithEmptyHeaders);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5,
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'none',
            });
            done();
          },
        });
      });

      it('should handle reflector returning undefined', (done) => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // isPublic = undefined (falsy)
          .mockReturnValueOnce(undefined); // requireApiKey = undefined (falsy)
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5,
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'none',
            });
            done();
          },
        });
      });

      it('should handle reflector throwing errors', (done) => {
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            // In case of reflector error, it should default to no authentication
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 5,
              skippedGuards: 0,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'none',
            });
            done();
          },
        });
      });
    });

    describe('auth analysis', () => {
      it('should prioritize isPublic over other authentication methods', (done) => {
        const requestWithAllHeaders = {
          ...mockRequest,
          headers: {
            'x-app-key': 'test-app-key',
            'x-access-token': 'test-access-token',
            'authorization': 'Bearer test-jwt-token',
          },
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithAllHeaders);

        reflector.getAllAndOverride
          .mockReturnValueOnce(true) // isPublic = true (takes precedence)
          .mockReturnValueOnce(true); // requireApiKey = true
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 1, // Only ThrottlerGuard
              skippedGuards: 4,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: false,
              authType: 'public',
            });
            done();
          },
        });
      });

      it('should prioritize requireApiKey over header-based detection', (done) => {
        const requestWithJwtHeader = {
          ...mockRequest,
          headers: {
            'authorization': 'Bearer test-jwt-token',
          },
        };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithJwtHeader);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true (takes precedence)
        (mockCallHandler.handle as jest.Mock).mockReturnValue(of('test response'));

        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

        result.subscribe({
          complete: () => {
            expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
              totalGuards: 5,
              executedGuards: 4, // All except JWT guard
              skippedGuards: 1,
              totalDuration: expect.any(Number),
              endpoint: '/api/v1/test',
              method: 'GET',
              authenticated: true,
              authType: 'api_key',
            });
            done();
          },
        });
      });
    });
  });

  describe('analyzeAuthRequirements', () => {
    it('should correctly analyze public endpoint requirements', () => {
      const result = (interceptor as any).analyzeAuthRequirements(true, false, mockRequest);
      
      expect(result).toEqual({
        authType: 'public',
        isPublic: true,
        requireApiKey: false,
        hasApiKeyHeaders: false,
        hasJwtHeader: false,
        expectedGuards: 5,
        expectedSkips: 4,
      });
    });

    it('should correctly analyze API key required endpoint requirements', () => {
      const requestWithApiKeyHeaders = {
        ...mockRequest,
        headers: {
          'x-app-key': 'test-app-key',
          'x-access-token': 'test-access-token',
        },
      };
      
      const result = (interceptor as any).analyzeAuthRequirements(false, true, requestWithApiKeyHeaders);
      
      expect(result).toEqual({
        authType: 'api_key',
        isPublic: false,
        requireApiKey: true,
        hasApiKeyHeaders: true,
        hasJwtHeader: false,
        expectedGuards: 5,
        expectedSkips: 1,
      });
    });

    it('should correctly analyze JWT authenticated endpoint requirements', () => {
      const requestWithJwtHeader = {
        ...mockRequest,
        headers: {
          'authorization': 'Bearer test-jwt-token',
        },
      };
      
      const result = (interceptor as any).analyzeAuthRequirements(false, false, requestWithJwtHeader);
      
      expect(result).toEqual({
        authType: 'jwt',
        isPublic: false,
        requireApiKey: false,
        hasApiKeyHeaders: false,
        hasJwtHeader: true,
        expectedGuards: 5,
        expectedSkips: 2,
      });
    });

    it('should correctly analyze no authentication endpoint requirements', () => {
      const result = (interceptor as any).analyzeAuthRequirements(false, false, mockRequest);
      
      expect(result).toEqual({
        authType: 'none',
        isPublic: false,
        requireApiKey: false,
        hasApiKeyHeaders: false,
        hasJwtHeader: false,
        expectedGuards: 5,
        expectedSkips: 0,
      });
    });
  });

  describe('recordAuthFlowSuccess', () => {
    it('should record successful auth flow stats', () => {
      const startTime = Date.now();
      const authAnalysis = {
        authType: 'jwt',
        isPublic: false,
        requireApiKey: false,
        hasApiKeyHeaders: false,
        hasJwtHeader: true,
        expectedGuards: 5,
        expectedSkips: 2,
      };

      (interceptor as any).recordAuthFlowSuccess(startTime, mockRequest, authAnalysis);

      expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
        totalGuards: 5,
        executedGuards: 3,
        skippedGuards: 2,
        totalDuration: expect.any(Number),
        endpoint: '/api/v1/test',
        method: 'GET',
        authenticated: true,
        authType: 'jwt',
      });
    });
  });

  describe('recordAuthFlowError', () => {
    it('should record failed auth flow stats', () => {
      const startTime = Date.now();
      const authAnalysis = {
        authType: 'api_key',
        isPublic: false,
        requireApiKey: true,
        hasApiKeyHeaders: true,
        hasJwtHeader: false,
        expectedGuards: 5,
        expectedSkips: 1,
      };
      const error = new Error('Test error');

      (interceptor as any).recordAuthFlowError(startTime, mockRequest, authAnalysis, error);

      expect(authPerformanceService.recordAuthFlowStats).toHaveBeenCalledWith({
        totalGuards: 5,
        executedGuards: 4,
        skippedGuards: 1,
        totalDuration: expect.any(Number),
        endpoint: '/api/v1/test',
        method: 'GET',
        authenticated: false,
        authType: 'api_key',
      });
    });
  });
});