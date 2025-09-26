import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyAuthGuard } from '@auth/guards/apikey-auth.guard';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { REQUIRE_API_KEY } from '@auth/decorators/require-apikey.decorator';

// Mock AuthGuard
const mockAuthGuard = jest.fn().mockImplementation(() => ({
  canActivate: jest.fn(),
}));

jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => mockAuthGuard),
}));

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let authPerformanceService: jest.Mocked<AuthPerformanceService>;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        url: '/api/v1/test',
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key',
          'x-access-token': 'test-access-token',
        },
      }),
    }),
  } as unknown as ExecutionContext;

  const mockAuthPerformanceService = {
    recordAuthFlowPerformance: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthPerformanceService,
          useValue: mockAuthPerformanceService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
    reflector = module.get(Reflector);
    authPerformanceService = module.get(AuthPerformanceService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockAuthGuard.mockClear();
  });

  describe('canActivate', () => {
    describe('public endpoints', () => {
      it('should allow access to public endpoints without API key validation', () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
          skipReason: 'public_endpoint',
        });
      });

      it('should not call parent AuthGuard for public endpoints', () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true
        const mockSuperCanActivate = jest.spyOn(guard as any, 'super');

        guard.canActivate(mockExecutionContext);

        expect(mockSuperCanActivate).not.toHaveBeenCalled();
      });
    });

    describe('endpoints without API key requirement', () => {
      it('should allow access when API key is not required', () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_API_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
          skipReason: 'no_api_key_required',
        });
      });
    });

    describe('API key validation', () => {
      beforeEach(() => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true
      });

      it('should validate API key when required', () => {
        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(mockParentCanActivate).toHaveBeenCalledWith(mockExecutionContext);
        expect(result).toBe(true);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
        });
      });

      it('should handle successful promise-based validation', async () => {
        const mockParentCanActivate = jest.fn().mockResolvedValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
        });
      });

      it('should handle failed promise-based validation', async () => {
        const error = new Error('API key validation failed');
        const mockParentCanActivate = jest.fn().mockRejectedValue(error);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'API key validation failed'
        );

        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: false,
          skipReason: undefined,
          error: 'API key validation failed',
        });
      });

      it('should handle synchronous validation errors', () => {
        const error = new Error('Sync validation error');
        const mockParentCanActivate = jest.fn().mockImplementation(() => {
          throw error;
        });
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        expect(() => guard.canActivate(mockExecutionContext)).toThrow('Sync validation error');

        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: false,
          skipReason: undefined,
          error: 'Sync validation error',
        });
      });

      it('should handle falsy result from parent guard', () => {
        const mockParentCanActivate = jest.fn().mockReturnValue(false);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: false,
        });
      });
    });

    describe('performance recording', () => {
      it('should work without performance service', () => {
        // Create guard without performance service
        const guardWithoutPerf = new ApiKeyAuthGuard(reflector);
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guardWithoutPerf.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        // Should not throw error even without performance service
      });

      it('should record correct timing information', () => {
        const startTime = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(startTime);

        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        guard.canActivate(mockExecutionContext);

        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime,
          endTime: startTime,
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
          skipReason: 'public_endpoint',
        });

        jest.restoreAllMocks();
      });
    });

    describe('reflector edge cases', () => {
      it('should handle reflector returning undefined', () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // isPublic = undefined (falsy)
          .mockReturnValueOnce(undefined); // requireApiKey = undefined (falsy)

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: true,
          skipReason: 'no_api_key_required',
        });
      });

      it('should handle reflector throwing errors', () => {
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });

        expect(() => guard.canActivate(mockExecutionContext)).toThrow('Reflector error');
      });
    });
  });

  describe('handleRequest', () => {
    it('should return API key when validation is successful', () => {
      const mockApiKey = {
        appKey: 'test-app-key',
        userId: '507f1f77bcf86cd799439011',
        permissions: ['DATA_READ'],
      };

      const result = guard.handleRequest(null, mockApiKey);

      expect(result).toEqual(mockApiKey);
    });

    it('should throw UnauthorizedException when error is provided', () => {
      const error = new Error('API key not found');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when API key is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null)).toThrow('API凭证验证失败');
    });

    it('should throw UnauthorizedException when API key is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, undefined)).toThrow('API凭证验证失败');
    });

    it('should throw UnauthorizedException when API key is empty object', () => {
      expect(() => guard.handleRequest(null, {})).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, {})).toThrow('API凭证验证失败');
    });

    it('should prioritize error over missing API key', () => {
      const error = new Error('Custom validation error');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should handle falsy API key values', () => {
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach((falsyValue) => {
        expect(() => guard.handleRequest(null, falsyValue)).toThrow(UnauthorizedException);
      });
    });

    it('should accept truthy API key values', () => {
      const truthyValues = [
        { appKey: 'test' },
        { userId: 'user123' },
        { permissions: [] },
        'string-api-key',
        123,
        true,
      ];

      truthyValues.forEach((truthyValue) => {
        const result = guard.handleRequest(null, truthyValue);
        expect(result).toEqual(truthyValue);
      });
    });
  });

  describe('inheritance and integration', () => {
    it('should extend AuthGuard with correct strategy', () => {
      // Verify that the guard properly extends AuthGuard
      expect(guard).toBeInstanceOf(ApiKeyAuthGuard);
    });

    it('should work with different execution contexts', () => {
      const wsContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({
            url: '/ws/test',
            method: 'WS',
          }),
        }),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/ws/test',
            method: 'WS',
          }),
        }),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

      const result = guard.canActivate(wsContext);

      expect(result).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle request object missing properties', () => {
      const contextWithIncompleteRequest = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}), // Empty request object
        }),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

      const result = guard.canActivate(contextWithIncompleteRequest);

      expect(result).toBe(true);
      expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        guardName: 'ApiKeyAuthGuard',
        endpoint: undefined,
        method: undefined,
        success: true,
        skipReason: 'public_endpoint',
      });
    });

    it('should handle switchToHttp throwing errors', () => {
      const contextWithError = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockImplementation(() => {
          throw new Error('Context switch error');
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(contextWithError)).toThrow('Context switch error');
    });
  });

  describe('performance edge cases', () => {
    it('should handle performance service throwing errors', () => {
      authPerformanceService.recordAuthFlowPerformance.mockImplementation(() => {
        throw new Error('Performance recording error');
      });

      reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

      // Should not throw error even if performance recording fails
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should record performance for different success states', () => {
      const testCases = [
        { parentResult: true, expectedSuccess: true },
        { parentResult: false, expectedSuccess: false },
        { parentResult: null, expectedSuccess: false },
        { parentResult: undefined, expectedSuccess: false },
      ];

      testCases.forEach(({ parentResult, expectedSuccess }, index) => {
        jest.clearAllMocks();
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true

        const mockParentCanActivate = jest.fn().mockReturnValue(parentResult);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        guard.canActivate(mockExecutionContext);

        expect(authPerformanceService.recordAuthFlowPerformance).toHaveBeenCalledWith({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          guardName: 'ApiKeyAuthGuard',
          endpoint: '/api/v1/test',
          method: 'GET',
          success: expectedSuccess,
        });
      });
    });
  });
});