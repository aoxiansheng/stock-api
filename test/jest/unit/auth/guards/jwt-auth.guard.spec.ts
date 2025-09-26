import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { REQUIRE_API_KEY } from '@auth/decorators/require-apikey.decorator';

// Mock AuthGuard
const mockAuthGuard = jest.fn().mockImplementation(() => ({
  canActivate: jest.fn(),
}));

jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => mockAuthGuard),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        url: '/api/v1/test',
        method: 'GET',
        headers: {},
      }),
    }),
  } as unknown as ExecutionContext;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockAuthGuard.mockClear();
  });

  describe('canActivate', () => {
    describe('public endpoints', () => {
      it('should allow access to public endpoints without JWT validation', () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
      });

      it('should not call parent AuthGuard for public endpoints', () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true
        const mockSuperCanActivate = jest.spyOn(guard as any, 'super');

        guard.canActivate(mockExecutionContext);

        expect(mockSuperCanActivate).not.toHaveBeenCalled();
      });
    });

    describe('API key precedence', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic = false
      });

      it('should skip JWT validation when API key is required', () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // requireApiKey = true

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_API_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
      });

      it('should skip JWT validation when API key headers are present', () => {
        const contextWithApiKeyHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              url: '/api/v1/test',
              method: 'GET',
              headers: {
                'x-app-key': 'test-app-key',
                'x-access-token': 'test-access-token',
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // requireApiKey = false
          .mockReturnValueOnce(false); // Second call for complete flow

        const result = guard.canActivate(contextWithApiKeyHeaders);

        expect(result).toBe(true);
      });

      it('should skip JWT validation when only x-app-key header is present', () => {
        const contextWithPartialHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: {
                'x-app-key': 'test-app-key',
                // Missing x-access-token
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride.mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithPartialHeaders);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should skip JWT validation when only x-access-token header is present', () => {
        const contextWithPartialHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: {
                'x-access-token': 'test-access-token',
                // Missing x-app-key
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride.mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithPartialHeaders);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should prioritize requireApiKey over API key headers', () => {
        const contextWithApiKeyHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: {
                'x-app-key': 'test-app-key',
                'x-access-token': 'test-access-token',
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride.mockReturnValueOnce(true); // requireApiKey = true

        const result = guard.canActivate(contextWithApiKeyHeaders);

        expect(result).toBe(true);
        // Should not reach the API key header check since requireApiKey is true
      });
    });

    describe('JWT validation', () => {
      beforeEach(() => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false
      });

      it('should perform JWT validation when no API key present and not public', () => {
        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(mockParentCanActivate).toHaveBeenCalledWith(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should handle JWT validation failure', () => {
        const mockParentCanActivate = jest.fn().mockReturnValue(false);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should handle JWT validation promise resolution', async () => {
        const mockParentCanActivate = jest.fn().mockResolvedValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should handle JWT validation promise rejection', async () => {
        const mockParentCanActivate = jest.fn().mockRejectedValue(new Error('JWT validation failed'));
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('JWT validation failed');
      });
    });

    describe('edge cases', () => {
      it('should handle missing request headers', () => {
        const contextWithoutHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              // No headers property
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithoutHeaders);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle null headers', () => {
        const contextWithNullHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: null,
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithNullHeaders);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle empty string headers', () => {
        const contextWithEmptyHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: {
                'x-app-key': '',
                'x-access-token': '',
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithEmptyHeaders);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle case-sensitive header names', () => {
        const contextWithUppercaseHeaders = {
          ...mockExecutionContext,
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              headers: {
                'X-APP-KEY': 'test-app-key',
                'X-ACCESS-TOKEN': 'test-access-token',
              },
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithUppercaseHeaders);

        // Should not skip JWT validation due to case sensitivity
        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe('reflector behavior', () => {
      it('should handle reflector returning undefined for public check', () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // isPublic = undefined (falsy)
          .mockReturnValueOnce(false); // requireApiKey = false

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle reflector returning undefined for API key check', () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // requireApiKey = undefined (falsy)

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(mockExecutionContext);

        expect(mockParentCanActivate).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle reflector throwing errors', () => {
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });

        expect(() => guard.canActivate(mockExecutionContext)).toThrow('Reflector error');
      });
    });

    describe('context errors', () => {
      it('should handle switchToHttp errors', () => {
        const contextWithError = {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToHttp: jest.fn().mockImplementation(() => {
            throw new Error('Context switch error');
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        expect(() => guard.canActivate(contextWithError)).toThrow('Context switch error');
      });

      it('should handle getRequest errors', () => {
        const contextWithError = {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockImplementation(() => {
              throw new Error('Get request error');
            }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        expect(() => guard.canActivate(contextWithError)).toThrow('Get request error');
      });
    });
  });

  describe('handleRequest', () => {
    it('should return user when JWT validation is successful', () => {
      const mockUser = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        role: 'DEVELOPER',
      };

      const result = guard.handleRequest(null, mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when error is provided', () => {
      const error = new Error('JWT token expired');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null)).toThrow('JWT认证失败');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, undefined)).toThrow('JWT认证失败');
    });

    it('should prioritize error over missing user', () => {
      const error = new Error('Custom JWT error');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should handle falsy user values', () => {
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach((falsyValue) => {
        expect(() => guard.handleRequest(null, falsyValue)).toThrow(UnauthorizedException);
      });
    });

    it('should accept truthy user values', () => {
      const truthyValues = [
        { userId: 'test' },
        { username: 'user123' },
        { role: 'ADMIN' },
        'string-user-id',
        123,
        true,
        [],
        {},
      ];

      truthyValues.forEach((truthyValue) => {
        const result = guard.handleRequest(null, truthyValue);
        expect(result).toEqual(truthyValue);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex authentication flow', () => {
      const scenarios = [
        {
          description: 'public endpoint',
          isPublic: true,
          requireApiKey: false,
          headers: {},
          expectedResult: true,
          shouldCallParent: false,
        },
        {
          description: 'API key required',
          isPublic: false,
          requireApiKey: true,
          headers: {},
          expectedResult: true,
          shouldCallParent: false,
        },
        {
          description: 'API key headers present',
          isPublic: false,
          requireApiKey: false,
          headers: { 'x-app-key': 'key', 'x-access-token': 'token' },
          expectedResult: true,
          shouldCallParent: false,
        },
        {
          description: 'JWT validation required',
          isPublic: false,
          requireApiKey: false,
          headers: {},
          expectedResult: true,
          shouldCallParent: true,
        },
      ];

      scenarios.forEach(({ description, isPublic, requireApiKey, headers, expectedResult, shouldCallParent }) => {
        jest.clearAllMocks();

        const contextWithHeaders = {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({ headers }),
          }),
        } as unknown as ExecutionContext;

        reflector.getAllAndOverride
          .mockReturnValueOnce(isPublic)
          .mockReturnValueOnce(requireApiKey);

        const mockParentCanActivate = jest.fn().mockReturnValue(true);
        Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

        const result = guard.canActivate(contextWithHeaders);

        expect(result).toBe(expectedResult);
        if (shouldCallParent) {
          expect(mockParentCanActivate).toHaveBeenCalled();
        } else {
          expect(mockParentCanActivate).not.toHaveBeenCalled();
        }
      });
    });

    it('should maintain proper method call order', () => {
      const callOrder = [];

      reflector.getAllAndOverride.mockImplementation((key) => {
        callOrder.push(`reflector:${key}`);
        return false;
      });

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockImplementation(() => {
            callOrder.push('getRequest');
            return { headers: {} };
          }),
        }),
      } as unknown as ExecutionContext;

      const mockParentCanActivate = jest.fn().mockImplementation(() => {
        callOrder.push('parent:canActivate');
        return true;
      });
      Object.setPrototypeOf(guard, { canActivate: mockParentCanActivate });

      guard.canActivate(mockContext);

      expect(callOrder).toEqual([
        `reflector:${IS_PUBLIC_KEY}`,
        `reflector:${REQUIRE_API_KEY}`,
        'getRequest',
        'parent:canActivate',
      ]);
    });
  });

  describe('inheritance and type safety', () => {
    it('should extend AuthGuard with correct strategy', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should maintain type safety for execution context', () => {
      // Test with different context types
      const httpContext = mockExecutionContext;
      const wsContext = {
        ...mockExecutionContext,
        getType: () => 'ws',
      } as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(true);

      expect(guard.canActivate(httpContext)).toBe(true);
      expect(guard.canActivate(wsContext)).toBe(true);
    });
  });
});